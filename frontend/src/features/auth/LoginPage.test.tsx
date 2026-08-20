import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/router';
import { useAuthStore } from '../../stores/authStore';

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as Response;
}

function makeJwt(payload: Record<string, unknown>) {
  return 'header.' + btoa(JSON.stringify(payload)) + '.signature';
}

function renderLoginPage() {
  const queryClient = new QueryClient();
  const router = createMemoryRouter(routes, { initialEntries: ['/login'] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1' } });
  fireEvent.click(screen.getByRole('button', { name: '로그인' }));
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = vi.fn();
  });

  it('로그인 실패 시 에러 메시지를 표시한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(401, { message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    );

    renderLoginPage();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText('이메일 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument();
    });
  });

  it('BUYER로 로그인 성공 시 /samples로 이동한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(
        jsonResponse(200, {
          access_token: makeJwt({ sub: 'u1', role: 'BUYER' }),
          refresh_token: 'r1',
        })
      )
      .mockResolvedValueOnce(jsonResponse(200, []));

    renderLoginPage();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '샘플 목록' })).toHaveClass('nav-active');
    });
  });

  it('ADMIN으로 로그인 성공 시 /admin/samples로 이동한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, {
        access_token: makeJwt({ sub: 'u2', role: 'ADMIN' }),
        refresh_token: 'r1',
      })
    );

    renderLoginPage();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '샘플 관리' })).toHaveClass('nav-active');
    });
  });
});
