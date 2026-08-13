const env = require('./config/env');
const app = require('./app');

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
