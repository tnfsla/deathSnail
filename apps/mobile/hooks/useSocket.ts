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

  useEffect(() => {
    if (!token || !location) return;

    const geohash = toGeohash6(
      location.coords.latitude,
      location.coords.longitude
    );

    // geohash가 바뀔 때만 재구독 (500m 이상 이동해야 바뀜)
    if (geohash === prevGeohashRef.current) return;
    prevGeohashRef.current = geohash;

    connectSocket(geohash);

    return () => {
      disconnectSocket();
      prevGeohashRef.current = null;
    };
  }, [token, location]);
}
