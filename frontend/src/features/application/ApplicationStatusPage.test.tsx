import { render, screen, waitFor } from '@testing-library/react';
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

function loginAsAdmin() {
  useAuthStore.setState({
    accessToken: makeJwt({ sub: 'admin1', role: 'ADMIN' }),
    refreshToken: 'r1',
    user: { id: 'admin1', role: 'ADMIN' },
  });
}

function renderApplicationStatusPage(state?: Record<string, unknown>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, {
    initialEntries: [{ pathname: '/admin/samples/s1/applications', state }],
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function mockApplicationWithUser(overrides: Partial<{ status: 'APPLIED' | 'CANCELLED' }> = {}) {
  const { status = 'APPLIED' } = overrides;
  return {
    id: 'a1',
    sample_id: 's1',
    user_id: 'u1',
    status,
    created_at: '2026-08-20T00:00:00.000Z',
    user: {
      id: 'u1',
      account_type: 'BUSINESS',
      email: 'buyer@example.com',
      name: '홍길동',
      company_name: '거래처A',
      created_at: '2026-08-01T00:00:00.000Z',
    },
  };
}

describe('ApplicationStatusPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = vi.fn();
    loginAsAdmin();
  });

  it('sampleName이 있으면 제목과 거래처명/담당자명/상태(신청/취소)를 표시한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, [
        mockApplicationWithUser({ status: 'APPLIED' }),
        {
          ...mockApplicationWithUser({ status: 'CANCELLED' }),
          id: 'a2',
          user_id: 'u2',
          user: {
            id: 'u2',
            account_type: 'BUSINESS',
            email: 'buyer2@example.com',
            name: '김철수',
            company_name: '거래처B',
            created_at: '2026-08-01T00:00:00.000Z',
          },
        },
      ])
    );

    renderApplicationStatusPage({ sampleName: '샘플A' });

    await waitFor(() => {
      expect(screen.getByText('샘플A - 신청 현황')).toBeInTheDocument();
      expect(screen.getByText('거래처A')).toBeInTheDocument();
      expect(screen.getByText('홍길동')).toBeInTheDocument();
      expect(screen.getByText('신청')).toBeInTheDocument();
      expect(screen.getByText('거래처B')).toBeInTheDocument();
      expect(screen.getByText('김철수')).toBeInTheDocument();
      expect(screen.getByText('취소')).toBeInTheDocument();
    });
  });

  it('state 없이 진입하면 제목이 신청 현황으로 표시된다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(200, []));

    renderApplicationStatusPage();

    await waitFor(() => {
      expect(screen.getByText('신청 현황')).toBeInTheDocument();
    });
  });

  it('API 에러 시 에러 메시지를 표시한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(404, { message: '샘플을 찾을 수 없습니다.' })
    );

    renderApplicationStatusPage({ sampleName: '샘플A' });

    await waitFor(() => {
      expect(screen.getByText('샘플을 찾을 수 없습니다.')).toBeInTheDocument();
    });
  });
});
