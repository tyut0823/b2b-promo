const service = require('../services/users.service');
const AppError = require('../utils/AppError');

async function me(req, res) {
  const user = await service.getMe(req.user.id);
  res.status(200).json(user);
}

async function updateMe(req, res) {
  const { name, company_name } = req.body;
  const user = await service.updateMe(req.user.id, { name, company_name });
  res.status(200).json(user);
}

async function updatePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    throw new AppError(400, '필수 항목이 누락되었습니다.');
  }
  const result = await service.updatePassword(req.user.id, { current_password, new_password });
  res.status(200).json(result);
}

module.exports = { me, updateMe, updatePassword };
