import { Queue, Worker } from 'bullmq';
import { redis, cache } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { toPostGISPoint, reverseGeocode, countryCodeToFlag, haversineDistance, bearingTo } from '../lib/geo';
import { moveToward } from 'shared';
import { emitToUser } from '../lib/socket';
import { checkAchievements } from './achievement-check';
import { getSnailPushMessage } from '../data/snail-dialogues';

const MOVEMENT_QUEUE_NAME = 'snail-daily-movement';
const BATCH_SIZE = 500;

const movementQueue = new Queue(MOVEMENT_QUEUE_NAME, { connection: redis });

export function startDailyMovementJob() {
  // jobId를 고정하면 서버 재시작마다 중복 잡이 쌓이지 않음
  // BullMQ는 동일 (name + repeat.pattern + jobId) 조합을 dedup
  movementQueue.add(
    'daily-tick',
    {},
    {
      jobId: 'snail-daily-movement-singleton',
      repeat: { pattern: '0 0 * * *' }, // 매일 00:00 UTC
    }
  );

  const worker = new Worker(
    MOVEMENT_QUEUE_NAME,
    async () => {
      console.log('[SnailMovement] 일일 이동 시작...');
      await runDailyMovement();
    },
    { connection: redis, concurrency: 1 }
  );

  worker.on('completed', () => console.log('[SnailMovement] 완료'));
  worker.on('failed', (_, err) => console.error('[SnailMovement] 실패:', err));

  console.log('[SnailMovement] 크론 잡 등록됨 (매일 00:00 UTC)');
}

export async function runDailyMovement(): Promise<{
  processed: number;
  gameOvers: number;
}> {
  let processed = 0;
  let gameOvers = 0;
  let cursor = 0;

  while (true) {
    const snails = await prisma.snail.findMany({
      where: { isActive: true },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            lastLat: true,
            lastLng: true,
            expoPushToken: true,
            currentTitle: true,
          },
        },
        buffs: {
          where: {
            isConsumed: false,
            expiresAt: { gte: new Date() },
          },
          select: { id: true, speedBonusKm: true },
        },
      },
      skip: cursor,
      take: BATCH_SIZE,
    });

    if (snails.length === 0) break;

    await Promise.all(
      snails.map(async (snail) => {
        try {
          const owner = snail.owner;

          // 타겟 위치: Redis 캐시 우선, 없으면 DB
          let targetLat = owner.lastLat;
          let targetLng = owner.lastLng;
          const cached = await cache.getUserLocation(owner.id);
          if (cached) {
            targetLat = cached.lat;
            targetLng = cached.lng;
          }

          // 위치 정보 없으면 이동 건너뜀
          if (targetLat == null || targetLng == null) return;

          // 오늘의 총 속도 (기본 + 버프 합산)
          const buffBonus = snail.buffs.reduce((sum, b) => sum + b.speedBonusKm, 0);
          const todaySpeedKm = snail.baseSpeedKmDay + buffBonus;

          // 이동 전 방위각 (방향 전환 감지용)
          const prevBearing = bearingTo(
            snail.currentLat, snail.currentLng,
            snail.targetLat || targetLat, snail.targetLng || targetLng
          );

          // 이동 계산
          const result = moveToward(
            snail.currentLat, snail.currentLng,
            targetLat, targetLng,
            todaySpeedKm
          );

          // 새 방위각 (방향 전환 여부)
          const newBearing = bearingTo(
            snail.currentLat, snail.currentLng,
            targetLat, targetLng
          );
          const bearingDiff = Math.abs(newBearing - prevBearing);
          const directionChanged = bearingDiff > 90 && bearingDiff < 270;

          // 역지오코딩 (현재 국가/지역)
          const geoInfo = await reverseGeocode(result.lat, result.lng);

          // 국가 변경 여부
          const countryChanged =
            geoInfo?.countryCode &&
            geoInfo.countryCode !== snail.currentCountryCode;

          // 푸시 메시지 생성 (Pre-generated DB에서 조합)
          const distanceKm = haversineDistance(
            result.lat, result.lng,
            targetLat, targetLng
          );
          const dayNumber = Math.floor(
            (Date.now() - snail.spawnedAt.getTime()) / 86400000
          );

          const pushMessage = getSnailPushMessage({
            situation: directionChanged
              ? 'direction_changed'
              : countryChanged
              ? 'country_crossed'
              : 'daily_moved',
            countryCode: geoInfo?.countryCode ?? null,
            countryName: geoInfo?.country ?? null,
            distanceKm,
            dayNumber,
            speedBonusKm: buffBonus,
          });

          // DB 업데이트 (트랜잭션)
          await prisma.$transaction([
            prisma.snail.update({
              where: { id: snail.id },
              data: {
                // 어제의 시작 위치를 오늘의 시작 위치로
                dayStartLat: snail.currentLat,
                dayStartLng: snail.currentLng,
                // 새 현재 위치
                currentLat: result.lat,
                currentLng: result.lng,
                currentLocation: toPostGISPoint(result.lng, result.lat),
                targetLat,
                targetLng,
                lastMovedAt: new Date(),
                totalDistanceKm: { increment: todaySpeedKm },
                // 지역 정보
                currentCountry: geoInfo?.country ?? snail.currentCountry,
                currentCountryCode: geoInfo?.countryCode ?? snail.currentCountryCode,
                currentRegion: geoInfo?.region ?? snail.currentRegion,
                lastPushMessage: pushMessage,
              },
            }),
            // 버프 소모 처리
            prisma.buff.updateMany({
              where: {
                id: { in: snail.buffs.map((b) => b.id) },
              },
              data: { isConsumed: true, appliedAt: new Date() },
            }),
            // 이동 히스토리 기록
            prisma.snailPosition.create({
              data: {
                snailId: snail.id,
                lat: result.lat,
                lng: result.lng,
                location: toPostGISPoint(result.lng, result.lat),
                dayNumber,
                description: pushMessage,
              },
            }),
          ]);

          // Redis 캐시 갱신
          await cache.setSnailPosition(snail.id, result.lat, result.lng);

          // 게임오버 처리
          if (result.reached) {
            await handleGameOver(snail.id, owner.id, owner.username);
            gameOvers++;
          } else {
            // 푸시 알림 발송
            if (owner.expoPushToken && pushMessage) {
              await sendPushNotification(owner.expoPushToken, '🐌 달팽이 소식', pushMessage);
            }
          }

          // 업적 체크 (비동기)
          checkAchievements(owner.id).catch(console.error);

          processed++;
        } catch (err) {
          console.error(`[SnailMovement] snail ${snail.id} 처리 실패:`, err);
        }
      })
    );

    cursor += BATCH_SIZE;
  }

  console.log(`[SnailMovement] 처리 완료: ${processed}마리, 게임오버: ${gameOvers}건`);
  return { processed, gameOvers };
}

async function handleGameOver(snailId: string, ownerId: string, ownerUsername: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: ownerId },
      data: { isDead: true, deathCount: { increment: 1 } },
    }),
    prisma.snail.update({
      where: { id: snailId },
      data: { isActive: false },
    }),
  ]);

  emitToUser(ownerId, 'game:over', { snailId });
  console.log(`[GameOver] ${ownerUsername} 달팽이에게 잡힘!`);
}

async function sendPushNotification(
  token: string,
  title: string,
  body: string
) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: token,
        title,
        body,
        sound: 'default',
        data: { type: 'snail_moved' },
      }),
    });
  } catch (err) {
    console.error('[Push] 알림 전송 실패:', err);
  }
}
