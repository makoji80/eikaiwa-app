import 'dotenv/config';
import { loadEnv } from './env';
import { getPrismaClient } from './db/client';
import { createAiProvider } from './providers/ai';
import { createApp } from './app';

const env = loadEnv();
const prisma = getPrismaClient();
const aiProvider = createAiProvider(env);
const app = createApp(prisma, aiProvider, env);

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on port ${env.PORT} (AI_PROVIDER=${env.AI_PROVIDER})`);
});
