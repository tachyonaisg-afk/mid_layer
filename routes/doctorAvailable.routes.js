const express = require('express');
const router = express.Router();
const controller = require('../controllers/doctorAvailable.controller');

router.post('/Create', controller.createAvailable);
router.get('/fetch', controller.getAvailable);

module.exports = router;