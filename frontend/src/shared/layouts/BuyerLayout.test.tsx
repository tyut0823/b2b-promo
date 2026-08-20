import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import BuyerLayout from './BuyerLayout';

describe('BuyerLayout', () => {
  function renderLayout() {
    return render(
      <MemoryRouter initialEntries={['/samples']}>
        <Routes>
          <Route element={<BuyerLayout />}>
            <Route path="/samples" element={<div>목록내용</div>} />
          </Route>
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
});
