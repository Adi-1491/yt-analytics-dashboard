const express = require('express');
const router = express.Router();
const { getChannelInfo, getRecentVideos, getChannelSummary } = require('../controllers/youtubeController');

router.post('/channel',getChannelInfo);
router.post('/recent', getRecentVideos);
router.post('/summary',getChannelSummary);

module.exports = router;