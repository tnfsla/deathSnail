import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { ACHIEVEMENT_DEFINITIONS } from '../data/achievements';

export async function achievementRoutes(app: FastifyInstance) {
  // GET /achievements/mine - 내 업적 (진행도 포함)
  app.get('/mine', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user;

    const userAchievements = await prisma.achievement.findMany({
      where: { userId },
    });

    const achievementMap = new Map(
      userAchievements.map((a) => [a.achievementKey, a])
    );

    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      const userAch = achievementMap.get(def.key);
      return {
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        reward: def.reward,
        category: def.category,
        isComplete: userAch?.isComplete ?? false,
        unlockedAt: userAch?.unlockedAt?.toISOString() ?? null,
        progress: userAch?.progress
          ? (userAch.progress as { value: number }).value ?? null
          : null,
      };
    });
  });
}
