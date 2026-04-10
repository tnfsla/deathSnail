import { FastifyInstance } from 'fastify';
import { runDailyMovement } from '../jobs/snail-movement';

export async function adminRoutes(app: FastifyInstance) {
  // POST /admin/trigger-movement - 개발용 수동 이동 트리거
  // TODO: 프로덕션에서는 내부 IP 또는 시크릿 키로 보호
  app.post('/trigger-movement', async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      const secret = request.headers['x-admin-secret'];
      if (secret !== process.env.ADMIN_SECRET) {
        return reply.status(403).send({ message: '접근 거부' });
      }
    }

    const startTime = Date.now();
    const result = await runDailyMovement();
    const elapsed = Date.now() - startTime;

    return {
      message: '이동 완료',
      processed: result.processed,
      gameOvers: result.gameOvers,
      elapsedMs: elapsed,
    };
  });

  // POST /admin/test-push - 푸시 알림 테스트
  app.post<{ Body: { userId: string } }>(
    '/test-push',
    async (request, reply) => {
      if (process.env.NODE_ENV === 'production') {
        return reply.status(403).send({ message: '개발 전용' });
      }
      // 구현 예정
      return { message: '푸시 테스트 전송됨' };
    }
  );
}
