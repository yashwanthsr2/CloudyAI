import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ScanEye, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Share2, 
  Layers, 
  AlertTriangle, 
  CheckCircle, 
  Lock,
  RefreshCw,
  Sparkles,
  FileText,
  Info,
  Maximize2
} from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function PrivacyAnalysis({ files = [] }) {
  const [searchParams] = useSearchParams();
  const fileIdParam = searchParams.get('file');

  const [selectedFileId, setSelectedFileId] = useState(fileIdParam || (files[0]?.id || ''));
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side' | 'original' | 'masked'

  useEffect(() => {
    if (fileIdParam) {
      setSelectedFileId(fileIdParam);
    } else if (files.length > 0 && !selectedFileId) {
      setSelectedFileId(files[0].id);
    }
  }, [fileIdParam, files]);

  useEffect(() => {
    if (selectedFileId) {
      loadFile(selectedFileId);
    }
  }, [selectedFileId]);

  const loadFile = async (id) => {
    try {
      setLoading(true);
      const res = await api.getFile(id);
      setFile(res.file);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const originalUrl = file ? api.getOriginalPreviewUrl(file.id) : '';
  const maskedUrl = file?.storage_path_masked ? api.getMaskedPreviewUrl(file.id) : '';
  const d = file?.detected_info || {};

  const aadhaarCount = d.aadhaar_count || d.count_aadhaar || 0;
  const panCount = d.pan_count || d.count_pan || 0;
  const phoneCount = d.phone_count || d.count_phone || 0;
  const emailCount = d.email_count || d.count_email || 0;

  const getRiskExplanation = (level) => {
    switch (level) {
      case 'HIGH':
        return 'Critical Indian Identity Credentials (Aadhaar number or PAN identifier) discovered in document text coordinates. Exposing these identifiers presents acute identity theft risk. Server strictly enforces a 5-minute link expiration.';
      case 'MEDIUM':
        return 'Personal contact numbers detected without primary identity documents. Assigned 10-minute link expiration.';
      case 'LOW':
        return 'Email address detected. Low-impact contact information assigned 15-minute link expiration.';
      default:
        return 'No sensitive Indian PII discovered by OCR and regular expression scanning engines. Clean document.';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cosmic-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/20 text-cyan-300 border border-violet-500/30">
              DLP REDACTION STUDIO
            </span>
            <span className="text-slate-400 text-xs">• Pixel-Level Verification</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5 mt-1">
            <ScanEye className="w-6 h-6 text-violet-400" />
            <span>Privacy Analysis & DLP Redaction</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verify irreversible redaction. Compare original authenticated vault files against server-rendered masked copies before generating ephemeral shares.
          </p>
        </div>

        {/* Document Selector Dropdown */}
        {files.length > 0 && (
          <div className="flex items-center space-x-3 self-start md:self-auto">
            <span className="text-xs text-slate-400 font-mono">Document:</span>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="px-3.5 py-2 bg-cosmic-900 border border-cosmic-border rounded-xl text-xs text-slate-200 focus:outline-none focus:border-violet-500 font-mono"
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.filename} ({f.risk_level})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!file ? (
        <div className="cyber-panel rounded-2xl p-12 text-center space-y-3">
          <p className="text-sm font-bold text-slate-300">No Document Selected</p>
          <p className="text-xs text-slate-400">Please choose a file from your vault to inspect privacy redactions.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Top Status & Rationale Card */}
          <div className="cyber-panel-elevated rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  CLASSIFICATION AUDIT
                </span>
                <h2 className="text-lg font-bold text-white">{file.filename}</h2>
              </div>
              <RiskBadge level={file.risk_level} size="lg" />
            </div>

            <div className="p-4 bg-cosmic-950/80 rounded-xl border border-cosmic-border flex items-start space-x-3 text-xs">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Policy Rationale</p>
                <p className="text-slate-400 leading-relaxed text-[11px]">{getRiskExplanation(file.risk_level)}</p>
              </div>
            </div>

            {/* Detected Entity Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 bg-cosmic-950/60 rounded-xl border border-cosmic-border text-center">
                <p className="text-[10px] font-mono text-slate-400">Aadhaar (40 pts)</p>
                <p className={`text-base font-bold font-mono mt-1 ${aadhaarCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {aadhaarCount}
                </p>
              </div>

              <div className="p-3 bg-cosmic-950/60 rounded-xl border border-cosmic-border text-center">
                <p className="text-[10px] font-mono text-slate-400">PAN Card (30 pts)</p>
                <p className={`text-base font-bold font-mono mt-1 ${panCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {panCount}
                </p>
              </div>

              <div className="p-3 bg-cosmic-950/60 rounded-xl border border-cosmic-border text-center">
                <p className="text-[10px] font-mono text-slate-400">Phone (10 pts)</p>
                <p className={`text-base font-bold font-mono mt-1 ${phoneCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {phoneCount}
                </p>
              </div>

              <div className="p-3 bg-cosmic-950/60 rounded-xl border border-cosmic-border text-center">
                <p className="text-[10px] font-mono text-slate-400">Email (10 pts)</p>
                <p className={`text-base font-bold font-mono mt-1 ${emailCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {emailCount}
                </p>
              </div>
            </div>
          </div>

          {/* View Mode Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1 bg-cosmic-900 border border-cosmic-border p-1 rounded-xl text-xs font-mono">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'side-by-side' ? 'bg-violet-600 text-white shadow-violet-glow font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Side-by-Side Dual View
              </button>
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'original' ? 'bg-violet-600 text-white shadow-violet-glow font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Vault Original Only
              </button>
              <button
                onClick={() => setViewMode('masked')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'masked' ? 'bg-violet-600 text-white shadow-violet-glow font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Masked Version Only
              </button>
            </div>

            <Link
              to={`/shares?file=${file.id}`}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-cyan-glow transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Masked Copy</span>
            </Link>
          </div>

          {/* Main Inspection Canvas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Left Canvas: Vault Original */}
            {(viewMode === 'side-by-side' || viewMode === 'original') && (
              <div className={`cyber-panel rounded-2xl p-5 space-y-3 ${viewMode === 'original' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between pb-2 border-b border-cosmic-border/60">
                  <span className="text-xs font-mono font-bold text-amber-400 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>AUTHENTICATED OWNER ORIGINAL (PRIVATE)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Zero Public Exposure</span>
                </div>

                <div className="bg-cosmic-950/90 rounded-xl p-2 border border-cosmic-border flex items-center justify-center min-h-[360px] max-h-[520px] overflow-hidden">
                  <img
                    src={originalUrl}
                    alt="Original Document"
                    className="max-h-[500px] w-full object-contain rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Right Canvas: Redacted Protected Image */}
            {(viewMode === 'side-by-side' || viewMode === 'masked') && (
              <div className={`cyber-panel rounded-2xl p-5 space-y-3 border-violet-500/30 ${viewMode === 'masked' ? 'md:col-span-2' : ''}`}>
                <div className="flex items-center justify-between pb-2 border-b border-cosmic-border/60">
                  <span className="text-xs font-mono font-bold text-emerald-400 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>OPAQUE REDACTED COPY (SHARE-SAFE)</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Solid #000000 Pixel Burn</span>
                </div>

                <div className="bg-cosmic-950/90 rounded-xl p-2 border border-cosmic-border flex items-center justify-center min-h-[360px] max-h-[520px] overflow-hidden">
                  {maskedUrl ? (
                    <img
                      src={maskedUrl}
                      alt="Redacted Document"
                      className="max-h-[500px] w-full object-contain rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = originalUrl;
                      }}
                    />
                  ) : (
                    <p className="text-xs text-slate-400 font-mono">No masked version required (Clean document).</p>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
