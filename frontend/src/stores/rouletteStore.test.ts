import { beforeEach, describe, expect, it } from 'vitest';
import { useRouletteStore } from './rouletteStore';

describe('rouletteStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useRouletteStore.setState({ userId: null, date: null, total: 0, remaining: 0 });
  });

  it('roll은 1~3 사이의 숫자를 뽑고 total/remaining에 반영한다', () => {
    const value = useRouletteStore.getState().roll('u1');
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(3);
    expect(useRouletteStore.getState().total).toBe(value);
    expect(useRouletteStore.getState().remaining).toBe(value);
  });

  it('hasRolledToday는 같은 사용자가 오늘 이미 뽑았으면 true를 반환한다', () => {
    expect(useRouletteStore.getState().hasRolledToday('u1')).toBe(false);
    useRouletteStore.getState().roll('u1');
    expect(useRouletteStore.getState().hasRolledToday('u1')).toBe(true);
  });

  it('hasRolledToday는 다른 사용자에 대해서는 false를 반환한다', () => {
    useRouletteStore.getState().roll('u1');
    expect(useRouletteStore.getState().hasRolledToday('u2')).toBe(false);
  });

  it('consume은 remaining을 1씩 줄이고 0 밑으로는 내려가지 않는다', () => {
    useRouletteStore.setState({ remaining: 1 });
    useRouletteStore.getState().consume();
    expect(useRouletteStore.getState().remaining).toBe(0);
    useRouletteStore.getState().consume();
    expect(useRouletteStore.getState().remaining).toBe(0);
  });
});
