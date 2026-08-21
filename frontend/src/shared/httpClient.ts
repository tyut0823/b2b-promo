import { useAuthStore } from '../stores/authStore';

export const BASE_URL = 'http://localhost:3000';

export function resolveAssetUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  return path.startsWith('/') ? `${BASE_URL}${path}` : path;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: useAuthStore.getState().refreshToken }),
        });
        if (!res.ok) {
          useAuthStore.getState().logout();
          return null;
        }
        const data = await res.json();
        return data.access_token ?? null;
      } catch {
        useAuthStore.getState().logout();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

function buildHeaders(options: RequestInit, accessToken: string | null): HeadersInit {
  const headers = new Headers(options.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return headers;
}

export async function httpClient(path: string, options: RequestInit = {}): Promise<Response> {
  const accessToken = useAuthStore.getState().accessToken;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options, accessToken),
  });

  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      return res;
    }
    useAuthStore.getState().setAccessToken(newToken);
    return fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: buildHeaders(options, newToken),
    });
  }

  return res;
}
