const express = require('express');
const router = express.Router();
const { getChannelInfo, getRecentVideos, getChannelSummary, getCadence } = require('../controllers/youtubeController');

router.post('/channel',getChannelInfo);
router.post('/recent', getRecentVideos);
router.post('/summary',getChannelSummary);
router.get('/insights/cadence',getCadence);

module.exports = router;