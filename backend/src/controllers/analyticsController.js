import { isConfigured, supabase, localStore, USER_QUOTA_BYTES } from '../config/supabase.js';

/**
 * Security Activity & Analytics Controller
 * Provides audit event timeline and dashboard KPI metrics.
 */
export async function getAnalyticsSummary(req, res) {
  try {
    const userId = req.user.id;
    const { event_type, event_status, limit = 50 } = req.query;

    let files = [];
    let shares = [];
    let securityEvents = [];
    let usedBytes = 0;

    if (isConfigured && supabase) {
      // Fetch user files
      const { data: fileData } = await supabase.from('files').select('*').eq('user_id', userId);
      files = fileData || [];
      usedBytes = files.reduce((acc, f) => acc + (f.size_bytes || 0), 0);

      // Fetch user shares
      const fileIds = files.map(f => f.id);
      if (fileIds.length > 0) {
        const { data: shareData } = await supabase.from('shares').select('*').in('file_id', fileIds);
        shares = shareData || [];
      }

      // Fetch security audit events
      let query = supabase.from('security_events').select('*').order('created_at', { ascending: false }).limit(limit);
      if (event_type) query = query.eq('event_type', event_type);
      if (event_status) query = query.eq('event_status', event_status);

      const { data: eventData } = await query;
      securityEvents = eventData || [];
    } else {
      files = await localStore.getFilesByUser(userId);
      usedBytes = await localStore.getUserStorageUsed(userId);

      const allShares = await localStore.getAllShares();
      const fileIdSet = new Set(files.map(f => f.id));
      shares = allShares.filter(s => fileIdSet.has(s.file_id));

      securityEvents = await localStore.getSecurityEvents({
        eventType: event_type,
        eventStatus: event_status
      });
    }

    // Risk distribution
    const riskCounts = {
      HIGH: files.filter(f => f.risk_level === 'HIGH').length,
      MEDIUM: files.filter(f => f.risk_level === 'MEDIUM').length,
      LOW: files.filter(f => f.risk_level === 'LOW').length,
      NONE: files.filter(f => f.risk_level === 'NONE').length,
    };

    // Detected PII Category Aggregates
    const piiCounts = {
      aadhaar: 0,
      pan: 0,
      phone: 0,
      email: 0
    };

    for (const f of files) {
      const d = f.detected_info || {};
      piiCounts.aadhaar += d.aadhaar || 0;
      piiCounts.pan += d.pan || 0;
      piiCounts.phone += d.phone || 0;
      piiCounts.email += d.email || 0;
    }

    // Share link states
    const now = new Date();
    const shareStats = {
      total: shares.length,
      active: shares.filter(s => s.status !== 'USED' && s.status !== 'REVOKED' && new Date(s.expires_at) > now).length,
      used: shares.filter(s => s.status === 'USED').length,
      revoked: shares.filter(s => s.status === 'REVOKED').length,
      expired: shares.filter(s => new Date(s.expires_at) <= now && s.status !== 'USED' && s.status !== 'REVOKED').length,
    };

    return res.json({
      success: true,
      summary: {
        total_files: files.length,
        storage: {
          used_bytes: usedBytes,
          total_bytes: USER_QUOTA_BYTES,
          remaining_bytes: Math.max(0, USER_QUOTA_BYTES - usedBytes),
          percent_used: Math.min(100, Math.round((usedBytes / USER_QUOTA_BYTES) * 100))
        },
        risk_distribution: riskCounts,
        pii_counts: piiCounts,
        shares: shareStats,
        security_events: securityEvents
      }
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
