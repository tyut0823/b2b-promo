import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RouletteModal from './RouletteModal';
import { useAuthStore } from '../../stores/authStore';
import { useRouletteStore } from '../../stores/rouletteStore';

function loginAsBuyer() {
  useAuthStore.setState({
    accessToken: 'token',
    refreshToken: 'r1',
    user: { id: 'u1', role: 'BUYER' },
  });
}

describe('RouletteModal', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    useRouletteStore.setState({ userId: null, date: null, total: 0, remaining: 0 });
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'setInterval', 'Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('오늘 아직 뽑지 않았으면 룰렛 휠과 STOP 버튼이 보이고, STOP을 누르면 1~3 사이 결과와 확인 버튼을 보여준다', async () => {
    loginAsBuyer();
    render(<RouletteModal />);

    expect(screen.getByText('오늘의 신청 가능 개수')).toBeInTheDocument();
    const stopButton = screen.getByRole('button', { name: 'STOP' });
    expect(stopButton).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500); // 스핀 중
    });
    expect(screen.queryByRole('button', { name: '확인' })).toBeNull();

    fireEvent.click(stopButton);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000); // 감속 애니메이션 완료까지
    });

    const message = screen.getByText(/오늘은 샘플을 최대 \d개까지 신청할 수 있어요!/);
    expect(message).toBeInTheDocument();
    const value = useRouletteStore.getState().total;
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(3);

    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(screen.queryByText('오늘의 신청 가능 개수')).toBeNull();
  });

  it('오늘 이미 뽑았으면 룰렛이 열리지 않는다', () => {
    loginAsBuyer();
    useRouletteStore.getState().roll('u1');

    render(<RouletteModal />);

    expect(screen.queryByText('오늘의 신청 가능 개수')).toBeNull();
  });
});
