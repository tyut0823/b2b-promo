import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import BuyerLayout from './BuyerLayout';
import { useAuthStore } from '../../stores/authStore';
import { useRouletteStore } from '../../stores/rouletteStore';

describe('BuyerLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: 'token', refreshToken: 'r1', user: { id: 'u1', role: 'BUYER' } });
    // 이미 오늘 뽑은 상태로 세팅해 룰렛 모달이 자동으로 뜨지 않게 한다(이 describe는 nav 자체를 검증).
    useRouletteStore.setState({ userId: 'u1', date: new Date().toISOString().slice(0, 10), total: 2, remaining: 2 });
  });

  function renderLayout() {
    return render(
      <MemoryRouter initialEntries={['/samples']}>
        <Routes>
          <Route element={<BuyerLayout />}>
            <Route path="/samples" element={<div>목록내용</div>} />
          </Route>
          <Route path="/login" element={<div>로그인 화면</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('네비게이션 링크가 올바른 텍스트와 href를 갖는다', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: '샘플 목록' })).toHaveAttribute('href', '/samples');
    expect(screen.getByRole('link', { name: '내 신청 내역' })).toHaveAttribute(
      'href',
      '/applications/me'
    );
    expect(screen.getByRole('link', { name: '마이페이지' })).toHaveAttribute('href', '/mypage');
  });

  it('Outlet 자리에 자식 라우트가 렌더링된다', () => {
    renderLayout();

    expect(screen.getByText('목록내용')).toBeInTheDocument();
  });

  it('로그아웃 버튼 클릭 시 인증 상태를 초기화하고 로그인 화면으로 이동한다', () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(screen.getByText('로그인 화면')).toBeInTheDocument();
  });

  it('오늘 신청 가능한 샘플 개수가 nav에 표시되고, 클릭하면 룰렛 결과 모달이 뜬다', () => {
    renderLayout();

    const badge = screen.getByRole('button', { name: '오늘 신청 가능한 샘플 개수 : 2개' });
    fireEvent.click(badge);

    expect(screen.getByText('오늘의 룰렛 결과')).toBeInTheDocument();
    expect(screen.getByText('오늘 뽑은 개수: 2개 (남은 개수: 2개)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByText('오늘의 룰렛 결과')).toBeNull();
  });
});
