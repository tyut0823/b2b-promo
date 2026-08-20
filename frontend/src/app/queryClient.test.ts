import { QueryClient } from '@tanstack/react-query';
import { queryClient } from './queryClient';

describe('queryClient', () => {
  it('QueryClient의 인스턴스다', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it('기본 옵션(retry, staleTime, refetchOnWindowFocus)이 설정되어 있다', () => {
    const { queries } = queryClient.getDefaultOptions();
    expect(queries?.retry).toBe(1);
    expect(queries?.staleTime).toBe(30_000);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });
});
