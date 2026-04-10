import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';

import authRoutes from './routes/auth';
import groupRoutes from './routes/groups';
import expenseRoutes from './routes/expenses';
import settlementRoutes from './routes/settlements';
import importRoutes from './routes/import';
import exportRoutes from './routes/export';
import activityRoutes from './routes/activity';
import { apiRateLimiter, authRateLimiter, uploadRateLimiter } from './middleware/rateLimiter';

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// ── Middleware ───────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ── Security headers ────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── Routes ──────────────────────────────────────────────────────────
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/groups', apiRateLimiter, groupRoutes);
app.use('/api/expenses', apiRateLimiter, expenseRoutes);
app.use('/api/settlements', apiRateLimiter, settlementRoutes);
app.use('/api/import', uploadRateLimiter, importRoutes);
app.use('/api/export', apiRateLimiter, exportRoutes);
app.use('/api/activity', apiRateLimiter, activityRoutes);

// ── Health check ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Error handler ───────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 SplitWISER API running on http://localhost:${PORT}`);
});

export default app;
