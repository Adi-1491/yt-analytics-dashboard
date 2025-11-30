require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// ✅ UPDATE CORS - Allow only your frontend
app.use(cors({
  origin: [
    'https://yt-analytics-dashboard.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  const hasKey = !!process.env.YOUTUBE_API_KEY;
  res.json({
    ok: true,
    envKeyLoaded: hasKey,
    keyPreview: hasKey ? process.env.YOUTUBE_API_KEY.slice(0, 6) + '...' : null
  });
});

const youtubeRoutes = require('./routes/youtubeRoutes');
app.use('/api/youtube', youtubeRoutes);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`Server Running on port ${PORT}`); // ✅ FIXED syntax
});