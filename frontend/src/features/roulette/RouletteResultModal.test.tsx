import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RouletteResultModal from './RouletteResultModal';
import { useRouletteStore } from '../../stores/rouletteStore';

describe('RouletteResultModal', () => {
  beforeEach(() => {
    localStorage.clear();
    useRouletteStore.setState({ userId: 'u1', date: '2026-08-21', total: 2, remaining: 1 });
  });

  it('오늘 뽑은 개수와 남은 개수를 보여준다', () => {
    const onClose = vi.fn();
    render(<RouletteResultModal onClose={onClose} />);

    expect(screen.getByText('오늘의 룰렛 결과')).toBeInTheDocument();
    expect(screen.getByText('오늘 뽑은 개수: 2개 (남은 개수: 1개)')).toBeInTheDocument();
  });

  it('닫기 버튼 클릭 시 onClose가 호출된다', () => {
    const onClose = vi.fn();
    render(<RouletteResultModal onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
