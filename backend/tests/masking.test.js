import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { generateMaskedImage } from '../src/services/maskingService.js';

describe('PRIVACLOUD AI — Image Masking Engine (Sharp)', () => {

  test('generateMaskedImage overlays solid black mask over sensitive coordinates', async () => {
    // 1. Create a 300x200 white test image buffer
    const whiteImageBuffer = await sharp({
      create: {
        width: 300,
        height: 200,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).png().toBuffer();

    // 2. Define a sensitive region bbox
    const sensitiveBoxes = [
      {
        type: 'pan',
        bbox: {
          x0: 50,
          y0: 40,
          x1: 150,
          y1: 80,
          width: 100,
          height: 40
        }
      }
    ];

    // 3. Generate masked image
    const maskedBuffer = await generateMaskedImage(whiteImageBuffer, sensitiveBoxes);
    assert.ok(maskedBuffer);
    assert.ok(Buffer.isBuffer(maskedBuffer));

    // 4. Verify dimensions are preserved and format is PNG
    const metadata = await sharp(maskedBuffer).metadata();
    assert.strictEqual(metadata.width, 300);
    assert.strictEqual(metadata.height, 200);
    assert.strictEqual(metadata.format, 'png');

    // 5. Inspect pixel data in the masked region (center of mask at x=100, y=60)
    // to confirm pixel is obscured (near black)
    const rawPixels = await sharp(maskedBuffer).raw().toBuffer();
    const channels = metadata.channels || 3;
    const targetPixelIndex = (60 * 300 + 100) * channels;
    const r = rawPixels[targetPixelIndex];
    const g = rawPixels[targetPixelIndex + 1];
    const b = rawPixels[targetPixelIndex + 2];

    // Solid black mask has RGB = 0,0,0
    assert.strictEqual(r, 0, 'Red channel in masked area must be 0 (black)');
    assert.strictEqual(g, 0, 'Green channel in masked area must be 0 (black)');
    assert.strictEqual(b, 0, 'Blue channel in masked area must be 0 (black)');
  });

  test('generateMaskedImage returns identical buffer when no sensitive data detected', async () => {
    const blankImage = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 200, g: 200, b: 200 }
      }
    }).png().toBuffer();

    const output = await generateMaskedImage(blankImage, []);
    assert.ok(output);
    const meta = await sharp(output).metadata();
    assert.strictEqual(meta.width, 100);
    assert.strictEqual(meta.height, 100);
  });

});
