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

function renderSampleFormPage(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: [initialEntry] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

const sampleA = {
  id: 's1',
  name: '샘플A',
  description: '설명A',
  image_url: 'http://img.example.com/a.png',
  start_date: '2026-08-01',
  end_date: '2026-08-20',
  created_at: '2026-08-01T00:00:00.000Z',
  status: 'ONGOING',
};

describe('SampleFormPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = vi.fn();
    loginAsAdmin();
  });

  it('등록 모드: 필드를 채우고 저장하기 클릭 시 POST /samples가 호출된다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(201, sampleA));

    renderSampleFormPage('/admin/samples/new');

    fireEvent.change(screen.getByLabelText('샘플명'), { target: { value: '샘플A' } });
    fireEvent.change(screen.getByLabelText('설명'), { target: { value: '설명A' } });
    fireEvent.change(screen.getByLabelText('이미지 URL'), {
      target: { value: 'http://img.example.com/a.png' },
    });
    fireEvent.change(screen.getByLabelText('신청 시작일'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('신청 종료일'), { target: { value: '2026-08-20' } });

    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/samples',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('등록 성공 시 관리자 목록 화면으로 이동한다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (url === 'http://localhost:3000/samples' && options?.method === 'POST') {
        return Promise.resolve(jsonResponse(201, sampleA));
      }
      return Promise.resolve(jsonResponse(200, [sampleA]));
    });

    renderSampleFormPage('/admin/samples/new');

    fireEvent.change(screen.getByLabelText('샘플명'), { target: { value: '샘플A' } });
    fireEvent.change(screen.getByLabelText('신청 시작일'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('신청 종료일'), { target: { value: '2026-08-20' } });

    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(screen.getByText('+ 샘플 등록')).toBeInTheDocument();
    });
  });

  it('수정 모드: 기존 값이 프리필되고 저장하기 클릭 시 PUT /samples/:id가 호출된다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (url === 'http://localhost:3000/samples/s1' && (!options || options.method === undefined)) {
        return Promise.resolve(jsonResponse(200, sampleA));
      }
      if (url === 'http://localhost:3000/samples/s1' && options?.method === 'PUT') {
        return Promise.resolve(jsonResponse(200, sampleA));
      }
      return Promise.resolve(jsonResponse(200, [sampleA]));
    });

    renderSampleFormPage('/admin/samples/s1/edit');

    await waitFor(() => {
      expect(screen.getByDisplayValue('샘플A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('설명A')).toBeInTheDocument();
      expect(screen.getByDisplayValue('http://img.example.com/a.png')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2026-08-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2026-08-20')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/samples/s1',
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });

  it('등록 실패(400) 시 에러 메시지가 화면에 표시된다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValue(jsonResponse(400, { message: '입력값이 올바르지 않습니다.' }));

    renderSampleFormPage('/admin/samples/new');

    fireEvent.change(screen.getByLabelText('샘플명'), { target: { value: '샘플A' } });
    fireEvent.change(screen.getByLabelText('신청 시작일'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('신청 종료일'), { target: { value: '2026-08-20' } });

    fireEvent.click(screen.getByRole('button', { name: '저장하기' }));

    await waitFor(() => {
      expect(screen.getByText('입력값이 올바르지 않습니다.')).toBeInTheDocument();
    });
  });
});
