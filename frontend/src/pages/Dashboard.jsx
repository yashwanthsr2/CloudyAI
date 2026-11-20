import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, UploadCloud, Files, Share2, AlertTriangle, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import ShareModal from '../components/ShareModal';
import MaskedPreviewModal from '../components/MaskedPreviewModal';

export default function Dashboard() {
  const [files, setFiles] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFileForShare, setSelectedFileForShare] = useState(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [filesRes, analyticsRes] = await Promise.all([
        api.getFiles().catch(() => ({ files: [] })),
        api.getAnalytics().catch(() => ({ analytics: null }))
      ]);
      setFiles(filesRes.files || []);
      setAnalytics(analyticsRes.analytics || null);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const highRiskCount = files.filter(f => f.scans?.[0]?.risk_level === 'High').length;
  const mediumRiskCount = files.filter(f => f.scans?.[0]?.risk_level === 'Medium').length;
  const lowRiskCount = files.filter(f => f.scans?.[0]?.risk_level === 'Low').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>Zero-Plaintext PII Storage Guarantee</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Privacy-Aware Cloud Storage
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Upload identity documents securely. Our backend engine extracts text via OCR, detects Aadhaar, PAN, Phone, and Email patterns, computes risk, and generates opaque masked copies for safe sharing.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/25 transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload & Scan Document</span>
            </Link>
            <Link
              to="/files"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition-all"
            >
              <Files className="w-4 h-4" />
              <span>View All Files</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
            <span>Total Vault Files</span>
            <Files className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{files.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Stored with Supabase RLS isolation</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
            <span>High Risk Documents</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{highRiskCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Strict 5-minute share expiration</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
            <span>Active Share Links</span>
            <Share2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-teal-400">
            {analytics?.shares?.active_links ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Server-enforced TTL countdown</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2 text-xs font-medium">
            <span>Total Masked Views</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {analytics?.shares?.total_views ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Zero leak access logs</p>
        </div>

      </div>

      {/* Recent Files Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-white">Recent Documents</h2>
            <p className="text-xs text-slate-400">Latest files stored in your private vault</p>
          </div>
          <Link
            to="/files"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center font-medium"
          >
            <span>See all files</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center">
            <Files className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No files uploaded yet.</p>
            <Link
              to="/upload"
              className="mt-3 inline-block text-xs font-medium text-emerald-400 hover:underline"
            >
              Upload your first document
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-3 pl-2">Filename</th>
                  <th className="pb-3">Uploaded</th>
                  <th className="pb-3">Risk Assessment</th>
                  <th className="pb-3">PII Detected</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {files.slice(0, 5).map((file) => {
                  const scan = file.scans?.[0];
                  return (
                    <tr key={file.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 pl-2 font-medium text-slate-200 truncate max-w-xs">
                        {file.filename}
                      </td>
                      <td className="py-3 text-slate-400">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {scan ? (
                          <RiskBadge level={scan.risk_level} score={scan.risk_score} />
                        ) : (
                          <span className="text-slate-500 text-[11px]">Unscanned</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400">
                        {scan ? (
                          <div className="flex gap-1.5 flex-wrap">
                            {scan.count_aadhaar > 0 && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">Aadhaar: {scan.count_aadhaar}</span>}
                            {scan.count_pan > 0 && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">PAN: {scan.count_pan}</span>}
                            {scan.count_phone > 0 && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">Phone: {scan.count_phone}</span>}
                            {scan.count_email > 0 && <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">Email: {scan.count_email}</span>}
                            {scan.count_aadhaar === 0 && scan.count_pan === 0 && scan.count_phone === 0 && scan.count_email === 0 && (
                              <span className="text-emerald-400 text-[11px]">None detected</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right pr-2 space-x-2">
                        {scan?.masked_path && (
                          <button
                            onClick={() => setSelectedFileForPreview(file)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors"
                          >
                            Preview Mask
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedFileForShare(file)}
                          className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium transition-colors"
                        >
                          Share Link
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {selectedFileForShare && (
        <ShareModal
          file={selectedFileForShare}
          onClose={() => setSelectedFileForShare(null)}
        />
      )}

      {/* Masked Preview Modal */}
      {selectedFileForPreview && (
        <MaskedPreviewModal
          file={selectedFileForPreview}
          onClose={() => setSelectedFileForPreview(null)}
        />
      )}

    </div>
  );
}
