import { PII_PATTERNS, calculateRisk } from '../utils/patterns.js';
import { extractTextWithBoundingBoxes } from './ocrService.js';

/**
 * Privacy Scanner Service
 * Scans image documents using OCR + Regex with contextual Indian identity detection.
 * Extracts counts, risk score, risk level, and bounding boxes for masking.
 * PRIVACY GUARANTEE: NEVER stores raw detected sensitive text in database.
 */
export async function scanDocument(imageBuffer) {
  // Step 1: Run OCR to extract text and bounding boxes
  const { fullText, blocks } = await extractTextWithBoundingBoxes(imageBuffer);

  // Normalize full text whitespace for robust regex matching
  const normalizedText = fullText.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');

  const detectedSensitiveBoxes = [];
  
  // Track counts
  const counts = {
    aadhaar: 0,
    pan: 0,
    phone: 0,
    email: 0
  };

  // Find matches on the normalized full document text
  for (const [piiType, regex] of Object.entries(PII_PATTERNS)) {
    const matches = normalizedText.match(regex);
    if (matches) {
      counts[piiType] = matches.length;
    }
  }

  // Step 2: Advanced Word-Sequence Aadhaar Detection (Catches 3 consecutive 4-digit words)
  for (const block of blocks) {
    const words = block.words || [];

    // Check for 3 consecutive 4-digit words (e.g. "1234" "5678" "9012" or "XXXX" "XXXX" "1234")
    for (let i = 0; i <= words.length - 3; i++) {
      const w1 = words[i].text.replace(/[^0-9xX\*]/g, '');
      const w2 = words[i+1].text.replace(/[^0-9xX\*]/g, '');
      const w3 = words[i+2].text.replace(/[^0-9xX\*]/g, '');

      const isAadhaarTriple = 
        (/^(?:\d{4}|[xX\*]{4})$/.test(w1)) &&
        (/^(?:\d{4}|[xX\*]{4})$/.test(w2)) &&
        (/^\d{4}$/.test(w3));

      if (isAadhaarTriple) {
        if (counts.aadhaar === 0) counts.aadhaar = 1;

        detectedSensitiveBoxes.push({
          type: 'aadhaar',
          bbox: {
            x0: Math.min(words[i].bbox.x0, words[i+1].bbox.x0, words[i+2].bbox.x0),
            y0: Math.min(words[i].bbox.y0, words[i+1].bbox.y0, words[i+2].bbox.y0),
            x1: Math.max(words[i].bbox.x1, words[i+1].bbox.x1, words[i+2].bbox.x1),
            y1: Math.max(words[i].bbox.y1, words[i+1].bbox.y1, words[i+2].bbox.y1),
            width: Math.max(words[i].bbox.x1, words[i+1].bbox.x1, words[i+2].bbox.x1) - Math.min(words[i].bbox.x0, words[i+1].bbox.x0, words[i+2].bbox.x0),
            height: Math.max(words[i].bbox.y1, words[i+1].bbox.y1, words[i+2].bbox.y1) - Math.min(words[i].bbox.y0, words[i+1].bbox.y0, words[i+2].bbox.y0)
          }
        });
      }
    }

    // Step 3: Match line and word blocks for PAN, Phone, Email, and regex Aadhaar
    const normalizedLine = block.text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
    let lineHasSensitive = false;

    for (const [piiType, regex] of Object.entries(PII_PATTERNS)) {
      if (new RegExp(regex.source, regex.flags).test(normalizedLine)) {
        lineHasSensitive = true;
        if (counts[piiType] === 0) counts[piiType] = 1;
        break;
      }
    }

    // Check for Aadhaar keywords on line ("aadhaar", "uidai", "आधार")
    const isAadhaarContext = /aadhaar|aadhar|uidai|आधार|mera aadhaar/i.test(normalizedLine);
    if (isAadhaarContext && /\d{4}/.test(normalizedLine)) {
      lineHasSensitive = true;
      if (counts.aadhaar === 0) counts.aadhaar = 1;
    }

    if (lineHasSensitive) {
      let matchedAnyWord = false;

      for (const word of words) {
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

      // If word-level didn't catch due to spaces across tokens, mask the line
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
    hasSensitiveData: riskScore > 0,
    fullTextLength: fullText.length
  };
}
