import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Achievement } from 'shared';

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAchievements().then(setAchievements).finally(() => setLoading(false));
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
      <Text style={styles.header}>🏆 업적</Text>
      <FlatList
        data={achievements}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.item, !item.isComplete && styles.itemLocked]}>
            <Text style={styles.itemIcon}>{item.isComplete ? item.icon : '🔒'}</Text>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, !item.isComplete && styles.itemNameLocked]}>
                {item.name}
              </Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
              {item.isComplete && item.reward && (
                <Text style={styles.itemReward}>보상: {item.reward}</Text>
              )}
              {!item.isComplete && item.progress != null && (
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${Math.min(item.progress * 100, 100)}%` }]}
                  />
                </View>
              )}
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
  },
  list: { padding: 16, paddingTop: 0 },
  item: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#8B000044',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  itemLocked: {
    borderColor: '#222',
    opacity: 0.6,
  },
  itemIcon: { fontSize: 28 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  itemNameLocked: { color: '#555' },
  itemDesc: { color: '#666', fontSize: 12, lineHeight: 18, marginBottom: 4 },
  itemReward: { color: '#cc2222', fontSize: 12 },
  progressBar: {
    height: 3,
    backgroundColor: '#1a1a1a',
    borderRadius: 2,
    marginTop: 6,
  },
  progressFill: {
    height: 3,
    backgroundColor: '#8B0000',
    borderRadius: 2,
  },
});
