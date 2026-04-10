import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { redis } from './lib/redis';
import { authRoutes } from './routes/auth';
import { snailRoutes } from './routes/snails';
import { buffRoutes } from './routes/buffs';
import { playerRoutes } from './routes/players';
import { achievementRoutes } from './routes/achievements';
import { leaderboardRoutes } from './routes/leaderboard';
import { adminRoutes } from './routes/admin';
import { setupSocketIO } from './lib/socket';
import { startDailyMovementJob } from './jobs/snail-movement';

const app = Fastify({ logger: true });
const httpServer = createServer(app.server as any);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
});

async function main() {
  // 플러그인 등록
  await app.register(cors, { origin: true });
  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  });
  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
  });

  // 라우트 등록
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(snailRoutes, { prefix: '/snails' });
  await app.register(buffRoutes, { prefix: '/buffs' });
  await app.register(playerRoutes, { prefix: '/players' });
  await app.register(achievementRoutes, { prefix: '/achievements' });
  await app.register(leaderboardRoutes, { prefix: '/leaderboard' });
  await app.register(adminRoutes, { prefix: '/admin' });

  // Socket.io 설정
  setupSocketIO(io);

  // BullMQ 크론 잡 시작
  startDailyMovementJob();

  // 서버 시작
  const port = parseInt(process.env.PORT ?? '3000');
  await app.ready();
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`🐌 Death Snail API running on port ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
