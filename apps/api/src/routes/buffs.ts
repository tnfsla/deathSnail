import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { cache } from '../lib/redis';
import { haversineDistance } from '../lib/geo';
import { authenticate } from '../middleware/auth';
import { getIO } from '../lib/socket';

const BUFF_PROXIMITY_M = 100;      // 버프 가능 반경 100m
const MAX_BUFFS_PER_USER_PER_DAY = 5;
const MAX_BUFFS_PER_SNAIL_PER_DAY = 3;

export async function buffRoutes(app: FastifyInstance) {
  // POST /buffs - 달팽이에 버프 주기
  app.post<{
    Body: { targetSnailId: string };
  }>(
    '/',
    { preHandler: authenticate },
    async (request, reply) => {
      const { userId } = request.user;
      const { targetSnailId } = request.body;

      if (!targetSnailId) {
        return reply.status(400).send({ message: 'targetSnailId가 필요합니다.' });
      }

      // 버퍼의 현재 위치 확인 (Redis 캐시)
      const giverLocation = await cache.getUserLocation(userId);
      if (!giverLocation) {
        return reply.status(400).send({
          message: '위치 정보가 없습니다. 앱에서 위치 권한을 허용해주세요.',
        });
      }

      // 타겟 달팽이 조회
      const targetSnail = await prisma.snail.findUnique({
        where: { id: targetSnailId, isActive: true },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              lastLat: true,
              lastLng: true,
            },
          },
        },
      });

      if (!targetSnail) {
        return reply.status(404).send({ message: '달팽이를 찾을 수 없습니다.' });
      }

      if (targetSnail.ownerId === userId) {
        return reply.status(400).send({ message: '자기 달팽이에겐 버프를 줄 수 없습니다.' });
      }

      // 달팽이 주인의 현재 위치가 내 반경 100m 내인지 확인
      const targetOwnerLocation = await cache.getUserLocation(targetSnail.ownerId);
      if (!targetOwnerLocation) {
        return reply.status(400).send({
          message: '대상 플레이어의 위치를 찾을 수 없습니다.',
        });
      }

      const distanceM =
        haversineDistance(
          giverLocation.lat, giverLocation.lng,
          targetOwnerLocation.lat, targetOwnerLocation.lng
        ) * 1000;

      if (distanceM > BUFF_PROXIMITY_M) {
        return reply.status(400).send({
          message: `상대방이 ${BUFF_PROXIMITY_M}m 반경 밖에 있습니다. (현재 ${Math.round(distanceM)}m)`,
        });
      }

      // 일일 버프 한도 확인
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const [giverBuffCount, targetSnailBuffCount] = await Promise.all([
        prisma.buff.count({
          where: { giverUserId: userId, createdAt: { gte: today } },
        }),
        prisma.buff.count({
          where: { targetSnailId, createdAt: { gte: today } },
        }),
      ]);

      if (giverBuffCount >= MAX_BUFFS_PER_USER_PER_DAY) {
        return reply.status(429).send({ message: '오늘 버프 한도를 모두 사용했습니다.' });
      }

      if (targetSnailBuffCount >= MAX_BUFFS_PER_SNAIL_PER_DAY) {
        return reply.status(429).send({ message: '이 달팽이는 오늘 이미 최대 버프를 받았습니다.' });
      }

      // 버프 생성
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      const buff = await prisma.buff.create({
        data: {
          targetSnailId,
          giverUserId: userId,
          speedBonusKm: 1.0,
          buffType: 'standard',
          expiresAt: tomorrow,
          giverLat: giverLocation.lat,
          giverLng: giverLocation.lng,
        },
      });

      // Socket.io로 달팽이 주인에게 알림
      const io = getIO();
      io?.to(`user:${targetSnail.ownerId}`).emit('buff:received', {
        fromUsername: request.user.username,
        speedBonus: buff.speedBonusKm,
        buffType: buff.buffType,
      });

      return {
        message: `${targetSnail.owner.username}의 달팽이에게 +1km 버프를 줬습니다! 😈`,
        buff: {
          id: buff.id,
          speedBonusKm: buff.speedBonusKm,
          expiresAt: buff.expiresAt.toISOString(),
        },
      };
    }
  );

  // GET /buffs/mine - 내 달팽이가 받은 버프 목록
  app.get('/mine', { preHandler: authenticate }, async (request, reply) => {
    const snail = await prisma.snail.findUnique({
      where: { ownerId: request.user.userId },
      select: { id: true },
    });

    if (!snail) return [];

    const buffs = await prisma.buff.findMany({
      where: {
        targetSnailId: snail.id,
        isConsumed: false,
        expiresAt: { gte: new Date() },
      },
      include: {
        giver: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return buffs.map((b) => ({
      id: b.id,
      giverUsername: b.giver?.username ?? '알 수 없음',
      speedBonusKm: b.speedBonusKm,
      buffType: b.buffType,
      createdAt: b.createdAt.toISOString(),
      expiresAt: b.expiresAt.toISOString(),
    }));
  });
}
