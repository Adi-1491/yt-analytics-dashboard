const axios = require('axios');
const { extractChannelId } = require('../utils/extractChannelId');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function getChannelInfo(req,res) {
    const { url } = req.body;
    if(!url) return res.status(400).json({error: 'URL is required'});

    const extracted = extractChannelId(url);
    if(!extracted) res.status(400).json({error:'Invalid Channel URL'});
}