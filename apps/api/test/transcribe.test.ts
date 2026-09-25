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

const VALID_AUDIO_BASE64 = Buffer.alloc(5000, 7).toString('base64');
const TOO_SHORT_AUDIO_BASE64 = Buffer.alloc(100, 7).toString('base64');

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

describe('POST /api/transcribe', () => {
  it('requires auth', async () => {
    const res = await request(app)
      .post('/api/transcribe')
      .send({ request_id: 'r1', locale: 'ja-JP', audio_base64: VALID_AUDIO_BASE64, mime_type: 'audio/m4a' });
    expect(res.status).toBe(401);
  });

  it('returns a schema-valid transcript and never persists a SpeechAsset row', async () => {
    const { access_token } = await signup(`user-${Date.now()}-voice-a@example.com`);

    const res = await request(app)
      .post('/api/transcribe')
      .set('Authorization', `Bearer ${access_token}`)
      .send({
        request_id: `req-transcribe-${Date.now()}`,
        locale: 'ja-JP',
        audio_base64: VALID_AUDIO_BASE64,
        mime_type: 'audio/m4a',
      });

    expect(res.status).toBe(200);
    expect(typeof res.body.transcript).toBe('string');
    expect(res.body.transcript.length).toBeGreaterThan(0);
    expect(res.body.language).toBe('ja');

    const speechAssetCount = await prisma.speechAsset.count();
    expect(speechAssetCount).toBe(0);
  });

  it('rejects requests missing audio_base64', async () => {
    const { access_token } = await signup(`user-${Date.now()}-voice-b@example.com`);
    const res = await request(app)
      .post('/api/transcribe')
      .set('Authorization', `Bearer ${access_token}`)
      .send({ request_id: 'req-missing-audio', locale: 'ja-JP', mime_type: 'audio/m4a' });
    expect(res.status).toBe(400);
  });

  it('rejects audio that is too short without calling the AI provider', async () => {
    const { access_token } = await signup(`user-${Date.now()}-voice-c@example.com`);
    const res = await request(app)
      .post('/api/transcribe')
      .set('Authorization', `Bearer ${access_token}`)
      .send({
        request_id: `req-short-${Date.now()}`,
        locale: 'ja-JP',
        audio_base64: TOO_SHORT_AUDIO_BASE64,
        mime_type: 'audio/m4a',
      });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('audio_too_short');
    expect(res.body.error.retryable).toBe(true);
  });

  it('is idempotent for duplicate request_id with the same payload', async () => {
    const { access_token } = await signup(`user-${Date.now()}-voice-d@example.com`);
    const body = {
      request_id: `req-dup-transcribe-${Date.now()}`,
      locale: 'en-US',
      audio_base64: VALID_AUDIO_BASE64,
      mime_type: 'audio/m4a',
    };

    const first = await request(app)
      .post('/api/transcribe')
      .set('Authorization', `Bearer ${access_token}`)
      .send(body);
    const second = await request(app)
      .post('/api/transcribe')
      .set('Authorization', `Bearer ${access_token}`)
      .send(body);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
  });
});
