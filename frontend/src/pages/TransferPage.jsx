import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, Clock, Download, AlertTriangle, CheckCircle2, Lock, Eye, AlertOctagon } from 'lucide-react';
import { api } from '../services/api';

export default function TransferPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [shareInfo, setShareInfo] = useState(null);
  const [error, setError] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    fetchTransferData();
  }, [token]);

  // Live countdown timer
  useEffect(() => {
    if (secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError({
            status: 410,
            message: 'HTTP 410 Gone: This secure share link has expired and is no longer accessible.'
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining]);

  const fetchTransferData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTransferInfo(token);
      setShareInfo(res.share);
      setSecondsRemaining(res.share.remaining_seconds || 0);
    } catch (err) {
      setError({
        status: err.status || 500,
        message: err.data?.error || err.message || 'Failed to access document.'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const viewUrl = api.getTransferViewUrl(token);
  const downloadUrl = api.getTransferDownloadUrl(token);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs text-slate-400">Verifying cryptographic token & server TTL...</p>
      </div>
    );
  }

  // HTTP 410 Expired or 404 Not Found State
  if (error) {
    const isExpired = error.status === 410;

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${
            isExpired ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {isExpired ? <Clock className="w-8 h-8" /> : <AlertOctagon className="w-8 h-8" />}
          </div>

          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {isExpired ? 'HTTP 410 GONE' : 'ACCESS DENIED'}
          </span>

          <h1 className="text-xl font-bold text-white mt-4">
            {isExpired ? 'Secure Link Expired' : 'Document Unavailable'}
          </h1>

          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {isExpired
              ? 'This privacy-protected file transfer was bound to a strict server-enforced expiration window to prevent unauthorized retention. The link is permanently revoked.'
              : error.message}
          </p>

          <div className="mt-6 pt-5 border-t border-slate-800 text-xs text-slate-500">
            Powered by PRIVACLOUD AI Privacy Shield
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Top Security Banner */}
      <header className="bg-slate-900/90 border-b border-slate-800 py-3.5 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-white">PRIVACLOUD AI</span>
              <span className="text-[11px] text-slate-400 block -mt-0.5">Secure Document Transfer</span>
            </div>
          </div>

          {/* Expiration Timer Display */}
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
            <Clock className="w-4 h-4 text-rose-400 animate-pulse" />
            <span className="text-xs text-slate-300 font-medium">Expires in:</span>
            <span className="text-xs font-mono font-bold text-rose-400 tracking-wider">
              {formatTimer(secondsRemaining)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Document Viewer */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
        
        {/* Document Header Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white">{shareInfo.filename}</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Masked Protected Copy
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              File Size: {(shareInfo.size_bytes / 1024).toFixed(1)} KB &bull; Sensitivity Score: {shareInfo.risk_score}/100
            </p>
          </div>

          {/* Download Button */}
          <a
            href={downloadUrl}
            download={`masked-${shareInfo.filename}`}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Masked Copy</span>
          </a>
        </div>

        {/* Mask Notice */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-start space-x-2.5">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Privacy Protection Notice:</strong> All sensitive identity numbers (Aadhaar, PAN, phone numbers) have been obscured with solid pixel-level masks. The owner's original unredacted file remains private in the cloud vault.
          </span>
        </div>

        {/* Image Preview Box */}
        <div className="flex-1 min-h-[450px] bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex items-center justify-center overflow-auto shadow-2xl">
          <img
            src={viewUrl}
            alt="Protected Document"
            className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-800/80"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300" viewBox="0 0 500 300"><rect width="500" height="300" fill="%230f172a"/><text x="50%" y="50%" fill="%2394a3b8" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14">Masked Document stream rendered</text></svg>';
            }}
          />
        </div>

      </main>

    </div>
  );
}
