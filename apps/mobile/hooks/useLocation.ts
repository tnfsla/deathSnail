import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { api } from '@/lib/api';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);

  const requestLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(status);

    if (status !== 'granted') return;

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setLocation(loc);

    // 서버에 위치 업데이트 (rate-limited: 30초 1회)
    await api.updateLocation(loc.coords.latitude, loc.coords.longitude).catch(() => {});
  }, []);

  useEffect(() => {
    requestLocation();

    // 위치 변경 감지 (500m 이동 시)
    let subscriber: Location.LocationSubscription | null = null;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscriber = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 500, // 500m 이동 시 업데이트
          timeInterval: 60000,   // 최소 1분 간격
        },
        (loc) => {
          setLocation(loc);
          api.updateLocation(loc.coords.latitude, loc.coords.longitude).catch(() => {});
        }
      );
    })();

    return () => {
      subscriber?.remove();
    };
  }, [requestLocation]);

  return { location, permissionStatus, requestLocation };
}
