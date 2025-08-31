const axios = require('axios');
const { extractChannelId } = require('../utils/extractChannelId');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

/** ---------- helpers ---------- **/
async function resolveChannelId({ url, channelId }) {
  // If FE sent a real UC… ID, use it
  if (channelId && channelId.startsWith('UC')) return channelId;

  if (!url) throw new Error('URL or channelId is required');

  const extracted = extractChannelId(url);
  if (!extracted) throw new Error('Invalid Channel URL');

  if (extracted.type === 'id') return extracted.value;

  if (extracted.type === 'user') {
    const resp = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'id', forUsername: extracted.value, key: YOUTUBE_API_KEY },
    });
    const id = resp.data?.items?.[0]?.id || null;
    if (!id) throw new Error('Channel not found');
    return id;
  }

  if (extracted.type === 'handle') {
    const resp = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: { part: 'id', q: extracted.value, type: 'channel', maxResults: 1, key: YOUTUBE_API_KEY },
    });
    const id = resp.data?.items?.[0]?.id?.channelId || null;
    if (!id) throw new Error('Channel not found');
    return id;
  }

  throw new Error('Could not resolve channelId');
}

/** ---------- existing channel info (kept) ---------- **/
async function getChannelInfo(req, res) {
  const { url, channelId } = req.body || {};
  try {
    // Accept url or channelId for convenience
    const id = await resolveChannelId({ url, channelId });

    const detailsRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'snippet,statistics', id, key: YOUTUBE_API_KEY },
    });
    const item = detailsRes.data?.items?.[0];
    if (!item) return res.status(404).json({ error: 'Channel not found' });
    return res.json(formatChannel(item));
  } catch (err) {
    const status = err?.response?.status || (/required|Invalid|not found/i.test(err.message) ? 400 : 500);
    console.error('YouTube API Error:', status, err?.response?.data || err.message);
    return res.status(status).json({ error: err.message || 'Failed to fetch channel info' });
  }
}

/** ---------- utils ---------- **/
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

function toNum(v) {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Keep engagementRate as FRACTION (0–1). FE will format as %
function formatVideo(snippet, statistics, contentDetails) {
  const views = toNum(statistics?.viewCount);
  const likes = statistics?.likeCount != null ? toNum(statistics.likeCount) : null;
  const comments = toNum(statistics?.commentCount);
  const engagementRate =
    views && views > 0 ? ((likes ?? 0) + (comments ?? 0)) / views : null;

  return {
    videoId: snippet?.resourceId?.videoId || snippet?.id?.videoId || null,
    title: snippet?.title || null,
    publishedAt: snippet?.publishedAt || null,
    thumbnails: snippet?.thumbnails || null,
    duration: contentDetails?.duration || null,
    views,
    likes,
    comments,
    engagementRate, // 0–1
  };
}

/** ---------- worker ---------- **/
async function fetchRecentVideosByChannelId(channelId, maxResults = 12, days = 30) {
  try {
    const publishedAfter = new Date(Date.now() - Number(days) * 86_400_000).toISOString();

    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'id,snippet',
        channelId,
        order: 'date',
        maxResults: Math.min(Number(maxResults) || 12, 50),
        publishedAfter,
        type: 'video',
        key: YOUTUBE_API_KEY,
      },
    });

    const items = searchRes.data?.items || [];
    const videoIds = items.map(i => i.id?.videoId).filter(Boolean);
    if (videoIds.length === 0) return [];

    const videosRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'statistics,contentDetails',
        id: videoIds.join(','), // comma-separated
        key: YOUTUBE_API_KEY,
      },
    });

    const meta = new Map();
    for (const it of videosRes.data?.items || []) {
      meta.set(it.id, { statistics: it.statistics, contentDetails: it.contentDetails });
    }

    const videos = items.map(item => {
      const vid = item.id?.videoId;
      const m = meta.get(vid) || {};
      const out = formatVideo(item.snippet, m.statistics, m.contentDetails);
      if (!out.videoId) out.videoId = vid || null;
      return out;
    });

    return videos;
  } catch (err) {
    console.error('fetchRecentVideosByChannelId error:', err?.response?.status, err?.response?.data || err.message);
    throw err;
  }
}

/** ---------- handlers ---------- **/
async function getRecentVideos(req, res) {
  try {
    const { url, channelId, maxResults = 12, days = 30 } = req.body || {};
    const id = await resolveChannelId({ url, channelId });

    const videos = await fetchRecentVideosByChannelId(id, maxResults, days);
    console.log('>>> /recent response', { channelId: id, count: videos.length });
    return res.json(videos); // FE expects an array
  } catch (err) {
    console.error('getRecentVideos error:', err?.response?.status, err?.response?.data || err.message);
    const status = err?.response?.status || (/required|Invalid|not found/i.test(err.message) ? 400 : 500);
    return res.status(status).json({ error: err.message || 'Failed to fetch recent videos' });
  }
}

async function getChannelSummary(req, res) {
  try {
    const { url, channelId, maxResults = 12, days = 30 } = req.body || {};
    const id = await resolveChannelId({ url, channelId });

    const detailsRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'snippet,statistics', id, key: YOUTUBE_API_KEY },
    });
    const channelItem = detailsRes.data?.items?.[0];
    if (!channelItem) return res.status(404).json({ error: 'Channel not found' });

    const channel = formatChannel(channelItem);
    const videos = await fetchRecentVideosByChannelId(id, maxResults, days);

    // aggregates
    const views = videos.map(v => v.views).filter(v => typeof v === 'number');
    const avgViews = views.length ? Math.round(views.reduce((a, b) => a + b, 0) / views.length) : null;
    const medianViews = views.length
      ? (() => {
          const s = [...views].sort((a, b) => a - b);
          const mid = Math.floor(s.length / 2);
          return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
        })()
      : null;

    const now = Date.now();
    const oldest = videos.length
      ? videos.reduce((min, v) => Math.min(min, Date.parse(v.publishedAt || now)), now)
      : now;
    const weeks = Math.max(1, (now - oldest) / (7 * 24 * 60 * 60 * 1000));
    const uploadPerWeek = videos.length ? +(videos.length / weeks).toFixed(2) : 0;

    const payload = { channel, aggregates: { avgViews, medianViews, uploadPerWeek }, videos };
    console.log('>>> /summary response', { id: channel.channelId, videos: videos.length, aggregates: payload.aggregates });
    return res.json(payload); // FE expects { channel, aggregates, videos }
  } catch (err) {
    console.error('getChannelSummary error:', err?.response?.status, err?.response?.data || err.message);
    const status = err?.response?.status || (/required|Invalid|not found/i.test(err.message) ? 400 : 500);
    return res.status(status).json({ error: err.message || 'Failed to build channel summary' });
  }
}

module.exports = { getChannelInfo, getRecentVideos, getChannelSummary };
