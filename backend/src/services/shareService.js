import { generateShareToken, hashToken, calculateExpiry } from '../utils/patterns.js';
import { isConfigured, supabase, localStore } from '../config/supabase.js';
import crypto from 'crypto';

/**
 * Secure Sharing Service
 * Manages cryptographically random tokens, server-enforced TTL, and access tracking.
 */
export async function createShareLink(fileId, riskLevel) {
  // 1. Generate 256-bit secure random token
  const rawToken = generateShareToken();
  const tokenHash = hashToken(rawToken);

  // 2. Compute risk-based expiration
  const { ttlMinutes, expiresAt } = calculateExpiry(riskLevel);

  const shareRecord = {
    id: crypto.randomUUID(),
    file_id: fileId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    masked_copy_flag: true,
    created_at: new Date().toISOString()
  };

  if (isConfigured && supabase) {
    const { data, error } = await supabase
      .from('shares')
      .insert([shareRecord])
      .select()
      .single();

    if (error) throw new Error(`Failed to create share: ${error.message}`);
  } else {
    await localStore.createShare(shareRecord);
  }

  return {
    rawToken,
    expiresAt: expiresAt.toISOString(),
    ttlMinutes
  };
}

/**
 * Validates a share token and enforces server-side expiration.
 * Returns HTTP 410 error if expired.
 */
export async function validateShareToken(rawToken) {
  if (!rawToken) {
    const err = new Error('Token is missing');
    err.status = 400;
    throw err;
  }

  const tokenHash = hashToken(rawToken);
  let share = null;

  if (isConfigured && supabase) {
    const { data, error } = await supabase
      .from('shares')
      .select(`
        *,
        files (
          id,
          filename,
          mime_type,
          size_bytes,
          storage_path
        ),
        scans (
          risk_level,
          risk_score,
          masked_path
        )
      `)
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) throw error;
    share = data;
  } else {
    const rawShare = await localStore.getShareByTokenHash(tokenHash);
    if (rawShare) {
      const file = await localStore.getFileById(rawShare.file_id);
      const scan = await localStore.getScanByFileId(rawShare.file_id);
      share = {
        ...rawShare,
        files: file,
        scans: scan
      };
    }
  }

  if (!share) {
    const err = new Error('Invalid or non-existent share link');
    err.status = 404;
    throw err;
  }

  // Enforce server-side expiration
  const now = new Date();
  const expiresAt = new Date(share.expires_at);

  if (now > expiresAt) {
    // Record expired attempt in share_events
    await recordEvent(share.id, 'EXPIRED_ATTEMPT');
    
    const err = new Error('This secure share link has expired and is no longer accessible');
    err.status = 410; // HTTP 410 Gone as specified
    err.code = 'LINK_EXPIRED';
    err.expiresAt = share.expires_at;
    throw err;
  }

  return share;
}

/**
 * Records an access event (VIEW / DOWNLOAD / EXPIRED_ATTEMPT)
 */
export async function recordEvent(shareId, eventType) {
  const eventRecord = {
    id: crypto.randomUUID(),
    share_id: shareId,
    event_type: eventType,
    event_time: new Date().toISOString()
  };

  try {
    if (isConfigured && supabase) {
      await supabase.from('share_events').insert([eventRecord]);
    } else {
      await localStore.recordShareEvent(eventRecord);
    }
  } catch (err) {
    console.error('Failed to log share event:', err);
  }
}
