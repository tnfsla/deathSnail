import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export async function userRoutes(app: FastifyInstance) {
  // PUT /users/push-token - Expo 푸시 토큰 저장
  app.put<{
    Body: { pushToken: string };
  }>(
    '/push-token',
    { preHandler: authenticate },
    async (request, reply) => {
      const { userId } = request.user;
      const { pushToken } = request.body;

      if (!pushToken || typeof pushToken !== 'string') {
        return reply.status(400).send({ message: '유효하지 않은 토큰입니다.' });
      }

      // Expo 푸시 토큰 형식 검증 (ExponentPushToken[...])
      if (!pushToken.startsWith('ExponentPushToken[')) {
        return reply.status(400).send({ message: '유효하지 않은 Expo 푸시 토큰 형식입니다.' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { expoPushToken: pushToken },
      });

      return reply.status(204).send();
    }
  );

  // GET /users/me - 내 정보
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        lastSeenAt: true,
        isDead: true,
        deathCount: true,
        longestSurvivalDays: true,
        currentTitle: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ message: '유저를 찾을 수 없습니다.' });
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      lastSeenAt: user.lastSeenAt?.toISOString() ?? null,
      isDead: user.isDead,
      deathCount: user.deathCount,
      longestSurvivalDays: user.longestSurvivalDays,
      currentTitle: user.currentTitle,
    };
  });
}
