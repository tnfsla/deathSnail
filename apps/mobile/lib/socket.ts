import { io, Socket } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import { useGameStore } from '@/stores/gameStore';
import { NearbySnail, SocketEvents } from 'shared';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;
let currentGeohash: string | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useGameStore.getState().token;
    socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function connectSocket(geohash6: string) {
  const s = getSocket();

  if (!s.connected) {
    s.connect();

    // 연결 성공 시 이벤트 등록 (중복 방지: off → on)
    s.off('snail:nearby');
    s.off('snail:left');
    s.off('buff:received');
    s.off('achievement:unlocked');
    s.off('game:over');

    s.on('snail:nearby', (data: NearbySnail) => {
      useGameStore.getState().updateNearbySnail(data);
    });

    s.on('snail:left', ({ snailId }: { snailId: string }) => {
      useGameStore.getState().removeNearbySnail(snailId);
    });

    s.on('buff:received', ({ fromUsername, speedBonus }: SocketEvents['buff:received']) => {
      // 인앱 로컬 알림으로 표시
      Notifications.scheduleNotificationAsync({
        content: {
          title: '🐌 달팽이가 빨라졌어요!',
          body: `${fromUsername}이 내 달팽이에게 +${speedBonus}km 버프를 줬습니다 😈`,
          data: { type: 'buff_received' },
        },
        trigger: null, // 즉시
      }).catch(() => {});
    });

    s.on('achievement:unlocked', ({ achievementKey, reward }: SocketEvents['achievement:unlocked']) => {
      Notifications.scheduleNotificationAsync({
        content: {
          title: '🏆 업적 달성!',
          body: reward ? `보상: ${reward}` : `업적을 달성했습니다: ${achievementKey}`,
          data: { type: 'achievement', achievementKey },
        },
        trigger: null,
      }).catch(() => {});
    });

    s.on('game:over', () => {
      useGameStore.getState().setDead(true);
    });
  }

  // 지역 구독 (geohash 변경 시 재구독)
  if (currentGeohash !== geohash6) {
    s.emit('subscribe:region', { geohash6 });
    currentGeohash = geohash6;
  }

  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.off('snail:nearby');
    socket.off('snail:left');
    socket.off('buff:received');
    socket.off('achievement:unlocked');
    socket.off('game:over');
    socket.disconnect();
  }
  socket = null;
  currentGeohash = null;
}
