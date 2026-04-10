import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '@/stores/gameStore';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

export default function DeadScreen() {
  const { snail, user, logout } = useGameStore();
  const [survivalDays, setSurvivalDays] = useState(0);
  const [showRestart, setShowRestart] = useState(false);

  useEffect(() => {
    if (snail?.spawnedAt) {
      const days = Math.floor(
        (Date.now() - new Date(snail.spawnedAt).getTime()) / 86400000
      );
      setSurvivalDays(days);
    }
    // 5초 후 재시작 버튼 표시 (너무 빠른 클릭 방지)
    const t = setTimeout(() => setShowRestart(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const handleRestart = () => {
    // logout()은 동기 함수이며 isDead: false 포함 초기화
    logout();
    router.replace('/(auth)');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.skull}>💀</Text>

      <Text style={styles.title}>잡혔습니다</Text>

      <Text style={styles.message}>
        달팽이가 당신을 찾아냈습니다.{'\n'}
        {survivalDays}일 동안 도망쳤지만{'\n'}
        결국 달팽이는 멈추지 않았어요.
      </Text>

      <View style={styles.statsCard}>
        <StatRow label="생존 일수" value={`${survivalDays}일`} />
        <StatRow
          label="달팽이 이동 거리"
          value={
            snail?.totalDistanceKm
              ? `${snail.totalDistanceKm.toFixed(0)} km`
              : '알 수 없음'
          }
        />
        <StatRow label="사용자명" value={user?.username ?? '알 수 없음'} />
      </View>

      <Text style={styles.epitaph}>
        "{user?.username ?? '누군가'}은 {survivalDays}일 동안 달팽이를 피했다."
      </Text>

      {showRestart ? (
        <TouchableOpacity style={styles.restartBtn} onPress={handleRestart}>
          <Text style={styles.restartText}>새로 시작하기</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.waitText}>잠시 결과를 감상하세요...</Text>
      )}
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  skull: { fontSize: 80, marginBottom: 24 },
  title: {
    fontSize: 36,
    color: '#cc2222',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
  },
  statsCard: {
    width: '100%',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statLabel: { color: '#555', fontSize: 14 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  epitaph: {
    fontSize: 13,
    color: '#444',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  restartBtn: {
    backgroundColor: '#1a0000',
    borderWidth: 1,
    borderColor: '#8B0000',
    borderRadius: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  restartText: { color: '#cc2222', fontSize: 16, fontWeight: '600' },
  waitText: { color: '#333', fontSize: 13 },
});
