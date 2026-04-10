import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useGameStore } from '@/stores/gameStore';
import { useLocation } from '@/hooks/useLocation';
import { useSocket } from '@/hooks/useSocket';
import { useSnailData } from '@/hooks/useSnailData';
import { interpolateSnailPosition } from '@/lib/geo';
import { api } from '@/lib/api';
import { NearbySnail } from 'shared';

export default function MapScreen() {
  const { snail, nearbySnails } = useGameStore();
  const { location, requestLocation } = useLocation();
  const mapRef = useRef<MapView>(null);

  // 실제 데이터 연결
  useSnailData();
  useSocket();

  // 30초마다 보간 위치 갱신
  const [interpolatedPos, setInterpolatedPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!snail) return;
    const update = () => setInterpolatedPos(interpolateSnailPosition(snail));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [snail]);

  // 공황 모드: 달팽이가 10km 이내면 붉은 오버레이
  const isPanicMode =
    snail != null && snail.distanceKm > 0 && snail.distanceKm <= 10;

  const handleCenterOnSnail = () => {
    if (!interpolatedPos) return;
    mapRef.current?.animateToRegion({
      latitude: interpolatedPos.lat,
      longitude: interpolatedPos.lng,
      latitudeDelta: 5,
      longitudeDelta: 5,
    });
  };

  const handleCenterOnMe = () => {
    if (!location) {
      requestLocation();
      return;
    }
    mapRef.current?.animateToRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const handleBuffSnail = async (targetSnailId: string, ownerName: string, distanceM: number) => {
    if (distanceM > 100) {
      Alert.alert(
        '너무 멀어요',
        `버프는 100m 이내에서만 가능해요.\n현재 ${Math.round(distanceM)}m 거리에 있어요.`
      );
      return;
    }
    Alert.alert(
      '달팽이 버프 😈',
      `${ownerName}의 달팽이에게 오늘 +1km 버프를 줄까요?\n그 달팽이가 더 빨리 주인을 쫓아가게 됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '버프 주기',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await api.giveBuff(targetSnailId);
              Alert.alert('완료', result.message);
            } catch (e: any) {
              Alert.alert('오류', e.message);
            }
          },
        },
      ]
    );
  };

  const snailPos = interpolatedPos ??
    (snail ? { lat: snail.currentLat, lng: snail.currentLng } : null);

  const initialRegion = {
    latitude: location?.coords.latitude ?? snailPos?.lat ?? 37.5665,
    longitude: location?.coords.longitude ?? snailPos?.lng ?? 126.978,
    latitudeDelta: 30,
    longitudeDelta: 30,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={isPanicMode ? panicMapStyle : darkMapStyle}
        initialRegion={initialRegion}
        showsUserLocation={false} // 직접 마커 그림
        showsMyLocationButton={false}
      >
        {/* 내 달팽이 */}
        {snailPos && (
          <Marker
            coordinate={{ latitude: snailPos.lat, longitude: snailPos.lng }}
            title="내 달팽이"
            description={
              snail
                ? `${snail.currentCountry ?? '이동 중...'} · 남은 거리 ${snail.distanceKm.toFixed(0)}km`
                : ''
            }
          >
            <Text style={styles.snailEmoji}>🐌</Text>
          </Marker>
        )}

        {/* 내 위치 */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="나"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.myDot, isPanicMode && styles.myDotPanic]} />
          </Marker>
        )}

        {/* 달팽이 이동 궤적 */}
        {snail?.positionHistory && snail.positionHistory.length > 1 && (
          <Polyline
            coordinates={snail.positionHistory.map((p) => ({
              latitude: p.lat,
              longitude: p.lng,
            }))}
            strokeColor={isPanicMode ? '#cc222288' : '#8B000066'}
            strokeWidth={2}
            lineDashPattern={[8, 4]}
          />
        )}

        {/* 주변 달팽이들 */}
        {nearbySnails.map((ns: NearbySnail) => (
          <Marker
            key={ns.snailId}
            coordinate={{ latitude: ns.currentLat, longitude: ns.currentLng }}
            title={`${ns.ownerName}의 달팽이`}
            description={
              `${(ns.distanceM / 1000).toFixed(1)}km · ` +
              (ns.canBuff ? '탭해서 버프 주기 👆' : '오늘 이미 버프함')
            }
            onCalloutPress={() =>
              handleBuffSnail(ns.snailId, ns.ownerName, ns.distanceM)
            }
          >
            <Text style={styles.nearbySnailEmoji}>🐌</Text>
          </Marker>
        ))}
      </MapView>

      {/* 공황 모드 붉은 오버레이 */}
      {isPanicMode && <View style={styles.panicOverlay} pointerEvents="none" />}

      {/* 컨트롤 버튼 */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={handleCenterOnSnail}>
          <Text style={styles.controlBtnText}>🐌 달팽이</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={handleCenterOnMe}>
          <Text style={styles.controlBtnText}>📍 내 위치</Text>
        </TouchableOpacity>
      </View>

      {/* 거리 표시 */}
      {snail && (
        <View style={[styles.distanceCard, isPanicMode && styles.distanceCardPanic]}>
          <Text style={styles.distanceLabel}>달팽이까지</Text>
          <Text style={[styles.distanceValue, isPanicMode && styles.distanceValuePanic]}>
            {snail.distanceKm >= 1000
              ? `${(snail.distanceKm / 1000).toFixed(1)}천 km`
              : `${snail.distanceKm.toFixed(0)} km`}
          </Text>
          {snail.currentCountry && (
            <Text style={styles.distanceCountry}>
              {snail.currentCountryFlag} {snail.currentCountry}
            </Text>
          )}
        </View>
      )}

      {/* 공황 모드 경고 */}
      {isPanicMode && (
        <View style={styles.panicBanner}>
          <Text style={styles.panicText}>⚠️ 달팽이가 10km 이내!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  map: { flex: 1 },
  snailEmoji: { fontSize: 28 },
  nearbySnailEmoji: { fontSize: 22, opacity: 0.7 },
  myDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4fc3f7',
    borderWidth: 2,
    borderColor: '#fff',
  },
  myDotPanic: { backgroundColor: '#ff1744', borderColor: '#ff8a80' },
  controls: {
    position: 'absolute',
    bottom: 110,
    right: 16,
    gap: 8,
  },
  controlBtn: {
    backgroundColor: '#111d',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  controlBtnText: { color: '#fff', fontSize: 13 },
  distanceCard: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: '#0a0a0aee',
    borderWidth: 1,
    borderColor: '#8B000066',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  distanceCardPanic: { borderColor: '#cc222288' },
  distanceLabel: { color: '#666', fontSize: 11, marginBottom: 2 },
  distanceValue: { color: '#cc2222', fontSize: 24, fontWeight: 'bold' },
  distanceValuePanic: { color: '#ff1744' },
  distanceCountry: { color: '#555', fontSize: 11, marginTop: 4 },
  panicOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ff000008',
    pointerEvents: 'none',
  },
  panicBanner: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#cc2222ee',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  panicText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];

// 공황 모드: 붉은 색조
const panicMapStyle = [
  ...darkMapStyle,
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#2a1010' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3a1515' }] },
];
