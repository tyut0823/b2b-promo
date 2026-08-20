import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AdminLayout from './AdminLayout';

describe('AdminLayout', () => {
  function renderLayout() {
    return render(
      <MemoryRouter initialEntries={['/admin/samples']}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/samples" element={<div>관리목록내용</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  it('네비게이션 링크가 올바른 텍스트와 href를 갖는다', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: '샘플 관리' })).toHaveAttribute(
      'href',
      '/admin/samples'
    );
    expect(screen.getByRole('link', { name: '마이페이지' })).toHaveAttribute('href', '/mypage');
  });

  it('Outlet 자리에 자식 라우트가 렌더링된다', () => {
    renderLayout();

    expect(screen.getByText('관리목록내용')).toBeInTheDocument();
  });
});
