import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import { httpClient } from './httpClient';

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('httpClient', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = vi.fn();
  });

  it('accessToken이 있으면 Authorization 헤더를 첨부한다', async () => {
    useAuthStore.setState({ accessToken: 'token-1', refreshToken: 'r1' });
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, { ok: true })
    );

    await httpClient('/samples');

    const [, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect((options.headers as Headers).get('Authorization')).toBe('Bearer token-1');
  });

  it('401 응답 시 refresh 후 원 요청을 재시도한다', async () => {
    useAuthStore.setState({ accessToken: 'old-token', refreshToken: 'r1' });
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'new-token' }))
      .mockResolvedValueOnce(jsonResponse(200, { data: 'ok' }));

    const res = await httpClient('/samples');
    const body = await res.json();

    expect(body).toEqual({ data: 'ok' });
    expect(useAuthStore.getState().accessToken).toBe('new-token');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain('/auth/refresh');
    expect((fetchMock.mock.calls[2][1].headers as Headers).get('Authorization')).toBe('Bearer new-token');
  });

  it('동시에 401을 받아도 refresh는 1회만 호출된다', async () => {
    useAuthStore.setState({ accessToken: 'old-token', refreshToken: 'r1' });
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;

    let sampleCallCount = 0;
    fetchMock.mockImplementation((input: string) => {
      const url = String(input);
      if (url.includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse(200, { access_token: 'new-token' }));
      }
      sampleCallCount += 1;
      if (sampleCallCount <= 2) {
        return Promise.resolve(jsonResponse(401, { message: 'unauthorized' }));
      }
      return Promise.resolve(jsonResponse(200, { data: 'ok' }));
    });

    await Promise.all([httpClient('/a'), httpClient('/b')]);

    const refreshCalls = fetchMock.mock.calls.filter((call) =>
      String(call[0]).includes('/auth/refresh')
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('refresh도 실패하면 logout 처리되고 원래 401 응답을 반환한다', async () => {
    useAuthStore.setState({ accessToken: 'old-token', refreshToken: 'r1' });
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'refresh failed' }));

    const res = await httpClient('/samples');

    expect(res.status).toBe(401);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
