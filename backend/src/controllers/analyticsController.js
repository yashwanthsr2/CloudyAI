import { isConfigured, supabase, localStore } from '../config/supabase.js';

/**
 * Privacy Analytics Controller
 * Computes aggregated metadata ONLY.
 * NEVER stores or returns raw detected PII values.
 */
export async function getAnalytics(req, res) {
  try {
    const userId = req.user.id;

    let files = [];
    let scans = [];
    let shares = [];
    let shareEvents = [];

    if (isConfigured && supabase) {
      // 1. Files & Scans
      const { data: fileData } = await supabase
        .from('files')
        .select('id, created_at')
        .eq('user_id', userId);
      files = fileData || [];

      const fileIds = files.map(f => f.id);

      if (fileIds.length > 0) {
        const { data: scanData } = await supabase
          .from('scans')
          .select('risk_score, risk_level, count_aadhaar, count_pan, count_phone, count_email, scanned_at')
          .in('file_id', fileIds);
        scans = scanData || [];

        const { data: shareData } = await supabase
          .from('shares')
          .select('id, file_id, expires_at, created_at')
          .in('file_id', fileIds);
        shares = shareData || [];

        const shareIds = shares.map(s => s.id);
        if (shareIds.length > 0) {
          const { data: eventData } = await supabase
            .from('share_events')
            .select('event_type, event_time')
            .in('share_id', shareIds);
          shareEvents = eventData || [];
        }
      }
    } else {
      files = await localStore.getFilesByUser(userId);
      for (const f of files) {
        const scan = await localStore.getScanByFileId(f.id);
        if (scan) scans.push(scan);
      }
      const allShares = await localStore.getAllShares();
      const fileIdSet = new Set(files.map(f => f.id));
      shares = allShares.filter(s => fileIdSet.has(s.file_id));
      const shareIdSet = new Set(shares.map(s => s.id));
      const allEvents = await localStore.getShareEvents();
      shareEvents = allEvents.filter(e => shareIdSet.has(e.share_id));
    }

    // Aggregate Risk Levels
    const riskDistribution = {
      Low: 0,
      Medium: 0,
      High: 0
    };

    // Aggregate Detected PII Counts
    const piiCounts = {
      aadhaar: 0,
      pan: 0,
      phone: 0,
      email: 0
    };

    let totalRiskScoreSum = 0;
    for (const s of scans) {
      if (s.risk_level) riskDistribution[s.risk_level] = (riskDistribution[s.risk_level] || 0) + 1;
      piiCounts.aadhaar += s.count_aadhaar || 0;
      piiCounts.pan += s.count_pan || 0;
      piiCounts.phone += s.count_phone || 0;
      piiCounts.email += s.count_email || 0;
      totalRiskScoreSum += s.risk_score || 0;
    }

    const averageRiskScore = scans.length > 0 ? Math.round(totalRiskScoreSum / scans.length) : 0;

    // Aggregate Share Link Status
    const now = new Date();
    let activeShares = 0;
    let expiredShares = 0;

    for (const sh of shares) {
      if (new Date(sh.expires_at) > now) {
        activeShares++;
      } else {
        expiredShares++;
      }
    }

    // Aggregate Events
    let totalViews = 0;
    let totalDownloads = 0;
    let totalExpiredAttempts = 0;

    for (const ev of shareEvents) {
      if (ev.event_type === 'VIEW') totalViews++;
      else if (ev.event_type === 'DOWNLOAD') totalDownloads++;
      else if (ev.event_type === 'EXPIRED_ATTEMPT') totalExpiredAttempts++;
    }

    return res.json({
      success: true,
      analytics: {
        total_files: files.length,
        total_scans: scans.length,
        average_risk_score: averageRiskScore,
        risk_distribution: riskDistribution,
        pii_counts: piiCounts,
        shares: {
          total_links: shares.length,
          active_links: activeShares,
          expired_links: expiredShares,
          total_views: totalViews,
          total_downloads: totalDownloads,
          expired_attempts: totalExpiredAttempts
        }
      }
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
