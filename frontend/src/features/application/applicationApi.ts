import { httpClient } from '../../shared/httpClient';
import type { Application, ApplicationWithSample, ApplicationWithUser } from '../../shared/types';

export async function apply(sampleId: string): Promise<Application> {
  const res = await httpClient('/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sample_id: sampleId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export async function cancelApplication(id: string): Promise<Application> {
  const res = await httpClient(`/applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export async function listMyApplications(): Promise<ApplicationWithSample[]> {
  const res = await httpClient('/applications/me');
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export async function listApplicationsForSample(sampleId: string): Promise<ApplicationWithUser[]> {
  const res = await httpClient(`/samples/${sampleId}/applications`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}
