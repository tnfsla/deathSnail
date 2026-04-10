import { Snail } from 'shared';

const EARTH_RADIUS_KM = 6371.0088;

export function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function toDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * 달팽이의 오늘 현재 위치를 보간으로 계산
 * 하루 이동 중 경과된 시간 비율에 따라 현재 위치 추정
 */
export function interpolateSnailPosition(snail: Snail): { lat: number; lng: number } {
  // targetLat/Lng가 0,0이면 아직 유저 위치 미공유 → 현재 위치 그대로 반환
  if (snail.targetLat === 0 && snail.targetLng === 0) {
    return { lat: snail.currentLat, lng: snail.currentLng };
  }

  const now = Date.now();
  const todayMidnightUTC = new Date();
  todayMidnightUTC.setUTCHours(0, 0, 0, 0);
  const elapsed = (now - todayMidnightUTC.getTime()) / 86400000; // 0.0 ~ 1.0

  const distanceTraveled = (snail.todaySpeedKm ?? 1) * elapsed;
  const totalDist = haversineDistance(
    snail.dayStartLat, snail.dayStartLng,
    snail.targetLat, snail.targetLng
  );

  if (totalDist <= distanceTraveled) {
    return { lat: snail.targetLat, lng: snail.targetLng };
  }

  const angularDist = distanceTraveled / EARTH_RADIUS_KM;
  const lat1 = toRad(snail.dayStartLat);
  const lng1 = toRad(snail.dayStartLng);
  const lat2 = toRad(snail.targetLat);
  const lng2 = toRad(snail.targetLng);

  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = Math.atan2(y, x);

  const newLat = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist) +
    Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearing)
  );
  const newLng =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDist) * Math.cos(lat1),
      Math.cos(angularDist) - Math.sin(lat1) * Math.sin(newLat)
    );

  return {
    lat: toDeg(newLat),
    lng: ((toDeg(newLng) + 540) % 360) - 180,
  };
}
