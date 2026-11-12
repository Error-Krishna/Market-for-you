const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
if (require.main === module) require('dotenv').config();
const port = process.env.PORT || 3000;
const connectDB = require('./config/db');
const apiRouter = require('./routes');
const createCorsMiddleware = require('./middleware/cors');
const { limitAuthIp, handleAuthPayloadError } = require('./middleware/authAttempts');
const { serveUploadedMedia } = require('./controllers/media/mediaController');
const { startScheduler, stopScheduler } = require('./services/schedulerService');

app.use(createCorsMiddleware());
app.use('/api/v1/auth', limitAuthIp);

// Allow larger base64 payloads strictly for user media uploads while keeping auth at 100kb.
app.use('/api/v1/media', express.json({ limit: '15mb' }));
app.use(express.json());
app.use('/api/v1/auth', handleAuthPayloadError);
app.use(cookieParser());

app.get('/uploads/media/:userId/:filename', serveUploadedMedia);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.get('/ready', (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ status: 'not_ready', dependencies: { database: 'unavailable' } });
  }
  return res.status(200).json({ status: 'ready' });
});

app.use('/api', apiRouter);

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err?.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    return res.status(400).json({ success: false, message: 'Malformed JSON request body.' });
  }
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    return res.status(413).json({ success: false, message: 'Request payload too large.' });
  }
  const statusCode = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  console.error('Unhandled request error:', err?.message || err);
  return res.status(statusCode).json({
    success: false,
    message: statusCode < 500 && err?.message ? err.message : 'Internal server error',
  });
});

if (require.main === module) {
  const server = app.listen(port, async () => {
    await connectDB();
    startScheduler();
    console.log(`Server is running at http://localhost:${port}`);
  });
  const shutdown = () => {
    stopScheduler();
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

module.exports = app;
