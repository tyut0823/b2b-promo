const service = require('../services/applications.service');
const AppError = require('../utils/AppError');

async function apply(req, res) {
  const { sample_id } = req.body;
  if (!sample_id) {
    throw new AppError(400, '필수 항목이 누락되었습니다.');
  }
  const application = await service.apply(sample_id, req.user.id);
  res.status(201).json(application);
}

async function cancel(req, res) {
  if (req.body.status !== 'CANCELLED') {
    throw new AppError(400, '잘못된 요청입니다.');
  }
  const application = await service.cancel(req.params.id, req.user.id);
  res.status(200).json(application);
}

async function listMine(req, res) {
  const applications = await service.listMine(req.user.id);
  res.status(200).json(applications);
}

async function listBySample(req, res) {
  const applications = await service.listBySample(req.params.id);
  res.status(200).json(applications);
}

module.exports = { apply, cancel, listMine, listBySample };
