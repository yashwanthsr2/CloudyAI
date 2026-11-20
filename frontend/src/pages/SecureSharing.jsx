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
  Loader2,
  Lock,
  Sparkles,
  KeyRound,
  FileCheck2
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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="pb-2 border-b border-cosmic-border/60">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            EPHEMERAL EXCHANGE
          </span>
          <span className="text-slate-400 text-xs">• Zero-Trust Protocol</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5 mt-1">
          <Share2 className="w-6 h-6 text-violet-400" />
          <span>Secure One-to-One File Sharing</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Issue cryptographically signed one-time sharing links with mandatory recipient email validation, 6-digit dynamic OTP verification, and atomic self-destruct after first download.
        </p>
      </div>

      {/* 2-Column Split: Share Creator (5 cols) & Active Shares Table (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Share Generation Card */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="cyber-panel-elevated rounded-2xl p-6 space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-cosmic-border/60">
              <Lock className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-tight">
                Create One-Time Share
              </h2>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateShare} className="space-y-4">
              
              {/* File Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 font-semibold">
                  SELECT VAULT DOCUMENT:
                </label>
                {files.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 bg-cosmic-950/80 rounded-xl border border-cosmic-border">
                    No files available in vault.
                  </p>
                ) : (
                  <select
                    value={selectedFileId}
                    onChange={(e) => setSelectedFileId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-cosmic-950 border border-cosmic-border rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
                  >
                    {files.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.filename} ({f.risk_level})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Recipient Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-400 font-semibold flex items-center justify-between">
                  <span>AUTHORIZED RECIPIENT EMAIL:</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Single Recipient Only</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="receiver@company.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-cosmic-950 border border-cosmic-border rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500 font-medium"
                  />
                </div>
              </div>

              {/* Dynamic Risk TTL Summary */}
              {currentFile && (
                <div className="p-3.5 rounded-xl bg-cosmic-950/80 border border-cosmic-border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-mono text-[11px]">Enforced Expiration:</span>
                    <span className="font-mono text-cyan-300 font-bold">{ttlMinutes} Minutes TTL</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono">Document Risk:</span>
                    <RiskBadge level={riskLevel} size="sm" />
                  </div>

                  <div className="pt-2 border-t border-cosmic-border/60 text-[10px] text-slate-400 font-mono flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-violet-400" />
                    <span>Countdown starts when token is generated.</span>
                  </div>
                </div>
              )}

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={loading || !selectedFileId || !recipientEmail}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-violet-glow flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Provisioning Cryptographic Share...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-cyan-300" />
                    <span>Generate Secure Share Link</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Success Banner if Share Created */}
          {createdShare && (
            <div className="cyber-panel rounded-2xl p-5 border-emerald-500/30 space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono font-bold">
                <Check className="w-4 h-4" />
                <span>EPHEMERAL SHARE LINK GENERATED</span>
              </div>

              <div className="p-2.5 bg-cosmic-950 rounded-xl border border-cosmic-border font-mono text-[11px] text-slate-200 break-all select-all flex items-center justify-between gap-2">
                <span className="truncate">{createdShare.share_url}</span>
                <button
                  onClick={() => copyToClipboard(createdShare.share_url)}
                  className="px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold shrink-0 inline-flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-400 font-mono space-y-1">
                <p>• Authorized: <strong>{createdShare.authorized_email}</strong></p>
                <p>• Expiration: <strong>{new Date(createdShare.expires_at).toLocaleTimeString()}</strong> ({ttlMinutes}m)</p>
                <p className="text-cyan-300">• Recipient must enter email and verify 6-digit OTP to claim.</p>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Active Shares & Transfers Audit Table */}
        <div className="lg:col-span-7 cyber-panel rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-cosmic-border/60">
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center space-x-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Active Ephemeral Transfers</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time lifecycle of all provisioned one-time download links
              </p>
            </div>

            <button
              onClick={loadShares}
              className="p-1.5 rounded-lg bg-cosmic-800 hover:bg-cosmic-750 text-slate-300 text-xs inline-flex items-center space-x-1 border border-cosmic-border transition-colors"
            >
              <span>Refresh</span>
            </button>
          </div>

          {shares.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono space-y-2">
              <Share2 className="w-8 h-8 mx-auto text-slate-600" />
              <p>No active or historical transfers found.</p>
            </div>
          ) : (
            <div className="divide-y divide-cosmic-border/50">
              {shares.map((share) => {
                const isExpired = new Date(share.expires_at) < new Date();
                const status = share.status || (isExpired ? 'EXPIRED' : 'ACTIVE');

                return (
                  <div key={share.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-white truncate max-w-xs">
                          {share.file_name || 'Document'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          status === 'ACTIVE' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' :
                          status === 'USED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          status === 'REVOKED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span className="text-slate-300">To: {share.authorized_email}</span>
                        <span>•</span>
                        <span>Expires: {new Date(share.expires_at).toLocaleTimeString()}</span>
                        {share.otp_verified && (
                          <span className="text-emerald-400 font-bold">✓ OTP Verified</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevoke(share.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-medium border border-rose-500/30 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
