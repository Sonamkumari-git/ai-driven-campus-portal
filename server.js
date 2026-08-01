require('dotenv').config();
const { createApp } = require('./src/app');
const { connectDatabase } = require('./src/config/database');
const { env } = require('./src/config/env');
const { seedAdmin } = require('./src/utils/seed');
const { startKeepAlive } = require('./src/utils/keepAlive');

async function bootstrap() {
  await connectDatabase();
  await seedAdmin();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });

  startKeepAlive();
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
