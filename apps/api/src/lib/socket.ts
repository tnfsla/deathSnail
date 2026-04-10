import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

interface JWTPayload {
  userId: string;
  username: string;
}

export function setupSocketIO(server: SocketIOServer) {
  io = server;

  // JWT 인증 미들웨어
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('인증 토큰이 없습니다.'));
    }
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
      ) as JWTPayload;
      (socket as any).userId = payload.userId;
      (socket as any).username = payload.username;
      next();
    } catch {
      next(new Error('유효하지 않은 토큰입니다.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;

    // 개인 룸 자동 가입 (game:over, buff:received, achievement:unlocked 수신용)
    socket.join(`user:${userId}`);

    socket.on('subscribe:region', ({ geohash6 }: { geohash6: string }) => {
      if (typeof geohash6 !== 'string' || geohash6.length !== 6) return;

      // 기존 geohash 룸에서 나가기
      socket.rooms.forEach((room) => {
        if (room.startsWith('geo:')) socket.leave(room);
      });

      // 새 geohash 룸 + 인접 셀 입장
      const cells = [geohash6, ...getGeohashNeighbors(geohash6)];
      cells.forEach((cell) => socket.join(`geo:${cell}`));
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
 * Geohash 인접 셀 8방향 계산
 * 프로덕션에서는 ngeohash 패키지 사용 권장
 * 여기서는 직접 구현 (의존성 최소화)
 */
function getGeohashNeighbors(geohash: string): string[] {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

  function decode(hash: string): { lat: [number, number]; lng: [number, number] } {
    let isEven = true;
    let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;

    for (const char of hash) {
      const bits = BASE32.indexOf(char);
      for (let i = 4; i >= 0; i--) {
        const bit = (bits >> i) & 1;
        if (isEven) {
          const mid = (lngMin + lngMax) / 2;
          bit ? (lngMin = mid) : (lngMax = mid);
        } else {
          const mid = (latMin + latMax) / 2;
          bit ? (latMin = mid) : (latMax = mid);
        }
        isEven = !isEven;
      }
    }
    return { lat: [latMin, latMax], lng: [lngMin, lngMax] };
  }

  function encode(lat: number, lng: number, precision: number): string {
    let isEven = true;
    let latMin = -90, latMax = 90, lngMin = -180, lngMax = 180;
    let hash = '', bits = 0, chr = 0;

    while (hash.length < precision) {
      if (isEven) {
        const mid = (lngMin + lngMax) / 2;
        lng >= mid ? (chr = (chr << 1) | 1, lngMin = mid) : (chr = chr << 1, lngMax = mid);
      } else {
        const mid = (latMin + latMax) / 2;
        lat >= mid ? (chr = (chr << 1) | 1, latMin = mid) : (chr = chr << 1, latMax = mid);
      }
      isEven = !isEven;
      if (++bits === 5) { hash += BASE32[chr]; bits = 0; chr = 0; }
    }
    return hash;
  }

  const { lat, lng } = decode(geohash);
  const latCenter = (lat[0] + lat[1]) / 2;
  const lngCenter = (lng[0] + lng[1]) / 2;
  const latDelta = lat[1] - lat[0];
  const lngDelta = lng[1] - lng[0];
  const precision = geohash.length;

  const offsets = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
  ] as const;

  const neighbors: string[] = [];
  for (const [dLat, dLng] of offsets) {
    const nLat = latCenter + dLat * latDelta;
    const nLng = lngCenter + dLng * lngDelta;
    if (nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180) {
      const neighbor = encode(nLat, nLng, precision);
      if (neighbor !== geohash) neighbors.push(neighbor);
    }
  }
  return neighbors;
}
