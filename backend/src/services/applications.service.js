const pool = require('../db/pool');
const AppError = require('../utils/AppError');

async function apply(sampleId, userId) {
  const { rows: sampleRows } = await pool.query(
    'SELECT id, start_date, end_date FROM samples WHERE id = $1',
    [sampleId]
  );
  const sample = sampleRows[0];
  if (!sample) {
    throw new AppError(404, '샘플을 찾을 수 없습니다.');
  }
  const { rows: dateCheck } = await pool.query(
    'SELECT (CURRENT_DATE BETWEEN $1::date AND $2::date) AS in_period',
    [sample.start_date, sample.end_date]
  );
  if (!dateCheck[0].in_period) {
    throw new AppError(400, '신청 기간이 아닙니다.');
  }

  const { rows } = await pool.query(
    `INSERT INTO applications (sample_id, user_id, status)
     VALUES ($1, $2, 'APPLIED')
     ON CONFLICT (sample_id, user_id)
     DO UPDATE SET status = 'APPLIED'
     WHERE applications.status = 'CANCELLED'
     RETURNING id, sample_id, user_id, status, created_at`,
    [sampleId, userId]
  );

  if (rows.length === 0) {
    throw new AppError(409, '이미 신청한 샘플입니다.');
  }
  return rows[0];
}

async function cancel(id, userId) {
  const { rows } = await pool.query(
    'SELECT id, user_id, status FROM applications WHERE id = $1',
    [id]
  );
  const application = rows[0];
  if (!application) {
    throw new AppError(404, '신청 내역을 찾을 수 없습니다.');
  }
  if (application.user_id !== userId) {
    throw new AppError(403, '본인의 신청이 아닙니다.');
  }
  if (application.status !== 'APPLIED') {
    throw new AppError(404, '신청 내역을 찾을 수 없습니다.');
  }

  const { rows: updated } = await pool.query(
    `UPDATE applications SET status = 'CANCELLED'
     WHERE id = $1 AND status = 'APPLIED'
     RETURNING id, sample_id, user_id, status, created_at`,
    [id]
  );
  return updated[0];
}

async function listMine(userId) {
  const { rows } = await pool.query(
    `SELECT
       a.id, a.sample_id, a.user_id, a.status, a.created_at,
       json_build_object(
         'id', s.id, 'name', s.name, 'description', s.description,
         'image_url', s.image_url, 'start_date', s.start_date, 'end_date', s.end_date,
         'created_at', s.created_at,
         'status', CASE WHEN s.start_date > CURRENT_DATE THEN 'SCHEDULED'
                         WHEN s.end_date < CURRENT_DATE THEN 'ENDED'
                         ELSE 'ONGOING' END
       ) AS sample
     FROM applications a
     JOIN samples s ON s.id = a.sample_id
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC`,
    [userId]
  );
  return rows;
}

async function listBySample(sampleId) {
  const { rows: sampleRows } = await pool.query('SELECT id FROM samples WHERE id = $1', [sampleId]);
  if (!sampleRows[0]) {
    throw new AppError(404, '샘플을 찾을 수 없습니다.');
  }

  const { rows } = await pool.query(
    `SELECT
       a.id, a.sample_id, a.user_id, a.status, a.created_at,
       json_build_object(
         'id', u.id, 'account_type', u.account_type, 'email', u.email,
         'name', u.name, 'company_name', u.company_name, 'created_at', u.created_at
       ) AS "user"
     FROM applications a
     JOIN users u ON u.id = a.user_id
     WHERE a.sample_id = $1
     ORDER BY a.created_at DESC`,
    [sampleId]
  );
  return rows;
}

module.exports = { apply, cancel, listMine, listBySample };
