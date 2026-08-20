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

function login(role: 'BUYER' | 'ADMIN' = 'BUYER') {
  useAuthStore.setState({
    accessToken: makeJwt({ sub: 'u1', role }),
    refreshToken: 'r1',
    user: { id: 'u1', role },
  });
}

function renderMyPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(routes, { initialEntries: ['/mypage'] });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

function mockMe(overrides: Partial<{ name: string; company_name: string }> = {}) {
  return {
    id: 'u1',
    name: '홍길동',
    company_name: '거래처A',
    role: 'BUYER',
    ...overrides,
  };
}

describe('MyPage', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    globalThis.fetch = vi.fn();
    login();
  });

  it('내 정보를 조회해 이름과 소속 거래처명을 인풋에 프리필한다', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(jsonResponse(200, mockMe()));

    renderMyPage();

    await waitFor(() => {
      expect(screen.getByLabelText('이름')).toHaveValue('홍길동');
      expect(screen.getByLabelText('소속 거래처명')).toHaveValue('거래처A');
    });
  });

  it('이름을 수정하고 내 정보 저장 클릭 시 PUT /users/me가 호출된다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, mockMe()))
      .mockResolvedValueOnce(jsonResponse(200, mockMe({ name: '김철수' })));

    renderMyPage();

    const nameInput = await screen.findByLabelText('이름');
    fireEvent.change(nameInput, { target: { value: '김철수' } });
    fireEvent.click(screen.getByRole('button', { name: '내 정보 저장' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/users/me',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: '김철수', company_name: '거래처A' }),
        })
      );
    });
  });

  it('현재 비밀번호와 새 비밀번호를 입력하고 비밀번호 변경 클릭 시 PUT /users/me/password가 호출된다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, mockMe()))
      .mockResolvedValueOnce(jsonResponse(200, {}));

    renderMyPage();

    await screen.findByLabelText('이름');
    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'oldpass1' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newpass1' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3000/users/me/password',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ current_password: 'oldpass1', new_password: 'newpass1' }),
        })
      );
    });
  });

  it('비밀번호 변경 실패 시 에러 메시지가 화면에 표시된다', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, mockMe()))
      .mockResolvedValueOnce(jsonResponse(400, { message: '현재 비밀번호가 일치하지 않습니다.' }));

    renderMyPage();

    await screen.findByLabelText('이름');
    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'wrongpass' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newpass1' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => {
      expect(screen.getByText('현재 비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
    });
  });

  it('ADMIN 계정으로 로그인해도 마이페이지에 접근할 수 있다', async () => {
    login('ADMIN');
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse(200, mockMe({ name: '관리자' }))
    );

    renderMyPage();

    await waitFor(() => {
      expect(screen.getByLabelText('이름')).toHaveValue('관리자');
    });
  });
});
