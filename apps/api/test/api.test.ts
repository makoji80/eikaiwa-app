import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app';
import { MockAiProvider } from '../src/providers/ai/mockProvider';
import type { Env } from '../src/env';
import { TEST_DATABASE_URL, resetTestDatabase } from './setup';

const testEnv: Env = {
  PORT: 4000,
  DATABASE_URL: TEST_DATABASE_URL,
  JWT_SECRET: 'test-secret-please-32-characters-long',
  JWT_EXPIRES_IN_SECONDS: 3600,
  AI_PROVIDER: 'mock',
  OPENAI_MODEL: 'gpt-4o-mini',
  CORS_ORIGIN: '*',
  IDEMPOTENCY_TTL_HOURS: 24,
};

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  resetTestDatabase();
  prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  app = createApp(prisma, new MockAiProvider(), testEnv);
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function signup(email: string) {
  const res = await request(app).post('/api/auth/signup').send({ email, password: 'password123' });
  expect(res.status).toBe(201);
  return res.body as { access_token: string; user_id: string };
}

async function createConversation(token: string) {
  const res = await request(app)
    .post('/api/conversations')
    .set('Authorization', `Bearer ${token}`)
    .send({ topic: 'travel' });
  expect(res.status).toBe(201);
  return res.body.conversation as { id: string };
}

describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('auth', () => {
  it('signs up and logs in', async () => {
    const email = `user-${Date.now()}-a@example.com`;
    const signupRes = await signup(email);
    expect(signupRes.access_token).toBeTruthy();

    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(loginRes.status).toBe(200);
  });

  it('rejects wrong password', async () => {
    const email = `user-${Date.now()}-b@example.com`;
    await signup(email);
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('conversation core loop (text)', () => {
  it('requires auth', async () => {
    const res = await request(app).get('/api/conversations/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });

  it('compose alone does not create a spoken English message; only reply does', async () => {
    const { access_token } = await signup(`user-${Date.now()}-c@example.com`);
    const conversation = await createConversation(access_token);

    const composeRes = await request(app)
      .post('/api/compose')
      .set('Authorization', `Bearer ${access_token}`)
      .send({
        request_id: `req-compose-${Date.now()}`,
        conversation_id: conversation.id,
        jp_intent: 'マイクロソフトとの連携を強めたい',
        level: 'intermediate',
      });
    expect(composeRes.status).toBe(200);
    expect(composeRes.body.english).toBeTruthy();
    expect(composeRes.body.source_message_id).toBeTruthy();

    const spokenEnglishBeforeReply = await prisma.message.findMany({
      where: { conversationId: conversation.id, role: 'user', language: 'en' },
    });
    expect(spokenEnglishBeforeReply).toHaveLength(0);

    const replyRes = await request(app)
      .post('/api/reply')
      .set('Authorization', `Bearer ${access_token}`)
      .send({
        request_id: `req-reply-${Date.now()}`,
        conversation_id: conversation.id,
        spoken_text: 'We want to build a stronger partnership with Microsoft.',
        source_message_id: composeRes.body.source_message_id,
        style: 'conversation',
      });
    expect(replyRes.status).toBe(200);
    expect(replyRes.body.reply_text).toBeTruthy();

    const spokenEnglishAfterReply = await prisma.message.findMany({
      where: { conversationId: conversation.id, role: 'user', language: 'en' },
    });
    expect(spokenEnglishAfterReply).toHaveLength(1);

    const attempt = await prisma.translationAttempt.findUnique({
      where: { sourceMessageId: composeRes.body.source_message_id },
    });
    expect(attempt?.userSpoke).toBe(true);
  });

  it('is idempotent for duplicate request_id with the same payload', async () => {
    const { access_token } = await signup(`user-${Date.now()}-d@example.com`);
    const conversation = await createConversation(access_token);
    const body = {
      request_id: `req-dup-${Date.now()}`,
      conversation_id: conversation.id,
      jp_intent: '有給休暇を取りたい',
      level: 'beginner',
    };

    const first = await request(app).post('/api/compose').set('Authorization', `Bearer ${access_token}`).send(body);
    const second = await request(app).post('/api/compose').set('Authorization', `Bearer ${access_token}`).send(body);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);

    const messages = await prisma.message.findMany({ where: { conversationId: conversation.id } });
    expect(messages).toHaveLength(1);
  });

  it('rejects request_id reuse with a different payload', async () => {
    const { access_token } = await signup(`user-${Date.now()}-e@example.com`);
    const conversation = await createConversation(access_token);
    const requestId = `req-conflict-${Date.now()}`;

    const first = await request(app)
      .post('/api/compose')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ request_id: requestId, conversation_id: conversation.id, jp_intent: '意図A', level: 'beginner' });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post('/api/compose')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ request_id: requestId, conversation_id: conversation.id, jp_intent: '意図B', level: 'beginner' });
    expect(second.status).toBe(400);
  });
});

describe('cross-user isolation', () => {
  it('returns 404 (not 403) when accessing another user\'s conversation', async () => {
    const userA = await signup(`user-${Date.now()}-f@example.com`);
    const userB = await signup(`user-${Date.now()}-g@example.com`);
    const conversation = await createConversation(userA.access_token);

    const res = await request(app)
      .get(`/api/conversations/${conversation.id}`)
      .set('Authorization', `Bearer ${userB.access_token}`);
    expect(res.status).toBe(404);
  });

  it('cannot compose into another user\'s conversation', async () => {
    const userA = await signup(`user-${Date.now()}-h@example.com`);
    const userB = await signup(`user-${Date.now()}-i@example.com`);
    const conversation = await createConversation(userA.access_token);

    const res = await request(app)
      .post('/api/compose')
      .set('Authorization', `Bearer ${userB.access_token}`)
      .send({
        request_id: `req-${Date.now()}`,
        conversation_id: conversation.id,
        jp_intent: '意図',
        level: 'beginner',
      });
    expect(res.status).toBe(404);
  });
});
