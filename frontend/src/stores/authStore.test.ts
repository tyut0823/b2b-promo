import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './authStore';

function makeJwt(payload: Record<string, unknown>) {
  return 'header.' + btoa(JSON.stringify(payload)) + '.signature';
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  });

  it('login 시 accessToken/refreshToken/user가 저장된다', () => {
    useAuthStore.getState().login({
      accessToken: makeJwt({ sub: 'u1', role: 'BUYER' }),
      refreshToken: 'r1',
    });

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe(makeJwt({ sub: 'u1', role: 'BUYER' }));
    expect(state.refreshToken).toBe('r1');
    expect(state.user).toEqual({ id: 'u1', role: 'BUYER' });
  });

  it('setAccessToken 시 accessToken/user만 갱신되고 refreshToken은 유지된다', () => {
    useAuthStore.getState().login({
      accessToken: makeJwt({ sub: 'u1', role: 'BUYER' }),
      refreshToken: 'r1',
    });

    useAuthStore.getState().setAccessToken(makeJwt({ sub: 'u2', role: 'ADMIN' }));

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe(makeJwt({ sub: 'u2', role: 'ADMIN' }));
    expect(state.user).toEqual({ id: 'u2', role: 'ADMIN' });
    expect(state.refreshToken).toBe('r1');
  });

  it('logout 시 accessToken/refreshToken/user가 모두 null이 된다', () => {
    useAuthStore.getState().login({
      accessToken: makeJwt({ sub: 'u1', role: 'BUYER' }),
      refreshToken: 'r1',
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });
});
