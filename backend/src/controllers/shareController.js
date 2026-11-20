import { createShareLink } from '../services/shareService.js';
import { isConfigured, supabase, localStore } from '../config/supabase.js';

/**
 * Generate a new secure share link for a file
 */
export async function createShare(req, res) {
  try {
    const { file_id } = req.params;
    const userId = req.user.id;

    // Fetch file & scan risk level
    let riskLevel = 'Low';
    let fileRecord = null;

    if (isConfigured && supabase) {
      const { data: file, error } = await supabase
        .from('files')
        .select('*, scans(risk_level, masked_path)')
        .eq('id', file_id)
        .eq('user_id', userId)
        .single();

      if (error || !file) {
        return res.status(404).json({ success: false, error: 'File not found or unauthorized.' });
      }

      fileRecord = file;
      if (file.scans && file.scans.length > 0) {
        riskLevel = file.scans[0].risk_level || 'Low';
      }
    } else {
      fileRecord = await localStore.getFileById(file_id);
      if (!fileRecord) {
        return res.status(404).json({ success: false, error: 'File not found.' });
      }
      const scan = await localStore.getScanByFileId(file_id);
      if (scan) {
        riskLevel = scan.risk_level || 'Low';
      }
    }

    const { rawToken, expiresAt, ttlMinutes } = await createShareLink(file_id, riskLevel);

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${baseUrl}/transfer/${rawToken}`;

    return res.status(201).json({
      success: true,
      message: `Secure share link generated. Link expires in ${ttlMinutes} minutes.`,
      share: {
        file_id,
        filename: fileRecord.filename,
        risk_level: riskLevel,
        token: rawToken,
        share_url: shareUrl,
        expires_at: expiresAt,
        ttl_minutes: ttlMinutes
      }
    });
  } catch (err) {
    console.error('Create share error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * List active & historical shares for user's files
 */
export async function listShares(req, res) {
  try {
    const userId = req.user.id;

    if (isConfigured && supabase) {
      const { data: shares, error } = await supabase
        .from('shares')
        .select(`
          id,
          file_id,
          expires_at,
          created_at,
          files!inner(id, filename, user_id),
          share_events(id, event_type, event_time)
        `)
        .eq('files.user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, shares: shares || [] });
    } else {
      const allShares = await localStore.getAllShares();
      const userFiles = await localStore.getFilesByUser(userId);
      const userFileIds = new Set(userFiles.map(f => f.id));
      const filtered = allShares.filter(s => userFileIds.has(s.file_id));

      const events = await localStore.getShareEvents();
      const enriched = filtered.map(s => {
        const file = userFiles.find(f => f.id === s.file_id);
        const relatedEvents = events.filter(e => e.share_id === s.id);
        return {
          ...s,
          files: file,
          share_events: relatedEvents
        };
      });

      return res.json({ success: true, shares: enriched });
    }
  } catch (err) {
    console.error('List shares error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
