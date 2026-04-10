import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ── GET /api/activity/group/:groupId ──────────────────────────────
// Returns a unified activity feed: expenses + settlements, sorted by date desc.
router.get('/group/:groupId', async (req: AuthRequest, res: Response) => {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: req.params.groupId, userId: req.userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Fetch recent expenses
    const expenses = await prisma.expense.findMany({
      where: { groupId: req.params.groupId },
      include: {
        payer: { select: { id: true, name: true, email: true, avatarUrl: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Fetch recent settlements
    const settlements = await prisma.settlement.findMany({
      where: { groupId: req.params.groupId },
      include: {
        fromUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
        toUser: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Merge into unified feed
    interface ActivityItem {
      id: string;
      type: 'expense' | 'settlement';
      date: Date;
      data: any;
    }

    const activities: ActivityItem[] = [
      ...expenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        date: e.createdAt,
        data: {
          description: e.description,
          amount: e.amount,
          category: e.category,
          payer: e.payer,
          participantCount: e.participants.length,
          expenseDate: e.date,
        },
      })),
      ...settlements.map((s) => ({
        id: s.id,
        type: 'settlement' as const,
        date: s.createdAt,
        data: {
          amount: s.amount,
          fromUser: s.fromUser,
          toUser: s.toUser,
          confirmed: s.status === 'confirmed',
          note: s.note,
        },
      })),
    ];

    // Sort by date descending
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Page the merged results
    const paged = activities.slice(0, limit);

    res.json({
      activities: paged,
      total: expenses.length + settlements.length,
    });
  } catch (err) {
    console.error('Activity feed error:', err);
    res.status(500).json({ error: 'Failed to load activity feed' });
  }
});

export default router;
