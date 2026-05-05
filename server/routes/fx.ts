import { Router, Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { getRates, convert } from '../services/fxRates';

const router = Router();
router.use(authMiddleware);

// GET /api/fx/rates?base=EUR
router.get('/rates', async (req: AuthRequest, res: Response) => {
  try {
    const base = String(req.query.base || 'EUR').toUpperCase();
    const bundle = await getRates(base);
    res.json({
      base: bundle.base,
      date: bundle.date,
      provider: 'ECB via Frankfurter',
      rates: bundle.rates,
    });
  } catch (err: any) {
    res.status(502).json({ error: 'fx_unavailable', message: err.message || 'FX upstream error' });
  }
});

// GET /api/fx/convert?amount=10&from=USD&to=EUR
router.get('/convert', async (req: AuthRequest, res: Response) => {
  try {
    const amount = Number(req.query.amount);
    const from = String(req.query.from || '').toUpperCase();
    const to = String(req.query.to || '').toUpperCase();
    if (!Number.isFinite(amount) || !from || !to) {
      res.status(400).json({ error: 'invalid_params' });
      return;
    }
    const result = await convert(amount, from, to);
    const bundle = await getRates(from);
    res.json({
      from,
      to,
      amount,
      converted: result,
      rate: from === to ? 1 : bundle.rates[to],
      date: bundle.date,
      provider: 'ECB via Frankfurter',
    });
  } catch (err: any) {
    res.status(502).json({ error: 'fx_unavailable', message: err.message || 'FX upstream error' });
  }
});

export default router;
