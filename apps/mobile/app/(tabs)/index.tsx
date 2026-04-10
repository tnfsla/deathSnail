import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useGameStore } from '@/stores/gameStore';
import { useLocation } from '@/hooks/useLocation';
import { useSocket } from '@/hooks/useSocket';
import { interpolateSnailPosition } from '@/lib/geo';
import { api } from '@/lib/api';
import { NearbySnail } from 'shared';

export default function MapScreen() {
  const { snail, nearbySnails, user } = useGameStore();
  const { location, requestLocation } = useLocation();
  const mapRef = useRef<MapView>(null);
  const [interpolatedPos, setInterpolatedPos] = useState<{ lat: number; lng: number } | null>(null);

  useSocket();

  // 30초마다 달팽이 위치 보간
  useEffect(() => {
    if (!snail) return;
    const update = () => setInterpolatedPos(interpolateSnailPosition(snail));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [snail]);

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

  const handleBuffSnail = async (targetSnailId: string, ownerName: string) => {
    Alert.alert(
      '달팽이 버프',
      `${ownerName}의 달팽이에게 오늘 하루 +1km 속도 버프를 줄까요?\n(그 달팽이가 빨라집니다)`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '버프 주기',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.giveBuff(targetSnailId);
              Alert.alert('완료', `${ownerName}의 달팽이가 오늘 더 빠르게 움직입니다 😈`);
            } catch (e: any) {
              Alert.alert('오류', e.message);
            }
          },
        },
      ]
    );
  };

  const snailPos = interpolatedPos ?? (snail ? { lat: snail.currentLat, lng: snail.currentLng } : null);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: location?.coords.latitude ?? 37.5665,
          longitude: location?.coords.longitude ?? 126.978,
          latitudeDelta: 30,
          longitudeDelta: 30,
        }}
      >
        {/* 내 달팽이 */}
        {snailPos && (
          <Marker
            coordinate={{ latitude: snailPos.lat, longitude: snailPos.lng }}
            title="내 달팽이"
            description={`당신을 향해 이동 중...`}
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
          >
            <Text style={styles.meEmoji}>📍</Text>
          </Marker>
        )}

        {/* 달팽이 이동 궤적 */}
        {snail?.positionHistory && snail.positionHistory.length > 1 && (
          <Polyline
            coordinates={snail.positionHistory.map((p) => ({
              latitude: p.lat,
              longitude: p.lng,
            }))}
            strokeColor="#8B000088"
            strokeWidth={2}
          />
        )}

        {/* 주변 달팽이들 */}
        {nearbySnails.map((ns: NearbySnail) => (
          <Marker
            key={ns.snailId}
            coordinate={{ latitude: ns.currentLat, longitude: ns.currentLng }}
            title={`${ns.ownerName}의 달팽이`}
            description={`${(ns.distanceM / 1000).toFixed(1)}km 떨어진 달팽이`}
            onCalloutPress={() => handleBuffSnail(ns.snailId, ns.ownerName)}
          >
            <Text style={styles.nearbySnailEmoji}>🐌</Text>
          </Marker>
        ))}
      </MapView>

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
        <View style={styles.distanceCard}>
          <Text style={styles.distanceLabel}>달팽이까지</Text>
          <Text style={styles.distanceValue}>
            {snail.distanceKm >= 1000
              ? `${(snail.distanceKm / 1000).toFixed(1)}천 km`
              : `${snail.distanceKm.toFixed(0)} km`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  map: { flex: 1 },
  snailEmoji: { fontSize: 28 },
  meEmoji: { fontSize: 24 },
  nearbySnailEmoji: { fontSize: 22, opacity: 0.6 },
  controls: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    gap: 8,
  },
  controlBtn: {
    backgroundColor: '#1a1a1aee',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
  },
  controlBtnText: { color: '#fff', fontSize: 13 },
  distanceCard: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: '#0a0a0aee',
    borderWidth: 1,
    borderColor: '#8B000066',
    borderRadius: 8,
    padding: 12,
  },
  distanceLabel: { color: '#aaa', fontSize: 11 },
  distanceValue: { color: '#cc2222', fontSize: 22, fontWeight: 'bold' },
});

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
];
