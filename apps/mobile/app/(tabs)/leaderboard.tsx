import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LeaderboardEntry } from 'shared';

export default function LeaderboardScreen() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard().then(setEntries).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#cc2222" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>💀 생존자 순위</Text>
      <Text style={styles.subheader}>달팽이를 가장 오래 피한 사람들</Text>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={[styles.row, index === 0 && styles.rowFirst]}>
            <Text style={styles.rank}>
              {index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
            </Text>
            <View style={styles.info}>
              <Text style={styles.username}>{item.username}</Text>
              {item.title && <Text style={styles.title}>{item.title}</Text>}
            </View>
            <View style={styles.right}>
              <Text style={styles.days}>{item.survivalDays}일</Text>
              <Text style={styles.distance}>{item.distanceKm.toFixed(0)}km 남음</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  header: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    padding: 16,
    paddingTop: 60,
    paddingBottom: 4,
  },
  subheader: { color: '#555', fontSize: 13, paddingHorizontal: 16, marginBottom: 12 },
  list: { padding: 16, paddingTop: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  rowFirst: {
    borderColor: '#8B000088',
    backgroundColor: '#1a0000',
  },
  rank: { fontSize: 20, width: 32, textAlign: 'center' },
  info: { flex: 1 },
  username: { color: '#fff', fontSize: 15, fontWeight: '600' },
  title: { color: '#8B0000', fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  days: { color: '#cc2222', fontSize: 16, fontWeight: 'bold' },
  distance: { color: '#555', fontSize: 11, marginTop: 2 },
});
