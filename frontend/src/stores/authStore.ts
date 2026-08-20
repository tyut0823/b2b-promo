import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Role = 'ADMIN' | 'BUYER';
type User = { id: string; role: Role };

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  login: (tokens: { accessToken: string; refreshToken: string }) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => void;
};

function decodeJwtPayload(token: string): User | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      login: ({ accessToken, refreshToken }) =>
        set({ accessToken, refreshToken, user: decodeJwtPayload(accessToken) }),
      setAccessToken: (accessToken) =>
        set({ accessToken, user: decodeJwtPayload(accessToken) }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'auth-storage' }
  )
);
