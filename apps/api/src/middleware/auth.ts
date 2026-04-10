import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: '인증이 필요합니다.' });
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { userId: string; username: string };
    user: { userId: string; username: string };
  }
}
