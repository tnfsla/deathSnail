import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { api } from '@/lib/api';
import { useGameStore } from '@/stores/gameStore';

// ─── 전역 싱글턴 ───────────────────────────────────────────
let globalLocation: Location.LocationObject | null = null;
const locationListeners = new Set<(loc: Location.LocationObject) => void>();
let watchSubscription: Location.LocationSubscription | null = null;
let watchStarted = false;
let lastSentAt = 0;

function notifyListeners(loc: Location.LocationObject) {
  globalLocation = loc;
  locationListeners.forEach((fn) => fn(loc));
}

async function sendLocationToServer(loc: Location.LocationObject) {
  const token = useGameStore.getState().token;
  if (!token) return;
  const now = Date.now();
  if (now - lastSentAt < 30_000) return; // 30초 rate-limit
  lastSentAt = now;
  await api.updateLocation(loc.coords.latitude, loc.coords.longitude).catch(() => {});
}

/**
 * GPS 구독을 전역에서 단 1번만 시작
 * 여러 컴포넌트에서 useLocation()을 호출해도 watchPositionAsync는 1회
 */
async function startWatchIfNeeded() {
  if (watchStarted) return;
  watchStarted = true;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    watchStarted = false;
    return;
  }

  // 최초 즉시 위치 획득
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  notifyListeners(loc);
  sendLocationToServer(loc);

  // 500m 이동 감지 구독 (단 1개)
  watchSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 500,
      timeInterval: 60_000,
    },
    (loc) => {
      notifyListeners(loc);
      sendLocationToServer(loc);
    }
  );
}

function stopWatch() {
  watchSubscription?.remove();
  watchSubscription = null;
  watchStarted = false;
  globalLocation = null;
  lastSentAt = 0;
}
// ──────────────────────────────────────────────────────────

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    globalLocation
  );
  const { token } = useGameStore();

  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    notifyListeners(loc);
    sendLocationToServer(loc);
  }, []);

  // 이 컴포넌트/훅의 로컬 상태를 전역 리스너에 연결
  useEffect(() => {
    const handler = (loc: Location.LocationObject) => setLocation(loc);
    locationListeners.add(handler);
    return () => { locationListeners.delete(handler); };
  }, []);

  // 토큰이 생기면 GPS 시작 (전역 1회), 없어지면 정지
  useEffect(() => {
    if (token) {
      startWatchIfNeeded();
    } else {
      stopWatch();
      setLocation(null);
    }
  }, [token]);

  return { location, requestLocation };
}
