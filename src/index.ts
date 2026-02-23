/**
 * Cue STT Proxy Server
 *
 * Fastify-based proxy that hides STT API keys from the extension.
 * Extensions register anonymously and receive tokens for authenticated access.
 * Audio is forwarded to Groq Whisper and transcription results returned.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes/register.js';
import { transcribeRoutes } from './routes/transcribe.js';
import { healthRoutes } from './routes/health.js';
import { ensureDataDir } from './lib/token-store.js';

const PORT = parseInt(process.env.PORT || '3456', 10);

async function main(): Promise<void> {
  // Ensure data directory exists for token storage
  await ensureDataDir();

  const app = Fastify({ logger: true });

  // CORS: allow all origins (including chrome-extension://)
  await app.register(cors, { origin: true });

  // Rate limiting: 100 requests per minute globally
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Multipart for audio file uploads (10MB max)
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // Register route handlers
  await app.register(registerRoutes);
  await app.register(transcribeRoutes);
  await app.register(healthRoutes);

  // Start server
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Cue proxy listening on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
