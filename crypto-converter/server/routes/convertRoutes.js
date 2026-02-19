const express = require('express');
const { convert, coins, trend, health } = require('../controllers/convertController');

const router = express.Router();

router.get('/convert', convert);
router.get('/coins', coins);
router.get('/trend', trend);
router.get('/health', health);

module.exports = router;