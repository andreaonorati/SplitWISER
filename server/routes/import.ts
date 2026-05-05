import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { extractTextFromImage, extractTextFromPdf } from '../services/ocr';
import { parseReceiptText, parseTabularData, suggestParticipants } from '../services/aiParser';
import { parseSpreadsheet } from '../services/spreadsheet';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

// ── Multer configuration ────────────────────────────────────────────
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10 }, // 10MB/file, up to 10 files
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

/**
 * Determine file type category from mime type.
 */
function getFileType(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype === 'text/csv') return 'csv';
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return 'excel';
  return 'unknown';
}

function normalizeParsedData(parsedData: any): any[] {
  if (!parsedData) return [];
  return Array.isArray(parsedData) ? parsedData : [parsedData];
}

function buildReceiptNotes(items?: Array<{ description: string; totalPrice: number }>): string | undefined {
  if (!items || items.length === 0) return undefined;
  return items
    .slice(0, 15)
    .map((item) => `${item.description}: ${item.totalPrice.toFixed(2)}`)
    .join('\n');
}

async function processUploadedFile(
  file: Express.Multer.File,
  userId: string,
  memberList: Array<{ id: string; name: string }>
) {
  const fileType = getFileType(file.mimetype);
  const filePath = file.path;

  const receipt = await prisma.receiptUpload.create({
    data: {
      fileName: file.originalname,
      fileType,
      filePath,
      uploadedById: userId,
      status: 'processing',
    },
  });

  try {
    let parsedData: any = null;

    if (fileType === 'image') {
      const ocrResult = await extractTextFromImage(filePath);

      await prisma.receiptUpload.update({
        where: { id: receipt.id },
        data: { ocrRawText: ocrResult.rawText },
      });

      parsedData = await parseReceiptText(ocrResult.rawText);
    } else if (fileType === 'pdf') {
      const pdfText = await extractTextFromPdf(filePath);

      await prisma.receiptUpload.update({
        where: { id: receipt.id },
        data: { ocrRawText: pdfText },
      });

      parsedData = await parseReceiptText(pdfText);
    } else if (fileType === 'csv' || fileType === 'excel') {
      const spreadsheetData = parseSpreadsheet(filePath);
      parsedData = await parseTabularData(
        spreadsheetData.rows.slice(0, 50),
        spreadsheetData.headers
      );
    }

    let suggestedParticipants: string[] = memberList.map((m) => m.id);
    if (parsedData && !Array.isArray(parsedData)) {
      suggestedParticipants = await suggestParticipants(parsedData, memberList);
    }

    await prisma.receiptUpload.update({
      where: { id: receipt.id },
      data: {
        parsedData: parsedData as any,
        status: 'parsed',
      },
    });

    return {
      receiptId: receipt.id,
      fileName: file.originalname,
      parsedData,
      suggestedParticipants,
    };
  } catch (err) {
    await prisma.receiptUpload.update({
      where: { id: receipt.id },
      data: { status: 'failed' },
    });
    throw err;
  }
}

const parsedExpenseSchema = z.object({
  merchantName: z.string().min(1),
  date: z.string().min(1),
  totalAmount: z.number().positive(),
  currency: z.string().length(3).optional(),
  category: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  taxAmount: z.number().nullable().optional(),
  tipAmount: z.number().nullable().optional(),
  items: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        totalPrice: z.number(),
      })
    )
    .optional(),
});

const bulkApproveSchema = z.object({
  groupId: z.string().uuid(),
  payerId: z.string().uuid(),
  participantIds: z.array(z.string().uuid()).min(1),
  expenses: z.array(parsedExpenseSchema).min(1).max(200),
});

// ── POST /api/import/upload ─────────────────────────────────────────
// Upload a receipt/statement and get parsed expense data
router.post(
  '/upload',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 10 },
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const filesMap = req.files as
        | Record<string, Express.Multer.File[]>
        | undefined;
      const uploadedFiles = [
        ...(filesMap?.file || []),
        ...(filesMap?.files || []),
      ];

      if (uploadedFiles.length === 0) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const groupId = req.body.groupId;
      if (!groupId) {
        res.status(400).json({ error: 'groupId is required' });
        return;
      }

      // Verify membership
      const membership = await prisma.groupMember.findFirst({
        where: { groupId, userId: req.userId },
      });
      if (!membership) {
        res.status(403).json({ error: 'Not a member of this group' });
        return;
      }

      const members = await prisma.groupMember.findMany({
        where: { groupId },
        include: { user: { select: { id: true, name: true } } },
      });
      const memberList = members.map((m) => ({ id: m.user.id, name: m.user.name }));

      const results = [] as Array<{
        receiptId: string;
        fileName: string;
        parsedData: any;
        suggestedParticipants: string[];
      }>;
      const failedFiles = [] as Array<{ fileName: string; error: string }>;

      for (const file of uploadedFiles) {
        try {
          const result = await processUploadedFile(file, req.userId!, memberList);
          results.push(result);
        } catch (err) {
          failedFiles.push({
            fileName: file.originalname,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      if (results.length === 0) {
        res.status(500).json({
          error: 'Failed to process all uploaded files',
          failedFiles,
        });
        return;
      }

      if (results.length === 1 && failedFiles.length === 0) {
        res.json({
          receiptId: results[0].receiptId,
          parsedData: results[0].parsedData,
          suggestedParticipants: results[0].suggestedParticipants,
          members: memberList,
        });
        return;
      }

      const parsedData = results.flatMap((r) => normalizeParsedData(r.parsedData));
      const suggestedParticipants = Array.from(
        new Set(results.flatMap((r) => r.suggestedParticipants))
      );

      const fileResults = results.map((r) => ({
        receiptId: r.receiptId,
        fileName: r.fileName,
        parsedCount: normalizeParsedData(r.parsedData).length,
      }));

      res.json({
        receiptIds: results.map((r) => r.receiptId),
        parsedData,
        suggestedParticipants,
        members: memberList,
        fileResults,
        failedFiles,
      });
    } catch (err) {
      console.error('Import upload error:', err);

      res.status(500).json({
        error: 'Failed to process upload',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
);

// ── POST /api/import/text ───────────────────────────────────────────
// Parse raw text (e.g., pasted receipt text) into expense data
router.post('/text', async (req: AuthRequest, res: Response) => {
  try {
    const { text, groupId } = req.body;
    if (!text || !groupId) {
      res.status(400).json({ error: 'text and groupId are required' });
      return;
    }

    const membership = await prisma.groupMember.findFirst({
      where: { groupId, userId: req.userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const parsedData = await parseReceiptText(text);

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true } } },
    });
    const memberList = members.map((m) => ({ id: m.user.id, name: m.user.name }));
    let suggestedParticipants: string[] = memberList.map((m) => m.id);
    if (parsedData && !Array.isArray(parsedData)) {
      suggestedParticipants = await suggestParticipants(parsedData, memberList);
    }

    res.json({ parsedData, suggestedParticipants, members: memberList });
  } catch (err) {
    console.error('Import text error:', err);
    res.status(500).json({ error: 'Failed to parse text' });
  }
});

// ── POST /api/import/approve-bulk ─────────────────────────────────
// Approve parsed expenses and create real expenses in bulk
router.post('/approve-bulk', async (req: AuthRequest, res: Response) => {
  try {
    const data = bulkApproveSchema.parse(req.body);

    const membership = await prisma.groupMember.findFirst({
      where: { groupId: data.groupId, userId: req.userId },
    });
    if (!membership) {
      res.status(403).json({ error: 'Not a member of this group' });
      return;
    }

    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId: data.groupId },
      select: { userId: true },
    });
    const memberIds = new Set(groupMembers.map((m) => m.userId));

    if (!memberIds.has(data.payerId)) {
      res.status(400).json({ error: 'Selected payer is not a group member' });
      return;
    }

    for (const participantId of data.participantIds) {
      if (!memberIds.has(participantId)) {
        res.status(400).json({ error: `Participant ${participantId} is not a group member` });
        return;
      }
    }

    const createdExpenses = await prisma.$transaction(async (tx) => {
      const created = [];

      for (const expense of data.expenses) {
        const participantCount = data.participantIds.length;
        const evenShare = Math.round((expense.totalAmount / participantCount) * 100) / 100;
        const remainder = Math.round((expense.totalAmount - evenShare * participantCount) * 100) / 100;

        const parsedDate = new Date(expense.date);
        const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        const createdExpense = await tx.expense.create({
          data: {
            description: expense.merchantName,
            amount: expense.totalAmount,
            currency: expense.currency || 'EUR',
            date: safeDate,
            category: expense.category || 'general',
            notes: buildReceiptNotes(expense.items),
            splitType: 'equal',
            payerId: data.payerId,
            groupId: data.groupId,
            participants: {
              create: data.participantIds.map((participantId, index) => ({
                userId: participantId,
                share: index === 0 ? evenShare + remainder : evenShare,
                isPayer: participantId === data.payerId,
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

        created.push(createdExpense);
      }

      return created;
    });

    res.status(201).json({
      createdCount: createdExpenses.length,
      expenses: createdExpenses,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }

    console.error('Bulk approve import error:', err);
    res.status(500).json({ error: 'Failed to approve imported expenses' });
  }
});

export default router;
