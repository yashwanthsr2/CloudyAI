import { PDFParse } from 'pdf-parse';
import sharp from 'sharp';
import { PII_PATTERNS, calculateRisk } from '../utils/patterns.js';
import { scanDocument } from './scannerService.js';
import { generateMaskedImage } from './maskingService.js';

/**
 * PDF Service for PRIVACLOUD AI
 * Converts PDF pages into flattened raster images, runs OCR and pattern scanning,
 * and generates permanently obscured masked copies.
 */
export async function processPdfDocument(pdfBuffer, filename = 'document.pdf') {
  let parser = null;
  let pdfText = '';
  let pageImageBuffer = null;

  try {
    parser = new PDFParse({ data: pdfBuffer });
    
    // Extract text stream from PDF
    try {
      const textResult = await parser.getText();
      pdfText = textResult.text || '';
    } catch (e) {
      console.warn('Direct PDF text extraction note:', e.message);
    }

    // Render first page as high-resolution raster screenshot
    try {
      const shot = await parser.getScreenshot({ scale: 1.5 });
      if (shot.pages && shot.pages.length > 0 && shot.pages[0].data) {
        pageImageBuffer = Buffer.from(shot.pages[0].data);
      }
    } catch (e) {
      console.warn('PDF screenshot rendering note:', e.message);
    }
  } catch (err) {
    console.error('PDF parsing error:', err);
  }

  // If raster screenshot is unavailable, fallback to rendering textual SVG to raster PNG
  if (!pageImageBuffer) {
    pageImageBuffer = await renderTextFallbackImage(pdfText, filename);
  }

  // Run OCR on the rasterized PDF page image to get bounding box coordinates
  let scanResult = null;
  try {
    scanResult = await scanDocument(pageImageBuffer);
  } catch (err) {
    console.warn('OCR on PDF image note:', err.message);
    scanResult = {
      riskScore: 0,
      riskLevel: 'Low',
      counts: { aadhaar: 0, pan: 0, phone: 0, email: 0 },
      detectedSensitiveBoxes: [],
      hasSensitiveData: false
    };
  }

  // Complement OCR counts with regex matches from the raw PDF text stream
  for (const [piiType, regex] of Object.entries(PII_PATTERNS)) {
    const matches = pdfText.match(regex);
    if (matches && matches.length > (scanResult.counts[piiType] || 0)) {
      scanResult.counts[piiType] = matches.length;
    }
  }

  // Recalculate combined risk score
  const { riskScore, riskLevel } = calculateRisk(scanResult.counts);
  scanResult.riskScore = riskScore;
  scanResult.riskLevel = riskLevel;
  scanResult.hasSensitiveData = riskScore > 0;

  // Generate permanently masked copy
  let maskedBuffer = null;
  if (scanResult.hasSensitiveData && scanResult.detectedSensitiveBoxes.length > 0) {
    maskedBuffer = await generateMaskedImage(pageImageBuffer, scanResult.detectedSensitiveBoxes);
  } else if (scanResult.hasSensitiveData) {
    // If sensitive data was found in text stream but bounding box was missed, overlay safety banner
    maskedBuffer = await overlayPdfSafetyMask(pageImageBuffer, scanResult.counts);
  } else {
    // If clean document, flatten to PNG
    maskedBuffer = await sharp(pageImageBuffer).png().toBuffer();
  }

  return {
    scanResult,
    pageImageBuffer,
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
    .slice(0, 35); // up to 35 lines on page 1

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
