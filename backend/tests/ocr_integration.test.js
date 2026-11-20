import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanDocument } from '../src/services/scannerService.js';
import { generateMaskedImage } from '../src/services/maskingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PRIVACLOUD AI — OCR Scanner & Masking Integration', () => {

  test('scanDocument extracts text via OCR and detects Aadhaar, PAN, Phone, Email', { timeout: 30000 }, async () => {
    const samplePath = path.resolve(__dirname, '../../sample-data/sample_identity_high_risk.png');
    assert.ok(fs.existsSync(samplePath), 'Sample test document must exist');

    const imageBuffer = fs.readFileSync(samplePath);
    const result = await scanDocument(imageBuffer);

    assert.ok(result);
    assert.strictEqual(result.riskLevel, 'High', 'Document with Aadhaar and PAN should be High Risk');
    assert.ok(result.riskScore >= 50, `Score should be >= 50, got: ${result.riskScore}`);
    assert.ok(result.counts.aadhaar >= 1, 'Should detect at least 1 Aadhaar number');
    assert.ok(result.counts.pan >= 1, 'Should detect at least 1 PAN card');
    assert.strictEqual(result.hasSensitiveData, true);
    assert.ok(result.detectedSensitiveBoxes.length > 0, 'Should have bounding boxes for masking');

    // Generate masked image and check it produces valid image buffer
    const maskedBuffer = await generateMaskedImage(imageBuffer, result.detectedSensitiveBoxes);
    assert.ok(maskedBuffer);
    assert.ok(Buffer.isBuffer(maskedBuffer));
  });

});
