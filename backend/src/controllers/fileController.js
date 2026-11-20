import crypto from 'crypto';
import { isConfigured, supabase, STORAGE_BUCKET, localStore, USER_QUOTA_BYTES, MAX_FILE_SIZE_BYTES } from '../config/supabase.js';

/**
 * Upload a document to private storage & enforce 100MB per-user quota
 */
export async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const userId = req.user.id;
    const fileId = crypto.randomUUID();
    const originalName = req.file.originalname;
    const mimeType = req.file.mimetype;
    const sizeBytes = req.file.size;
    const fileBuffer = req.file.buffer;

    // 1. Enforce individual file size limit (5MB)
    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        error: `File exceeds maximum individual limit of 5 MB (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB uploaded).`
      });
    }

    // 2. Enforce total per-user storage quota (100MB)
    let currentUsed = 0;
    if (isConfigured && supabase) {
      const { data: userFiles, error: sumErr } = await supabase
        .from('files')
        .select('size_bytes')
        .eq('user_id', userId);

      if (!sumErr && userFiles) {
        currentUsed = userFiles.reduce((acc, f) => acc + (f.size_bytes || 0), 0);
      }
    } else {
      currentUsed = await localStore.getUserStorageUsed(userId);
    }

    if (currentUsed + sizeBytes > USER_QUOTA_BYTES) {
      return res.status(400).json({
        success: false,
        error: `Storage quota exceeded. You have used ${(currentUsed / (1024 * 1024)).toFixed(1)} MB of your 100 MB quota.`
      });
    }

    // 3. Isolated private storage path: <userId>/<fileId>-<safeName>
    const safeFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePathOriginal = `${userId}/${fileId}-${safeFilename}`;

    const fileRecord = {
      id: fileId,
      user_id: userId,
      filename: originalName,
      storage_path_original: storagePathOriginal,
      storage_path_masked: null,
      size_bytes: sizeBytes,
      mime_type: mimeType,
      risk_level: 'NONE',
      risk_reason: 'Awaiting privacy scan',
      detected_info: { aadhaar: 0, pan: 0, phone: 0, email: 0 },
      scan_status: 'PENDING',
      masking_status: 'NONE',
      ocr_confidence: 0
    };

    if (isConfigured && supabase) {
      const { error: uploadErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePathOriginal, fileBuffer, { contentType: mimeType, upsert: false });

      if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

      const { data: inserted, error: dbErr } = await supabase
        .from('files')
        .insert([fileRecord])
        .select()
        .single();

      if (dbErr) throw new Error(`Database error: ${dbErr.message}`);

      // Log Security Event
      await supabase.from('security_events').insert([{
        user_id: userId,
        file_id: fileId,
        event_type: 'FILE_UPLOAD',
        event_status: 'SUCCESS',
        safe_metadata: { filename: originalName, size_bytes: sizeBytes, mime_type: mimeType }
      }]);

      return res.status(201).json({
        success: true,
        message: 'File uploaded to private vault.',
        file: inserted
      });
    } else {
      await localStore.uploadFile(storagePathOriginal, fileBuffer, mimeType);
      const inserted = await localStore.insertFile(fileRecord);

      await localStore.recordSecurityEvent({
        user_id: userId,
        file_id: fileId,
        event_type: 'FILE_UPLOAD',
        event_status: 'SUCCESS',
        safe_metadata: { filename: originalName, size_bytes: sizeBytes, mime_type: mimeType }
      });

      return res.status(201).json({
        success: true,
        message: 'File uploaded to private vault (Sandbox Mode).',
        file: inserted
      });
    }
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * List all files for the authenticated user and return quota usage
 */
export async function listFiles(req, res) {
  try {
    const userId = req.user.id;
    let files = [];
    let usedBytes = 0;

    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      files = data || [];
      usedBytes = files.reduce((acc, f) => acc + (f.size_bytes || 0), 0);
    } else {
      files = await localStore.getFilesByUser(userId);
      usedBytes = await localStore.getUserStorageUsed(userId);
    }

    return res.json({
      success: true,
      quota: {
        used_bytes: usedBytes,
        total_bytes: USER_QUOTA_BYTES,
        remaining_bytes: Math.max(0, USER_QUOTA_BYTES - usedBytes),
        percent_used: Math.min(100, Math.round((usedBytes / USER_QUOTA_BYTES) * 100))
      },
      files
    });
  } catch (err) {
    console.error('List files error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Get single file metadata
 */
export async function getFile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    let file = null;

    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();
      if (error || !file) return res.status(404).json({ success: false, error: 'File not found' });
      file = data;
    } else {
      file = await localStore.getFileById(id);
      if (!file || file.user_id !== userId) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }
    }

    return res.json({ success: true, file });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Delete a file and associated masked copy from storage and database
 */
export async function deleteFile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (isConfigured && supabase) {
      const { data: file, error: fetchErr } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !file) {
        return res.status(404).json({ success: false, error: 'File not found or unauthorized' });
      }

      const pathsToRemove = [file.storage_path_original];
      if (file.storage_path_masked) pathsToRemove.push(file.storage_path_masked);

      await supabase.storage.from(STORAGE_BUCKET).remove(pathsToRemove);
      await supabase.from('files').delete().eq('id', id);

      return res.json({ success: true, message: 'File deleted permanently' });
    } else {
      const file = await localStore.getFileById(id);
      if (!file || file.user_id !== userId) {
        return res.status(404).json({ success: false, error: 'File not found or unauthorized' });
      }
      await localStore.deleteFile(id);
      return res.json({ success: true, message: 'File deleted permanently' });
    }
  } catch (err) {
    console.error('Delete file error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
