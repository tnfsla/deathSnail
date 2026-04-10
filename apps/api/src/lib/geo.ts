// shared 패키지의 geo 유틸을 re-export (API 서버에서 사용)
export { haversineDistance, moveToward, bearingTo, toRad, toDeg } from 'shared';

/**
 * 좌표를 PostGIS GEOGRAPHY 문자열로 변환
 */
export function toPostGISPoint(lng: number, lat: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}

/**
 * 국가코드에서 국기 이모지 변환
 */
export function countryCodeToFlag(code: string): string {
  const offset = 127397;
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + offset))
    .join('');
}

/**
 * Nominatim 역지오코딩 (무료 OpenStreetMap)
 * 달팽이 위치 → 국가/지역명
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ country: string; countryCode: string; region: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=8`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DeathSnailApp/1.0' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      country: data.address?.country ?? 'Unknown',
      countryCode: data.address?.country_code?.toUpperCase() ?? '',
      region: data.address?.state ?? data.address?.county ?? '',
    };
  } catch {
    return null;
  }
}
