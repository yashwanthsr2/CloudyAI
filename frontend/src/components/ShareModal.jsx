import React, { useState } from 'react';
import { X, Copy, Check, Clock, Shield, ExternalLink, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export default function ShareModal({ file, onClose }) {
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateLink = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.createShareLink(file.id);
      setShareData(res.share);
    } catch (err) {
      setError(err.message || 'Failed to generate secure link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareData?.share_url) {
      navigator.clipboard.writeText(shareData.share_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const riskLevel = file.scans?.[0]?.risk_level || 'Low';
  const riskScore = file.scans?.[0]?.risk_score || 0;
  const ttlMinutes = riskLevel === 'High' ? 5 : riskLevel === 'Medium' ? 10 : 15;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Generate Secure Share Link</h3>
            <p className="text-xs text-slate-400 truncate max-w-xs">{file.filename}</p>
          </div>
        </div>

        {/* Security Rule Banner */}
        <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/60 mb-5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Document Sensitivity:</span>
            <span className={`font-semibold ${
              riskLevel === 'High' ? 'text-rose-400' : riskLevel === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {riskLevel} Risk ({riskScore}/100)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Server-Enforced TTL:</span>
            <span className="text-white font-mono flex items-center">
              <Clock className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              {ttlMinutes} Minutes Expiry
            </span>
          </div>
          <div className="flex items-start space-x-2 pt-1 border-t border-slate-700/50 text-[11px] text-slate-400">
            <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              The recipient will receive an opaque <strong>masked copy</strong>. The original document remains private and untouched.
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl mb-4">
            {error}
          </div>
        )}

        {!shareData ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Generating this link produces a cryptographically secure 256-bit token. When time expires, server automatically responds with HTTP 410 Gone.
            </p>
            <button
              onClick={handleGenerateLink}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Cryptographic Token...' : 'Create Protected Share Link'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
              Secure link generated successfully! Automatically expires in {shareData.ttl_minutes} minutes.
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Shareable URL</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={shareData.share_url}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-emerald-400 focus:outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
                  title="Copy to clipboard"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={shareData.share_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs text-emerald-400 hover:text-emerald-300"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Transfer Page
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
