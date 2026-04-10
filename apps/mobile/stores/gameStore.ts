import { create } from 'zustand';
import { User, Snail, NearbySnail } from 'shared';

interface GameStore {
  token: string | null;
  user: User | null;
  snail: Snail | null;
  nearbySnails: NearbySnail[];

  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setSnail: (snail: Snail | null) => void;
  setNearbySnails: (snails: NearbySnail[]) => void;
  updateNearbySnail: (snail: NearbySnail) => void;
  removeNearbySnail: (snailId: string) => void;
  logout: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  token: null,
  user: null,
  snail: null,
  nearbySnails: [],

  setToken: (token) => set({ token }),
  setUser: (user) => set({ user }),
  setSnail: (snail) => set({ snail }),
  setNearbySnails: (nearbySnails) => set({ nearbySnails }),

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

  logout: () => set({ token: null, user: null, snail: null, nearbySnails: [] }),
}));
