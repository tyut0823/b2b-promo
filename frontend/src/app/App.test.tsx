import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('기본 라우트(/)가 렌더링된다', () => {
    render(<App />);
    expect(screen.getByText('b2b-promo')).toBeInTheDocument();
  });
});
