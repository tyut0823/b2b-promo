const AppError = require('../utils/AppError');
const service = require('../services/uploads.service');

async function create(req, res) {
  if (!req.file) {
    throw new AppError(400, '업로드할 파일이 없습니다.');
  }
  const url = await service.uploadImage(req.file);
  res.status(201).json({ url });
}

module.exports = { create };
