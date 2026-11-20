import { isConfigured, supabase, STORAGE_BUCKET, localStore } from '../config/supabase.js';
import { scanDocument } from '../services/scannerService.js';
import { generateMaskedImage } from '../services/maskingService.js';
import { processPdfDocument } from '../services/pdfService.js';
import crypto from 'crypto';

/**
 * Scan a document for PII using OCR + Regex, compute risk score,
 * and automatically create an opaque masked copy.
 * 
 * IMPORTANT: NEVER stores raw detected sensitive values in DB.
 */
export async function scanFile(req, res) {
  try {
    const { file_id } = req.params;
    const userId = req.user.id;

    // Fetch file record
    let fileRecord = null;
    let fileBuffer = null;

    if (isConfigured && supabase) {
      const { data: file, error: fetchError } = await supabase
        .from('files')
        .select('*')
        .eq('id', file_id)
        .eq('user_id', userId)
        .single();

      if (fetchError || !file) {
        return res.status(404).json({ success: false, error: 'File not found.' });
      }
      fileRecord = file;

      // Download original image from private Supabase Storage
      const { data: blobData, error: downloadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(file.storage_path);

      if (downloadError) {
        throw new Error(`Failed to retrieve file from storage: ${downloadError.message}`);
      }

      const arrayBuf = await blobData.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuf);
    } else {
      fileRecord = await localStore.getFileById(file_id);
      if (!fileRecord) {
        return res.status(404).json({ success: false, error: 'File not found.' });
      }
      const storageRes = await localStore.downloadFile(fileRecord.storage_path);
      fileBuffer = storageRes.data;
    }

    const isPdf = fileRecord.mime_type === 'application/pdf' || fileRecord.filename.toLowerCase().endsWith('.pdf');
    const isImage = fileRecord.mime_type.startsWith('image/');

    if (!isImage && !isPdf) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file format: ${fileRecord.mime_type}. Only images (JPEG, PNG, WebP) and PDF documents are supported.`
      });
    }

    let scanResult = null;
    let maskedStoragePath = null;
    let maskedBuffer = null;

    if (isPdf) {
      // Step 1: Process PDF document (render raster page image, extract text, run OCR)
      const pdfProcessed = await processPdfDocument(fileBuffer, fileRecord.filename);
      scanResult = pdfProcessed.scanResult;
      maskedBuffer = pdfProcessed.maskedBuffer;
      maskedStoragePath = `${userId}/masked-${file_id}.png`;
    } else {
      // Step 1: Run Privacy Scanner on image (OCR + Regex)
      scanResult = await scanDocument(fileBuffer);

      // Step 2: If sensitive data found, generate masked image copy
      if (scanResult.hasSensitiveData) {
        maskedBuffer = await generateMaskedImage(fileBuffer, scanResult.detectedSensitiveBoxes);
        maskedStoragePath = `${userId}/masked-${file_id}.png`;
      }
    }

    // Step 2: Store masked copy separately; original remains unmodified
    if (maskedBuffer && maskedStoragePath) {
      if (isConfigured && supabase) {
        const { error: maskUploadErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(maskedStoragePath, maskedBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (maskUploadErr) {
          console.error('Mask upload failed:', maskUploadErr);
        }
      } else {
        await localStore.uploadFile(maskedStoragePath, maskedBuffer, 'image/png');
      }
    }

    // Step 3: Record scan metadata in scans table (NO RAW SENSITIVE VALUES)
    const scanRecord = {
      id: crypto.randomUUID(),
      file_id,
      risk_score: scanResult.riskScore,
      risk_level: scanResult.riskLevel,
      count_aadhaar: scanResult.counts.aadhaar,
      count_pan: scanResult.counts.pan,
      count_phone: scanResult.counts.phone,
      count_email: scanResult.counts.email,
      masked_path: maskedStoragePath,
      scanned_at: new Date().toISOString()
    };

    if (isConfigured && supabase) {
      const { data: savedScan, error: scanSaveErr } = await supabase
        .from('scans')
        .upsert([scanRecord], { onConflict: 'file_id' })
        .select()
        .single();

      if (scanSaveErr) throw scanSaveErr;
    } else {
      await localStore.upsertScan(scanRecord);
    }

    return res.json({
      success: true,
      message: 'Scan completed successfully.',
      scan: {
        file_id,
        risk_score: scanResult.riskScore,
        risk_level: scanResult.riskLevel,
        counts: scanResult.counts,
        masked_path: maskedStoragePath,
        has_masked_copy: !!maskedStoragePath
      }
    });
  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Privacy scan failed.' });
  }
}

/**
 * Get masked image preview stream / buffer
 */
export async function getMaskedPreview(req, res) {
  try {
    const { file_id } = req.params;
    let maskedPath = null;

    if (isConfigured && supabase) {
      const { data: scan } = await supabase
        .from('scans')
        .select('masked_path')
        .eq('file_id', file_id)
        .single();

      if (!scan || !scan.masked_path) {
        return res.status(404).json({ success: false, error: 'No masked copy exists for this file.' });
      }
      maskedPath = scan.masked_path;

      const { data: blobData, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(maskedPath);

      if (error) throw error;
      const arrayBuf = await blobData.arrayBuffer();
      res.setHeader('Content-Type', 'image/png');
      return res.send(Buffer.from(arrayBuf));
    } else {
      const scan = await localStore.getScanByFileId(file_id);
      if (!scan || !scan.masked_path) {
        return res.status(404).json({ success: false, error: 'No masked copy exists.' });
      }
      const fileRes = await localStore.downloadFile(scan.masked_path);
      res.setHeader('Content-Type', 'image/png');
      return res.send(fileRes.data);
    }
  } catch (err) {
    console.error('Preview error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
