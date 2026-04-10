import Tesseract from 'tesseract.js';

/**
 * OCR Service: Extract text from images using Tesseract.js
 * with optional preprocessing via sharp.
 */

export interface OcrResult {
  rawText: string;
  confidence: number;
}

/**
 * Preprocess an image for better OCR accuracy:
 * - Convert to grayscale
 * - Increase contrast
 * - Sharpen
 * - Resize if too small
 */
export async function preprocessImage(imagePath: string): Promise<Buffer> {
  const sharp = (await import('sharp')).default;

  const metadata = await sharp(imagePath).metadata();
  let pipeline = sharp(imagePath)
    .grayscale()
    .normalize()       // auto contrast
    .sharpen({ sigma: 1.5 });

  // Upscale small images for better OCR
  if (metadata.width && metadata.width < 1000) {
    pipeline = pipeline.resize({
      width: Math.round(metadata.width * 2),
      fit: 'inside',
    });
  }

  return pipeline.toBuffer();
}

/**
 * Run OCR on an image file.
 */
export async function extractTextFromImage(imagePath: string): Promise<OcrResult> {
  // Preprocess
  const processedBuffer = await preprocessImage(imagePath);

  // Run Tesseract
  const result = await Tesseract.recognize(processedBuffer, 'eng', {
    logger: (info) => {
      if (info.status === 'recognizing text') {
        // Progress tracking if needed
      }
    },
  });

  return {
    rawText: result.data.text,
    confidence: result.data.confidence,
  };
}

/**
 * Extract text from a PDF file using pdf-parse.
 */
export async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const fs = await import('fs');
  const pdfParse = (await import('pdf-parse')).default;

  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}
