import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { extractTextFromImage, extractTextFromPdf } from '../services/ocr';
import { parseReceiptText, parseTabularData, suggestParticipants } from '../services/aiParser';
import { parseSpreadsheet } from '../services/spreadsheet';

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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

// ── POST /api/import/upload ─────────────────────────────────────────
// Upload a receipt/statement and get parsed expense data
router.post(
  '/upload',
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
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

      const fileType = getFileType(req.file.mimetype);
      const filePath = req.file.path;

      // Create receipt record
      const receipt = await prisma.receiptUpload.create({
        data: {
          fileName: req.file.originalname,
          fileType,
          filePath,
          uploadedById: req.userId!,
          status: 'processing',
        },
      });

      // Process based on file type
      let parsedData;

      if (fileType === 'image') {
        // OCR pipeline: preprocess → OCR → LLM parse
        const ocrResult = await extractTextFromImage(filePath);

        await prisma.receiptUpload.update({
          where: { id: receipt.id },
          data: { ocrRawText: ocrResult.rawText },
        });

        parsedData = await parseReceiptText(ocrResult.rawText);

      } else if (fileType === 'pdf') {
        // Extract text from PDF → LLM parse
        const pdfText = await extractTextFromPdf(filePath);

        await prisma.receiptUpload.update({
          where: { id: receipt.id },
          data: { ocrRawText: pdfText },
        });

        parsedData = await parseReceiptText(pdfText);

      } else if (fileType === 'csv' || fileType === 'excel') {
        // Parse spreadsheet → LLM parse rows
        const spreadsheetData = parseSpreadsheet(filePath);
        parsedData = await parseTabularData(
          spreadsheetData.rows.slice(0, 50), // Limit to 50 rows
          spreadsheetData.headers
        );
      }

      // Suggest participants
      const members = await prisma.groupMember.findMany({
        where: { groupId },
        include: { user: { select: { id: true, name: true } } },
      });
      const memberList = members.map((m) => ({ id: m.user.id, name: m.user.name }));

      let suggestedParticipants: string[] = memberList.map((m) => m.id);

      if (parsedData && !Array.isArray(parsedData)) {
        suggestedParticipants = await suggestParticipants(parsedData, memberList);
      }

      // Update receipt with parsed data
      await prisma.receiptUpload.update({
        where: { id: receipt.id },
        data: {
          parsedData: parsedData as any,
          status: 'parsed',
        },
      });

      res.json({
        receiptId: receipt.id,
        parsedData,
        suggestedParticipants,
        members: memberList,
      });
    } catch (err) {
      console.error('Import upload error:', err);

      // Clean up file on error
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }

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

export default router;
