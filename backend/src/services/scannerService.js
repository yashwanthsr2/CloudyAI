import { PII_PATTERNS, calculateRisk } from '../utils/patterns.js';
import { extractTextWithBoundingBoxes } from './ocrService.js';

/**
 * Privacy Scanner Service
 * Scans image documents using OCR + Regex.
 * Extracts counts, risk score, risk level, and bounding boxes for masking.
 * PRIVACY GUARANTEE: NEVER stores raw detected sensitive text in database.
 */
export async function scanDocument(imageBuffer) {
  // Step 1: Run OCR to extract text and bounding boxes
  const { fullText, blocks } = await extractTextWithBoundingBoxes(imageBuffer);

  // Step 2: Match PII patterns across full text and line blocks
  const detectedSensitiveBoxes = [];
  
  // Track counts
  const counts = {
    aadhaar: 0,
    pan: 0,
    phone: 0,
    email: 0
  };

  // Find matches on the full document text for accurate counts
  for (const [piiType, regex] of Object.entries(PII_PATTERNS)) {
    const matches = fullText.match(regex);
    if (matches) {
      counts[piiType] = matches.length;
    }
  }

  // Step 3: Match line and word blocks to locate precise bounding boxes for masking
  for (const block of blocks) {
    let blockHasSensitive = false;

    for (const [piiType, regex] of Object.entries(PII_PATTERNS)) {
      // Test the line text
      if (new RegExp(regex.source, regex.flags).test(block.text)) {
        blockHasSensitive = true;
        break;
      }
    }

    if (blockHasSensitive) {
      // Check each word in the line for finer bounding box granularity
      let matchedAnyWord = false;
      for (const word of block.words) {
        for (const [piiType, regex] of Object.entries(PII_PATTERNS)) {
          if (new RegExp(regex.source, regex.flags).test(word.text)) {
            detectedSensitiveBoxes.push({
              type: piiType,
              bbox: word.bbox
            });
            matchedAnyWord = true;
          }
        }
      }

      // If word-level didn't catch due to spacing, mask the full line bounding box
      if (!matchedAnyWord) {
        detectedSensitiveBoxes.push({
          type: 'sensitive_line',
          bbox: block.bbox
        });
      }
    }
  }

  // Step 4: Calculate risk score and level
  const { riskScore, riskLevel } = calculateRisk(counts);

  return {
    riskScore,
    riskLevel,
    counts,
    detectedSensitiveBoxes,
    hasSensitiveData: riskScore > 0
  };
}
