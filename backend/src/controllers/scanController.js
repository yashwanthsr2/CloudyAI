import { isConfigured, supabase, STORAGE_BUCKET, localStore } from '../config/supabase.js';
import { scanDocument } from '../services/scannerService.js';
import { generateMaskedImage } from '../services/maskingService.js';

/**
 * Scan a document for PII using OCR + Regex, compute risk classification,
 * and automatically generate a separate masked copy.
 */
export async function scanFile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let fileRecord = null;
    let fileBuffer = null;

    if (isConfigured && supabase) {
      const { data: file, error: fetchError } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchError || !file) return res.status(404).json({ success: false, error: 'File not found.' });
      fileRecord = file;

      const { data: blobData, error: downloadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(file.storage_path_original);

      if (downloadError) throw new Error(`Failed to retrieve file from storage: ${downloadError.message}`);
      const arrayBuf = await blobData.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuf);
    } else {
      fileRecord = await localStore.getFileById(id);
      if (!fileRecord || fileRecord.user_id !== userId) {
        return res.status(404).json({ success: false, error: 'File not found.' });
      }
      const storageRes = await localStore.downloadFile(fileRecord.storage_path_original);
      fileBuffer = storageRes.data;
    }

    // Step 1: Run OCR Privacy Scanner
    const scanResult = await scanDocument(fileBuffer);

    // Step 2: Generate opaque masked copy (Original remains untouched)
    let maskedStoragePath = null;
    let maskedBuffer = null;
    let maskingStatus = 'NONE';

    if (scanResult.hasSensitiveData && scanResult.detectedSensitiveBoxes.length > 0) {
      maskedBuffer = await generateMaskedImage(fileBuffer, scanResult.detectedSensitiveBoxes);
      maskedStoragePath = `${userId}/masked-${id}.png`;
      maskingStatus = 'MASKED';

      if (isConfigured && supabase) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(maskedStoragePath, maskedBuffer, { contentType: 'image/png', upsert: true });
      } else {
        await localStore.uploadFile(maskedStoragePath, maskedBuffer, 'image/png');
      }
    }

    // Step 3: Update file record with scan results (NO RAW PII STORED)
    const updates = {
      risk_level: scanResult.riskLevel,
      risk_reason: scanResult.riskReason,
      detected_info: scanResult.counts,
      scan_status: 'COMPLETED',
      masking_status: maskingStatus,
      storage_path_masked: maskedStoragePath,
      ocr_confidence: 95
    };

    if (isConfigured && supabase) {
      const { data: updated, error: updateErr } = await supabase
        .from('files')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Log Security Events
      await supabase.from('security_events').insert([
        {
          user_id: userId,
          file_id: id,
          event_type: 'SCAN_COMPLETED',
          event_status: 'SUCCESS',
          safe_metadata: { risk_level: scanResult.riskLevel, counts: scanResult.counts }
        },
        ...(maskingStatus === 'MASKED' ? [{
          user_id: userId,
          file_id: id,
          event_type: 'MASK_CREATED',
          event_status: 'SUCCESS',
          safe_metadata: { masked_path: maskedStoragePath }
        }] : [])
      ]);

      return res.json({
        success: true,
        message: 'Document scan & redaction completed.',
        file: updated,
        scan: {
          risk_level: scanResult.riskLevel,
          risk_reason: scanResult.riskReason,
          counts: scanResult.counts,
          masking_status: maskingStatus,
          has_masked_copy: !!maskedStoragePath
        }
      });
    } else {
      const updated = await localStore.updateFile(id, updates);

      await localStore.recordSecurityEvent({
        user_id: userId,
        file_id: id,
        event_type: 'SCAN_COMPLETED',
        event_status: 'SUCCESS',
        safe_metadata: { risk_level: scanResult.riskLevel, counts: scanResult.counts }
      });

      if (maskingStatus === 'MASKED') {
        await localStore.recordSecurityEvent({
          user_id: userId,
          file_id: id,
          event_type: 'MASK_CREATED',
          event_status: 'SUCCESS',
          safe_metadata: { masked_path: maskedStoragePath }
        });
      }

      return res.json({
        success: true,
        message: 'Document scan & redaction completed.',
        file: updated,
        scan: {
          risk_level: scanResult.riskLevel,
          risk_reason: scanResult.riskReason,
          counts: scanResult.counts,
          masking_status: maskingStatus,
          has_masked_copy: !!maskedStoragePath
        }
      });
    }
  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Privacy scan failed.' });
  }
}

/**
 * Get masked image preview stream
 */
export async function getMaskedPreview(req, res) {
  try {
    const { id } = req.params;
    let file = null;

    if (isConfigured && supabase) {
      const { data } = await supabase.from('files').select('*').eq('id', id).single();
      file = data;
    } else {
      file = await localStore.getFileById(id);
    }

    if (!file || !file.storage_path_masked) {
      return res.status(404).json({ success: false, error: 'No masked copy exists for this file.' });
    }

    let buffer = null;
    if (isConfigured && supabase) {
      const { data: blob } = await supabase.storage.from(STORAGE_BUCKET).download(file.storage_path_masked);
      const arr = await blob.arrayBuffer();
      buffer = Buffer.from(arr);
    } else {
      const r = await localStore.downloadFile(file.storage_path_masked);
      buffer = r.data;
    }

    res.setHeader('Content-Type', 'image/png');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get original image preview stream (OWNER ONLY)
 */
export async function getOriginalPreview(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    let file = null;

    if (isConfigured && supabase) {
      const { data } = await supabase.from('files').select('*').eq('id', id).eq('user_id', userId).single();
      file = data;
    } else {
      file = await localStore.getFileById(id);
      if (file && file.user_id !== userId) file = null;
    }

    if (!file) {
      return res.status(403).json({ success: false, error: 'Unauthorized to view original file.' });
    }

    let buffer = null;
    if (isConfigured && supabase) {
      const { data: blob } = await supabase.storage.from(STORAGE_BUCKET).download(file.storage_path_original);
      const arr = await blob.arrayBuffer();
      buffer = Buffer.from(arr);
    } else {
      const r = await localStore.downloadFile(file.storage_path_original);
      buffer = r.data;
    }

    res.setHeader('Content-Type', file.mime_type || 'image/png');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
