import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import {
  computeSettlementPlan,
  getUserContributions,
} from '../services/debtEngine';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// ── GET /api/settlements/group/:groupId/balances ────────────────────
router.get('/group/:groupId/balances', async (req: AuthRequest, res: Response) => {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: req.params.groupId, userId: req.userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId: req.params.groupId },
      include: { participants: true },
    });

    const settlements = await prisma.settlement.findMany({
      where: { groupId: req.params.groupId },
    });

    const members = await prisma.groupMember.findMany({
      where: { groupId: req.params.groupId },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    const { balances, transactions } = computeSettlementPlan(expenses, settlements);
    const contributions = getUserContributions(expenses);

    // Build user-friendly response
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const userBalances = members.map((m) => ({
      user: m.user,
      balance: Math.round((balances.get(m.userId) || 0) * 100) / 100,
      contribution: contributions.get(m.userId) || { paid: 0, owes: 0, net: 0 },
    }));

    const settlementPlan = transactions.map((t) => {
      const fromUser = members.find((m) => m.userId === t.from)?.user;
      const toUser = members.find((m) => m.userId === t.to)?.user;
      return {
        from: fromUser || { id: t.from, name: 'Unknown' },
        to: toUser || { id: t.to, name: 'Unknown' },
        amount: t.amount,
      };
    });

    res.json({
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      expenseCount: expenses.length,
      userBalances,
      settlementPlan,
    });
  } catch (err) {
    console.error('Balances error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/settlements ───────────────────────────────────────────
const createSettlementSchema = z.object({
  groupId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createSettlementSchema.parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId: req.userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const settlement = await prisma.settlement.create({
      data: {
        fromUserId: req.userId!,
        toUserId: data.toUserId,
        groupId: data.groupId,
        amount: data.amount,
        note: data.note,
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(settlement);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Create settlement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/settlements/:id/confirm ────────────────────────────────
router.put('/:id/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: req.params.id },
    });

    if (!settlement) {
      res.status(404).json({ error: 'Settlement not found' });
      return;
    }

    // Only the creditor (toUser) can confirm
    if (settlement.toUserId !== req.userId) {
      res.status(403).json({ error: 'Only the recipient can confirm a settlement' });
      return;
    }

    const updated = await prisma.settlement.update({
      where: { id: req.params.id },
      data: { status: 'confirmed' },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Confirm settlement error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
