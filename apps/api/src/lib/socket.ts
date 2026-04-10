import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer;

export function setupSocketIO(server: SocketIOServer) {
  io = server;

  io.on('connection', (socket: Socket) => {
    const userId = socket.handshake.auth?.token; // JWT 검증은 미들웨어에서 처리

    socket.on('subscribe:region', ({ geohash6 }: { geohash6: string }) => {
      // 기존 geohash 룸에서 나가기
      socket.rooms.forEach((room) => {
        if (room.startsWith('geo:')) socket.leave(room);
      });
      // 새 geohash 룸과 인접 8개 셀에 입장
      const neighbors = getGeohashNeighbors(geohash6);
      [geohash6, ...neighbors].forEach((cell) => socket.join(`geo:${cell}`));
    });

    socket.on('ping:location', ({ lat, lng }: { lat: number; lng: number }) => {
      // 경량 위치 업데이트 (rate-limited on client side)
    });

    socket.on('disconnect', () => {});
  });
}

export function getIO(): SocketIOServer {
  return io;
}

export function emitToRegion(geohash6: string, event: string, data: unknown) {
  io?.to(`geo:${geohash6}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: unknown) {
  io?.to(`user:${userId}`).emit(event, data);
}

/**
 * Geohash 인접 셀 계산 (8방향)
 * 단순화 버전 - 프로덕션에서는 ngeohash 라이브러리 사용 권장
 */
function getGeohashNeighbors(geohash: string): string[] {
  // 단순화: 실제 구현은 ngeohash 패키지 사용
  // 여기서는 기본 구조만 반환
  return [];
}
