const cloudinary = require('cloudinary').v2;
const { env } = require('./env');

if (env.hasCloudinary) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true
  });
}

module.exports = { cloudinary, hasCloudinary: env.hasCloudinary };
