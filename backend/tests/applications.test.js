const { test, after } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const pool = require('../src/db/pool');

// 이 테스트는 supertest로 app.js를 in-process 실행하지 않는다.
// npm run dev로 이미 떠 있는 개발 서버(http://localhost:3000)에 실제 HTTP 요청을 보낸다.
const BASE_URL = 'http://localhost:3000';

const SENSITIVE_KEYS = ['password', 'password_hash'];

function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function signupAndLogin() {
  const email = `test-app-${randomUUID()}@example.com`;
  await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'test1234', name: '신청테스터', company_name: '테스트거래처' }),
  });
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'test1234' }),
  });
  const { access_token } = await loginRes.json();
  return { email, accessToken: access_token };
}

async function createSample(adminToken, { start_date, end_date }) {
  const res = await fetch(`${BASE_URL}/samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `신청테스트샘플-${randomUUID()}`, start_date, end_date }),
  });
  return res.json();
}

function makeAdminToken() {
  return jwt.sign({ sub: randomUUID(), role: 'ADMIN' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
}

function makeBuyerToken() {
  return jwt.sign({ sub: randomUUID(), role: 'BUYER' }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
}

async function apply(token, sample_id) {
  const res = await fetch(`${BASE_URL}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sample_id }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function cancel(token, id) {
  const res = await fetch(`${BASE_URL}/applications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function getMyApplications(token) {
  const res = await fetch(`${BASE_URL}/applications/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function getSampleApplications(token, sampleId) {
  const res = await fetch(`${BASE_URL}/samples/${sampleId}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  return { status: res.status, body };
}

const adminToken = makeAdminToken();

const applicationIds = [];
const sampleIds = [];
const emails = [];

after(async () => {
  if (applicationIds.length > 0) {
    await pool.query('DELETE FROM applications WHERE id = ANY($1)', [applicationIds]);
  }
  if (sampleIds.length > 0) {
    await pool.query('DELETE FROM samples WHERE id = ANY($1)', [sampleIds]);
  }
  if (emails.length > 0) {
    await pool.query('DELETE FROM users WHERE email = ANY($1)', [emails]);
  }
  // ponytail: pool.end()는 생략 — 다른 테스트 파일과 pool을 공유한다.
});

let userA;
let ongoingSample;
let firstApplicationId;

test('신청 성공: 진행중인 샘플에 신청하면 201과 status APPLIED를 반환한다', async () => {
  userA = await signupAndLogin();
  emails.push(userA.email);

  ongoingSample = await createSample(adminToken, { start_date: isoDate(-1), end_date: isoDate(7) });
  sampleIds.push(ongoingSample.id);

  const { status, body } = await apply(userA.accessToken, ongoingSample.id);

  assert.strictEqual(status, 201);
  assert.strictEqual(body.sample_id, ongoingSample.id);
  assert.strictEqual(body.status, 'APPLIED');
  assert.ok(body.id, 'id가 존재해야 한다');
  firstApplicationId = body.id;
  applicationIds.push(firstApplicationId);
});

test('중복 신청: 이미 APPLIED 상태면 409를 반환한다', async () => {
  const { status, body } = await apply(userA.accessToken, ongoingSample.id);

  assert.strictEqual(status, 409);
  assert.strictEqual(body.message, '이미 신청한 샘플입니다.');
});

test('DB에는 여전히 신청 레코드가 1건만 존재한다', async () => {
  const result = await pool.query(
    'SELECT count(*) FROM applications WHERE sample_id=$1 AND user_id=$2',
    [ongoingSample.id, userA.accessToken ? jwt.decode(userA.accessToken).sub : null]
  );
  assert.strictEqual(Number(result.rows[0].count), 1);
});

test('취소: 본인 신청을 취소하면 200과 status CANCELLED를 반환한다', async () => {
  const { status, body } = await cancel(userA.accessToken, firstApplicationId);

  assert.strictEqual(status, 200);
  assert.strictEqual(body.status, 'CANCELLED');

  const result = await pool.query('SELECT count(*) FROM applications WHERE id=$1', [firstApplicationId]);
  assert.strictEqual(Number(result.rows[0].count), 1, '취소해도 레코드는 삭제되지 않아야 한다');
});

test('재신청: 취소 후 같은 사용자/샘플로 다시 신청하면 201, 기존 id를 재사용한다', async () => {
  const { status, body } = await apply(userA.accessToken, ongoingSample.id);

  assert.strictEqual(status, 201);
  assert.strictEqual(body.status, 'APPLIED');
  assert.strictEqual(body.id, firstApplicationId);
});

test('신청 시작 전 샘플에 신청하면 400을 반환한다', async () => {
  const scheduledSample = await createSample(adminToken, { start_date: isoDate(3), end_date: isoDate(10) });
  sampleIds.push(scheduledSample.id);

  const user = await signupAndLogin();
  emails.push(user.email);

  const { status } = await apply(user.accessToken, scheduledSample.id);
  assert.strictEqual(status, 400);
});

test('신청 종료일 당일에는 신청에 성공한다', async () => {
  const endingTodaySample = await createSample(adminToken, { start_date: isoDate(-7), end_date: isoDate(0) });
  sampleIds.push(endingTodaySample.id);

  const user = await signupAndLogin();
  emails.push(user.email);

  const { status, body } = await apply(user.accessToken, endingTodaySample.id);
  assert.strictEqual(status, 201);
  applicationIds.push(body.id);
});

test('신청 종료일 다음날에는 신청에 실패한다', async () => {
  const endedSample = await createSample(adminToken, { start_date: isoDate(-7), end_date: isoDate(-1) });
  sampleIds.push(endedSample.id);

  const user = await signupAndLogin();
  emails.push(user.email);

  const { status } = await apply(user.accessToken, endedSample.id);
  assert.strictEqual(status, 400);
});

test('타인 신청 취소 시도: 다른 사용자의 신청을 취소하면 403을 반환한다', async () => {
  const userB = await signupAndLogin();
  emails.push(userB.email);

  const { status } = await cancel(userB.accessToken, firstApplicationId);
  assert.strictEqual(status, 403);
});

test('존재하지 않는 신청 id를 취소하면 404를 반환한다', async () => {
  const { status } = await cancel(userA.accessToken, randomUUID());
  assert.strictEqual(status, 404);
});

test('GET /applications/me: 본인의 신청 내역에 sample 정보가 포함되어 반환된다', async () => {
  const { status, body } = await getMyApplications(userA.accessToken);

  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(body));
  const mine = body.find((a) => a.id === firstApplicationId);
  assert.ok(mine, '본인이 신청한 내역이 포함되어야 한다');
  assert.strictEqual(mine.sample.id, ongoingSample.id);
});

test('GET /samples/:id/applications: ADMIN이 조회하면 user 정보가 포함되고 민감 필드가 없다', async () => {
  const { status, body } = await getSampleApplications(adminToken, ongoingSample.id);

  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(body));
  const found = body.find((a) => a.id === firstApplicationId);
  assert.ok(found, '해당 샘플의 신청 내역이 포함되어야 한다');
  assert.ok(found.user, 'user 필드가 존재해야 한다');
  for (const key of SENSITIVE_KEYS) {
    assert.ok(
      !Object.prototype.hasOwnProperty.call(found.user, key),
      `user에 민감 필드 "${key}"가 노출되면 안 된다`
    );
  }
});

test('BUYER 토큰으로 관리자용 신청 현황을 조회하면 403을 반환한다', async () => {
  const buyerToken = makeBuyerToken();
  const { status } = await getSampleApplications(buyerToken, ongoingSample.id);
  assert.strictEqual(status, 403);
});

test('존재하지 않는 샘플로 관리자용 신청 현황을 조회하면 404를 반환한다', async () => {
  const { status } = await getSampleApplications(adminToken, randomUUID());
  assert.strictEqual(status, 404);
});
