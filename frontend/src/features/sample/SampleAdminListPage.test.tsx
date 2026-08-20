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

function loginAsAdmin() {
  useAuthStore.setState({
    accessToken: makeJwt({ sub: 'admin1', role: 'ADMIN' }),
    refreshToken: 'r1',
    user: { id: 'admin1', role: 'ADMIN' },
  });
}

function renderSampleAdminListPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: ['/admin/samples'] });
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

describe('SampleAdminListPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = vi.fn();
    loginAsAdmin();
  });

  it('목록이 정상 렌더링된다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, [sampleA])
    );

    renderSampleAdminListPage();

    await waitFor(() => {
      expect(screen.getByText('샘플A')).toBeInTheDocument();
      expect(screen.getByText('2026-08-01 ~ 2026-08-20')).toBeInTheDocument();
    });
  });

  it('+ 샘플 등록 버튼 클릭 시 등록 폼 화면으로 이동한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, [sampleA])
    );

    renderSampleAdminListPage();

    await screen.findByText('샘플A');

    fireEvent.click(screen.getByText('+ 샘플 등록'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '저장하기' })).toBeInTheDocument();
    });
  });

  it('수정 버튼 클릭 시 해당 샘플의 수정 폼으로 이동한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === 'http://localhost:3000/samples/s1') {
        return Promise.resolve(jsonResponse(200, sampleA));
      }
      return Promise.resolve(jsonResponse(200, [sampleA]));
    });

    renderSampleAdminListPage();

    await screen.findByText('샘플A');

    fireEvent.click(screen.getByRole('button', { name: '수정' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '저장하기' })).toBeInTheDocument();
    });
  });
});
