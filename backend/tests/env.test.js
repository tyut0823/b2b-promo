const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');

const ENV_MODULE_PATH = path.join(__dirname, '..', 'src', 'config', 'env.js');

const REQUIRED_ENV = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/b2b_promo',
  JWT_ACCESS_SECRET: 'access-secret',
  JWT_REFRESH_SECRET: 'refresh-secret',
  JWT_ACCESS_EXPIRES_IN: '1h',
  JWT_REFRESH_EXPIRES_IN: '14d',
  PORT: '3000',
};

function runEnvCheck(env) {
  return spawnSync(
    process.execPath,
    ['-e', `require(${JSON.stringify(ENV_MODULE_PATH)})`],
    { env, cwd: os.tmpdir() }
  );
}

for (const missingKey of Object.keys(REQUIRED_ENV)) {
  test(`env.js: ${missingKey}가 없으면 process.exit(1)로 종료된다`, () => {
    const env = { ...REQUIRED_ENV };
    delete env[missingKey];

    const result = runEnvCheck(env);

    assert.strictEqual(result.status, 1);
    assert.ok(
      result.stderr.toString().includes(missingKey),
      `stderr에 "${missingKey}"가 포함되어야 한다. 실제 stderr: ${result.stderr.toString()}`
    );
  });
}

test('env.js: 필수 환경변수가 모두 있으면 정상 종료(exit code 0)된다', () => {
  const env = { ...REQUIRED_ENV };

  const result = runEnvCheck(env);

  assert.strictEqual(result.status, 0);
});
