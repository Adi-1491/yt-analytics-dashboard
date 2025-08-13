const axios = require('axios');
const { extractChannelId } = require('../utils/extractChannelId');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function getChannelInfo(req,res) {
    const { url } = req.body;
    if(!url) return res.status(400).json({error: 'URL is required'});

    const extracted = extractChannelId(url);
    if(!extracted) res.status(400).json({error:'Invalid Channel URL'});

    try {

        let channelId = null;

        if(extracted.type === 'id') {
            channelId = extracted.value;
        }

        //if value is legacy name i.e /user/pewdipie then hit the channel api whose legacy name equals the value
        else if(extracted.value === 'user') {
            const res = axios.get('https://www.googleapis.com/youtube/v3/channels',{
                params: {
                    part:'snippet, statistics',
                    forUsername:extracted.value,
                    key:YOUTUBE_API_KEY
                },
            });
            if (!resp.data.items?.length) return res.status(404).json({ error: 'Channel not found' });
            return res.json(formatChannel(resp.data.items[0]));
        }

        else if(extracted.value === 'handle') {
            const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'id',
                    q:extracted.value,
                    type: 'channel',
                    maxResults: 1,
                    key: YOUTUBE_API_KEY,
                },
            });
            channelId = search.data.items?.[0]?.id?.channelId || null;
            if(!channelId) res.status(404).json({error: 'Channel not found'});

            const details = axios.get('https://www.googleapis.com/youtube/v3/channels',{
                params: {
                    part: 'snippet.statistics',
                    id:channelId,
                    key:YOUTUBE_API_KEY,
                },
            });
            if (!details.data.items?.length) return res.status(404).json({ error: 'Channel not found' });
            return res.json(formatChannel(details.data.items[0]));
        }
    }

    catch(err) {
        console.error('YouTube API Error:', err?.response?.data || err.message);
        return res.status(500).json({err:'Failed to fetch channel info'});
    }
}

function formatChannel(item) {
    return {
        channelId: item.id,
        name: item.snippet.title,
        description: item.snippet.description,
        profilePic: item.snippet.thumbnails?.default?.url || null,
        subscribers: item.statistics?.subscriberCount || null,
        totalViews: item.statistics?.viewCount || null,
        totalVideos: item.statistics?.videoCount || null,
    };
}

module.exports = { getChannelInfo };



