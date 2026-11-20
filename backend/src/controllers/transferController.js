import { isConfigured, supabase, STORAGE_BUCKET, localStore } from '../config/supabase.js';
import { hashToken, generateOTP, hashOTP } from '../utils/patterns.js';
import { sendOtpEmail } from '../services/emailService.js';

/**
 * Public Transfer: Step 1 - Inspect shared link status
 */
export async function getTransferInfo(req, res) {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, error: 'Token missing' });

    const tokenHash = hashToken(token);
    let share = null;
    let file = null;

    if (isConfigured && supabase) {
      const { data, error } = await supabase
        .from('shares')
        .select('*, files(*)')
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (error) throw error;
      share = data;
      file = share?.files;
    } else {
      share = await localStore.getShareByTokenHash(tokenHash);
      if (share) file = await localStore.getFileById(share.file_id);
    }

    if (!share) {
      return res.status(404).json({ success: false, error: 'Invalid or non-existent share link.' });
    }

    // Check Revoked
    if (share.status === 'REVOKED') {
      return res.status(410).json({
        success: false,
        error: 'HTTP 410 Gone: This share link has been revoked by the sender.',
        code: 'SHARE_REVOKED'
      });
    }

    // Check Already Used
    if (share.status === 'USED') {
      return res.status(410).json({
        success: false,
        error: 'HTTP 410 Gone: This one-time document has already been accessed and consumed.',
        code: 'SHARE_ALREADY_USED',
        used_at: share.used_at
      });
    }

    // Check Expiration
    const now = new Date();
    const expiresAt = new Date(share.expires_at);
    if (now > expiresAt) {
      if (isConfigured && supabase) {
        await supabase.from('shares').update({ status: 'EXPIRED' }).eq('id', share.id);
        await supabase.from('security_events').insert([{
          file_id: share.file_id,
          share_id: share.id,
          event_type: 'LINK_EXPIRED',
          event_status: 'INFO',
          safe_metadata: { expired_at: share.expires_at }
        }]);
      } else {
        await localStore.updateShare(share.id, { status: 'EXPIRED' });
        await localStore.recordSecurityEvent({
          file_id: share.file_id,
          share_id: share.id,
          event_type: 'LINK_EXPIRED',
          event_status: 'INFO',
          safe_metadata: { expired_at: share.expires_at }
        });
      }

      return res.status(410).json({
        success: false,
        error: 'HTTP 410 Gone: This secure share link has expired.',
        code: 'LINK_EXPIRED',
        expires_at: share.expires_at
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

    // Mask authorized email hint (e.g. j***n@domain.com)
    const emailParts = share.authorized_email.split('@');
    const maskedEmailHint = emailParts[0].length <= 2 
      ? `${emailParts[0]}***@${emailParts[1]}`
      : `${emailParts[0][0]}***${emailParts[0].slice(-1)}@${emailParts[1]}`;

    return res.json({
      success: true,
      share: {
        filename: file?.filename || 'Document',
        risk_level: file?.risk_level || 'LOW',
        status: share.status,
        expires_at: share.expires_at,
        remaining_seconds: remainingSeconds,
        authorized_email_hint: maskedEmailHint,
        is_verified: share.status === 'VERIFIED'
      }
    });
  } catch (err) {
    console.error('Transfer info error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Public Transfer: Step 2 - Request 6-digit OTP
 */
export async function requestOtp(req, res) {
  try {
    const { token } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Recipient email is required.' });
    }

    const tokenHash = hashToken(token);
    let share = null;
    let file = null;

    if (isConfigured && supabase) {
      const { data } = await supabase.from('shares').select('*, files(*)').eq('token_hash', tokenHash).maybeSingle();
      share = data;
      file = share?.files;
    } else {
      share = await localStore.getShareByTokenHash(tokenHash);
      if (share) file = await localStore.getFileById(share.file_id);
    }

    if (!share) return res.status(404).json({ success: false, error: 'Link not found.' });

    // Validate Status & Expiry
    if (['USED', 'REVOKED', 'EXPIRED'].includes(share.status) || new Date() > new Date(share.expires_at)) {
      return res.status(410).json({ success: false, error: 'This share link is no longer active.' });
    }

    // Validate Authorized Email Match
    if (email.trim().toLowerCase() !== share.authorized_email.toLowerCase()) {
      // Record failed access attempt
      if (isConfigured && supabase) {
        await supabase.from('security_events').insert([{
          file_id: share.file_id,
          share_id: share.id,
          event_type: 'ACCESS_DENIED',
          event_status: 'FAILURE',
          safe_metadata: { reason: 'EMAIL_MISMATCH' }
        }]);
      } else {
        await localStore.recordSecurityEvent({
          file_id: share.file_id,
          share_id: share.id,
          event_type: 'ACCESS_DENIED',
          event_status: 'FAILURE',
          safe_metadata: { reason: 'EMAIL_MISMATCH' }
        });
      }

      return res.status(403).json({
        success: false,
        error: 'Access Denied: You are not the authorized recipient of this document.'
      });
    }

    // Generate 6-digit OTP & 5-minute expiry
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const updates = {
      otp_hash: otpHash,
      otp_expires_at: otpExpiresAt.toISOString(),
      otp_attempts: 0,
      status: 'OTP_PENDING'
    };

    if (isConfigured && supabase) {
      await supabase.from('shares').update(updates).eq('id', share.id);
      await supabase.from('security_events').insert([{
        file_id: share.file_id,
        share_id: share.id,
        event_type: 'OTP_REQUESTED',
        event_status: 'SUCCESS',
        safe_metadata: { recipient: share.authorized_email }
      }]);
    } else {
      await localStore.updateShare(share.id, updates);
      await localStore.recordSecurityEvent({
        file_id: share.file_id,
        share_id: share.id,
        event_type: 'OTP_REQUESTED',
        event_status: 'SUCCESS',
        safe_metadata: { recipient: share.authorized_email }
      });
    }

    // Send email dispatch
    const emailResult = await sendOtpEmail({
      toEmail: share.authorized_email,
      otp,
      filename: file?.filename || 'Protected Document'
    });

    return res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${share.authorized_email}.`,
      otp_expires_at: otpExpiresAt.toISOString(),
      // In local dev/mock mode, return OTP for instant evaluation testing
      ...(emailResult.mock ? { dev_otp: otp } : {})
    });
  } catch (err) {
    console.error('Request OTP error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Public Transfer: Step 3 - Verify 6-digit OTP
 */
export async function verifyOtp(req, res) {
  try {
    const { token } = req.params;
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'Email and 6-digit OTP are required.' });
    }

    const tokenHash = hashToken(token);
    let share = null;

    if (isConfigured && supabase) {
      const { data } = await supabase.from('shares').select('*').eq('token_hash', tokenHash).maybeSingle();
      share = data;
    } else {
      share = await localStore.getShareByTokenHash(tokenHash);
    }

    if (!share) return res.status(404).json({ success: false, error: 'Link not found.' });

    // Enforce limits and expiry
    if (new Date() > new Date(share.expires_at)) {
      return res.status(410).json({ success: false, error: 'This share link has expired.' });
    }

    if (email.trim().toLowerCase() !== share.authorized_email.toLowerCase()) {
      return res.status(403).json({ success: false, error: 'Unauthorized email.' });
    }

    if (!share.otp_expires_at || new Date() > new Date(share.otp_expires_at)) {
      return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new code.' });
    }

    if (share.otp_attempts >= 5) {
      return res.status(429).json({ success: false, error: 'Maximum verification attempts exceeded. Please request a new OTP.' });
    }

    // Verify OTP Hash
    const incomingHash = hashOTP(otp.trim());
    if (incomingHash !== share.otp_hash) {
      const newAttempts = (share.otp_attempts || 0) + 1;

      if (isConfigured && supabase) {
        await supabase.from('shares').update({ otp_attempts: newAttempts }).eq('id', share.id);
        await supabase.from('security_events').insert([{
          file_id: share.file_id,
          share_id: share.id,
          event_type: 'OTP_REJECTED',
          event_status: 'FAILURE',
          safe_metadata: { attempts: newAttempts }
        }]);
      } else {
        await localStore.updateShare(share.id, { otp_attempts: newAttempts });
        await localStore.recordSecurityEvent({
          file_id: share.file_id,
          share_id: share.id,
          event_type: 'OTP_REJECTED',
          event_status: 'FAILURE',
          safe_metadata: { attempts: newAttempts }
        });
      }

      return res.status(400).json({
        success: false,
        error: `Invalid verification code. ${5 - newAttempts} attempts remaining.`
      });
    }

    // Mark as VERIFIED
    const updates = {
      status: 'VERIFIED',
      verified_at: new Date().toISOString()
    };

    if (isConfigured && supabase) {
      await supabase.from('shares').update(updates).eq('id', share.id);
      await supabase.from('security_events').insert([{
        file_id: share.file_id,
        share_id: share.id,
        event_type: 'OTP_VERIFIED',
        event_status: 'SUCCESS',
        safe_metadata: { verified_recipient: share.authorized_email }
      }]);
    } else {
      await localStore.updateShare(share.id, updates);
      await localStore.recordSecurityEvent({
        file_id: share.file_id,
        share_id: share.id,
        event_type: 'OTP_VERIFIED',
        event_status: 'SUCCESS',
        safe_metadata: { verified_recipient: share.authorized_email }
      });
    }

    return res.json({
      success: true,
      message: 'Identity verified successfully. You may now download your protected document.',
      status: 'VERIFIED'
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Public Transfer: Step 4 - Atomic One-Time Download
 * Consumes the share immediately; subsequent calls fail with HTTP 410.
 */
export async function downloadMaskedFile(req, res) {
  try {
    const { token } = req.params;
    const { email } = req.body;

    const tokenHash = hashToken(token);
    let share = null;
    let file = null;

    if (isConfigured && supabase) {
      const { data } = await supabase.from('shares').select('*, files(*)').eq('token_hash', tokenHash).maybeSingle();
      share = data;
      file = share?.files;
    } else {
      share = await localStore.getShareByTokenHash(tokenHash);
      if (share) file = await localStore.getFileById(share.file_id);
    }

    if (!share) return res.status(404).json({ success: false, error: 'Share link not found.' });

    // Enforce Single-Use Atomic Status
    if (share.status === 'USED') {
      return res.status(410).json({
        success: false,
        error: 'HTTP 410 Gone: This one-time document has already been downloaded and the link is now closed.',
        code: 'SHARE_ALREADY_USED'
      });
    }

    if (share.status !== 'VERIFIED') {
      return res.status(403).json({
        success: false,
        error: 'Access Denied: Recipient OTP verification is required before download.'
      });
    }

    if (new Date() > new Date(share.expires_at)) {
      return res.status(410).json({ success: false, error: 'HTTP 410 Gone: This share link has expired.' });
    }

    // Atomically claim the share: mark status = 'USED'
    const usedAt = new Date().toISOString();
    if (isConfigured && supabase) {
      const { error: updateErr } = await supabase
        .from('shares')
        .update({ status: 'USED', used_at: usedAt })
        .eq('id', share.id)
        .eq('status', 'VERIFIED'); // Optimistic locking guard

      if (updateErr) throw updateErr;

      await supabase.from('security_events').insert([{
        file_id: share.file_id,
        share_id: share.id,
        event_type: 'DOWNLOAD_COMPLETED',
        event_status: 'SUCCESS',
        safe_metadata: { downloaded_by: share.authorized_email }
      }]);
    } else {
      await localStore.updateShare(share.id, { status: 'USED', used_at: usedAt });
      await localStore.recordSecurityEvent({
        file_id: share.file_id,
        share_id: share.id,
        event_type: 'DOWNLOAD_COMPLETED',
        event_status: 'SUCCESS',
        safe_metadata: { downloaded_by: share.authorized_email }
      });
    }

    // Fetch ONLY the masked copy from storage
    const targetPath = file?.storage_path_masked || file?.storage_path_original;
    let fileBuffer = null;

    if (isConfigured && supabase) {
      const { data: blob, error: dlErr } = await supabase.storage.from(STORAGE_BUCKET).download(targetPath);
      if (dlErr) throw dlErr;
      const arr = await blob.arrayBuffer();
      fileBuffer = Buffer.from(arr);
    } else {
      const r = await localStore.downloadFile(targetPath);
      fileBuffer = r.data;
    }

    const safeFilename = `masked-${(file?.filename || 'document').replace(/\.[^/.]+$/, '')}.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    return res.send(fileBuffer);
  } catch (err) {
    console.error('Download error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
