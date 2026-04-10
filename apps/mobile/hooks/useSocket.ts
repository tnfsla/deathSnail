import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useLocation } from './useLocation';

// Geohash 6자리 계산 (외부 라이브러리 없이 인라인 구현)
function toGeohash6(lat: number, lng: number): string {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90, minLng = -180, maxLng = 180;
  let hash = '', bits = 0, even = true, chr = 0;

  while (hash.length < 6) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) { chr = (chr << 1) | 1; minLng = mid; }
      else { chr = chr << 1; maxLng = mid; }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) { chr = (chr << 1) | 1; minLat = mid; }
      else { chr = chr << 1; maxLat = mid; }
    }
    even = !even;
    if (++bits === 5) { hash += BASE32[chr]; bits = 0; chr = 0; }
  }
  return hash;
}

export function useSocket() {
  const { token } = useGameStore();
  const { location } = useLocation();
  const prevGeohashRef = useRef<string | null>(null);

  // 소켓 연결 생명주기: 로그인 시 유지, 로그아웃/언마운트 시 종료
  // location 변경에 반응하지 않으므로 위치 업데이트마다 재연결되지 않음
  useEffect(() => {
    if (!token) {
      disconnectSocket();
      prevGeohashRef.current = null;
    }
    return () => {
      disconnectSocket();
      prevGeohashRef.current = null;
    };
  }, [token]);

  // Geohash 구독: 위치가 바뀌어 다른 geohash 셀로 진입했을 때만 재구독
  // cleanup 없음 → 위치 업데이트마다 소켓이 끊기지 않음
  useEffect(() => {
    if (!token || !location) return;

    const geohash = toGeohash6(
      location.coords.latitude,
      location.coords.longitude
    );

    if (geohash === prevGeohashRef.current) return;
    prevGeohashRef.current = geohash;

    connectSocket(geohash);
  }, [token, location]);
}
