import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// ── Validation ──────────────────────────────────────────────────────
const participantSchema = z.object({
  userId: z.string().uuid(),
  share: z.number().min(0),
  percentage: z.number().min(0).max(100).optional(),
});

const createExpenseSchema = z.object({
  description: z.string().min(1).max(300),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  date: z.string().transform((s) => new Date(s)),
  category: z.string().default('general'),
  notes: z.string().max(1000).optional(),
  splitType: z.enum(['equal', 'percentage', 'custom']).default('equal'),
  payerId: z.string().uuid(),
  groupId: z.string().uuid(),
  participants: z.array(participantSchema).min(1),
});

// ── Helper: verify group membership ─────────────────────────────────
async function verifyMembership(userId: string, groupId: string): Promise<boolean> {
  const member = await prisma.groupMember.findFirst({
    where: { userId, groupId },
  });
  return !!member;
}

// ── POST /api/expenses ──────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createExpenseSchema.parse(req.body);

    if (!(await verifyMembership(req.userId!, data.groupId))) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    // Validate participants are group members
    const memberIds = (
      await prisma.groupMember.findMany({
        where: { groupId: data.groupId },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    for (const p of data.participants) {
      if (!memberIds.includes(p.userId)) {
        res.status(400).json({ error: `User ${p.userId} is not a group member` });
        return;
      }
    }

    // Validate shares sum to amount
    const sharesTotal = data.participants.reduce((sum, p) => sum + p.share, 0);
    if (Math.abs(sharesTotal - data.amount) > 0.01) {
      res.status(400).json({
        error: `Participant shares (${sharesTotal.toFixed(2)}) must equal expense amount (${data.amount.toFixed(2)})`,
      });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        category: data.category,
        notes: data.notes,
        splitType: data.splitType,
        payerId: data.payerId,
        groupId: data.groupId,
        participants: {
          create: data.participants.map((p) => ({
            userId: p.userId,
            share: p.share,
            percentage: p.percentage,
            isPayer: p.userId === data.payerId,
          })),
        },
      },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    res.status(201).json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Create expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/expenses/group/:groupId ────────────────────────────────
router.get('/group/:groupId', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await verifyMembership(req.userId!, req.params.groupId))) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const expenses = await prisma.expense.findMany({
      where: { groupId: req.params.groupId },
      include: {
        payer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json(expenses);
  } catch (err) {
    console.error('List expenses error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/expenses/:id ───────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: {
        payer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        group: { select: { id: true, name: true } },
        receipt: true,
      },
    });

    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (!(await verifyMembership(req.userId!, expense.groupId))) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    res.json(expense);
  } catch (err) {
    console.error('Get expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/expenses/:id ───────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = createExpenseSchema.parse(req.body);

    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (!(await verifyMembership(req.userId!, existing.groupId))) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    // Delete existing participants and recreate
    await prisma.expenseParticipant.deleteMany({ where: { expenseId: req.params.id } });

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        category: data.category,
        notes: data.notes,
        splitType: data.splitType,
        payerId: data.payerId,
        participants: {
          create: data.participants.map((p) => ({
            userId: p.userId,
            share: p.share,
            percentage: p.percentage,
            isPayer: p.userId === data.payerId,
          })),
        },
      },
      include: {
        payer: { select: { id: true, name: true, email: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    res.json(expense);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Update expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/expenses/:id ────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const expense = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (!(await verifyMembership(req.userId!, expense.groupId))) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    await prisma.expense.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
