import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Share2, 
  Mail, 
  Clock, 
  ShieldCheck, 
  Copy, 
  Check, 
  AlertTriangle, 
  Trash2, 
  ExternalLink,
  Ban,
  Send,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function SecureSharing({ files = [] }) {
  const [searchParams] = useSearchParams();
  const fileIdParam = searchParams.get('file');

  const [selectedFileId, setSelectedFileId] = useState(fileIdParam || (files[0]?.id || ''));
  const [recipientEmail, setRecipientEmail] = useState('');
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sharesLoading, setSharesLoading] = useState(true);
  const [createdShare, setCreatedShare] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (fileIdParam) {
      setSelectedFileId(fileIdParam);
    } else if (files.length > 0 && !selectedFileId) {
      setSelectedFileId(files[0].id);
    }
  }, [fileIdParam, files]);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      setSharesLoading(true);
      const res = await api.getShares();
      setShares(res.shares || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSharesLoading(false);
    }
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();
    if (!selectedFileId || !recipientEmail) return;

    try {
      setLoading(true);
      setError(null);
      setCreatedShare(null);
      const res = await api.createShare(selectedFileId, recipientEmail);
      setCreatedShare(res.share);
      setRecipientEmail('');
      await loadShares();
    } catch (err) {
      setError(err.message || 'Failed to create secure share link');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (shareId) => {
    if (!window.confirm('Are you sure you want to revoke this share link immediately? The recipient will lose access.')) return;
    try {
      await api.revokeShare(shareId);
      await loadShares();
    } catch (err) {
      alert(err.message);
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const currentFile = files.find(f => f.id === selectedFileId);
  const riskLevel = currentFile?.risk_level || 'LOW';
  const ttlMinutes = riskLevel === 'HIGH' ? 5 : riskLevel === 'MEDIUM' ? 10 : 15;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
          <Share2 className="w-6 h-6 text-indigo-400" />
          <span>Secure One-to-One Sharing</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Issue cryptographically locked sharing links restricted to exactly ONE recipient email with server-enforced OTP verification and atomic one-time download.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Sharing Creation Panel (Reference 5) */}
      <div className="glass-panel rounded-3xl p-8 border border-cosmic-border shadow-2xl space-y-6">
        <h2 className="text-base font-bold text-white tracking-tight">Create Controlled One-Time Share Link</h2>

        <form onSubmit={handleCreateShare} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* File Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Vault Document</label>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-cosmic-950/80 border border-cosmic-border rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.filename} — {f.risk_level} Risk
                </option>
              ))}
            </select>
            {currentFile && (
              <div className="mt-2 flex items-center space-x-2">
                <RiskBadge level={currentFile.risk_level} />
                <span className="text-[11px] text-slate-400 font-mono">
                  TTL: <strong>{ttlMinutes} Minutes</strong>
                </span>
              </div>
            )}
          </div>

          {/* Authorized Recipient Email */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Authorized Recipient Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@organization.com"
                className="w-full pl-10 pr-4 py-2.5 bg-cosmic-950/80 border border-cosmic-border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Only this email can request and verify the 6-digit OTP to access the file.
            </p>
          </div>

          {/* Notice & Submit */}
          <div className="md:col-span-2 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-cosmic-border">
            <div className="text-xs text-slate-400 space-y-1">
              <p className="flex items-center text-emerald-400">
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                Atomic One-Time Download: Link automatically becomes invalid after first verified download.
              </p>
              <p className="text-[11px] text-slate-500">
                Recipient will receive an opaque masked copy. Original remains untouched in your private vault.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !selectedFileId}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition-all disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Generate & Send Share</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Share Link Result Banner */}
        {createdShare && (
          <div className="p-5 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">🎉 Share Link Generated Successfully</span>
              <span className="text-[11px] font-mono text-emerald-400">
                Expires in {createdShare.ttl_minutes} minutes
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={createdShare.share_url}
                className="w-full px-3.5 py-2 bg-cosmic-950 border border-cosmic-border rounded-xl text-xs font-mono text-emerald-400 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(createdShare.share_url)}
                className="p-2.5 bg-cosmic-800 hover:bg-cosmic-700 text-slate-200 rounded-xl transition-colors border border-cosmic-border shrink-0"
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
              <span>Authorized: <strong>{createdShare.authorized_email}</strong></span>
              <a
                href={createdShare.share_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 inline-flex items-center"
              >
                <span>Preview Recipient Portal</span>
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>
        )}

      </div>

      {/* Active Shares Management Table */}
      <div className="glass-panel rounded-3xl p-6 border border-cosmic-border shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight">Active & Historical One-Time Shares</h2>

        {sharesLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading share records...</div>
        ) : shares.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">No share links generated yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-cosmic-border text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">File</th>
                  <th className="pb-3">Authorized Recipient</th>
                  <th className="pb-3">Expiry</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cosmic-border/60">
                {shares.map((s) => {
                  const isExpired = new Date(s.expires_at) <= new Date();
                  return (
                    <tr key={s.id} className="hover:bg-cosmic-800/40 transition-colors">
                      <td className="py-3.5 pl-2 font-medium text-slate-200">
                        {s.files?.filename || 'Document'}
                      </td>
                      <td className="py-3.5 text-slate-300 font-mono text-[11px]">
                        {s.authorized_email}
                      </td>
                      <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(s.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          s.status === 'USED' ? 'bg-slate-800 text-slate-400' :
                          s.status === 'REVOKED' ? 'bg-rose-500/15 text-rose-400' :
                          isExpired ? 'bg-amber-500/15 text-amber-400' :
                          s.status === 'VERIFIED' ? 'bg-emerald-500/15 text-emerald-400' :
                          'bg-indigo-500/15 text-indigo-400'
                        }`}>
                          {s.status === 'CREATED' && isExpired ? 'EXPIRED' : s.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        {s.status !== 'USED' && s.status !== 'REVOKED' && !isExpired && (
                          <button
                            onClick={() => handleRevoke(s.id)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[11px] font-medium transition-colors inline-flex items-center space-x-1"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Revoke</span>
                          </button>
                        )}
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
