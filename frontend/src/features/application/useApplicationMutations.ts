import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apply, cancelApplication } from './applicationApi';

export function useApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'me'] });
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
