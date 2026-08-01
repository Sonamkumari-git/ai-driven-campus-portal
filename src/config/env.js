const path = require('path');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zhi_college',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  publicDir: path.join(__dirname, '..', '..', 'public'),
  uploadDir: path.join(__dirname, '..', '..', 'public', 'uploads'),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  },
  mail: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@zhi.local'
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@zhi.edu.in',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },
  keepAliveUrl: process.env.KEEP_ALIVE_URL || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-development-secret',
    expiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS || 24 * 60 * 60),
    cookieName: 'zhi_token'
  }
};

env.hasCloudinary = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
env.hasMail = Boolean(env.mail.user && env.mail.pass);

module.exports = { env };
