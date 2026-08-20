const { test, after } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
const pool = require('../src/db/pool');

// 이 테스트는 supertest로 app.js를 in-process 실행하지 않는다.
// npm run dev로 이미 떠 있는 개발 서버(http://localhost:3000)에 실제 HTTP 요청을 보낸다.
const BASE_URL = 'http://localhost:3000';

const SENSITIVE_KEYS = ['password', 'password_hash'];

const emails = [];

async function signupAndLogin(password = 'test1234') {
  const email = `test-users-${randomUUID()}@example.com`;
  await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: '마이페이지테스터', company_name: '테스트거래처' }),
  });
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await loginRes.json();
  return { email, accessToken: body.access_token };
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function getMe(token) {
  const res = await fetch(`${BASE_URL}/users/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function updateMe(token, patch) {
  const res = await fetch(`${BASE_URL}/users/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function updatePassword(token, current_password, new_password) {
  const res = await fetch(`${BASE_URL}/users/me/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ current_password, new_password }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

after(async () => {
  if (emails.length > 0) {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
  }
  // ponytail: pool.end()는 생략 — 다른 테스트 파일과 pool을 공유한다.
});

test('BUYER 내 정보 조회: GET /users/me는 200과 민감 필드 없는 User를 반환한다', async () => {
  const user = await signupAndLogin();
  emails.push(user.email);

  const { status, body } = await getMe(user.accessToken);

  assert.strictEqual(status, 200);
  assert.strictEqual(body.email, user.email);
  for (const key of SENSITIVE_KEYS) {
    assert.ok(!Object.prototype.hasOwnProperty.call(body, key), `응답에 민감 필드 "${key}"가 노출되면 안 된다`);
  }
});

test('BUYER 내 정보 수정: PUT /users/me는 partial update를 지원한다', async () => {
  const user = await signupAndLogin();
  emails.push(user.email);

  const before = await getMe(user.accessToken);
  const { status, body } = await updateMe(user.accessToken, { name: '새이름' });

  assert.strictEqual(status, 200);
  assert.strictEqual(body.name, '새이름');
  assert.strictEqual(body.company_name, before.body.company_name, 'company_name은 보내지 않으면 기존 값이 유지되어야 한다');
});

test('BUYER 비밀번호 변경 성공 및 재로그인 검증', async () => {
  const user = await signupAndLogin('test1234');
  emails.push(user.email);

  const { status } = await updatePassword(user.accessToken, 'test1234', 'newpass1234');
  assert.strictEqual(status, 200);

  const oldLogin = await login(user.email, 'test1234');
  assert.strictEqual(oldLogin.status, 401);

  const newLogin = await login(user.email, 'newpass1234');
  assert.strictEqual(newLogin.status, 200);
  assert.ok(newLogin.body.access_token, '새 비밀번호로 로그인 시 access_token이 발급되어야 한다');
});

test('비밀번호 변경 실패: 현재 비밀번호가 틀리면 400을 반환한다', async () => {
  const user = await signupAndLogin('test1234');
  emails.push(user.email);

  const { status } = await updatePassword(user.accessToken, 'wrongpass', 'whatever1234');
  assert.strictEqual(status, 400);
});

test('토큰 없이 GET /users/me를 호출하면 401을 반환한다', async () => {
  const { status } = await getMe(undefined);
  assert.strictEqual(status, 401);
});

test('ADMIN 역할: 내 정보 조회/수정/비밀번호 변경이 모두 정상 동작한다', async () => {
  const user = await signupAndLogin('test1234');
  emails.push(user.email);

  await pool.query("UPDATE users SET account_type='ADMIN' WHERE email=$1", [user.email]);
  const adminLogin = await login(user.email, 'test1234');
  const adminToken = adminLogin.body.access_token;

  const { status: getStatus, body: getBody } = await getMe(adminToken);
  assert.strictEqual(getStatus, 200);
  assert.strictEqual(getBody.account_type, 'ADMIN');

  const { status: putStatus, body: putBody } = await updateMe(adminToken, { name: '관리자이름' });
  assert.strictEqual(putStatus, 200);
  assert.strictEqual(putBody.name, '관리자이름');

  const { status: pwStatus } = await updatePassword(adminToken, 'test1234', 'adminnewpass1234');
  assert.strictEqual(pwStatus, 200);
});
