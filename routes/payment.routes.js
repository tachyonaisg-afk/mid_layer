const express = require('express');
const router = express.Router();
const paymentCtrl = require('../controllers/payment.controller');

router.post('/create', paymentCtrl.createPayment);
router.post('/webhook', paymentCtrl.paymentWebhook);
router.get('/success', paymentCtrl.paymentSuccess);

// router.post('/verify', paymentCtrl.verifyPaymentFallback);
module.exports = router;
