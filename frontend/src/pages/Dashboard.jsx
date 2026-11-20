import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Files, 
  UploadCloud, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HardDrive, 
  ArrowRight, 
  Share2, 
  Eye, 
  ScanEye,
  RefreshCw,
  Lock,
  Sparkles,
  ShieldCheck,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function Dashboard({ files = [], quota = null, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await api.getAnalyticsSummary();
      setSummary(res.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const highCount = files.filter(f => f.risk_level === 'HIGH').length;
  const medCount = files.filter(f => f.risk_level === 'MEDIUM').length;
  const lowCount = files.filter(f => f.risk_level === 'LOW').length;
  const noneCount = files.filter(f => !f.risk_level || f.risk_level === 'NONE').length;

  const usedBytes = quota?.used_bytes || 0;
  const totalBytes = quota?.total_bytes || (10 * 1024 * 1024 * 1024);
  const formatBytes = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  const usedFormatted = formatBytes(usedBytes);
  const totalFormatted = formatBytes(totalBytes);
  const percentUsed = Math.min(100, Math.round((usedBytes / totalBytes) * 100));

  const recentFiles = files.slice(0, 5);
  const recentEvents = summary?.recent_events?.slice(0, 5) || [];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Hero Banner (Reference 2) */}
      <div className="relative overflow-hidden cyber-panel-elevated rounded-2xl p-6 sm:p-8 border border-cosmic-border shadow-2xl">
        <div className="absolute -right-10 -top-10 w-96 h-96 bg-gradient-to-br from-violet-600/15 via-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/20 text-cyan-300 border border-violet-500/30">
                ACTIVE VAULT ENCLAVE
              </span>
              <span className="text-[11px] text-emerald-400 font-mono flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Zero-Plaintext Policy Active</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Privacy-Aware Document Vault
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Automated Optical Character Recognition detects Indian identity credentials (Aadhaar, PAN, phone, email) and generates opaque masked variants for one-time ephemeral sharing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/upload"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-violet-glow flex items-center space-x-2 transition-all active:scale-[0.98]"
            >
              <UploadCloud className="w-4 h-4 text-cyan-300" />
              <span>Upload Document</span>
            </Link>

            <Link
              to="/files"
              className="px-4 py-2.5 rounded-xl bg-cosmic-800 hover:bg-cosmic-750 text-slate-300 font-semibold text-xs border border-cosmic-border flex items-center space-x-1.5 transition-colors"
            >
              <Files className="w-4 h-4 text-slate-400" />
              <span>Browse Vault</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Row of 4 High-Impact KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1: Encrypted Storage Quota */}
        <div className="cyber-panel rounded-2xl p-5 space-y-3 shadow-panel">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
              <HardDrive className="w-4 h-4 text-violet-400" />
              <span>Storage Quota</span>
            </span>
            <span className="font-mono text-cyan-300 font-bold">{percentUsed}%</span>
          </div>

          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold font-mono text-white">{usedFormatted}</span>
              <span className="text-xs text-slate-400 font-mono">/ {totalFormatted}</span>
            </div>
            
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentUsed > 85 ? 'bg-rose-500' : percentUsed > 60 ? 'bg-amber-400' : 'bg-gradient-to-r from-violet-500 to-cyan-400'
                }`}
                style={{ width: `${Math.max(3, percentUsed)}%` }}
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-mono">
            {remainingMb} MB remaining in private bucket
          </p>
        </div>

        {/* Metric 2: Total Protected Files */}
        <div className="cyber-panel rounded-2xl p-5 space-y-3 shadow-panel">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
              <Files className="w-4 h-4 text-cyan-400" />
              <span>Vault Documents</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              OWNED
            </span>
          </div>

          <div>
            <p className="text-2xl font-bold font-mono text-white">{files.length}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              JPG/PNG formats • 5 MB max per file
            </p>
          </div>

          <p className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Isolated PostgreSQL RLS</span>
          </p>
        </div>

        {/* Metric 3: High Sensitivity Documents */}
        <div className="cyber-panel rounded-2xl p-5 space-y-3 shadow-panel">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>High Risk (5m TTL)</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
              AADHAAR/PAN
            </span>
          </div>

          <div>
            <p className="text-2xl font-bold font-mono text-rose-400">{highCount}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              {medCount} Medium (10m) • {lowCount} Low (15m)
            </p>
          </div>

          <p className="text-[10px] text-slate-400 font-mono">
            Requires opaque black redaction
          </p>
        </div>

        {/* Metric 4: Ephemeral One-Time Transfers */}
        <div className="cyber-panel rounded-2xl p-5 space-y-3 shadow-panel">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium flex items-center space-x-1.5">
              <Share2 className="w-4 h-4 text-indigo-400" />
              <span>Secure Transfers</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              1-TO-1 OTP
            </span>
          </div>

          <div>
            <p className="text-2xl font-bold font-mono text-white">
              {summary?.shares?.active_count ?? 0}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-1">
              {summary?.shares?.total_count ?? 0} total links generated
            </p>
          </div>

          <p className="text-[10px] text-cyan-300 font-mono flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>Atomic One-Time Invalidation</span>
          </p>
        </div>

      </div>

      {/* Balanced 2-Column Split: Recent Vault Files (65%) & Live Activity (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Recent Vault Documents (8 cols) */}
        <div className="lg:col-span-8 cyber-panel rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-cosmic-border/60">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <Files className="w-4 h-4 text-violet-400" />
                <span>Recent Ingested Documents</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Encrypted identity records currently stored in your private bucket
              </p>
            </div>

            <Link
              to="/files"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center space-x-1 transition-colors"
            >
              <span>View All ({files.length})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {files.length === 0 ? (
            /* Clean Empty State */
            <div className="py-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-cosmic-850 border border-cosmic-border flex items-center justify-center">
                <Files className="w-8 h-8 text-slate-500" />
              </div>
              <div className="max-w-sm mx-auto">
                <p className="text-sm font-bold text-white">Your Vault is Empty</p>
                <p className="text-xs text-slate-400 mt-1">
                  Upload your first JPG or PNG document to run OCR scanning, calculate sensitivity risk, and generate opaque masked copies.
                </p>
              </div>
              <Link
                to="/upload"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-violet-glow transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload First Document</span>
              </Link>
            </div>
          ) : (
            /* Recent Files Table */
            <div className="divide-y divide-cosmic-border/50">
              {recentFiles.map((file) => {
                const d = file.detected_info || {};
                const aadhaar = d.aadhaar_count || d.count_aadhaar || 0;
                const pan = d.pan_count || d.count_pan || 0;
                const phone = d.phone_count || d.count_phone || 0;
                const email = d.email_count || d.count_email || 0;

                return (
                  <div
                    key={file.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-cosmic-850/40 px-2 -mx-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-cosmic-950 border border-cosmic-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                        <img
                          src={file.storage_path_masked ? api.getMaskedPreviewUrl(file.id) : api.getOriginalPreviewUrl(file.id)}
                          alt={file.filename}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                          {file.filename}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono">
                          <span>{(file.size_bytes / 1024).toFixed(0)} KB</span>
                          <span>•</span>
                          <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                          {aadhaar > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                              Aadhaar
                            </span>
                          )}
                          {pan > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                              PAN
                            </span>
                          )}
                          {phone > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Phone
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-center shrink-0">
                      <RiskBadge level={file.risk_level} size="sm" />

                      <div className="flex items-center space-x-1">
                        <Link
                          to={`/privacy-analysis?file=${file.id}`}
                          title="DLP Analysis"
                          className="p-1.5 rounded-lg bg-cosmic-800 hover:bg-violet-600/30 text-slate-300 hover:text-white border border-cosmic-border transition-colors"
                        >
                          <ScanEye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          to={`/shares?file=${file.id}`}
                          title="Share Masked Copy"
                          className="p-1.5 rounded-lg bg-cosmic-800 hover:bg-cyan-600/30 text-slate-300 hover:text-white border border-cosmic-border transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Security Activity Feed (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="cyber-panel rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-cosmic-border/60">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Security Activity Log</span>
              </h2>
              <Link to="/activity" className="text-[11px] font-semibold text-cyan-400 hover:underline">
                Full Log
              </Link>
            </div>

            {recentEvents.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center font-mono">
                No recent security activity logged yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((evt, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-cosmic-950/60 border border-cosmic-border/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-violet-300">
                        {evt.event_type}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono ${
                        evt.event_status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'
                      }`}>
                        {evt.event_status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {new Date(evt.created_at).toLocaleTimeString()} • Encrypted Event
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security Policy Reminder */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/30 to-cosmic-900 border border-violet-500/20 text-xs space-y-2">
            <div className="flex items-center space-x-1.5 text-cyan-300 font-semibold text-[11px]">
              <Lock className="w-3.5 h-3.5 text-cyan-300" />
              <span>Strict Priority Policy Enforcement</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Links for HIGH risk files (Aadhaar or PAN) automatically expire in 5 minutes. All downloads require recipient email match + 6-digit OTP and are destroyed after first claim.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
