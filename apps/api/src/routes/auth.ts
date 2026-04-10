import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma';
import { cache } from '../lib/redis';
import { toPostGISPoint } from '../lib/geo';
import { randomLandCoordinate } from 'shared';
import landCoordinates from '../data/land-coordinates.json';

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  // 최초 등록 + 달팽이 생성
  app.post<{
    Body: { username: string };
  }>(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string', minLength: 2, maxLength: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const { username } = request.body;

      // 사용자 이름 중복 확인
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return reply.status(409).send({ message: '이미 사용 중인 이름입니다.' });
      }

      // 랜덤 육지 좌표 생성
      const spawnCoord = randomLandCoordinate(
        landCoordinates as Array<[number, number]>
      );

      // 트랜잭션으로 유저 + 달팽이 동시 생성
      const { user, snail } = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            username,
            displayName: username,
          },
        });

        const snail = await tx.snail.create({
          data: {
            ownerId: user.id,
            spawnLat: spawnCoord.lat,
            spawnLng: spawnCoord.lng,
            spawnLocation: toPostGISPoint(spawnCoord.lng, spawnCoord.lat),
            currentLat: spawnCoord.lat,
            currentLng: spawnCoord.lng,
            currentLocation: toPostGISPoint(spawnCoord.lng, spawnCoord.lat),
            dayStartLat: spawnCoord.lat,
            dayStartLng: spawnCoord.lng,
            targetLat: 0, // 첫 위치 공유 시 갱신됨
            targetLng: 0,
          },
        });

        // 초기 위치 히스토리 기록
        await tx.snailPosition.create({
          data: {
            snailId: snail.id,
            lat: spawnCoord.lat,
            lng: spawnCoord.lng,
            location: toPostGISPoint(spawnCoord.lng, spawnCoord.lat),
            dayNumber: 0,
            description: `전 세계 어딘가에서 생성되었습니다.`,
          },
        });

        return { user, snail };
      });

      // JWT 발급
      const token = await reply.jwtSign(
        { userId: user.id, username: user.username },
        { expiresIn: '30d' }
      );

      return reply.status(201).send({
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt.toISOString(),
          lastSeenAt: null,
          isDead: false,
          deathCount: 0,
          longestSurvivalDays: 0,
          currentTitle: null,
        },
        snail: {
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
          todaySpeedKm: snail.baseSpeedKmDay,
          distanceKm: 0,
          totalDistanceKm: 0,
          baseSpeedKmDay: snail.baseSpeedKmDay,
          skinId: snail.skinId,
          name: snail.name,
          currentCountry: null,
          currentCountryFlag: null,
          currentRegion: null,
          landmarkComment: null,
          positionHistory: [],
          travelLog: [],
        },
      });
    }
  );
}
