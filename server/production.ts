// Production server: Express API + Next.js SSR in a single process
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import next from 'next';

import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import expenseRoutes from './routes/expenses';
import settlementRoutes from './routes/settlements';
import importRoutes from './routes/import';
import exportRoutes from './routes/export';
import activityRoutes from './routes/activity';
import { apiRateLimiter, authRateLimiter, uploadRateLimiter } from './middleware/rateLimiter';

const PORT = parseInt(process.env.PORT || '8080', 10);
const dev = process.env.NODE_ENV !== 'production';

function resolveNextProjectDir() {
  const compiledRoot = path.resolve(__dirname, '..', '..');
  const fallbackRoot = path.resolve(__dirname, '..');

  // When transpiled, __dirname is dist/server and app root is two levels up.
  if (fs.existsSync(path.join(compiledRoot, '.next'))) {
    return compiledRoot;
  }

  return fallbackRoot;
}

const nextApp = next({ dev, dir: resolveNextProjectDir() });
const handle = nextApp.getRequestHandler();

async function main() {
  await nextApp.prepare();

  const app = express();

  // ── Middleware ───────────────────────────────────────────────────
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // ── Security headers ──────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ── API Routes ────────────────────────────────────────────────────
  app.use('/api/auth', authRateLimiter, authRoutes);
  app.use('/api/groups', apiRateLimiter, groupRoutes);
  app.use('/api/expenses', apiRateLimiter, expenseRoutes);
  app.use('/api/settlements', apiRateLimiter, settlementRoutes);
  app.use('/api/import', uploadRateLimiter, importRoutes);
  app.use('/api/export', apiRateLimiter, exportRoutes);
  app.use('/api/activity', apiRateLimiter, activityRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Next.js handles everything else ───────────────────────────────
  app.all('*', (req, res) => handle(req, res));

  // ── Error handler ─────────────────────────────────────────────────
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 SplitWISER running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
