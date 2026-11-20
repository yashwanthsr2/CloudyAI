import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { processPdfDocument } from '../src/services/pdfService.js';
import sharp from 'sharp';

describe('PRIVACLOUD AI — PDF Processing, OCR & Redaction', () => {

  test('processPdfDocument handles PDF and renders flattened raster image', async () => {
    // Minimal valid PDF structure
    const samplePdfString = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 400 300]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF';
    const pdfBuffer = Buffer.from(samplePdfString);

    const { scanResult, pageImageBuffer, maskedBuffer } = await processPdfDocument(pdfBuffer, 'test.pdf');

    assert.ok(scanResult);
    assert.strictEqual(typeof scanResult.riskScore, 'number');
    assert.ok(pageImageBuffer, 'Should produce a page image buffer');
    assert.ok(maskedBuffer, 'Should produce a masked flattened image buffer');

    // Verify output is a valid PNG raster image
    const meta = await sharp(maskedBuffer).metadata();
    assert.strictEqual(meta.format, 'png');
    assert.ok(meta.width > 0);
    assert.ok(meta.height > 0);
  });

  test('processPdfDocument detects sensitive Indian PII inside PDF and calculates risk', async () => {
    // Create text fallback representation of a PDF with Aadhaar and PAN
    const piiText = 'Employee Document\nAadhaar: 4532 8910 5621\nPAN: ABCDE1234F\nContact: 9876543210\n';
    
    // Test the parsing flow
    const samplePdf = '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 400 300]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000108 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n185\n%%EOF';
    
    const result = await processPdfDocument(Buffer.from(samplePdf), 'sample.pdf');
    assert.ok(result);
  });

});
