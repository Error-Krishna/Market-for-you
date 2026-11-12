import { createRequire } from 'module';

// Resolve dependencies relative to backend package
const backendRequire = createRequire(new URL('../market-aura-4u-backend-main/src/app.js', import.meta.url));

const mongoose = backendRequire('mongoose');
const app = backendRequire('./app.js');
const connectDB = backendRequire('./config/db.js');

let isConnecting = null;

export default async function handler(req, res) {
  // Ensure database connection is established across serverless invocations
  if (mongoose.connection.readyState !== 1) {
    if (!isConnecting) {
      isConnecting = connectDB().finally(() => {
        isConnecting = null;
      });
    }
    await isConnecting;
  }

  return app(req, res);
}
