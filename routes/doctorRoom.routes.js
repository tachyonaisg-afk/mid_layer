const router = require('express').Router();
const ctrl = require('../controllers/doctorRoom.controller');

router.post('/assign', ctrl.assignRoom);
router.get('/doctor_room', ctrl.getDoctorRoom);
router.get('/all', ctrl.getAssignments);
router.put('/update/:id', ctrl.updateAssignment);
router.delete('/delete/:id', ctrl.deleteAssignment);
router.get("/assignments/by-company-date", ctrl.getAssignmentsByCompanyDate);
router.get("/assignments/by-slot", ctrl.getAssignmentsBySlot);
// GET all assignments by doctor_id
router.get('/assignments/by-doctor-company', ctrl.getAssignmentsByDoctorAndCompany);

module.exports = router;