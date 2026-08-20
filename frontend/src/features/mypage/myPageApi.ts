import { httpClient } from '../../shared/httpClient';
import type { User } from '../../shared/types';

export type UpdateProfileBody = { name: string; company_name: string | null };
export type ChangePasswordBody = { current_password: string; new_password: string };

export async function getMe(): Promise<User> {
  const res = await httpClient('/users/me');
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export async function updateProfile(body: UpdateProfileBody): Promise<User> {
  const res = await httpClient('/users/me', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export async function changePassword(body: ChangePasswordBody): Promise<{ message: string }> {
  const res = await httpClient('/users/me/password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}
