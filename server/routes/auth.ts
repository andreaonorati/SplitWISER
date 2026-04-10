import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware, generateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// ── Validation schemas ──────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(6).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ── POST /api/auth/register ─────────────────────────────────────────
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { email: data.email, name: data.name, passwordHash },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });

    const token = generateToken(user.id);
    res.status(201).json({ user, token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/login ────────────────────────────────────────────
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/auth/profile ───────────────────────────────────────────
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    });

    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/auth/password ──────────────────────────────────────────
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(128),
});

router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const validPassword = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
