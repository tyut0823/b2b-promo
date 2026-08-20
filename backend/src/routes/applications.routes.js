const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middlewares/auth');
const controller = require('../controllers/applications.controller');

const router = express.Router();

router.get('/me', auth, asyncHandler(controller.listMine));
router.post('/', auth, asyncHandler(controller.apply));
router.patch('/:id', auth, asyncHandler(controller.cancel));

module.exports = router;
