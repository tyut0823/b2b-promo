const pool = require('../db/pool');
const AppError = require('../utils/AppError');

const STATUS_CASE = `
  CASE
    WHEN start_date > CURRENT_DATE THEN 'SCHEDULED'
    WHEN end_date < CURRENT_DATE THEN 'ENDED'
    ELSE 'ONGOING'
  END AS status
`;

async function list() {
  const { rows } = await pool.query(
    `SELECT id, name, description, image_url, start_date, end_date, created_at,
      CASE WHEN start_date > CURRENT_DATE THEN 'SCHEDULED' ELSE 'ONGOING' END AS status
     FROM samples
     WHERE end_date >= CURRENT_DATE
     ORDER BY start_date ASC`
  );
  return rows;
}

async function detail(id) {
  const { rows } = await pool.query(
    `SELECT id, name, description, image_url, start_date, end_date, created_at, ${STATUS_CASE}
     FROM samples WHERE id = $1`,
    [id]
  );
  if (!rows[0]) throw new AppError(404, '샘플을 찾을 수 없습니다.');
  return rows[0];
}

async function create({ name, description, image_url, start_date, end_date }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO samples (name, description, image_url, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, image_url, start_date, end_date, created_at, ${STATUS_CASE}`,
      [name, description ?? null, image_url ?? null, start_date, end_date]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23514') {
      throw new AppError(400, '신청 종료일은 시작일 이후여야 합니다.');
    }
    throw err;
  }
}

async function update(id, { name, description, image_url, start_date, end_date }) {
  try {
    const { rows } = await pool.query(
      `UPDATE samples SET name = $1, description = $2, image_url = $3, start_date = $4, end_date = $5
       WHERE id = $6
       RETURNING id, name, description, image_url, start_date, end_date, created_at, ${STATUS_CASE}`,
      [name, description ?? null, image_url ?? null, start_date, end_date, id]
    );
    if (!rows[0]) throw new AppError(404, '샘플을 찾을 수 없습니다.');
    return rows[0];
  } catch (err) {
    if (err.code === '23514') {
      throw new AppError(400, '신청 종료일은 시작일 이후여야 합니다.');
    }
    throw err;
  }
}

module.exports = { list, detail, create, update };
