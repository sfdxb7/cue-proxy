/**
 * GET /health -- Health check endpoint.
 *
 * No authentication required. Returns server status and uptime.
 */

import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    return reply.code(200).send({
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime(),
    });
  });
}
