import crypto from 'crypto';
import { isConfigured, supabase, STORAGE_BUCKET, localStore } from '../config/supabase.js';

/**
 * Upload a document to private storage & register in files table
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

    // Secure isolated path: <userId>/<fileId>-<safeFilename>
    const safeFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${fileId}-${safeFilename}`;

    if (isConfigured && supabase) {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, fileBuffer, {
          contentType: mimeType,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Record in files table
      const { data: fileData, error: dbError } = await supabase
        .from('files')
        .insert([{
          id: fileId,
          user_id: userId,
          filename: originalName,
          storage_path: storagePath,
          mime_type: mimeType,
          size_bytes: sizeBytes
        }])
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully to private storage.',
        file: fileData
      });
    } else {
      // Local fallback
      await localStore.uploadFile(storagePath, fileBuffer, mimeType);
      const fileRecord = await localStore.insertFile({
        id: fileId,
        user_id: userId,
        filename: originalName,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: sizeBytes
      });

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully (Local Sandbox Mode).',
        file: fileRecord
      });
    }
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, error: err.message || 'File upload failed.' });
  }
}

/**
 * List all files belonging to authenticated user with their scan status
 */
export async function listFiles(req, res) {
  try {
    const userId = req.user.id;

    if (isConfigured && supabase) {
      const { data: files, error } = await supabase
        .from('files')
        .select(`
          *,
          scans (
            id,
            risk_score,
            risk_level,
            count_aadhaar,
            count_pan,
            count_phone,
            count_email,
            masked_path,
            scanned_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, files: files || [] });
    } else {
      const userFiles = await localStore.getFilesByUser(userId);
      const results = [];
      for (const f of userFiles) {
        const scan = await localStore.getScanByFileId(f.id);
        results.push({
          ...f,
          scans: scan ? [scan] : []
        });
      }
      return res.json({ success: true, files: results });
    }
  } catch (err) {
    console.error('List files error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Delete a file and associated masked copies
 */
export async function deleteFile(req, res) {
  try {
    const { file_id } = req.params;
    const userId = req.user.id;

    if (isConfigured && supabase) {
      // Verify ownership
      const { data: file, error: fetchErr } = await supabase
        .from('files')
        .select('*')
        .eq('id', file_id)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !file) {
        return res.status(404).json({ success: false, error: 'File not found or unauthorized.' });
      }

      // Check scan for masked path
      const { data: scan } = await supabase
        .from('scans')
        .select('masked_path')
        .eq('file_id', file_id)
        .maybeSingle();

      const pathsToDelete = [file.storage_path];
      if (scan && scan.masked_path) {
        pathsToDelete.push(scan.masked_path);
      }

      await supabase.storage.from(STORAGE_BUCKET).remove(pathsToDelete);
      await supabase.from('files').delete().eq('id', file_id);

      return res.json({ success: true, message: 'File deleted successfully.' });
    } else {
      await localStore.deleteFile(file_id);
      return res.json({ success: true, message: 'File deleted successfully.' });
    }
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
