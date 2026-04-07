const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/prescription.controller");
const upload = require("../middleware/upload.middleware");

router.post(
    "/send",
    upload.single("pdf"), 
    ctrl.uploadAndSendPrescription
);

router.get("/prescription/:token", ctrl.showPasswordPage);
router.post("/prescription/:token", ctrl.verifyPasswordAndDownload);


router.get("/report/:token", ctrl.showPasswordPage);
router.post("/report/:token", ctrl.verifyPasswordAndDownload);

module.exports = router;