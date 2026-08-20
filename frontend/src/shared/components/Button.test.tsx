import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('기본 렌더링 시 텍스트와 primary variant 클래스를 갖는다', () => {
    render(<Button>확인</Button>);

    const button = screen.getByRole('button', { name: '확인' });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain('btn-primary');
  });

  it('variant="danger"를 전달하면 btn-danger 클래스를 갖는다', () => {
    render(<Button variant="danger">삭제</Button>);

    expect(screen.getByRole('button', { name: '삭제' }).className).toContain('btn-danger');
  });

  it('클릭 시 onClick이 호출된다', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>클릭</Button>);

    screen.getByRole('button', { name: '클릭' }).click();

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disabled를 전달하면 버튼이 비활성화된다', () => {
    render(<Button disabled>비활성</Button>);

    expect(screen.getByRole('button', { name: '비활성' })).toBeDisabled();
  });
});
