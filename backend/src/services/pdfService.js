import { PDFParse } from 'pdf-parse';
import sharp from 'sharp';
import { PII_PATTERNS, calculateRisk } from '../utils/patterns.js';
import { scanDocument } from './scannerService.js';
import { generateMaskedImage } from './maskingService.js';

/**
 * Advanced PDF Processing Service for PRIVACLOUD AI
 * Handles native text streams, high-resolution rendered pages (multi-page),
 * and embedded camera/scanner images of identity cards.
 */
export async function processPdfDocument(pdfBuffer, filename = 'document.pdf') {
  let parser = null;
  let pdfText = '';
  const pageImageBuffers = [];
  const embeddedImageBuffers = [];

  try {
    parser = new PDFParse({ data: pdfBuffer });
    
    // 1. Extract digital text stream
    try {
      const textResult = await parser.getText();
      pdfText = textResult.text || '';
    } catch (e) {
      console.warn('PDF getText note:', e.message);
    }

    // 2. Render all PDF pages as high-resolution raster screenshots (scale: 2.0)
    try {
      const shot = await parser.getScreenshot({ scale: 2.0 });
      if (shot.pages && shot.pages.length > 0) {
        for (const pg of shot.pages) {
          if (pg.data) {
            pageImageBuffers.push(Buffer.from(pg.data));
          }
        }
      }
    } catch (e) {
      console.warn('PDF getScreenshot note:', e.message);
    }

    // 3. Extract embedded camera/scanner images (for scanned Aadhaar cards)
    try {
      const imgRes = await parser.getImage();
      if (imgRes && imgRes.pages) {
        for (const p of imgRes.pages) {
          for (const img of p.images || []) {
            if (img.data) {
              embeddedImageBuffers.push(Buffer.from(img.data));
            }
          }
        }
      }
    } catch (e) {
      console.warn('PDF getImage note:', e.message);
    }
  } catch (err) {
    console.error('PDF parsing error:', err);
  }

  // Combined counts across all pages and streams
  const aggregateCounts = {
    aadhaar: 0,
    pan: 0,
    phone: 0,
    email: 0
  };

  // 4. Check digital text stream first
  const normalizedPdfText = (pdfText || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
  for (const [piiType, regex] of Object.entries(PII_PATTERNS)) {
    const matches = normalizedPdfText.match(regex);
    if (matches) {
      aggregateCounts[piiType] = Math.max(aggregateCounts[piiType], matches.length);
    }
  }

  // Check Aadhaar keywords in raw PDF text
  if (/aadhaar|aadhar|uidai|आधार/i.test(normalizedPdfText) && /\d{4}/.test(normalizedPdfText)) {
    aggregateCounts.aadhaar = Math.max(aggregateCounts.aadhaar, 1);
  }

  // 5. Select the primary page image to scan and display
  let primaryPageBuffer = pageImageBuffers[0] || embeddedImageBuffers[0] || null;
  if (!primaryPageBuffer) {
    primaryPageBuffer = await renderTextFallbackImage(pdfText, filename);
  }

  // 6. Run OCR scanner on all available page images to map bounding boxes and detect PII
  const candidateBuffers = [
    ...pageImageBuffers,
    ...embeddedImageBuffers
  ];

  let bestScanResult = null;
  let targetPageBufferForMasking = primaryPageBuffer;

  for (const buf of candidateBuffers) {
    try {
      const scan = await scanDocument(buf);
      
      // Accumulate counts
      aggregateCounts.aadhaar = Math.max(aggregateCounts.aadhaar, scan.counts.aadhaar);
      aggregateCounts.pan = Math.max(aggregateCounts.pan, scan.counts.pan);
      aggregateCounts.phone = Math.max(aggregateCounts.phone, scan.counts.phone);
      aggregateCounts.email = Math.max(aggregateCounts.email, scan.counts.email);

      if (scan.detectedSensitiveBoxes && scan.detectedSensitiveBoxes.length > 0) {
        if (!bestScanResult || scan.detectedSensitiveBoxes.length > bestScanResult.detectedSensitiveBoxes.length) {
          bestScanResult = scan;
          targetPageBufferForMasking = buf;
        }
      }
    } catch (e) {
      console.warn('Scan candidate page note:', e.message);
    }
  }

  // Recalculate combined risk score
  const { riskScore, riskLevel } = calculateRisk(aggregateCounts);

  const finalScanResult = {
    riskScore,
    riskLevel,
    counts: aggregateCounts,
    detectedSensitiveBoxes: bestScanResult?.detectedSensitiveBoxes || [],
    hasSensitiveData: riskScore > 0
  };

  // 7. Generate masked copy
  let maskedBuffer = null;
  if (finalScanResult.hasSensitiveData && finalScanResult.detectedSensitiveBoxes.length > 0) {
    maskedBuffer = await generateMaskedImage(targetPageBufferForMasking, finalScanResult.detectedSensitiveBoxes);
  } else if (finalScanResult.hasSensitiveData) {
    // Sensitive data detected in text stream or card context - overlay safety banner
    maskedBuffer = await overlayPdfSafetyMask(targetPageBufferForMasking, finalScanResult.counts);
  } else {
    // Clean document - output flattened raster PNG
    maskedBuffer = await sharp(targetPageBufferForMasking).png().toBuffer();
  }

  return {
    scanResult: finalScanResult,
    pageImageBuffer: targetPageBufferForMasking,
    maskedBuffer
  };
}

/**
 * Text-to-raster fallback for text-only PDFs
 */
async function renderTextFallbackImage(text, filename) {
  const width = 800;
  const height = 1100;
  const cleanLines = (text || 'Document content')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .slice(0, 35);

  let textElements = '';
  let y = 140;
  for (const line of cleanLines) {
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    textElements += `<text x="50" y="${y}" font-family="Arial, sans-serif" font-size="14" fill="#1e293b">${escaped}</text>\n`;
    y += 24;
  }

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#f8fafc"/>
      <rect x="25" y="25" width="${width - 50}" height="${height - 50}" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="25" y="25" width="${width - 50}" height="60" rx="8" fill="#0f172a"/>
      <text x="45" y="60" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">${filename} (Flattened PDF Page)</text>
      ${textElements}
    </svg>
  `;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Overlays a prominent privacy protection redaction banner if bounding box coords could not be pinned
 */
async function overlayPdfSafetyMask(imageBuffer, counts) {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 1100;

  const detectedList = [];
  if (counts.aadhaar > 0) detectedList.push(`${counts.aadhaar} Aadhaar`);
  if (counts.pan > 0) detectedList.push(`${counts.pan} PAN`);
  if (counts.phone > 0) detectedList.push(`${counts.phone} Phone`);
  if (counts.email > 0) detectedList.push(`${counts.email} Email`);

  const summary = detectedList.join(', ');

  const bannerSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="20" width="${width - 40}" height="70" rx="10" fill="#000000" />
      <rect x="20" y="20" width="${width - 40}" height="70" rx="10" fill="none" stroke="#ef4444" stroke-width="3" />
      <text x="40" y="50" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ef4444">⚠️ PRIVACLOUD REDACTION: SENSITIVE DATA DETECTED</text>
      <text x="40" y="72" font-family="Arial, sans-serif" font-size="13" fill="#ffffff">Protected Elements: ${summary}. Document permanently flattened to raster image.</text>
    </svg>
  `;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(bannerSvg), top: 0, left: 0 }])
    .png()
    .toBuffer();
}
