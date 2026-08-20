const env = require('./config/env');
const app = require('./app');
const pool = require('./db/pool');

async function ensureDbConnected(dbPool = pool) {
  try {
    await dbPool.query('SELECT 1');
    console.log('[db] connected');
    return true;
  } catch (err) {
    console.error('[db] connection failed', err);
    return false;
  }
}

async function start() {
  const connected = await ensureDbConnected();
  if (!connected) {
    process.exit(1);
    return;
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[server] listening on port ${env.PORT}`);
  });

  function shutdown(signal) {
    console.log(`[server] received ${signal}, shutting down`);
    server.close(() => {
      console.log('[server] closed');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  start();
}

module.exports = { ensureDbConnected, start };
