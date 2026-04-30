const jwt = require('jsonwebtoken');
const LiveSession = require('../models/LiveSession');
const { error } = require('../utils/response');

const PLAYER_TOKEN_EXPIRY = '4h';
const PLAYER_SECRET = process.env.JWT_SECRET + '_player';

// Extract YouTube video ID from any YouTube URL format
const extractVideoId = (url) => {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/watch\?(?:.*&)?v=([^&]+)/,
    /youtube\.com\/embed\/([^?&/]+)/,
    /youtube\.com\/live\/([^?&/]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

// Student calls this to receive a short-lived player token
const getPlayerToken = async (req, res, next) => {
  try {
    const session = await LiveSession.findById(req.params.sessionId)
      .select('+youtubeUrl +recordingUrl');

    if (!session) return error(res, 'Session not found', 404);

    if (session.state === 'UPCOMING') {
      return error(res, 'Session has not started yet', 403);
    }

    const useRecording = session.state === 'COMPLETED';
    const url = useRecording ? session.recordingUrl : session.youtubeUrl;
    const videoId = extractVideoId(url);

    if (!videoId) return error(res, 'Stream not available', 404);

    // Token carries only the videoId — never the full URL
    const token = jwt.sign(
      {
        videoId,
        sessionId: session._id.toString(),
        userId: req.user._id.toString(),
        isRecording: useRecording,
      },
      PLAYER_SECRET,
      { expiresIn: PLAYER_TOKEN_EXPIRY }
    );

    res.json({ success: true, data: { token } });
  } catch (err) {
    next(err);
  }
};

// Backend renders and serves the player HTML — YouTube URL never leaves the server
const servePlayerHtml = (req, res, next) => {
  try {
    const { token } = req.params;
    const payload = jwt.verify(token, PLAYER_SECRET);
    const { videoId, isRecording } = payload;

    const embedUrl = [
      `https://www.youtube-nocookie.com/embed/${videoId}`,
      '?autoplay=1',
      '&rel=0',
      '&modestbranding=1',
      '&iv_load_policy=3',   // no annotations
      '&fs=0',               // disable YT fullscreen button (handled natively)
      '&playsinline=1',
      '&color=white',
      '&cc_load_policy=0',
      `&origin=${encodeURIComponent(process.env.CLIENT_ORIGIN || 'https://bodha.app')}`,
    ].join('');

    const html = buildPlayerHtml(embedUrl, isRecording);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-src https://www.youtube-nocookie.com; script-src 'unsafe-inline'; style-src 'unsafe-inline'"
    );
    res.send(html);
  } catch (err) {
    // Expired or invalid token
    res.status(401).send('<h3 style="font-family:sans-serif;text-align:center;margin-top:40px;color:#555">Session expired. Please refresh the app.</h3>');
  }
};

const buildPlayerHtml = (embedUrl, isRecording) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <title>Bodha Player</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;-webkit-user-select:none;user-select:none;}
    html,body{width:100%;height:100%;background:#000;overflow:hidden;}
    #wrap{position:relative;width:100%;height:100%;}
    iframe{width:100%;height:100%;border:0;display:block;}
    /* Transparent overlay blocks right-click / long-press on iOS/Android */
    #shield{
      position:absolute;top:0;left:0;right:0;bottom:0;
      z-index:10;
      /* Pointer events pass through to iframe for tap/play, but block contextmenu */
      pointer-events:none;
    }
  </style>
</head>
<body>
  <div id="wrap">
    <iframe
      src="${embedUrl}"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen="false"
      webkitallowfullscreen="false"
      mozallowfullscreen="false"
      frameborder="0"
      scrolling="no"
      draggable="false"
    ></iframe>
    <div id="shield"></div>
  </div>
  <script>
    // Block all context menus (long-press on Android, right-click on desktop)
    document.addEventListener('contextmenu', function(e){ e.preventDefault(); return false; }, true);

    // Block long-press text-selection / callout on iOS
    document.addEventListener('touchstart', function(e){
      if(e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    var longPressTimer;
    document.addEventListener('touchstart', function(){ longPressTimer = setTimeout(function(){}, 500); }, true);
    document.addEventListener('touchend', function(){ clearTimeout(longPressTimer); }, true);

    // Block select-all, save, view-source keyboard shortcuts
    document.addEventListener('keydown', function(e){
      if((e.ctrlKey||e.metaKey) && ['s','u','j','a','c'].indexOf(e.key.toLowerCase()) !== -1){
        e.preventDefault();
      }
    }, true);

    // Prevent any navigation away from this page
    window.addEventListener('beforeunload', function(e){ e.preventDefault(); });

    // Block postMessage-based open-in-app attempts
    window.addEventListener('message', function(e){ e.stopImmediatePropagation(); }, true);
  </script>
</body>
</html>`;

module.exports = { getPlayerToken, servePlayerHtml };
