/**
 * POST /v1/register -- Anonymous token registration.
 *
 * Rate limited: max 5 per hour per IP to prevent abuse.
 * No authentication required (public endpoint).
 */

import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import { addToken } from '../lib/token-store.js';

interface RegisterBody {
  version?: string;
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: RegisterBody }>(
    '/v1/register',
    {
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 hour',
        },
      },
    },
    async (request, reply) => {
      const { version } = request.body ?? {};

      // Generate a 32-character token
      const token = nanoid(32);

      // Store token
      await addToken(token, version);

      request.log.info({ version }, 'New token registered');

      return reply.code(200).send({ token });
    },
  );
}
