const { test, after } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
const pool = require('../src/db/pool');

// 이 테스트는 supertest로 app.js를 in-process 실행하지 않는다.
// npm run dev로 이미 떠 있는 개발 서버(http://localhost:3000)에 실제 HTTP 요청을 보낸다.
const BASE_URL = 'http://localhost:3000';

const email = `test-${randomUUID()}@example.com`;
const password = 'Test-password-1234!';

const SENSITIVE_KEYS = ['password', 'password_hash'];

function assertNoSensitiveKeys(body) {
  for (const key of SENSITIVE_KEYS) {
    assert.ok(
      !Object.prototype.hasOwnProperty.call(body, key),
      `응답에 민감 필드 "${key}"가 노출되면 안 된다`
    );
  }
}

async function signup(payload) {
  const res = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function login(payload) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function refresh(payload) {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  return { status: res.status, body };
}

let issuedRefreshToken;

after(async () => {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  // ponytail: pool.end()는 생략 — 다른 테스트 파일이 같은 pool 모듈을 공유하므로
  // 여기서 커넥션을 닫으면 이후 파일 실행 시 영향을 줄 수 있다.
});

test('회원가입 성공: 201과 안전한 사용자 정보를 반환한다', async () => {
  const { status, body } = await signup({
    email,
    password,
    name: '홍길동',
    company_name: '테스트상사',
  });

  assert.strictEqual(status, 201);
  assert.ok(body.id, 'id가 존재해야 한다');
  assert.strictEqual(body.account_type, 'BUYER');
  assert.strictEqual(body.email, email);
  assert.strictEqual(body.name, '홍길동');
  assert.strictEqual(body.company_name, '테스트상사');
  assert.ok(body.created_at, 'created_at이 존재해야 한다');
  assertNoSensitiveKeys(body);
});

test('회원가입 실패: 중복 이메일이면 400을 반환한다', async () => {
  const { status, body } = await signup({
    email,
    password,
    name: '홍길동',
    company_name: '테스트상사',
  });

  assert.strictEqual(status, 400);
  assert.ok(body.message, 'message가 존재해야 한다');
  assertNoSensitiveKeys(body);
});

test('로그인 성공: access_token과 refresh_token을 반환한다', async () => {
  const { status, body } = await login({ email, password });

  assert.strictEqual(status, 200);
  assert.strictEqual(typeof body.access_token, 'string');
  assert.strictEqual(typeof body.refresh_token, 'string');
  assertNoSensitiveKeys(body);

  issuedRefreshToken = body.refresh_token;
});

test('로그인 실패: 비밀번호가 틀리면 401을 반환한다', async () => {
  const { status, body } = await login({ email, password: 'wrong-password' });

  assert.strictEqual(status, 401);
  assertNoSensitiveKeys(body);
});

test('로그인 실패: 존재하지 않는 이메일이면 401을 반환한다', async () => {
  const { status, body } = await login({
    email: `no-such-${randomUUID()}@example.com`,
    password,
  });

  assert.strictEqual(status, 401);
  assertNoSensitiveKeys(body);
});

test('refresh 성공: 유효한 refresh_token으로 새 access_token을 받는다', async () => {
  assert.ok(issuedRefreshToken, '로그인 테스트에서 refresh_token을 발급받아야 한다');

  const { status, body } = await refresh({ refresh_token: issuedRefreshToken });

  assert.strictEqual(status, 200);
  assert.strictEqual(typeof body.access_token, 'string');
  assertNoSensitiveKeys(body);
});

test('refresh 실패: 위조된 토큰이면 401을 반환한다', async () => {
  const { status, body } = await refresh({ refresh_token: 'invalid.token.value' });

  assert.strictEqual(status, 401);
  assertNoSensitiveKeys(body);
});
