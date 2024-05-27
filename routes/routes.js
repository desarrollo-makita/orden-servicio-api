const express = require('express');
const router = express.Router();

const { ordenServicio } = require('../controllers/ordenServicioControllers');


router.get('/proceso-telecontrol', ordenServicio);


module.exports = router;
