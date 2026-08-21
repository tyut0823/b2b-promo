require('dotenv').config();

const REQUIRED_KEYS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'PORT',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_STORAGE_BUCKET',
];

function findMissingKeys(env) {
  return REQUIRED_KEYS.filter((key) => !env[key]);
}

const missing = findMissingKeys(process.env);

if (missing.length > 0) {
  console.error('[env] 필수 환경변수 누락: ' + missing.join(', '));
  process.exit(1);
}

module.exports = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
  PORT: Number(process.env.PORT),
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET,
  findMissingKeys,
};
