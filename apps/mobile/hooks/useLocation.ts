import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { api } from '@/lib/api';
import { useGameStore } from '@/stores/gameStore';

// 전역 위치 상태 (여러 훅에서 공유)
let globalLocation: Location.LocationObject | null = null;
const listeners = new Set<(loc: Location.LocationObject) => void>();

function notifyListeners(loc: Location.LocationObject) {
  globalLocation = loc;
  listeners.forEach((fn) => fn(loc));
}

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    globalLocation
  );
  const { token } = useGameStore();
  const lastSentRef = useRef<number>(0);

  // 서버에 위치 업데이트 (rate-limit: 30초 1회)
  const sendLocation = useCallback(
    async (loc: Location.LocationObject) => {
      if (!token) return;
      const now = Date.now();
      if (now - lastSentRef.current < 30_000) return; // 30초 내 재전송 방지
      lastSentRef.current = now;
      await api.updateLocation(loc.coords.latitude, loc.coords.longitude).catch(() => {});
    },
    [token]
  );

  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    notifyListeners(loc);
    sendLocation(loc);
  }, [sendLocation]);

  // 리스너 등록
  useEffect(() => {
    const handler = (loc: Location.LocationObject) => {
      setLocation(loc);
      sendLocation(loc);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, [sendLocation]);

  // 최초 위치 획득 + 500m 이동 감지 구독
  useEffect(() => {
    if (!token) return;

    let sub: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // 아직 위치 없으면 즉시 1회 획득
      if (!globalLocation) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        notifyListeners(loc);
        sendLocation(loc);
      }

      // 500m 이동 시 자동 업데이트
      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 500,
          timeInterval: 60_000,
        },
        (loc) => {
          notifyListeners(loc);
          // sendLocation은 내부 rate-limit으로 자체 처리
        }
      );
    })();

    return () => {
      sub?.remove();
    };
  }, [token, sendLocation]);

  return { location, requestLocation };
}
