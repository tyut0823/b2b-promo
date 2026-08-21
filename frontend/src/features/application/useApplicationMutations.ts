import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apply, cancelApplication } from './applicationApi';
import { useRouletteStore } from '../../stores/rouletteStore';

export function useApply() {
  const queryClient = useQueryClient();
  const consume = useRouletteStore((s) => s.consume);
  return useMutation({
    mutationFn: apply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'me'] });
      consume();
    },
  });
}

export function useCancelApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'me'] });
    },
  });
}
