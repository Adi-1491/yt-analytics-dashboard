const express = require('express');
const router = express.Router();
const { getChannelInfo, getRecentVideos } = require('../controllers/youtubeController');

router.post('/channel',getChannelInfo);
router.post('/recent', getRecentVideos);

module.exports = router;