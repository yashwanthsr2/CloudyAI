import crypto from 'crypto';
import { isConfigured, supabase, localStore } from '../config/supabase.js';
import { generateShareToken, hashToken, calculateExpiry } from '../utils/patterns.js';
import { sendShareInvitationEmail } from '../services/emailService.js';

/**
 * Create a secure one-to-one share for an authorized recipient email
 */
export async function createShare(req, res) {
  try {
    const { id } = req.params;
    const { recipient_email } = req.body;
    const userId = req.user.id;

    if (!recipient_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient_email.trim())) {
      return res.status(400).json({
        success: false,
        error: 'A valid authorized recipient email address is required.'
      });
    }

    const cleanEmail = recipient_email.trim().toLowerCase();

    // 1. Fetch file and verify ownership
    let file = null;
    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error || !data) return res.status(404).json({ success: false, error: 'File not found or unauthorized.' });
      file = data;
    } else {
      file = await localStore.getFileById(id);
      if (!file || file.user_id !== userId) {
        return res.status(404).json({ success: false, error: 'File not found or unauthorized.' });
      }
    }

    // 2. Compute risk-based expiry
    const riskLevel = file.risk_level || 'LOW';
    const { ttlMinutes, expiresAt } = calculateExpiry(riskLevel);

    // 3. Cryptographically random share token
    const rawToken = generateShareToken();
    const tokenHash = hashToken(rawToken);

    const shareId = crypto.randomUUID();
    const shareRecord = {
      id: shareId,
      file_id: id,
      token_hash: tokenHash,
      authorized_email: cleanEmail,
      otp_hash: null,
      otp_expires_at: null,
      otp_attempts: 0,
      expires_at: expiresAt.toISOString(),
      status: 'CREATED',
      verified_at: null,
      used_at: null,
      created_at: new Date().toISOString()
    };

    if (isConfigured && supabase) {
      const { error: insertErr } = await supabase.from('shares').insert([shareRecord]);
      if (insertErr) throw insertErr;

      await supabase.from('security_events').insert([{
        user_id: userId,
        file_id: id,
        share_id: shareId,
        event_type: 'SHARE_CREATED',
        event_status: 'SUCCESS',
        safe_metadata: { authorized_email: cleanEmail, ttl_minutes: ttlMinutes, risk_level: riskLevel }
      }]);
    } else {
      await localStore.createShare(shareRecord);
      await localStore.recordSecurityEvent({
        user_id: userId,
        file_id: id,
        share_id: shareId,
        event_type: 'SHARE_CREATED',
        event_status: 'SUCCESS',
        safe_metadata: { authorized_email: cleanEmail, ttl_minutes: ttlMinutes, risk_level: riskLevel }
      });
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareUrl = `${frontendBase}/transfer/${rawToken}`;

    // 4. Dispatch email invitation to recipient
    const emailResult = await sendShareInvitationEmail({
      toEmail: cleanEmail,
      senderEmail: req.user.email || 'A PRIVACLOUD user',
      shareUrl,
      ttlMinutes,
      riskLevel,
      filename: file.filename
    });

    return res.status(201).json({
      success: true,
      message: `Secure one-time share created for ${cleanEmail}. Link expires in ${ttlMinutes} minutes.`,
      share: {
        id: shareId,
        file_id: id,
        filename: file.filename,
        authorized_email: cleanEmail,
        risk_level: riskLevel,
        token: rawToken,
        share_url: shareUrl,
        expires_at: expiresAt.toISOString(),
        ttl_minutes: ttlMinutes,
        email_sent: emailResult.sent,
        mock_email: emailResult.mock || false
      }
    });
  } catch (err) {
    console.error('Create share error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Revoke an active share link
 */
export async function revokeShare(req, res) {
  try {
    const { id } = req.params; // share_id
    const userId = req.user.id;

    if (isConfigured && supabase) {
      const { data: share, error: fetchErr } = await supabase
        .from('shares')
        .select('*, files!inner(user_id)')
        .eq('id', id)
        .eq('files.user_id', userId)
        .single();

      if (fetchErr || !share) {
        return res.status(404).json({ success: false, error: 'Share link not found or unauthorized.' });
      }

      await supabase.from('shares').update({ status: 'REVOKED' }).eq('id', id);

      await supabase.from('security_events').insert([{
        user_id: userId,
        share_id: id,
        event_type: 'SHARE_REVOKED',
        event_status: 'SUCCESS',
        safe_metadata: { revoked_by: userId }
      }]);

      return res.json({ success: true, message: 'Share link revoked permanently.' });
    } else {
      const share = Array.from((await localStore.getAllShares())).find(s => s.id === id);
      if (!share) return res.status(404).json({ success: false, error: 'Share not found' });

      await localStore.updateShare(id, { status: 'REVOKED' });
      await localStore.recordSecurityEvent({
        user_id: userId,
        share_id: id,
        event_type: 'SHARE_REVOKED',
        event_status: 'SUCCESS',
        safe_metadata: { revoked_by: userId }
      });

      return res.json({ success: true, message: 'Share link revoked permanently.' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * List all shares belonging to files of authenticated user
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
          authorized_email,
          expires_at,
          status,
          verified_at,
          used_at,
          created_at,
          files!inner(id, filename, user_id, risk_level)
        `)
        .eq('files.user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json({ success: true, shares: shares || [] });
    } else {
      const userFiles = await localStore.getFilesByUser(userId);
      const userFileIds = new Set(userFiles.map(f => f.id));
      const allShares = await localStore.getAllShares();

      const userShares = allShares
        .filter(s => userFileIds.has(s.file_id))
        .map(s => {
          const file = userFiles.find(f => f.id === s.file_id);
          return {
            ...s,
            files: file
          };
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      return res.json({ success: true, shares: userShares });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
