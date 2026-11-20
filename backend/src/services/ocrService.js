import { createWorker } from 'tesseract.js';

/**
 * OCR Service using Tesseract.js
 * Extracts text and bounding box coordinates for each detected word / line block
 */
export async function extractTextWithBoundingBoxes(imageBuffer) {
  let worker = null;
  try {
    worker = await createWorker('eng');
    
    // Perform OCR recognition
    const ret = await worker.recognize(imageBuffer);
    const { data } = ret;

    // Collect words and lines with their precise bounding boxes
    const detectedBlocks = [];

    if (data.lines && data.lines.length > 0) {
      for (const line of data.lines) {
        if (!line.text || line.text.trim().length === 0) continue;
        
        detectedBlocks.push({
          type: 'line',
          text: line.text.trim(),
          confidence: line.confidence,
          bbox: {
            x0: line.bbox.x0,
            y0: line.bbox.y0,
            x1: line.bbox.x1,
            y1: line.bbox.y1,
            width: line.bbox.x1 - line.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0
          },
          words: (line.words || []).map(w => ({
            text: w.text.trim(),
            confidence: w.confidence,
            bbox: {
              x0: w.bbox.x0,
              y0: w.bbox.y0,
              x1: w.bbox.x1,
              y1: w.bbox.y1,
              width: w.bbox.x1 - w.bbox.x0,
              height: w.bbox.y1 - w.bbox.y0
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
