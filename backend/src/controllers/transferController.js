import { validateShareToken, recordEvent } from '../services/shareService.js';
import { isConfigured, supabase, STORAGE_BUCKET, localStore } from '../config/supabase.js';

/**
 * Public Transfer Endpoint: Inspect / View shared document
 * Accessible without login.
 * Validates token hash and enforces server-side expiration.
 * Returns HTTP 410 Gone if expired.
 */
export async function getTransferInfo(req, res) {
  try {
    const { token } = req.params;

    const share = await validateShareToken(token);

    // Record VIEW event
    await recordEvent(share.id, 'VIEW');

    const file = share.files || {};
    const scan = share.scans || {};

    const now = new Date();
    const expiresAt = new Date(share.expires_at);
    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    return res.json({
      success: true,
      message: 'Access granted to masked document.',
      share: {
        filename: file.filename,
        size_bytes: file.size_bytes,
        mime_type: file.mime_type,
        risk_level: scan.risk_level || 'Low',
        risk_score: scan.risk_score || 0,
        expires_at: share.expires_at,
        remaining_seconds: remainingSeconds,
        is_masked: true
      }
    });
  } catch (err) {
    if (err.status === 410) {
      return res.status(410).json({
        success: false,
        error: 'HTTP 410 Gone: This secure share link has expired and is no longer accessible.',
        code: 'LINK_EXPIRED',
        expires_at: err.expiresAt
      });
    }

    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Failed to retrieve shared document.'
    });
  }
}

/**
 * Public Download / Stream of the masked document
 * Returns the masked copy ONLY. Never reveals the private original!
 */
export async function downloadMaskedFile(req, res) {
  try {
    const { token } = req.params;

    const share = await validateShareToken(token);
    const scan = share.scans || {};
    const file = share.files || {};

    // Record DOWNLOAD event
    await recordEvent(share.id, 'DOWNLOAD');

    const maskedPath = scan.masked_path;
    let fileBuffer = null;

    if (maskedPath) {
      if (isConfigured && supabase) {
        const { data: blobData, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(maskedPath);

        if (error) throw error;
        const arrayBuf = await blobData.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
      } else {
        const fileRes = await localStore.downloadFile(maskedPath);
        fileBuffer = fileRes.data;
      }
    } else {
      // If risk score was 0 (no PII detected), fallback to original image
      if (isConfigured && supabase) {
        const { data: blobData, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(file.storage_path);

        if (error) throw error;
        const arrayBuf = await blobData.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
      } else {
        const fileRes = await localStore.downloadFile(file.storage_path);
        fileBuffer = fileRes.data;
      }
    }

    const baseFilename = (file.filename || 'document').replace(/\.[^/.]+$/, '');
    const safeFilename = `masked-${baseFilename}.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    return res.send(fileBuffer);
  } catch (err) {
    if (err.status === 410) {
      return res.status(410).json({
        success: false,
        error: 'HTTP 410 Gone: This secure share link has expired.',
        code: 'LINK_EXPIRED'
      });
    }

    return res.status(err.status || 500).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * Public inline image view of the masked file
 */
export async function viewMaskedFile(req, res) {
  try {
    const { token } = req.params;
    const share = await validateShareToken(token);
    const scan = share.scans || {};
    const file = share.files || {};

    const targetPath = scan.masked_path || file.storage_path;
    let fileBuffer = null;

    if (isConfigured && supabase) {
      const { data: blobData, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(targetPath);

      if (error) throw error;
      const arrayBuf = await blobData.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuf);
    } else {
      const fileRes = await localStore.downloadFile(targetPath);
      fileBuffer = fileRes.data;
    }

    res.setHeader('Content-Type', 'image/png');
    return res.send(fileBuffer);
  } catch (err) {
    if (err.status === 410) {
      return res.status(410).json({
        success: false,
        error: 'HTTP 410 Gone: Link expired.'
      });
    }
    return res.status(err.status || 500).json({ success: false, error: err.message });
  }
}
