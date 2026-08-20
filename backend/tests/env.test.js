const { test } = require('node:test');
const assert = require('node:assert');
const env = require('../src/config/env');

const REQUIRED_ENV = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/b2b_promo',
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_ACCESS_EXPIRES_IN: '1h',
  JWT_REFRESH_EXPIRES_IN: '14d',
  PORT: '3000',
};

for (const missingKey of Object.keys(REQUIRED_ENV)) {
  test(`env.js: ${missingKey}가 없으면 findMissingKeys가 이를 감지한다`, () => {
    const partialEnv = { ...REQUIRED_ENV };
    delete partialEnv[missingKey];

    const missing = env.findMissingKeys(partialEnv);

    assert.ok(
      missing.includes(missingKey),
      `${missingKey}가 누락 목록에 포함되어야 한다. 실제: ${missing.join(', ')}`
    );
  });
}

test('env.js: 필수 환경변수가 모두 있으면 findMissingKeys가 빈 배열을 반환한다', () => {
  const missing = env.findMissingKeys(REQUIRED_ENV);
  assert.deepStrictEqual(missing, []);
});
