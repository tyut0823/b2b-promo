const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const upload = require('../middlewares/upload');
const controller = require('../controllers/uploads.controller');

const router = express.Router();

router.post('/', auth, requireRole('ADMIN'), upload.single('file'), asyncHandler(controller.create));

module.exports = router;
