import { useQuery } from '@tanstack/react-query';
import { listSamples, getSample } from './sampleApi';

export function useSampleList() {
  return useQuery({ queryKey: ['samples'], queryFn: listSamples });
}

export function useSampleDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['samples', id],
    queryFn: () => getSample(id as string),
    enabled: !!id,
  });
}
