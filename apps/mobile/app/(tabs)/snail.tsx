import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useGameStore } from '@/stores/gameStore';
import { interpolateSnailPosition } from '@/lib/geo';

export default function SnailScreen() {
  const { snail, user } = useGameStore();

  if (!snail) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>달팽이 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const currentPos = interpolateSnailPosition(snail);
  const survivalDays = Math.floor(
    (Date.now() - new Date(snail.spawnedAt).getTime()) / 86400000
  );
  const etaYears = snail.distanceKm / 365; // 1km/day

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 달팽이 상태 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🐌 내 달팽이는 지금...</Text>

        <View style={styles.locationRow}>
          <Text style={styles.countryFlag}>{snail.currentCountryFlag ?? '🌍'}</Text>
          <View>
            <Text style={styles.countryName}>{snail.currentCountry ?? '알 수 없는 장소'}</Text>
            <Text style={styles.region}>{snail.currentRegion ?? ''}</Text>
          </View>
        </View>

        {snail.landmarkComment && (
          <View style={styles.snailSpeech}>
            <Text style={styles.speechBubble}>"{snail.landmarkComment}"</Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <StatItem label="남은 거리" value={`${snail.distanceKm.toFixed(0)} km`} />
          <StatItem label="도달 예상" value={`약 ${etaYears.toFixed(1)}년`} />
          <StatItem label="생존 일수" value={`${survivalDays}일`} />
          <StatItem
            label="오늘 이동"
            value={`${((snail.todaySpeedKm ?? 1) * getDayProgress()).toFixed(2)} / ${snail.todaySpeedKm ?? 1} km`}
          />
        </View>
      </View>

      {/* 달팽이 기분 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>달팽이 상태</Text>
        <MoodBar days={survivalDays} />
      </View>

      {/* 여행 기록 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📖 여행 기록</Text>
        {(snail.travelLog ?? []).map((entry, i) => (
          <View key={i} style={styles.logEntry}>
            <Text style={styles.logDay}>Day {entry.dayNumber}</Text>
            <Text style={styles.logText}>{entry.description}</Text>
          </View>
        ))}
        {(!snail.travelLog || snail.travelLog.length === 0) && (
          <Text style={styles.noLog}>아직 기록이 없습니다.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function MoodBar({ days }: { days: number }) {
  const moods = [
    { threshold: 0, label: '😐 평온함', color: '#4CAF50' },
    { threshold: 30, label: '😤 결연함', color: '#FF9800' },
    { threshold: 180, label: '😠 집요함', color: '#FF5722' },
    { threshold: 365, label: '😡 맹렬함', color: '#F44336' },
    { threshold: 730, label: '💀 집착', color: '#8B0000' },
  ];

  const mood = [...moods].reverse().find((m) => days >= m.threshold) ?? moods[0];

  return (
    <View>
      <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
      <Text style={styles.moodDesc}>
        {days >= 730
          ? '달팽이는 이제 침묵 속에서 당신을 향해 이동합니다. 별도의 알림이 없습니다.'
          : `달팽이가 당신을 쫓기 시작한 지 ${days}일이 지났습니다.`}
      </Text>
    </View>
  );
}

function getDayProgress(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(0, 0, 0, 0);
  return (now.getTime() - midnight.getTime()) / 86400000;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 16, paddingTop: 60, paddingBottom: 32 },
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  loading: { color: '#555', fontSize: 16 },
  card: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  countryFlag: { fontSize: 40 },
  countryName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  region: { color: '#666', fontSize: 13 },
  snailSpeech: {
    backgroundColor: '#1a1a1a',
    borderLeftWidth: 3,
    borderLeftColor: '#8B0000',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  speechBubble: { color: '#ccc', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
  },
  statLabel: { color: '#555', fontSize: 11, marginBottom: 4 },
  statValue: { color: '#cc2222', fontSize: 16, fontWeight: 'bold' },
  moodLabel: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  moodDesc: { color: '#666', fontSize: 13, lineHeight: 20 },
  logEntry: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  logDay: { color: '#555', fontSize: 12, width: 50 },
  logText: { color: '#aaa', fontSize: 13, flex: 1, lineHeight: 18 },
  noLog: { color: '#444', fontSize: 13 },
});
