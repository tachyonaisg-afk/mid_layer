const router = require('express').Router();
const ctrl = require('../controllers/doctorAvailability.controller');

router.post('/add', ctrl.addUnavailable);
router.get('/check', ctrl.getDoctorAvailability);
router.put('/update', ctrl.updateUnavailable);
router.delete('/delete/:id', ctrl.deleteUnavailable);

module.exports = router;