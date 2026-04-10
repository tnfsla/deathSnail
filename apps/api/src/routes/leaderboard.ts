import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { haversineDistance } from '../lib/geo';

export async function leaderboardRoutes(app: FastifyInstance) {
  // GET /leaderboard/survivors - 최장 생존자 순위
  app.get('/survivors', { preHandler: authenticate }, async (request, reply) => {
    const users = await prisma.user.findMany({
      where: { isDead: false },
      select: {
        id: true,
        username: true,
        currentTitle: true,
        createdAt: true,
        snail: {
          select: {
            currentLat: true,
            currentLng: true,
            owner: {
              select: { lastLat: true, lastLng: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return users
      .map((u, i) => {
        const survivalDays = Math.floor(
          (Date.now() - u.createdAt.getTime()) / 86400000
        );
        const distanceKm =
          u.snail && u.snail.owner.lastLat != null
            ? haversineDistance(
                u.snail.currentLat, u.snail.currentLng,
                u.snail.owner.lastLat, u.snail.owner.lastLng
              )
            : 0;

        return {
          userId: u.id,
          username: u.username,
          title: u.currentTitle,
          survivalDays,
          distanceKm,
          rank: i + 1,
        };
      })
      .sort((a, b) => b.survivalDays - a.survivalDays);
  });
}
