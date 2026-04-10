import { useGameStore } from '@/stores/gameStore';
import { Achievement, LeaderboardEntry, NearbySnail, Snail, User } from 'shared';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useGameStore.getState().token;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '요청에 실패했습니다.' }));
    throw new Error(err.message ?? '요청에 실패했습니다.');
  }

  return res.json();
}

export const api = {
  register: (username: string) =>
    request<{ token: string; user: User; snail: Snail }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  getMySnail: () => request<Snail>('/snails/mine'),

  getNearbySnails: (lat: number, lng: number, radiusM = 5000) =>
    request<NearbySnail[]>(`/snails/nearby?lat=${lat}&lng=${lng}&radius=${radiusM}`),

  updateLocation: (lat: number, lng: number) =>
    request<{ nearbyCount: number }>('/players/location', {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    }),

  getNearbyPlayers: (lat: number, lng: number) =>
    request<NearbySnail[]>(`/players/nearby?lat=${lat}&lng=${lng}&radius=100`),

  giveBuff: (targetSnailId: string) =>
    request<{ message: string }>('/buffs', {
      method: 'POST',
      body: JSON.stringify({ targetSnailId }),
    }),

  getAchievements: () => request<Achievement[]>('/achievements/mine'),

  getLeaderboard: () => request<LeaderboardEntry[]>('/leaderboard/survivors'),
};
