import sharp from 'sharp';

/**
 * Image Masking Service
 * Generates an opaque redacted copy of the original image by overlaying
 * solid rectangular masks over all detected sensitive bounding boxes.
 * 
 * SECURITY GUARANTEE:
 * 1. The original image is NEVER modified.
 * 2. Solid black opaque masks are composited into the pixel grid (not CSS or removable layers).
 * 3. Additional padding (+4px) is added to ensure complete character coverage.
 */
export async function generateMaskedImage(imageBuffer, sensitiveBoxes) {
  if (!sensitiveBoxes || sensitiveBoxes.length === 0) {
    // If no sensitive regions detected, return a clean clone
    return sharp(imageBuffer).toBuffer();
  }

  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;

  // Build SVG overlay with solid black rectangles covering sensitive coordinates
  // Adding 4px padding on all sides for OCR margin safety
  const PADDING = 4;
  let svgRects = '';

  for (const item of sensitiveBoxes) {
    const { bbox } = item;
    const x = Math.max(0, bbox.x0 - PADDING);
    const y = Math.max(0, bbox.y0 - PADDING);
    const w = Math.min(width - x, bbox.width + (PADDING * 2));
    const h = Math.min(height - y, bbox.height + (PADDING * 2));

    svgRects += `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#000000" rx="3" ry="3" />
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="3,3" />
    `;
  }

  const svgOverlay = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${svgRects}
    </svg>
  `;

  // Composite SVG onto original image buffer to produce the masked image
  const maskedBuffer = await sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0
      }
    ])
    .png()
    .toBuffer();

  return maskedBuffer;
}
