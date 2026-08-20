const AppError = require('../utils/AppError');
const authService = require('../services/auth.service');

async function signup(req, res) {
  const { email, password, name, company_name } = req.body;
  if (!email || !password || !name || !company_name) {
    throw new AppError(400, '필수 항목이 누락되었습니다.');
  }
  const user = await authService.signup({ email, password, name, company_name });
  res.status(201).json(user);
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError(400, '필수 항목이 누락되었습니다.');
  }
  const tokens = await authService.login({ email, password });
  res.status(200).json(tokens);
}

async function refresh(req, res) {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    throw new AppError(400, '필수 항목이 누락되었습니다.');
  }
  const result = await authService.refresh({ refresh_token });
  res.status(200).json(result);
}

module.exports = { signup, login, refresh };
