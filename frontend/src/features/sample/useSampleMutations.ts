import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSample, updateSample } from './sampleApi';
import type { SampleInput } from './sampleApi';

export function useCreateSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSample,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    },
  });
}

export function useUpdateSample() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; body: SampleInput }) => updateSample(vars.id, vars.body),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['samples', vars.id] });
    },
  });
}
