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

function loginAsBuyer() {
  useAuthStore.setState({
    accessToken: makeJwt({ sub: 'u1', role: 'BUYER' }),
    refreshToken: 'r1',
    user: { id: 'u1', role: 'BUYER' },
  });
}

function renderSampleListPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: ['/samples'] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

const sampleA = {
  id: 's1',
  name: '샘플A',
  description: null,
  image_url: null,
  start_date: '2026-08-01',
  end_date: '2026-08-20',
  created_at: '2026-08-01T00:00:00.000Z',
  status: 'ONGOING',
};

describe('SampleListPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = vi.fn();
  });

  it('샘플 목록을 카드로 렌더링한다', async () => {
    loginAsBuyer();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, [sampleA])
    );

    renderSampleListPage();

    await waitFor(() => {
      expect(screen.getByText('샘플A')).toBeInTheDocument();
      expect(screen.getByText('2026-08-01 ~ 2026-08-20')).toBeInTheDocument();
      expect(screen.getByText('신청 가능')).toBeInTheDocument();
    });
  });

  it('카드 클릭 시 상세 페이지로 이동한다', async () => {
    loginAsBuyer();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/samples/s1')) {
        return Promise.resolve(jsonResponse(200, sampleA));
      }
      return Promise.resolve(jsonResponse(200, [sampleA]));
    });

    renderSampleListPage();

    await waitFor(() => {
      expect(screen.getByText('샘플A')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('샘플A'));

    await waitFor(() => {
      expect(screen.getByText('← 목록으로')).toBeInTheDocument();
    });
  });
});
