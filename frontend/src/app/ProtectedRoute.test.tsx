import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import ProtectedRoute from './ProtectedRoute';

function renderProtected(role?: 'ADMIN' | 'BUYER') {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/" element={<div>home</div>} />
        <Route path="/login" element={<div>login page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute role={role}>
              <div>secret</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  });

  it('accessToken이 없으면 /login으로 리다이렉트한다', () => {
    renderProtected();

    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('role이 다르면 /로 리다이렉트한다', () => {
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'r1',
      user: { id: 'u1', role: 'BUYER' },
    });

    renderProtected('ADMIN');

    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });

  it('role이 일치하면 children을 렌더링한다', () => {
    useAuthStore.setState({
      accessToken: 'token',
      refreshToken: 'r1',
      user: { id: 'u1', role: 'BUYER' },
    });

    renderProtected('BUYER');

    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
