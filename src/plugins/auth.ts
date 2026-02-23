/**
 * Bearer token authentication preHandler for Fastify.
 *
 * Extracts the token from the Authorization header and validates
 * it against the token store.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { hasToken, touchToken } from '../lib/token-store.js';

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!token) {
    reply.code(401).send({ error: 'Empty token' });
    return;
  }

  const valid = await hasToken(token);
  if (!valid) {
    reply.code(401).send({ error: 'Invalid token' });
    return;
  }

  // Update lastUsed timestamp (fire-and-forget)
  touchToken(token).catch(() => {});
}
