// index.js
import 'dotenv/config';
import './utils/dateHelpers.js';
import { createServer } from './server.js';
import { initMarketingCron } from './utils/marketingCron.js';

const DEFAULT_PORT = Number(process.env.PORT) || 5003;
const MAX_PORT_PROBES = 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Try to bind the app to a port once. Resolve with server or null if in use. */
function listenOnce(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        server.close(() => resolve(null));
      } else {
        reject(err);
      }
    });
  });
}

async function start() {
  try {
    // Build app (DB connection should happen inside createServer)
    const app = await createServer();

    // Initialize marketing cron jobs
    initMarketingCron();

    // Optional seeding (set SEED=false to skip)
    try {
      if (process.env.SEED !== 'false') {
        const mod = await import('./seed/performSeeding.js').catch(() => null);
        if (mod?.performSeeding) {
          await mod.performSeeding();
          console.log('🌱 Seeding complete');
        }
      }
    } catch (e) {
      console.error('Seeding failed:', e?.message || e);
    }

    // Find an open port (default + 9 more attempts)
    let server = null;
    let port = DEFAULT_PORT;

    for (let attempts = 0; attempts < MAX_PORT_PROBES && !server; attempts++) {
      const s = await listenOnce(app, port);
      if (s) {
        server = s;
        break;
      }
      console.warn(`Port ${port} is in use. Trying ${port + 1}…`);
      port++;
      await sleep(150);
    }

    if (!server) {
      console.error(
        '❌ Failed to find an available port. Free a port or set PORT in .env'
      );
      process.exit(1);
    }

    const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .join(', ');

    console.log(`✅ EventX API running on http://localhost:${port}`);
    console.log(`🔓 CORS enabled for: ${clientOrigins}`);
    console.log(`🔗 Client .env → VITE_API_URL=http://localhost:${port}`);

    // Verify admin user exists
    try {
      const { default: User } = await import('./models/User.js');
      const admin = await User.findOne({ email: 'admin@eventx.dev' });
      if (admin) {
        console.log('👤 Admin user verified in database');
      } else {
        console.warn('⚠️ Admin user not found in database!');
      }
    } catch (e) {
      console.error('Admin verification failed:', e?.message || e);
    }

    // Graceful shutdown
    const graceful = (sig) => {
      console.log(`${sig} received. Shutting down gracefully…`);
      server.close(() => process.exit(0));
      // Failsafe
      setTimeout(() => process.exit(1), 5000).unref();
    };
    process.on('SIGINT', () => graceful('SIGINT'));
    process.on('SIGTERM', () => graceful('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
