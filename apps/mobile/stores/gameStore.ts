import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Snail, NearbySnail } from 'shared';

const TOKEN_KEY = '@deathsnail/token';

interface GameStore {
  token: string | null;
  user: User | null;
  snail: Snail | null;
  nearbySnails: NearbySnail[];
  isBootstrapping: boolean; // 앱 시작 시 AsyncStorage에서 토큰 로드 중
  isDead: boolean;          // 달팽이에게 잡혔는지

  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setSnail: (snail: Snail | null) => void;
  setNearbySnails: (snails: NearbySnail[]) => void;
  updateNearbySnail: (snail: NearbySnail) => void;
  removeNearbySnail: (snailId: string) => void;
  setDead: (isDead: boolean) => void;
  logout: () => void;         // 동기: 상태 즉시 초기화, AsyncStorage는 fire-and-forget
  bootstrap: () => Promise<void>; // 앱 시작 시 1회
}

export const useGameStore = create<GameStore>((set, get) => ({
  token: null,
  user: null,
  snail: null,
  nearbySnails: [],
  isBootstrapping: true,
  isDead: false,

  setToken: (token) => {
    // 상태는 즉시 업데이트 (라우터 분기가 바로 반응하도록)
    set({ token });
    // AsyncStorage는 백그라운드에서 비동기 저장
    if (token) {
      AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
    } else {
      AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    }
  },

  setUser: (user) => set({ user }),
  setSnail: (snail) => set({ snail }),
  setNearbySnails: (nearbySnails) => set({ nearbySnails }),
  setDead: (isDead) => set({ isDead }),

  updateNearbySnail: (snail) =>
    set((state) => {
      const exists = state.nearbySnails.find((s) => s.snailId === snail.snailId);
      if (exists) {
        return {
          nearbySnails: state.nearbySnails.map((s) =>
            s.snailId === snail.snailId ? snail : s
          ),
        };
      }
      return { nearbySnails: [...state.nearbySnails, snail] };
    }),

  removeNearbySnail: (snailId) =>
    set((state) => ({
      nearbySnails: state.nearbySnails.filter((s) => s.snailId !== snailId),
    })),

  logout: () => {
    AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
    set({ token: null, user: null, snail: null, nearbySnails: [], isDead: false });
  },

  // 앱 시작 시 저장된 토큰 복구
  bootstrap: async () => {
    try {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        set({ token: savedToken });
      }
    } catch {
      // 토큰 복구 실패 시 로그인 화면으로
    } finally {
      set({ isBootstrapping: false });
    }
  },
}));
