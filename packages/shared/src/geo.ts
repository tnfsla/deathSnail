/**
 * 공유 지리 계산 유틸리티
 * 달팽이 이동 알고리즘의 단일 소스 - 클라이언트/서버 모두 사용
 */

const EARTH_RADIUS_KM = 6371.0088;

export function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function toDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

/**
 * 두 좌표 간 Haversine 거리 (km)
 */
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
 * 방위각 계산 (degrees, 0=북, 90=동, 180=남, 270=서)
 */
export function bearingTo(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number
): number {
  const lat1 = toRad(fromLat);
  const lat2 = toRad(toLat);
  const dLng = toRad(toLng - fromLng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export interface MoveResult {
  lat: number;
  lng: number;
  reached: boolean; // 타겟 도달 여부 (게임오버 트리거)
}

/**
 * 달팽이 이동 핵심 함수
 * Great Circle 경로를 따라 fromLat/Lng에서 toLat/Lng 방향으로 distanceKm만큼 이동
 *
 * @param fromLat - 달팽이 현재 위도
 * @param fromLng - 달팽이 현재 경도
 * @param toLat - 타겟(유저) 위도
 * @param toLng - 타겟(유저) 경도
 * @param distanceKm - 이동할 거리 (km)
 * @returns 이동 후 새 좌표 및 도달 여부
 */
export function moveToward(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  distanceKm: number
): MoveResult {
  const totalDist = haversineDistance(fromLat, fromLng, toLat, toLng);

  // 달팽이가 타겟 범위(10m) 내 도달 → 게임오버
  if (totalDist <= Math.max(distanceKm, 0.01)) {
    return { lat: toLat, lng: toLng, reached: true };
  }

  const angularDist = distanceKm / EARTH_RADIUS_KM;

  const lat1 = toRad(fromLat);
  const lng1 = toRad(fromLng);
  const lat2 = toRad(toLat);
  const lng2 = toRad(toLng);

  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
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
    lng: ((toDeg(newLng) + 540) % 360) - 180, // 경도 정규화 [-180, 180]
    reached: false,
  };
}

/**
 * 랜덤 육지 좌표 생성을 위한 후보 좌표 목록에서 선택
 * 실제 구현 시 Natural Earth GeoJSON 기반으로 rejection sampling 사용
 */
export function randomLandCoordinate(landCoordinates: Array<[number, number]>): {
  lat: number;
  lng: number;
} {
  const [lat, lng] = landCoordinates[Math.floor(Math.random() * landCoordinates.length)];
  return { lat, lng };
}
