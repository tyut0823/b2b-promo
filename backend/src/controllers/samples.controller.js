const service = require('../services/samples.service');
const AppError = require('../utils/AppError');

async function list(req, res) {
  const samples = await service.list();
  res.status(200).json(samples);
}

async function detail(req, res) {
  const sample = await service.detail(req.params.id);
  res.status(200).json(sample);
}

async function create(req, res) {
  const { name, description, image_url, start_date, end_date } = req.body;
  if (!name || !start_date || !end_date) {
    throw new AppError(400, '필수 항목이 누락되었습니다.');
  }
  const sample = await service.create({ name, description, image_url, start_date, end_date });
  res.status(201).json(sample);
}

async function update(req, res) {
  const { name, description, image_url, start_date, end_date } = req.body;
  if (!name || !start_date || !end_date) {
    throw new AppError(400, '필수 항목이 누락되었습니다.');
  }
  const sample = await service.update(req.params.id, { name, description, image_url, start_date, end_date });
  res.status(200).json(sample);
}

module.exports = { list, detail, create, update };
