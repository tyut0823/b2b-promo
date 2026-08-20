const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  console.error('[error]', err);
  return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
}

module.exports = errorHandler;
