import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authMiddleware);

// ── Validation ──────────────────────────────────────────────────────
const createGroupSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  currency: z.string().length(3).default('USD'),
});

// ── POST /api/groups ────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createGroupSchema.parse(req.body);

    const group = await prisma.groupTrip.create({
      data: {
        ...data,
        members: {
          create: { userId: req.userId!, role: 'admin' },
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
      },
    });

    res.status(201).json(group);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/groups ─────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const groups = await prisma.groupTrip.findMany({
      where: { members: { some: { userId: req.userId } } },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { expenses: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(groups);
  } catch (err) {
    console.error('List groups error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/groups/:id ─────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const group = await prisma.groupTrip.findFirst({
      where: {
        id: req.params.id,
        members: { some: { userId: req.userId } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        expenses: {
          include: {
            payer: { select: { id: true, name: true, email: true, avatarUrl: true } },
            participants: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
          orderBy: { date: 'desc' },
        },
        settlements: {
          include: {
            fromUser: { select: { id: true, name: true } },
            toUser: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    res.json(group);
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/groups/:id ─────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = createGroupSchema.parse(req.body);

    // Only admin can update
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: req.params.id, userId: req.userId, role: 'admin' },
    });
    if (!membership) {
      res.status(403).json({ error: 'Only group admin can update the group' });
      return;
    }

    const group = await prisma.groupTrip.update({
      where: { id: req.params.id },
      data,
    });

    res.json(group);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Update group error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/groups/:id ──────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: req.params.id, userId: req.userId, role: 'admin' },
    });
    if (!membership) {
      res.status(403).json({ error: 'Only group admin can delete the group' });
      return;
    }

    await prisma.groupTrip.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    console.error('Delete group error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/groups/:id/invite ─────────────────────────────────────
router.post('/:id/invite', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: req.params.id, userId: req.userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    // Check if user exists
    const recipient = await prisma.user.findUnique({ where: { email } });

    // Check if already a member
    if (recipient) {
      const existing = await prisma.groupMember.findFirst({
        where: { groupId: req.params.id, userId: recipient.id },
      });
      if (existing) {
        res.status(409).json({ error: 'User is already a member' });
        return;
      }
    }

    const invite = await prisma.invite.create({
      data: {
        groupId: req.params.id,
        senderId: req.userId!,
        recipientId: recipient?.id,
        email,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    res.status(201).json(invite);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Invite error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/groups/invite/:token/accept ───────────────────────────
router.post('/invite/:token/accept', async (req: AuthRequest, res: Response) => {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token },
    });

    if (!invite || invite.status !== 'pending') {
      res.status(404).json({ error: 'Invalid or expired invite' });
      return;
    }

    if (new Date() > invite.expiresAt) {
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'declined' },
      });
      res.status(410).json({ error: 'Invite has expired' });
      return;
    }

    // Add user to group
    await prisma.groupMember.create({
      data: { userId: req.userId!, groupId: invite.groupId },
    });

    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: 'accepted', recipientId: req.userId },
    });

    res.json({ message: 'Invite accepted', groupId: invite.groupId });
  } catch (err) {
    console.error('Accept invite error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
