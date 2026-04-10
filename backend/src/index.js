import 'dotenv/config';
import express from 'express';
import { runMigrations } from './db/migrate.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import { scanReleases } from './scanner/releaseScanner.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api', subscriptionRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  const SCAN_INTERVAL = 10 * 60 * 1000;
  setInterval(scanReleases, SCAN_INTERVAL);
  console.log('Scanner scheduled every 10 minutes');
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});