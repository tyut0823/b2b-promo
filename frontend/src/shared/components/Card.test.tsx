import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Card from './Card';

describe('Card', () => {
  it('children을 그대로 렌더링한다', () => {
    render(
      <Card>
        <p>카드 내용</p>
      </Card>
    );

    expect(screen.getByText('카드 내용')).toBeInTheDocument();
  });

  it('className을 전달하면 card와 함께 합쳐진다', () => {
    render(<Card className="extra">내용</Card>);

    const card = screen.getByText('내용');
    expect(card.className).toContain('card');
    expect(card.className).toContain('extra');
  });
});
