import { useQuery } from '@tanstack/react-query';
import { getMe } from './myPageApi';

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: getMe });
}
