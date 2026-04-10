import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#222',
        },
        tabBarActiveTintColor: '#cc2222',
        tabBarInactiveTintColor: '#555',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '지도',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="snail"
        options={{
          title: '내 달팽이',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🐌</Text>,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: '업적',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏆</Text>,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: '순위',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💀</Text>,
        }}
      />
    </Tabs>
  );
}
