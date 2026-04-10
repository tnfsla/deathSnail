import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { cache } from '../lib/redis';
import { haversineDistance, toPostGISPoint, countryCodeToFlag } from '../lib/geo';
import { moveToward } from 'shared';
import { authenticate } from '../middleware/auth';

export async function snailRoutes(app: FastifyInstance) {
  // GET /snails/mine - 내 달팽이 정보 + 보간 위치
  app.get('/mine', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.user;

    const snail = await prisma.snail.findUnique({
      where: { ownerId: userId },
      include: {
        positions: {
          orderBy: { dayNumber: 'asc' },
          take: 100, // 최근 100일 궤적
        },
        owner: {
          select: {
            lastLat: true,
            lastLng: true,
          },
        },
      },
    });

    if (!snail) {
      return reply.status(404).send({ message: '달팽이를 찾을 수 없습니다.' });
    }

    const distanceKm = snail.owner.lastLat != null
      ? haversineDistance(
          snail.currentLat, snail.currentLng,
          snail.owner.lastLat, snail.owner.lastLng
        )
      : 0;

    // 현재 날짜 인덱스 (spawn 후 몇 일차)
    const dayNumber = Math.floor(
      (Date.now() - snail.spawnedAt.getTime()) / 86400000
    );

    // 버프 합산
    const activeBuffs = await prisma.buff.aggregate({
      where: {
        targetSnailId: snail.id,
        isConsumed: false,
        expiresAt: { gte: new Date() },
      },
      _sum: { speedBonusKm: true },
    });

    const todaySpeedKm = snail.baseSpeedKmDay + (activeBuffs._sum.speedBonusKm ?? 0);

    return {
      id: snail.id,
      ownerId: snail.ownerId,
      spawnLat: snail.spawnLat,
      spawnLng: snail.spawnLng,
      spawnedAt: snail.spawnedAt.toISOString(),
      currentLat: snail.currentLat,
      currentLng: snail.currentLng,
      dayStartLat: snail.dayStartLat,
      dayStartLng: snail.dayStartLng,
      targetLat: snail.targetLat,
      targetLng: snail.targetLng,
      todaySpeedKm,
      distanceKm,
      totalDistanceKm: snail.totalDistanceKm,
      baseSpeedKmDay: snail.baseSpeedKmDay,
      skinId: snail.skinId,
      name: snail.name,
      currentCountry: snail.currentCountry,
      currentCountryFlag: snail.currentCountryCode
        ? countryCodeToFlag(snail.currentCountryCode)
        : null,
      currentRegion: snail.currentRegion,
      landmarkComment: snail.lastPushMessage,
      positionHistory: snail.positions.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        dayNumber: p.dayNumber,
      })),
      travelLog: snail.positions
        .filter((p) => p.description)
        .map((p) => ({
          dayNumber: p.dayNumber,
          description: p.description!,
          countryCode: null,
        })),
    };
  });

  // GET /snails/nearby - 주변 달팽이 조회 (PostGIS)
  app.get<{
    Querystring: { lat: string; lng: string; radius?: string };
  }>('/nearby', { preHandler: authenticate }, async (request, reply) => {
    const lat = parseFloat(request.query.lat);
    const lng = parseFloat(request.query.lng);
    const radiusM = parseInt(request.query.radius ?? '5000');

    if (isNaN(lat) || isNaN(lng)) {
      return reply.status(400).send({ message: '유효하지 않은 좌표입니다.' });
    }

    // PostGIS 반경 쿼리
    const snails = await prisma.$queryRaw<
      Array<{
        id: string;
        owner_id: string;
        username: string;
        current_lat: number;
        current_lng: number;
        distance_m: number;
      }>
    >`
      SELECT
        s.id,
        s.owner_id,
        u.username,
        s.current_lat,
        s.current_lng,
        ST_Distance(
          s.current_location::geography,
          ST_MakePoint(${lng}, ${lat})::geography
        ) AS distance_m
      FROM snails s
      JOIN users u ON u.id = s.owner_id
      WHERE s.is_active = true
        AND s.owner_id != ${request.user.userId}
        AND ST_DWithin(
          s.current_location::geography,
          ST_MakePoint(${lng}, ${lat})::geography,
          ${radiusM}
        )
      ORDER BY distance_m ASC
      LIMIT 50
    `;

    // 버프 이미 줬는지 확인
    const { userId } = request.user;
    const alreadyBuffedToday = await prisma.buff.findMany({
      where: {
        giverUserId: userId,
        createdAt: { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) },
      },
      select: { targetSnailId: true },
    });
    const buffedSnailIds = new Set(alreadyBuffedToday.map((b) => b.targetSnailId));

    return snails.map((s) => ({
      snailId: s.id,
      ownerId: s.owner_id,
      ownerName: s.username,
      currentLat: s.current_lat,
      currentLng: s.current_lng,
      distanceM: Math.round(s.distance_m),
      canBuff: !buffedSnailIds.has(s.id),
    }));
  });

  // GET /snails/:id - 특정 달팽이 정보
  app.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const snail = await prisma.snail.findUnique({
        where: { id: request.params.id },
        include: {
          owner: {
            select: { username: true, longestSurvivalDays: true, isDead: true },
          },
        },
      });

      if (!snail) {
        return reply.status(404).send({ message: '달팽이를 찾을 수 없습니다.' });
      }

      const survivalDays = Math.floor(
        (Date.now() - snail.spawnedAt.getTime()) / 86400000
      );

      return {
        id: snail.id,
        ownerName: snail.owner.username,
        survivalDays,
        isDead: snail.owner.isDead,
        currentCountry: snail.currentCountry,
        currentCountryFlag: snail.currentCountryCode
          ? countryCodeToFlag(snail.currentCountryCode)
          : null,
      };
    }
  );
}
