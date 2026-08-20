import { httpClient } from '../../shared/httpClient';
import type { Sample } from '../../shared/types';

export async function listSamples(): Promise<Sample[]> {
  const res = await httpClient('/samples');
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export async function getSample(id: string): Promise<Sample> {
  const res = await httpClient(`/samples/${id}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export type SampleInput = {
  name: string;
  description?: string | null;
  image_url?: string | null;
  start_date: string;
  end_date: string;
};

export async function createSample(body: SampleInput): Promise<Sample> {
  const res = await httpClient('/samples', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export async function updateSample(id: string, body: SampleInput): Promise<Sample> {
  const res = await httpClient(`/samples/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}
