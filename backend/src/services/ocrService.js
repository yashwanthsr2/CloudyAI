import { createWorker } from 'tesseract.js';
import sharp from 'sharp';

/**
 * OCR Service using Tesseract.js with Sharp image enhancement
 * Upscales and normalizes document images to ensure high OCR accuracy for identity cards.
 */
export async function extractTextWithBoundingBoxes(imageBuffer) {
  let worker = null;
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const origWidth = metadata.width || 800;
    const origHeight = metadata.height || 600;

    // Enhance resolution & contrast for Tesseract recognition
    const targetWidth = Math.max(1800, origWidth);
    const scaleFactor = targetWidth / origWidth;

    const enhancedBuffer = await sharp(imageBuffer)
      .resize({ width: targetWidth, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen()
      .png()
      .toBuffer();

    worker = await createWorker('eng');
    
    // Perform OCR recognition on enhanced buffer
    const ret = await worker.recognize(enhancedBuffer);
    const { data } = ret;

    // Collect words and lines with their precise scaled bounding boxes
    const detectedBlocks = [];

    if (data.lines && data.lines.length > 0) {
      for (const line of data.lines) {
        if (!line.text || line.text.trim().length === 0) continue;
        
        detectedBlocks.push({
          type: 'line',
          text: line.text.trim(),
          confidence: line.confidence,
          bbox: {
            x0: Math.round(line.bbox.x0 / scaleFactor),
            y0: Math.round(line.bbox.y0 / scaleFactor),
            x1: Math.round(line.bbox.x1 / scaleFactor),
            y1: Math.round(line.bbox.y1 / scaleFactor),
            width: Math.round((line.bbox.x1 - line.bbox.x0) / scaleFactor),
            height: Math.round((line.bbox.y1 - line.bbox.y0) / scaleFactor)
          },
          words: (line.words || []).map(w => ({
            text: w.text.trim(),
            confidence: w.confidence,
            bbox: {
              x0: Math.round(w.bbox.x0 / scaleFactor),
              y0: Math.round(w.bbox.y0 / scaleFactor),
              x1: Math.round(w.bbox.x1 / scaleFactor),
              y1: Math.round(w.bbox.y1 / scaleFactor),
              width: Math.round((w.bbox.x1 - w.bbox.x0) / scaleFactor),
              height: Math.round((w.bbox.y1 - w.bbox.y0) / scaleFactor)
            }
          }))
        });
      }
    }

    return {
      fullText: data.text || '',
      blocks: detectedBlocks
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}
