/**
 * POST /v1/transcribe -- Forward audio to Groq Whisper for transcription.
 *
 * Requires Bearer token authentication.
 * Accepts multipart audio file, forwards to Groq API, returns transcript.
 */

import type { FastifyInstance } from 'fastify';
import { authenticate } from '../plugins/auth.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_TIMEOUT_MS = 30_000;

export async function transcribeRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/v1/transcribe',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      if (!GROQ_API_KEY) {
        return reply.code(503).send({ error: 'STT provider not configured' });
      }

      // Read multipart file
      const file = await request.file();
      if (!file) {
        return reply.code(400).send({ error: 'No audio file provided' });
      }

      const buffer = await file.toBuffer();

      // Build FormData for Groq API
      // Use ArrayBuffer to avoid Node Buffer / BlobPart type mismatch
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;

      const formData = new FormData();
      formData.append(
        'file',
        new Blob([arrayBuffer], { type: file.mimetype || 'audio/webm' }),
        file.filename || 'audio.webm',
      );
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('response_format', 'verbose_json');

      // Forward to Groq with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

      try {
        const groqResponse = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (groqResponse.status === 429) {
          const retryAfter = groqResponse.headers.get('retry-after');
          if (retryAfter) {
            reply.header('retry-after', retryAfter);
          }
          return reply.code(429).send({ error: 'STT provider rate limited' });
        }

        if (!groqResponse.ok) {
          const errorText = await groqResponse.text();
          request.log.error(
            { status: groqResponse.status, body: errorText },
            'Groq API error',
          );
          return reply.code(502).send({
            error: `STT provider error: ${groqResponse.status}`,
            details: errorText,
          });
        }

        const result = await groqResponse.json();
        return reply.code(200).send(result);
      } catch (err) {
        clearTimeout(timeout);

        if (err instanceof Error && err.name === 'AbortError') {
          return reply.code(504).send({ error: 'STT provider timeout' });
        }

        request.log.error({ err }, 'Transcription request failed');
        return reply.code(502).send({
          error: 'Failed to reach STT provider',
        });
      }
    },
  );
}
