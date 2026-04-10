import { prisma } from '../lib/prisma';
import { emitToUser } from '../lib/socket';
import { ACHIEVEMENT_DEFINITIONS } from '../data/achievements';

export async function checkAchievements(userId: string) {
  const [user, snail, existingAchievements] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, deathCount: true },
    }),
    prisma.snail.findUnique({
      where: { ownerId: userId },
      select: { spawnedAt: true, totalDistanceKm: true },
    }),
    prisma.achievement.findMany({
      where: { userId },
      select: { achievementKey: true },
    }),
  ]);

  if (!user || !snail) return;

  const completedKeys = new Set(existingAchievements.map((a) => a.achievementKey));
  const survivalDays = Math.floor(
    (Date.now() - user.createdAt.getTime()) / 86400000
  );

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (completedKeys.has(def.key)) continue;

    const isComplete = def.check({ survivalDays, deathCount: user.deathCount });
    if (!isComplete) continue;

    // 업적 달성!
    await prisma.achievement.upsert({
      where: { userId_achievementKey: { userId, achievementKey: def.key } },
      create: {
        userId,
        achievementKey: def.key,
        isComplete: true,
        unlockedAt: new Date(),
      },
      update: { isComplete: true, unlockedAt: new Date() },
    });

    // 보상 적용 (칭호)
    if (def.rewardType === 'title' && def.rewardId) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentTitle: def.rewardId },
      });
    }

    // Socket 알림
    emitToUser(userId, 'achievement:unlocked', {
      achievementKey: def.key,
      reward: def.reward,
    });
  }
}
