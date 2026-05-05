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
  currency: z.string().length(3).default('EUR'),
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

async function getMembership(userId: string, groupId: string) {
  return prisma.groupMember.findFirst({ where: { userId, groupId } });
}

function makeExpenseSnapshot(expense: any) {
  return {
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    date: expense.date,
    category: expense.category,
    notes: expense.notes,
    splitType: expense.splitType,
    status: expense.status,
    payerId: expense.payerId,
    groupId: expense.groupId,
    participants: (expense.participants || []).map((p: any) => ({
      userId: p.userId,
      share: p.share,
      percentage: p.percentage,
      isPayer: p.isPayer,
    })),
  };
}

function canManageExpense(expense: any, membership: { role: string; userId: string } | null, userId: string) {
  if (!membership) return false;
  return membership.role === 'admin' || expense.createdById === userId;
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

    if (!data.participants.some((p) => p.userId === data.payerId)) {
      res.status(400).json({ error: 'Payer must be included in participants' });
      return;
    }

    // Validate shares sum to amount
    const sharesTotal = data.participants.reduce((sum, p) => sum + p.share, 0);
    if (Math.abs(sharesTotal - data.amount) > 0.01) {
      res.status(400).json({
        error: `Participant shares (${sharesTotal.toFixed(2)}) must equal expense amount (${data.amount.toFixed(2)})`,
      });
      return;
    }

    const expense = await prisma.$transaction(async (tx) => {
      const createdExpense = await tx.expense.create({
        data: {
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          date: data.date,
          category: data.category,
          notes: data.notes,
          splitType: data.splitType,
          payerId: data.payerId,
          createdById: req.userId,
          groupId: data.groupId,
          status: 'pending_confirmation',
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
          participants: true,
        },
      });

      await tx.expenseConfirmation.createMany({
        data: data.participants.map((p) => ({
          expenseId: createdExpense.id,
          userId: p.userId,
          status: p.userId === req.userId ? 'confirmed' : 'pending',
          confirmedAt: p.userId === req.userId ? new Date() : null,
        })),
      });

      await tx.expenseHistory.create({
        data: {
          expenseId: createdExpense.id,
          actorId: req.userId,
          action: 'created',
          snapshot: makeExpenseSnapshot(createdExpense),
        },
      });

      const pendingCount = await tx.expenseConfirmation.count({
        where: { expenseId: createdExpense.id, status: 'pending' },
      });

      if (pendingCount === 0) {
        await tx.expense.update({
          where: { id: createdExpense.id },
          data: { status: 'confirmed', confirmedAt: new Date() },
        });
      }

      return tx.expense.findUnique({
        where: { id: createdExpense.id },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          participants: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          confirmations: {
            select: { userId: true, status: true, confirmedAt: true },
          },
        },
      });
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
      where: { groupId: req.params.groupId, deletedAt: null },
      include: {
        payer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        confirmations: {
          select: { userId: true, status: true, confirmedAt: true },
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
        confirmations: {
          select: { userId: true, status: true, confirmedAt: true },
        },
        history: {
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        group: { select: { id: true, name: true } },
        receipt: true,
      },
    });

    if (!expense || expense.deletedAt) {
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

    const existing = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: { participants: true },
    });
    if (!existing) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (existing.deletedAt) {
      res.status(410).json({ error: 'Expense was deleted' });
      return;
    }

    if (existing.groupId !== data.groupId) {
      res.status(400).json({ error: 'Cannot move expense to another group' });
      return;
    }

    const membership = await getMembership(req.userId!, existing.groupId);
    if (!canManageExpense(existing, membership, req.userId!)) {
      res.status(403).json({ error: 'Only the expense author or a group admin can edit this expense' });
      return;
    }

    const memberIds = (
      await prisma.groupMember.findMany({
        where: { groupId: existing.groupId },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    for (const p of data.participants) {
      if (!memberIds.includes(p.userId)) {
        res.status(400).json({ error: `User ${p.userId} is not a group member` });
        return;
      }
    }

    if (!data.participants.some((p) => p.userId === data.payerId)) {
      res.status(400).json({ error: 'Payer must be included in participants' });
      return;
    }

    const sharesTotal = data.participants.reduce((sum, p) => sum + p.share, 0);
    if (Math.abs(sharesTotal - data.amount) > 0.01) {
      res.status(400).json({
        error: `Participant shares (${sharesTotal.toFixed(2)}) must equal expense amount (${data.amount.toFixed(2)})`,
      });
      return;
    }

    const beforeSnapshot = makeExpenseSnapshot(existing);

    const expense = await prisma.$transaction(async (tx) => {
      await tx.expenseParticipant.deleteMany({ where: { expenseId: req.params.id } });
      await tx.expenseConfirmation.deleteMany({ where: { expenseId: req.params.id } });

      const updated = await tx.expense.update({
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
          status: 'pending_confirmation',
          confirmedAt: null,
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
          participants: true,
        },
      });

      await tx.expenseConfirmation.createMany({
        data: data.participants.map((p) => ({
          expenseId: req.params.id,
          userId: p.userId,
          status: p.userId === req.userId ? 'confirmed' : 'pending',
          confirmedAt: p.userId === req.userId ? new Date() : null,
        })),
      });

      const afterSnapshot = makeExpenseSnapshot(updated);

      await tx.expenseHistory.create({
        data: {
          expenseId: req.params.id,
          actorId: req.userId,
          action: 'updated',
          snapshot: {
            before: beforeSnapshot,
            after: afterSnapshot,
          },
        },
      });

      const pendingCount = await tx.expenseConfirmation.count({
        where: { expenseId: req.params.id, status: 'pending' },
      });

      if (pendingCount === 0) {
        await tx.expense.update({
          where: { id: req.params.id },
          data: { status: 'confirmed', confirmedAt: new Date() },
        });
      }

      return tx.expense.findUnique({
        where: { id: req.params.id },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          participants: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          confirmations: {
            select: { userId: true, status: true, confirmedAt: true },
          },
        },
      });
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

    if (expense.deletedAt) {
      res.status(204).send();
      return;
    }

    const membership = await getMembership(req.userId!, expense.groupId);
    if (!canManageExpense(expense, membership, req.userId!)) {
      res.status(403).json({ error: 'Only the expense author or a group admin can delete this expense' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: req.params.id },
        data: {
          deletedAt: new Date(),
          status: 'deleted',
        },
      });

      await tx.expenseHistory.create({
        data: {
          expenseId: req.params.id,
          actorId: req.userId,
          action: 'deleted',
          snapshot: makeExpenseSnapshot(expense),
        },
      });
    });

    res.status(204).send();
  } catch (err) {
    console.error('Delete expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/expenses/:id/restore ─────────────────────────────────
router.post('/:id/restore', async (req: AuthRequest, res: Response) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: { participants: true },
    });

    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (!expense.deletedAt) {
      res.status(400).json({ error: 'Expense is not deleted' });
      return;
    }

    const membership = await getMembership(req.userId!, expense.groupId);
    if (!canManageExpense(expense, membership, req.userId!)) {
      res.status(403).json({ error: 'Only the expense author or a group admin can restore this expense' });
      return;
    }

    const restored = await prisma.$transaction(async (tx) => {
      await tx.expenseConfirmation.deleteMany({ where: { expenseId: req.params.id } });

      const updated = await tx.expense.update({
        where: { id: req.params.id },
        data: {
          deletedAt: null,
          status: 'pending_confirmation',
          confirmedAt: null,
        },
      });

      await tx.expenseConfirmation.createMany({
        data: expense.participants.map((p) => ({
          expenseId: req.params.id,
          userId: p.userId,
          status: p.userId === req.userId ? 'confirmed' : 'pending',
          confirmedAt: p.userId === req.userId ? new Date() : null,
        })),
      });

      await tx.expenseHistory.create({
        data: {
          expenseId: req.params.id,
          actorId: req.userId,
          action: 'restored',
          snapshot: makeExpenseSnapshot(expense),
        },
      });

      const pendingCount = await tx.expenseConfirmation.count({
        where: { expenseId: req.params.id, status: 'pending' },
      });

      if (pendingCount === 0) {
        await tx.expense.update({
          where: { id: req.params.id },
          data: { status: 'confirmed', confirmedAt: new Date() },
        });
      }

      return tx.expense.findUnique({
        where: { id: req.params.id },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          participants: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          confirmations: {
            select: { userId: true, status: true, confirmedAt: true },
          },
        },
      });
    });

    res.json(restored);
  } catch (err) {
    console.error('Restore expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/expenses/:id/confirm ─────────────────────────────────
router.post('/:id/confirm', async (req: AuthRequest, res: Response) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: req.params.id },
      include: { participants: true },
    });

    if (!expense) {
      res.status(404).json({ error: 'Expense not found' });
      return;
    }

    if (expense.deletedAt) {
      res.status(410).json({ error: 'Expense was deleted' });
      return;
    }

    if (!(await verifyMembership(req.userId!, expense.groupId))) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const participantIds = expense.participants.map((p) => p.userId);
    if (!participantIds.includes(req.userId!)) {
      res.status(403).json({ error: 'Only participants can confirm this expense' });
      return;
    }

    const confirmedExpense = await prisma.$transaction(async (tx) => {
      await tx.expenseConfirmation.upsert({
        where: {
          expenseId_userId: {
            expenseId: req.params.id,
            userId: req.userId!,
          },
        },
        update: {
          status: 'confirmed',
          confirmedAt: new Date(),
        },
        create: {
          expenseId: req.params.id,
          userId: req.userId!,
          status: 'confirmed',
          confirmedAt: new Date(),
        },
      });

      const confirmedCount = await tx.expenseConfirmation.count({
        where: {
          expenseId: req.params.id,
          userId: { in: participantIds },
          status: 'confirmed',
        },
      });

      const allConfirmed = confirmedCount === participantIds.length;

      await tx.expense.update({
        where: { id: req.params.id },
        data: {
          status: allConfirmed ? 'confirmed' : 'pending_confirmation',
          confirmedAt: allConfirmed ? new Date() : null,
        },
      });

      return tx.expense.findUnique({
        where: { id: req.params.id },
        include: {
          payer: { select: { id: true, name: true, email: true } },
          participants: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          confirmations: {
            select: { userId: true, status: true, confirmedAt: true },
          },
        },
      });
    });

    res.json(confirmedExpense);
  } catch (err) {
    console.error('Confirm expense error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/expenses/:id/history ──────────────────────────────────
router.get('/:id/history', async (req: AuthRequest, res: Response) => {
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

    const history = await prisma.expenseHistory.findMany({
      where: { expenseId: req.params.id },
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(history);
  } catch (err) {
    console.error('Expense history error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
