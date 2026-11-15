/**
 * ==============================================================================
 * Market Aura 4U — Serverless Compatibility Bridge (Reference Only)
 * ==============================================================================
 * ARCHITECTURAL NOTICE:
 * In the recommended production deployment architecture:
 * - Frontend is hosted on Vercel as a Vite SPA.
 * - Backend API is deployed as a long-running Node.js Web Service on Render.
 * - Long-running scheduler polling, durable Mongo job claiming, and media
 *   operations execute on the persistent Render service.
 *
 * This file is retained for monorepo verification and optional serverless
 * testing, but should NOT be used as the primary production backend entry point.
 * ==============================================================================
 */

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
