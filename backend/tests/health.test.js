const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

test('GET /health는 200과 { status: "ok" }를 반환한다', async () => {
  const res = await request(app).get('/health');

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { status: 'ok' });
});

test('존재하지 않는 경로는 404를 반환한다', async () => {
  const res = await request(app).get('/not-exists');

  assert.strictEqual(res.status, 404);
});
