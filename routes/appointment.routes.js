const express = require('express');
const router = express.Router();
const appointmentCtrl = require('../controllers/appointment.controller');

router.post('/create', appointmentCtrl.createAppointment);
router.get('/queue/:appointment_id', appointmentCtrl.getQueueByAppointment);


module.exports = router;
