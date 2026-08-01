const mongoose = require('mongoose');
const { env } = require('./env');

async function connectDatabase() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (env.nodeEnv === 'production') throw error;
  }
}

module.exports = { connectDatabase };
