const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/location.controller");

//  Autocomplete
router.get("/autocomplete", ctrl.getAutocomplete);

//  Place details
router.get("/details", ctrl.getPlaceDetails);

module.exports = router;