import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

function loginAsBuyer() {
  useAuthStore.setState({
    accessToken: makeJwt({ sub: 'u1', role: 'BUYER' }),
    refreshToken: 'r1',
    user: { id: 'u1', role: 'BUYER' },
  });
}

function renderMyApplicationsPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: ['/applications/me'] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function mockApplication(overrides: Partial<{ status: 'APPLIED' | 'CANCELLED'; sampleStatus: 'SCHEDULED' | 'ONGOING' | 'ENDED' }> = {}) {
  const { status = 'APPLIED', sampleStatus = 'ONGOING' } = overrides;
  return {
    id: 'a1',
    sample_id: 's1',
    user_id: 'u1',
    status,
    created_at: '2026-08-20T00:00:00.000Z',
    sample: {
      id: 's1',
      name: '샘플A',
      description: null,
      image_url: null,
      start_date: '2026-08-01',
      end_date: '2026-08-20',
      created_at: '2026-08-01T00:00:00.000Z',
      status: sampleStatus,
    },
  };
}

describe('MyApplicationsPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = vi.fn();
    loginAsBuyer();
  });

  it('신청 목록을 렌더링한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, [mockApplication({ status: 'APPLIED' })])
    );

    renderMyApplicationsPage();

    await waitFor(() => {
      expect(screen.getByText('샘플A')).toBeInTheDocument();
      expect(screen.getByText('상태: 신청')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });
  });

  it('취소 버튼 클릭 시 상태가 취소로 바뀌고 재신청 버튼이 노출된다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, [mockApplication({ status: 'APPLIED' })]))
      .mockResolvedValueOnce(jsonResponse(200, mockApplication({ status: 'CANCELLED' })))
      .mockResolvedValueOnce(jsonResponse(200, [mockApplication({ status: 'CANCELLED' })]));

    renderMyApplicationsPage();

    const cancelButton = await screen.findByRole('button', { name: '취소' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('상태: 취소')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '재신청' })).toBeInTheDocument();
    });
  });

  it('종료된 샘플은 재신청 버튼이 비활성화된다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, [mockApplication({ status: 'CANCELLED', sampleStatus: 'ENDED' })])
    );

    renderMyApplicationsPage();

    const reapplyButton = await screen.findByRole('button', { name: '재신청' });
    expect(reapplyButton).toBeDisabled();
  });
});
