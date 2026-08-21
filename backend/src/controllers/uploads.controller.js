const AppError = require('../utils/AppError');

async function create(req, res) {
  if (!req.file) {
    throw new AppError(400, '업로드할 파일이 없습니다.');
  }
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
}

module.exports = { create };
