import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

// 위치 캐시 TTL (5분)
const LOCATION_TTL = 300;
// 달팽이 위치 캐시 TTL (25시간)
const SNAIL_POSITION_TTL = 90000;

export const cache = {
  setUserLocation: (userId: string, lat: number, lng: number) =>
    redis.setex(`user:location:${userId}`, LOCATION_TTL, `${lat},${lng}`),

  getUserLocation: async (
    userId: string
  ): Promise<{ lat: number; lng: number } | null> => {
    const val = await redis.get(`user:location:${userId}`);
    if (!val) return null;
    const [lat, lng] = val.split(',').map(Number);
    return { lat, lng };
  },

  setSnailPosition: (snailId: string, lat: number, lng: number) =>
    redis.setex(`snail:position:${snailId}`, SNAIL_POSITION_TTL, `${lat},${lng}`),

  getSnailPosition: async (
    snailId: string
  ): Promise<{ lat: number; lng: number } | null> => {
    const val = await redis.get(`snail:position:${snailId}`);
    if (!val) return null;
    const [lat, lng] = val.split(',').map(Number);
    return { lat, lng };
  },

  // 버프 일일 사용 횟수
  getBuffCount: (userId: string) =>
    redis.get(`buff:daily_count:${userId}`).then((v) => parseInt(v ?? '0')),

  incrBuffCount: async (userId: string) => {
    const key = `buff:daily_count:${userId}`;
    const now = new Date();
    const ttl = Math.floor(
      (new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()) / 1000
    );
    await redis.incr(key);
    await redis.expire(key, ttl);
  },
};
