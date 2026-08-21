import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type RouletteState = {
  userId: string | null;
  date: string | null;
  total: number;
  remaining: number;
  hasRolledToday: (userId: string) => boolean;
  roll: (userId: string) => number;
  consume: () => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useRouletteStore = create<RouletteState>()(
  persist(
    (set, get) => ({
      userId: null,
      date: null,
      total: 0,
      remaining: 0,
      hasRolledToday: (userId) => get().userId === userId && get().date === today(),
      roll: (userId) => {
        const value = Math.floor(Math.random() * 3) + 1;
        set({ userId, date: today(), total: value, remaining: value });
        return value;
      },
      consume: () => set((s) => ({ remaining: Math.max(0, s.remaining - 1) })),
    }),
    { name: 'roulette-storage' }
  )
);
