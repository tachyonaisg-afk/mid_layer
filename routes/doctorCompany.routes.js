const express = require('express');
const router = express.Router();

const doctorCompanyCtrl = require('../controllers/doctorCompany.controller');

router.post('/empanel', doctorCompanyCtrl.empanelDoctor);
router.get(
    '/company/:company',
    doctorCompanyCtrl.getDoctorsByCompany
);
router.post("/remove-empanel-doctor", doctorCompanyCtrl.removeEmpanelDoctor);

router.get(
    "/empanel/company/:company/doctor/:doctor_id",
    doctorCompanyCtrl.getDoctorByCompanyAndDoctorId
);

// update empnel doctor router
router.put(
    "/update-empanel-doctor",
    doctorCompanyCtrl.updateEmpanelDoctor
);

// for delete
router.delete(
    "/delete-empanel-doctor",
    doctorCompanyCtrl.deleteEmpanelDoctor
);

module.exports = router;