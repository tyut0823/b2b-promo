const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

module.exports = pool;
