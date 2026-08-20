import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Input from './Input';

describe('Input', () => {
  it('label과 id를 전달하면 라벨로 input을 찾을 수 있다', () => {
    render(<Input label="이메일" id="email" />);

    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
  });

  it('label 없이 렌더링해도 input이 정상적으로 렌더링된다', () => {
    render(<Input placeholder="이름" />);

    expect(screen.getByPlaceholderText('이름')).toBeInTheDocument();
  });

  it('value/onChange가 정상적으로 전달·동작한다', () => {
    const handleChange = vi.fn();
    render(<Input label="이름" id="name" value="홍길동" onChange={handleChange} />);

    const input = screen.getByLabelText('이름') as HTMLInputElement;
    expect(input.value).toBe('홍길동');

    fireEvent.change(input, { target: { value: '김철수' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
  });
});
