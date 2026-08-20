const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const AppError = require('../utils/AppError');

const SALT_ROUNDS = 10;

async function getMe(userId) {
  const { rows } = await pool.query(
    'SELECT id, account_type, email, name, company_name, created_at FROM users WHERE id = $1',
    [userId]
  );
  if (!rows[0]) {
    throw new AppError(404, '사용자를 찾을 수 없습니다.');
  }
  return rows[0];
}

async function updateMe(userId, { name, company_name }) {
  const { rows } = await pool.query(
    `UPDATE users
     SET name = COALESCE($1, name), company_name = COALESCE($2, company_name)
     WHERE id = $3
     RETURNING id, account_type, email, name, company_name, created_at`,
    [name ?? null, company_name ?? null, userId]
  );
  if (!rows[0]) {
    throw new AppError(404, '사용자를 찾을 수 없습니다.');
  }
  return rows[0];
}

async function updatePassword(userId, { current_password, new_password }) {
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) {
    throw new AppError(404, '사용자를 찾을 수 없습니다.');
  }
  const ok = await bcrypt.compare(current_password, user.password_hash);
  if (!ok) {
    throw new AppError(400, '현재 비밀번호가 올바르지 않습니다.');
  }
  const newHash = await bcrypt.hash(new_password, SALT_ROUNDS);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
  return { message: '비밀번호가 변경되었습니다.' };
}

module.exports = { getMe, updateMe, updatePassword };
