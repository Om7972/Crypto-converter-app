require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const apiRateLimiter = require('./middlewares/rateLimiter');
const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');
const convertRoutes = require('./routes/convertRoutes');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true }));
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(logger);

app.use('/api', apiRateLimiter, convertRoutes);

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');
const staticDir = process.env.NODE_ENV === 'production' && fs.existsSync(distDir) ? distDir : publicDir;

app.use(express.static(staticDir, { maxAge: '1d' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});