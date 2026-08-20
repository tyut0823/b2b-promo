const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middlewares/auth');
const requireRole = require('../middlewares/requireRole');
const controller = require('../controllers/samples.controller');
const applicationsController = require('../controllers/applications.controller');

const router = express.Router();

router.get('/', auth, asyncHandler(controller.list));
router.get('/:id', auth, asyncHandler(controller.detail));
router.post('/', auth, requireRole('ADMIN'), asyncHandler(controller.create));
router.put('/:id', auth, requireRole('ADMIN'), asyncHandler(controller.update));
router.get('/:id/applications', auth, requireRole('ADMIN'), asyncHandler(applicationsController.listBySample));

module.exports = router;
