const { test, after } = require('node:test');
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const pool = require('../src/db/pool');

// 이 테스트는 supertest로 app.js를 in-process 실행하지 않는다.
// npm run dev로 이미 떠 있는 개발 서버(http://localhost:3000)에 실제 HTTP 요청을 보낸다.
const BASE_URL = 'http://localhost:3000';

function makeToken(role) {
  return jwt.sign({ sub: randomUUID(), role }, env.JWT_ACCESS_SECRET, { expiresIn: '1h' });
}
const adminToken = makeToken('ADMIN');
const buyerToken = makeToken('BUYER');

function toDateString(date) {
  return date.toISOString().slice(0, 10);
}

function daysFromToday(diff) {
  const d = new Date();
  d.setDate(d.getDate() + diff);
  return toDateString(d);
}

const createdIds = [];

async function createSample(token, overrides = {}) {
  const res = await fetch(`${BASE_URL}/samples`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      name: `샘플-${randomUUID()}`,
      description: '테스트용 샘플',
      image_url: 'https://example.com/sample.jpg',
      start_date: daysFromToday(0),
      end_date: daysFromToday(7),
      ...overrides,
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function updateSample(token, id, overrides = {}) {
  const res = await fetch(`${BASE_URL}/samples/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      name: `수정된 샘플-${randomUUID()}`,
      description: '수정된 설명',
      image_url: 'https://example.com/updated.jpg',
      start_date: daysFromToday(0),
      end_date: daysFromToday(7),
      ...overrides,
    }),
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function getSampleList(token) {
  const res = await fetch(`${BASE_URL}/samples`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function getSample(token, id) {
  const res = await fetch(`${BASE_URL}/samples/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = await res.json();
  return { status: res.status, body };
}

after(async () => {
  if (createdIds.length > 0) {
    await pool.query('DELETE FROM samples WHERE id = ANY($1)', [createdIds]);
  }
  // ponytail: pool.end()는 생략 — auth.test.js와 동일하게 다른 테스트 파일과 pool을 공유한다.
});

test('ADMIN이 진행중(ONGOING) 샘플을 등록하면 201과 status ONGOING을 반환한다', async () => {
  const { status, body } = await createSample(adminToken, {
    start_date: daysFromToday(0),
    end_date: daysFromToday(7),
  });

  assert.strictEqual(status, 201);
  assert.ok(body.id, 'id가 존재해야 한다');
  assert.strictEqual(body.status, 'ONGOING');
  createdIds.push(body.id);
});

let scheduledSampleId;

test('시작일이 미래인 샘플을 등록하면 201과 status SCHEDULED를 반환한다', async () => {
  const { status, body } = await createSample(adminToken, {
    start_date: daysFromToday(3),
    end_date: daysFromToday(10),
  });

  assert.strictEqual(status, 201);
  assert.strictEqual(body.status, 'SCHEDULED');
  scheduledSampleId = body.id;
  createdIds.push(body.id);
});

test('BUYER가 샘플 등록을 시도하면 403을 반환한다', async () => {
  const { status } = await createSample(buyerToken);
  assert.strictEqual(status, 403);
});

test('토큰 없이 샘플 등록을 시도하면 401을 반환한다', async () => {
  const { status } = await createSample(null);
  assert.strictEqual(status, 401);
});

test('목록 조회에 등록한 ONGOING/SCHEDULED 샘플이 포함된다', async () => {
  const { status, body } = await getSampleList(buyerToken);

  assert.strictEqual(status, 200);
  assert.ok(Array.isArray(body));
  const ids = body.map((s) => s.id);
  assert.ok(createdIds.every((id) => ids.includes(id)), '등록한 샘플이 목록에 포함되어야 한다');
});

let endedSampleId;

test('종료된(ENDED) 샘플은 목록 조회에 포함되지 않는다', async () => {
  const { status, body: created } = await createSample(adminToken, {
    start_date: daysFromToday(-10),
    end_date: daysFromToday(-1),
  });
  assert.strictEqual(status, 201);
  endedSampleId = created.id;
  createdIds.push(endedSampleId);

  const { body: list } = await getSampleList(adminToken);
  const ids = list.map((s) => s.id);
  assert.ok(!ids.includes(endedSampleId), '종료된 샘플은 목록에서 제외되어야 한다');
});

test('종료된 샘플도 상세 조회는 가능하며 status ENDED를 반환한다', async () => {
  const { status, body } = await getSample(buyerToken, endedSampleId);

  assert.strictEqual(status, 200);
  assert.strictEqual(body.id, endedSampleId);
  assert.strictEqual(body.status, 'ENDED');
});

test('존재하지 않는 id로 상세 조회하면 404를 반환한다', async () => {
  const { status } = await getSample(buyerToken, randomUUID());
  assert.strictEqual(status, 404);
});

test('ADMIN이 샘플을 수정하면 200과 변경된 내용을 반환한다', async () => {
  const newName = `수정됨-${randomUUID()}`;
  const { status, body } = await updateSample(adminToken, scheduledSampleId, { name: newName });

  assert.strictEqual(status, 200);
  assert.strictEqual(body.id, scheduledSampleId);
  assert.strictEqual(body.name, newName);
});

test('BUYER가 샘플 수정을 시도하면 403을 반환한다', async () => {
  const { status } = await updateSample(buyerToken, scheduledSampleId);
  assert.strictEqual(status, 403);
});

test('존재하지 않는 id로 수정을 시도하면 404를 반환한다', async () => {
  const { status } = await updateSample(adminToken, randomUUID());
  assert.strictEqual(status, 404);
});
