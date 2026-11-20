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
  Scan,
  RefreshCw
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
      const res = await api.getAnalyticsSummary();
      setSummary(res.summary);
    } catch (e) {
      console.error(e);
    }
  };

  const highCount = files.filter(f => f.risk_level === 'HIGH').length;
  const medCount = files.filter(f => f.risk_level === 'MEDIUM').length;
  const lowCount = files.filter(f => f.risk_level === 'LOW').length;

  const usedMb = ((quota?.used_bytes || 0) / (1024 * 1024)).toFixed(1);
  const remainingMb = ((quota?.remaining_bytes || 104857600) / (1024 * 1024)).toFixed(1);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Top Welcome & Quick Action Banner (Reference 2) */}
      <div className="relative overflow-hidden glass-panel rounded-3xl p-8 border border-cosmic-border shadow-2xl">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 inline-block mb-3">
              🛡️ Commercial Cloud Security Vault
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Privacy-Aware Cloud Storage
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
              Upload identity documents privately. Our OCR engine detects Aadhaar, PAN, phone numbers, and email strings, computes strict priority risk, generates opaque masked copies, and provisions single-use OTP sharing.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              to="/upload"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </Link>
            <Link
              to="/files"
              className="px-4 py-2.5 rounded-xl bg-cosmic-950/80 hover:bg-cosmic-800/80 text-slate-300 text-xs font-semibold border border-cosmic-border transition-all flex items-center space-x-2"
            >
              <Files className="w-4 h-4" />
              <span>Browse All Files</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Files */}
        <div className="p-5 glass-panel rounded-2xl border border-cosmic-border">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
            <span>Total Vault Files</span>
            <Files className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{files.length}</div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">JPG &bull; JPEG &bull; PNG only</p>
        </div>

        {/* High Risk */}
        <div className="p-5 glass-panel rounded-2xl border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
            <span className="text-rose-300 font-semibold">HIGH Risk Documents</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{highCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Aadhaar or PAN (5m TTL)</p>
        </div>

        {/* Medium Risk */}
        <div className="p-5 glass-panel rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
            <span className="text-amber-300 font-semibold">MEDIUM Risk Documents</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{medCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Phone numbers (10m TTL)</p>
        </div>

        {/* Quota Remaining */}
        <div className="p-5 glass-panel rounded-2xl border border-cosmic-border">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
            <span>Storage Remaining</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{remainingMb} MB</div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">{usedMb} MB / 100 MB used</p>
        </div>

      </div>

      {/* Recent Files Section */}
      <div className="glass-panel rounded-3xl p-6 border border-cosmic-border shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Recent Vault Documents</h2>
            <p className="text-xs text-slate-400">Original copies remain private. Only masked versions are shareable.</p>
          </div>
          <Link
            to="/files"
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center font-semibold"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {files.length === 0 ? (
          <div className="py-14 text-center">
            <Files className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No documents in vault yet.</p>
            <Link
              to="/upload"
              className="mt-3 inline-block text-xs font-semibold text-indigo-400 hover:underline"
            >
              Upload your first identity document
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-cosmic-border text-slate-400 font-semibold">
                  <th className="pb-3 pl-3">Filename</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Uploaded</th>
                  <th className="pb-3">Risk Priority</th>
                  <th className="pb-3">Detected PII</th>
                  <th className="pb-3 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cosmic-border/60">
                {files.slice(0, 6).map((file) => {
                  const d = file.detected_info || {};
                  return (
                    <tr key={file.id} className="hover:bg-cosmic-800/40 transition-colors">
                      <td className="py-3.5 pl-3 font-medium text-slate-200">
                        <span className="truncate max-w-xs block font-mono text-xs">{file.filename}</span>
                      </td>
                      <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                        {(file.size_bytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3.5 text-slate-400">
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5">
                        <RiskBadge level={file.risk_level} />
                      </td>
                      <td className="py-3.5 text-slate-400">
                        <div className="flex gap-1.5 flex-wrap">
                          {d.aadhaar > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 text-[10px] border border-rose-500/20">Aadhaar: {d.aadhaar}</span>}
                          {d.pan > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] border border-amber-500/20">PAN: {d.pan}</span>}
                          {d.phone > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] border border-blue-500/20">Phone: {d.phone}</span>}
                          {d.email > 0 && <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] border border-purple-500/20">Email: {d.email}</span>}
                          {d.aadhaar === 0 && d.pan === 0 && d.phone === 0 && d.email === 0 && (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-right pr-3 space-x-2">
                        <Link
                          to={`/privacy-analysis?file=${file.id}`}
                          className="px-2.5 py-1 rounded-lg bg-cosmic-800 hover:bg-cosmic-700 text-slate-200 text-[11px] font-semibold transition-colors inline-flex items-center space-x-1"
                        >
                          <Scan className="w-3 h-3" />
                          <span>Analyze</span>
                        </Link>
                        <Link
                          to={`/shares?file=${file.id}`}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-colors inline-flex items-center space-x-1"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
