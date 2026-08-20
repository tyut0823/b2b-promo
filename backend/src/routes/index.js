const express = require('express');
const authRoutes = require('./auth.routes');

const router = express.Router();
router.use('/auth', authRoutes);
router.use('/samples', require('./samples.routes'));
router.use('/applications', require('./applications.routes'));
router.use('/users', require('./users.routes'));

module.exports = router;
