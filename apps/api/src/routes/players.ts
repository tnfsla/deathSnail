import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { cache } from '../lib/redis';
import { toPostGISPoint } from '../lib/geo';
import { authenticate } from '../middleware/auth';

export async function playerRoutes(app: FastifyInstance) {
  // POST /players/location - 내 위치 업데이트 (rate-limited: 30초 1회)
  app.post<{
    Body: { lat: number; lng: number };
  }>(
    '/location',
    {
      preHandler: authenticate,
      config: { rateLimit: { max: 2, timeWindow: '30 seconds' } },
    },
    async (request, reply) => {
      const { userId } = request.user;
      const { lat, lng } = request.body;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return reply.status(400).send({ message: '유효하지 않은 좌표입니다.' });
      }

      // Redis 캐시 업데이트 (5분 TTL)
      await cache.setUserLocation(userId, lat, lng);

      // DB 업데이트 (last_lat/lng)
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLat: lat,
          lastLng: lng,
          lastLocation: toPostGISPoint(lng, lat),
          lastSeenAt: new Date(),
        },
      });

      // 달팽이의 타겟 위치도 업데이트
      await prisma.snail.updateMany({
        where: { ownerId: userId, isActive: true },
        data: { targetLat: lat, targetLng: lng },
      });

      // 이 위치 주변의 플레이어 수 (주변에 얼마나 있는지 피드백)
      const nearbyCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) FROM users
        WHERE id != ${userId}
          AND last_location IS NOT NULL
          AND ST_DWithin(
            last_location::geography,
            ST_MakePoint(${lng}, ${lat})::geography,
            1000
          )
      `;

      return { nearbyCount: Number(nearbyCount[0]?.count ?? 0) };
    }
  );

  // GET /players/nearby - 내 반경 내 플레이어 (버프 대상)
  app.get<{
    Querystring: { lat: string; lng: string; radius?: string };
  }>('/nearby', { preHandler: authenticate }, async (request, reply) => {
    const lat = parseFloat(request.query.lat);
    const lng = parseFloat(request.query.lng);
    const radiusM = parseInt(request.query.radius ?? '100');

    if (isNaN(lat) || isNaN(lng)) {
      return reply.status(400).send({ message: '유효하지 않은 좌표입니다.' });
    }

    const players = await prisma.$queryRaw<
      Array<{
        id: string;
        username: string;
        snail_id: string;
        snail_current_lat: number;
        snail_current_lng: number;
        distance_m: number;
      }>
    >`
      SELECT
        u.id,
        u.username,
        s.id as snail_id,
        s.current_lat as snail_current_lat,
        s.current_lng as snail_current_lng,
        ST_Distance(
          u.last_location::geography,
          ST_MakePoint(${lng}, ${lat})::geography
        ) AS distance_m
      FROM users u
      JOIN snails s ON s.owner_id = u.id
      WHERE u.id != ${request.user.userId}
        AND u.last_location IS NOT NULL
        AND s.is_active = true
        AND ST_DWithin(
          u.last_location::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusM}
        )
      ORDER BY distance_m ASC
      LIMIT 20
    `;

    // 이미 버프 준 달팽이 확인
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const alreadyBuffed = await prisma.buff.findMany({
      where: {
        giverUserId: request.user.userId,
        createdAt: { gte: today },
      },
      select: { targetSnailId: true },
    });
    const buffedSet = new Set(alreadyBuffed.map((b) => b.targetSnailId));

    return players.map((p) => ({
      snailId: p.snail_id,
      ownerId: p.id,
      ownerName: p.username,
      currentLat: p.snail_current_lat,
      currentLng: p.snail_current_lng,
      distanceM: Math.round(p.distance_m),
      canBuff: !buffedSet.has(p.snail_id),
    }));
  });
}
