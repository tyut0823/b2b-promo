import { httpClient } from '../../shared/httpClient';

export type SignupBody = { email: string; password: string; name: string; company_name: string };
export type LoginBody = { email: string; password: string };
export type TokenPair = { access_token: string; refresh_token: string };

export async function signup(body: SignupBody) {
  const res = await httpClient('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

export async function login(body: LoginBody): Promise<TokenPair> {
  const res = await httpClient('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}
