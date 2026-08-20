const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, '인증 토큰이 필요합니다.'));
  }
  const token = header.slice('Bearer '.length);
  let payload;
  try {
    payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    return next(new AppError(401, '유효하지 않거나 만료된 토큰입니다.'));
  }
  req.user = { id: payload.sub, role: payload.role };
  next();
}

module.exports = auth;
