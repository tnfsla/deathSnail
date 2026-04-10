import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useGameStore } from '@/stores/gameStore';
import { api } from '@/lib/api';

const POLL_INTERVAL_MS = 60_000; // 60초마다 서버에서 최신 달팽이 데이터 fetch

/**
 * 달팽이 데이터 폴링 훅
 * - 앱 포그라운드 진입 시 즉시 fetch
 * - 60초마다 백그라운드 폴링
 * - 게임오버 이벤트 처리 (isDead 플래그)
 */
export function useSnailData() {
  const { token, setSnail, setDead } = useGameStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const fetchSnail = useCallback(async () => {
    if (!token) return;
    try {
      const snail = await api.getMySnail();
      setSnail(snail);
    } catch (err: any) {
      // 401 → 토큰 만료
      if (err?.status === 401) {
        useGameStore.getState().logout();
      }
    }
  }, [token, setSnail]);

  // 앱 포그라운드/백그라운드 전환 감지
  useEffect(() => {
    if (!token) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // 포그라운드 복귀 시 즉시 갱신
        fetchSnail();
      }
      appStateRef.current = nextState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [token, fetchSnail]);

  // 60초 폴링
  useEffect(() => {
    if (!token) return;

    fetchSnail(); // 마운트 시 즉시

    intervalRef.current = setInterval(fetchSnail, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [token, fetchSnail]);

  return { refetch: fetchSnail };
}
