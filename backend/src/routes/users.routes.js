const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const auth = require('../middlewares/auth');
const controller = require('../controllers/users.controller');

const router = express.Router();

router.get('/me', auth, asyncHandler(controller.me));
router.put('/me', auth, asyncHandler(controller.updateMe));
router.put('/me/password', auth, asyncHandler(controller.updatePassword));

module.exports = router;
