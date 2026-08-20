import { useQuery } from '@tanstack/react-query';
import { listMyApplications, listApplicationsForSample } from './applicationApi';

export function useMyApplications() {
  return useQuery({ queryKey: ['applications', 'me'], queryFn: listMyApplications });
}

export function useSampleApplications(sampleId: string | undefined) {
  return useQuery({
    queryKey: ['applications', 'sample', sampleId],
    queryFn: () => listApplicationsForSample(sampleId as string),
    enabled: !!sampleId,
  });
}
