const https = require('https');
const { env } = require('../config/env');

function startKeepAlive() {
  if (!env.keepAliveUrl) return;
  setInterval(() => {
    https.get(env.keepAliveUrl, () => {}).on('error', (err) => {
      console.warn('Keep-alive failed:', err.message);
    });
  }, 5 * 60 * 1000);
}

module.exports = { startKeepAlive };
