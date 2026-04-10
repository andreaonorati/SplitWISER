import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// ── GET /api/export/group/:groupId/csv ──────────────────────────────
// Export all group expenses as a CSV file
router.get('/group/:groupId/csv', async (req: AuthRequest, res: Response) => {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: req.params.groupId, userId: req.userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const group = await prisma.groupTrip.findUnique({
      where: { id: req.params.groupId },
    });

    const expenses = await prisma.expense.findMany({
      where: { groupId: req.params.groupId },
      include: {
        payer: { select: { name: true, email: true } },
        participants: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Build CSV
    const header = 'Date,Description,Category,Amount,Currency,Paid By,Split Type,Participants,Notes\n';
    const rows = expenses.map((e) => {
      const participantList = e.participants
        .map((p) => `${p.user.name} ($${p.share.toFixed(2)})`)
        .join('; ');
      const notes = (e.notes || '').replace(/"/g, '""');
      const description = e.description.replace(/"/g, '""');

      return [
        new Date(e.date).toISOString().split('T')[0],
        `"${description}"`,
        e.category,
        e.amount.toFixed(2),
        e.currency,
        e.payer.name,
        e.splitType,
        `"${participantList}"`,
        `"${notes}"`,
      ].join(',');
    });

    const csv = header + rows.join('\n');
    const filename = `${(group?.name || 'expenses').replace(/[^a-zA-Z0-9]/g, '_')}_export.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/export/group/:groupId/summary ──────────────────────────
// Export a settlement summary as CSV
router.get('/group/:groupId/summary', async (req: AuthRequest, res: Response) => {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: req.params.groupId, userId: req.userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const group = await prisma.groupTrip.findUnique({
      where: { id: req.params.groupId },
    });

    const members = await prisma.groupMember.findMany({
      where: { groupId: req.params.groupId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const expenses = await prisma.expense.findMany({
      where: { groupId: req.params.groupId },
      include: { participants: true },
    });

    const settlements = await prisma.settlement.findMany({
      where: { groupId: req.params.groupId },
    });

    // Calculate per-user stats
    const stats = new Map<string, { paid: number; owes: number }>();
    for (const m of members) {
      stats.set(m.userId, { paid: 0, owes: 0 });
    }
    for (const e of expenses) {
      const s = stats.get(e.payerId);
      if (s) s.paid += e.amount;
      for (const p of e.participants) {
        const ps = stats.get(p.userId);
        if (ps) ps.owes += p.share;
      }
    }

    const header = 'Name,Email,Total Paid,Total Owed,Net Balance\n';
    const rows = members.map((m) => {
      const s = stats.get(m.userId) || { paid: 0, owes: 0 };
      const net = s.paid - s.owes;
      return [
        m.user.name,
        m.user.email,
        s.paid.toFixed(2),
        s.owes.toFixed(2),
        net.toFixed(2),
      ].join(',');
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    rows.push('');
    rows.push(`Total Group Expenses,,${totalExpenses.toFixed(2)},,`);

    const csv = header + rows.join('\n');
    const filename = `${(group?.name || 'summary').replace(/[^a-zA-Z0-9]/g, '_')}_summary.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error('Export summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
