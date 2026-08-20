import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/router';

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  } as Response;
}

function renderSignupPage() {
  const queryClient = new QueryClient();
  const router = createMemoryRouter(routes, { initialEntries: ['/signup'] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('이메일'), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password1' } });
  fireEvent.change(screen.getByLabelText('이름'), { target: { value: '홍길동' } });
  fireEvent.change(screen.getByLabelText('소속 거래처명'), { target: { value: '테스트' } });
  fireEvent.click(screen.getByRole('button', { name: '가입하기' }));
}

describe('SignupPage', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('회원가입 성공 시 로그인 화면으로 이동한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(201, {
        id: 'u1',
        account_type: 'BUYER',
        email: 'a@b.com',
        name: '홍길동',
        company_name: '테스트',
        created_at: '2026-01-01',
      })
    );

    renderSignupPage();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
    });
  });

  it('회원가입 실패 시 에러 메시지를 표시한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(400, { message: '이미 사용 중인 이메일입니다.' })
    );

    renderSignupPage();
    await fillAndSubmit();

    await waitFor(() => {
      expect(screen.getByText('이미 사용 중인 이메일입니다.')).toBeInTheDocument();
    });
  });
});
