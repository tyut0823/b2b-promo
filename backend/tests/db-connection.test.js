const { test } = require('node:test');
const assert = require('node:assert');
const { Pool } = require('pg');
const { ensureDbConnected } = require('../src/server');

test('DB 연결 실패 시 ensureDbConnected가 false를 반환한다', async () => {
  const badPool = new Pool({
    connectionString: 'postgresql://postgres:postgres@localhost:5433/b2b_promo',
  });

  const result = await ensureDbConnected(badPool);

  assert.strictEqual(result, false);
  await badPool.end();
});

test('DB 연결 성공 시 ensureDbConnected가 true를 반환한다', async () => {
  const result = await ensureDbConnected();
  assert.strictEqual(result, true);
});
