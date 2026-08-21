import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../app/router';
import { useAuthStore } from '../../stores/authStore';
import { useRouletteStore } from '../../stores/rouletteStore';

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

function renderSampleDetailPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: ['/samples/s1'] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('SampleDetailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = vi.fn();
  });

  it('샘플 상세 정보를 렌더링한다', async () => {
    loginAsBuyer();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, {
        id: 's1',
        name: '샘플A',
        description: '상세 설명',
        image_url: null,
        start_date: '2026-08-01',
        end_date: '2026-08-20',
        created_at: '2026-08-01T00:00:00.000Z',
        status: 'ONGOING',
      })
    );

    renderSampleDetailPage();

    await waitFor(() => {
      expect(screen.getByText('샘플A')).toBeInTheDocument();
      expect(screen.getByText('상세 설명')).toBeInTheDocument();
      expect(screen.getByText('신청 가능')).toBeInTheDocument();
    });
  });

  it('존재하지 않는 샘플이면 404 안내 문구를 표시한다', async () => {
    loginAsBuyer();
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(404, { message: '샘플을 찾을 수 없습니다.' })
    );

    renderSampleDetailPage();

    await waitFor(() => {
      expect(screen.getByText('샘플을 찾을 수 없습니다.')).toBeInTheDocument();
    });
  });
});

function mockSample(status: 'SCHEDULED' | 'ONGOING' | 'ENDED') {
  return {
    id: 's1',
    name: '샘플A',
    description: '상세 설명',
    image_url: null,
    start_date: '2026-08-01',
    end_date: '2026-08-20',
    created_at: '2026-08-01T00:00:00.000Z',
    status,
  };
}

describe('SampleDetailPage 샘플 신청/취소', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    useRouletteStore.setState({ userId: 'u1', date: new Date().toISOString().slice(0, 10), total: 3, remaining: 3 });
    globalThis.fetch = vi.fn();
    loginAsBuyer();
  });

  it('ONGOING이고 미신청 상태면 신청하기 버튼 클릭 시 POST /applications가 호출된다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, mockSample('ONGOING')))
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(
        jsonResponse(201, { id: 'a1', sample_id: 's1', user_id: 'u1', status: 'APPLIED', created_at: '2026-08-20T00:00:00.000Z' })
      )
      .mockResolvedValue(jsonResponse(200, []));

    renderSampleDetailPage();

    const applyButton = await screen.findByRole('button', { name: '신청하기' });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/applications',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('중복 신청 시 에러 메시지를 표시한다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, mockSample('ONGOING')))
      .mockResolvedValueOnce(jsonResponse(200, []))
      .mockResolvedValueOnce(jsonResponse(409, { message: '이미 신청한 샘플입니다.' }));

    renderSampleDetailPage();

    const applyButton = await screen.findByRole('button', { name: '신청하기' });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(screen.getByText('이미 신청한 샘플입니다.')).toBeInTheDocument();
    });
  });

  it('이미 신청한 상태(APPLIED)면 신청 취소 버튼이 보인다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, mockSample('ONGOING')))
      .mockResolvedValueOnce(
        jsonResponse(200, [
          { id: 'a1', sample_id: 's1', user_id: 'u1', status: 'APPLIED', created_at: '2026-08-20T00:00:00.000Z' },
        ])
      );

    renderSampleDetailPage();

    await screen.findByRole('button', { name: '신청 취소' });
    expect(screen.queryByRole('button', { name: '신청하기' })).toBeNull();
  });

  it('오늘 신청 가능 개수를 다 썼으면 신청하기 버튼 대신 안내 문구가 보인다', async () => {
    useRouletteStore.setState({ remaining: 0 });
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, mockSample('ONGOING')))
      .mockResolvedValueOnce(jsonResponse(200, []));

    renderSampleDetailPage();

    await screen.findByText('오늘 신청 가능 개수를 모두 사용했어요.');
    expect(screen.queryByRole('button', { name: '신청하기' })).toBeNull();
  });

  it('SCHEDULED 상태면 신청 관련 버튼이 없다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, mockSample('SCHEDULED')))
      .mockResolvedValueOnce(jsonResponse(200, []));

    renderSampleDetailPage();

    await screen.findByText('샘플A');
    expect(screen.queryByRole('button', { name: /신청/ })).toBeNull();
  });

  it('ENDED 상태면 신청 관련 버튼이 없다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, mockSample('ENDED')))
      .mockResolvedValueOnce(jsonResponse(200, []));

    renderSampleDetailPage();

    await screen.findByText('샘플A');
    expect(screen.queryByRole('button', { name: /신청/ })).toBeNull();
  });

  it('신청 성공 시 /applications/me만 재요청되고 /samples 목록 전체는 재요청되지 않는다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    let applicationsCallCount = 0;
    fetchMock.mockImplementation((url: string, options?: RequestInit) => {
      if (url === 'http://localhost:3000/samples/s1') {
        return Promise.resolve(jsonResponse(200, mockSample('ONGOING')));
      }
      if (url === 'http://localhost:3000/applications/me') {
        applicationsCallCount += 1;
        const status = applicationsCallCount === 1 ? [] : [
          { id: 'a1', sample_id: 's1', user_id: 'u1', status: 'APPLIED', created_at: '2026-08-20T00:00:00.000Z' },
        ];
        return Promise.resolve(jsonResponse(200, status));
      }
      if (url === 'http://localhost:3000/applications' && options?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(201, { id: 'a1', sample_id: 's1', user_id: 'u1', status: 'APPLIED', created_at: '2026-08-20T00:00:00.000Z' })
        );
      }
      return Promise.resolve(jsonResponse(404, { message: 'not found' }));
    });

    renderSampleDetailPage();

    const applyButton = await screen.findByRole('button', { name: '신청하기' });

    const samplesListCallsBefore = fetchMock.mock.calls.filter(
      (call: unknown[]) => call[0] === 'http://localhost:3000/samples'
    ).length;
    const applicationsCallsBefore = fetchMock.mock.calls.filter(
      (call: unknown[]) => call[0] === 'http://localhost:3000/applications/me'
    ).length;

    fireEvent.click(applyButton);

    await screen.findByRole('button', { name: '신청 취소' });

    const samplesListCallsAfter = fetchMock.mock.calls.filter(
      (call: unknown[]) => call[0] === 'http://localhost:3000/samples'
    ).length;
    const applicationsCallsAfter = fetchMock.mock.calls.filter(
      (call: unknown[]) => call[0] === 'http://localhost:3000/applications/me'
    ).length;

    expect(samplesListCallsAfter).toBe(samplesListCallsBefore);
    expect(applicationsCallsAfter).toBeGreaterThan(applicationsCallsBefore);
  });
});
