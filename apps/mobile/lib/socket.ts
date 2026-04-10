import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/stores/gameStore';
import { NearbySnail, SocketEvents } from 'shared';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useGameStore.getState().token;
    socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(geohash: string) {
  const s = getSocket();
  if (!s.connected) s.connect();

  s.emit('subscribe:region', { geohash6: geohash });

  s.on('snail:nearby', (data: NearbySnail) => {
    useGameStore.getState().updateNearbySnail(data);
  });

  s.on('snail:left', ({ snailId }: { snailId: string }) => {
    useGameStore.getState().removeNearbySnail(snailId);
  });

  s.on('buff:received', ({ fromUsername, speedBonus }: SocketEvents['buff:received']) => {
    // 로컬 알림 표시는 expo-notifications로 처리
    console.log(`버프 수신! ${fromUsername}이 내 달팽이에게 +${speedBonus}km 버프`);
  });

  s.on('achievement:unlocked', ({ achievementKey }: SocketEvents['achievement:unlocked']) => {
    console.log(`업적 달성: ${achievementKey}`);
  });

  s.on('game:over', () => {
    console.log('게임 오버! 달팽이에게 잡혔습니다.');
  });

  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
