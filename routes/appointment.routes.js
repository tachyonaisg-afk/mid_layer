const express = require('express');
const router = express.Router();
const appointmentCtrl = require('../controllers/appointment.controller');

router.post('/create', appointmentCtrl.createAppointment);
router.get('/queue/:company/:appointment_id', appointmentCtrl.getQueueByAppointment);
router.get('/count', appointmentCtrl.getPatientCountByDoctorDate);
router.get('/company-patient-count', appointmentCtrl.getTotalPatientsByCompanyDate);
router.get('/doctor-queue', appointmentCtrl.getQueueByDoctorDate);

module.exports = router;
