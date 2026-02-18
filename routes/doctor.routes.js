const express = require('express');
const router = express.Router();
const doctorCtrl = require('../controllers/doctor.controller');

router.post('/create', doctorCtrl.createDoctor);

module.exports = router;
