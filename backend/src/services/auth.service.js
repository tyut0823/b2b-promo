const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const env = require('../config/env');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
}

async function signup({ email, password, name, company_name }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (account_type, email, password_hash, name, company_name)
       VALUES ('BUYER', $1, $2, $3, $4)
       RETURNING id, account_type, email, name, company_name, created_at`,
      [email, passwordHash, name, company_name]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(400, '이미 사용 중인 이메일입니다.');
    }
    throw err;
  }
}

async function login({ email, password }) {
  const { rows } = await pool.query(
    'SELECT id, account_type, password_hash FROM users WHERE email = $1',
    [email]
  );
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) {
    throw new AppError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
  }
  const payload = { sub: user.id, role: user.account_type };
  return {
    access_token: signAccessToken(payload),
    refresh_token: signRefreshToken(payload),
  };
}

async function refresh({ refresh_token }) {
  let payload;
  try {
    payload = jwt.verify(refresh_token, env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError(401, '유효하지 않은 토큰입니다.');
  }
  return { access_token: signAccessToken({ sub: payload.sub, role: payload.role }) };
}

module.exports = { signup, login, refresh };
