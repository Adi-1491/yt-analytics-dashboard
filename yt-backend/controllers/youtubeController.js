const axios = require('axios');
const { extractChannelId } = require('../utils/extractChannelId');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function getChannelInfo(req, res) {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const extracted = extractChannelId(url);
  if (!extracted) return res.status(400).json({ error: 'Invalid Channel URL' });

  try {

    let channelId = null;
    
    //     channelId → direct /channels?id=...
    // username → direct /channels?forUsername=...
    // handle/custom → /search first → then /channels?id=...

    if (extracted.type === 'id') {
      // already a real channelId
      channelId = extracted.value;
    } 
    else if (extracted.type === 'user') {
      // legacy /user/<username>
      const resp = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet,statistics',
          forUsername: extracted.value,
          key: YOUTUBE_API_KEY,
        },
      });
      if (!resp.data.items?.length) return res.status(404).json({ error: 'Channel not found' });
      return res.json(formatChannel(resp.data.items[0]));
    } else if (extracted.type === 'handle') {
      // handle or legacy custom -> search to get channelId
      const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'id',
          q: extracted.value,
          type: 'channel',
          maxResults: 1,
          key: YOUTUBE_API_KEY,
        },
      });
      channelId = searchRes.data.items?.[0]?.id?.channelId || null;
      if (!channelId) return res.status(404).json({ error: 'Channel not found' });
    }

    // If we have a channelId (from 'id' branch or after search), fetch details:
    if (channelId) {
      const detailsRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet,statistics',
          id: channelId,
          key: YOUTUBE_API_KEY,
        },
      });
      if (!detailsRes.data.items?.length) return res.status(404).json({ error: 'Channel not found' });
      return res.json(formatChannel(detailsRes.data.items[0]));
    }

    // Shouldn't reach here, but just in case:
    return res.status(400).json({ error: 'Unable to resolve channel' });
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error('YouTube API Error:', status, JSON.stringify(data, null, 2));
    return res.status(status || 500).json({
      error: 'Failed to fetch channel info',
      upstreamStatus: status || 500,
      upstream: data || null,
    });
  }
}

//provide cleaner data of youtube API(since data of youtube api is heavy and messy)
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

//since youtube provides analytics in string converting them to number
function toNum(v) {
    if(v==null) 
    {
        return null;
    }
    else {
       return Number(v);
    }
}

//similar to formatchannel we are creating this function to get similar data (the data we need) for the tool since api gives a lot bulky data
function formatVideo(snippet, statistics, contentDetails) {
    const views = toNum(statistics?.viewCount);
    const likes = (statistics?.likeCount!=null) ? toNum(statistics.likeCount) : null;
    const comments =  toNum(statistics?.commentCount);
    const engagementRate = (views && views > 0) ? (((likes ?? 0) + (comments ?? 0)) / views) * 100 : null;
    return {
        videoId: snippet?.resourceId?.videoId || snippet?.id?.videoId || null,
        title: snippet?.title || null,
        publishedAt: snippet?.publishedAt || null,
        thumbnails: snippet?.thumbnails || null,
        duration: contentDetails?.duration || null,
        views,
        likes,
        comments,
        engagementRate
    };
}

// worker that knows how to fetch videos when channelID is given
async function fetchRecentVideosByChannelId(channelId, maxResults = 12, days = 30){
    try {

        //gives details about published videos in last n days i.e in our case 30 days in milliseconds
        const publishedAfter = new Date(Date.now() - Number(days)*86_400_000).toISOString();

        const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search',{
            params:{
                part: 'id,snippet', //includes video id and basic snippet: thumbnails, publishedAt etc.
                channelId:channelId,
                order:'date', //sort by date
                maxResults:Math.min(Number(maxResults) || 12, 50), //YouTube API has a maximum limit of 50 results per request
                publishedAfter:publishedAfter,
                type:'video',
                key:YOUTUBE_API_KEY
            },
        });

        //
        const items = searchRes.data?.items || []; //are there any items in searchres??
        const videoIds = items.map(i => i.id?.videoId).filter(Boolean); //boolean to remove falsy value like undefined from the map
        if(videoIds.length === 0)
            return [];

        //fetching stats and duration from the ids of the videos
        const videosRes = await axios.get('https://www.googleapis.com/youtube/v3/videos',{
            params:{
                part:'statistics,contentDetails',
                id:videoIds.join(','), //videoids are in an array, YouTube Videos API parameter id does not accept an array — it expects a comma-separated string
                key:YOUTUBE_API_KEY
            },
        });

        //creating a map to store videos id and details(like stats and content details in key value pair)
        const meta = new Map();
        for(const it of(videosRes.data?.items || [])) {
            meta.set(it.id, {
                statistics:it.statistics,
                contentDetails: it.contentDetails
            });
        }

        //merging the 2 data set we have i.e items(basic video info) and meta(detailed info)

        const videos = items.map(item => {
            const vid = item.id?.videoId;
            const m = meta.get(vid) || {};
            const out = formatVideo(item.snippet, m.statistics, m.contentDetails);
            if(!out.videoId) out.videoId = vid || null;  //This line is a backup plan. It guarantees that every video you return has a videoId field, even if the earlier steps forgot it.
            return out;
        });

        return videos;
    }
    catch(err){
        console.error('fetchRecentVideosByChannelId search error:', err?.response?.status, err?.response?.data || err.message);
        throw err;
    }
}

//receptionist that talks to the frontend,listens to requests,extracts the channelId from the URL,asks the worker to fetch videos,gives the answer back to the frontend.
async function getRecentVideos(req,res) {
    const { url, maxResults = 12 , days = 30 } = req.body;
    if(!url) return res.status(400).json({error:'URL is required'});

    const extracted = extractChannelId(url);
    if(!extracted) return res.status(400).json({error:'Invalid Channel URL'});

    try {
        let channelId = null;
        if(extracted.type === 'id')
        {
            channelId = extracted.value;
        }
        else if(extracted.type === 'user') {
            const resp = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                params: {
                    part:'id',
                    forUsername: extracted.value,
                    key:YOUTUBE_API_KEY
                },
            });
            channelId = resp.data?.items?.[0]?.id || null;
            if (!channelId) return res.status(404).json({ error: 'Channel not found' });
        }

        else if(extracted.type === 'handle') {
            const resp = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                params: {
                    part: 'id',
                    q: extracted.value,
                    type:'channel',
                    maxResults:1,
                    key:YOUTUBE_API_KEY
                },
            });
            channelId = resp.data?.items?.[0]?.id?.channelId || null;
            if (!channelId) return res.status(404).json({ error: 'Channel not found' });
        }
        
            if (!channelId) return res.status(404).json({ error: 'Channel not found' });
            const videos = await fetchRecentVideosByChannelId(channelId, maxResults, days);
            return res.json({channelId, videos});
    }

    catch(err) {
        console.error('getRecentVideos error:', err?.response?.status, err?.response?.data || err.message);
        return res.status(err?.response?.status || 500).json({ error: 'Failed to fetch recent videos' });
    }
};



module.exports = { getChannelInfo, getRecentVideos };