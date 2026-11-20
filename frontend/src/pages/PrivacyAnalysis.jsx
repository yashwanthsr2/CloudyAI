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
  RefreshCw
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <ScanEye className="w-6 h-6 text-indigo-400" />
            <span>Privacy Analysis & DLP Redaction</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Data Loss Prevention (DLP) review: compare original authenticated vault file with the server-masked protected version.
          </p>
        </div>

        {/* File Selector Dropdown */}
        {files.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400">Select Document:</span>
            <select
              value={selectedFileId}
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="px-3.5 py-2 bg-cosmic-900 border border-cosmic-border rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
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
        <div className="py-20 text-center glass-panel rounded-3xl border border-cosmic-border">
          <ScanEye className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No document selected for privacy review.</p>
          <Link to="/upload" className="mt-3 inline-block text-xs font-semibold text-indigo-400 hover:underline">
            Upload and scan a file first
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Metadata & Risk Card (Reference 4) */}
          <div className="glass-panel rounded-3xl p-6 border border-cosmic-border shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-cosmic-border">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-lg font-bold text-white tracking-tight">{file.filename}</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cosmic-950 text-slate-300 border border-cosmic-border">
                    {(file.size_bytes / 1024).toFixed(1)} KB
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  OCR Engine: <strong>Tesseract.js v5</strong> &bull; Confidence: <strong>{file.ocr_confidence || 95}%</strong> &bull; Masking: <strong className="text-emerald-400">{file.masking_status}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <RiskBadge level={file.risk_level} size="lg" />
                <Link
                  to={`/shares?file=${file.id}`}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 flex items-center space-x-1.5 transition-all"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Masked Copy</span>
                </Link>
              </div>
            </div>

            {/* Assessment Reason */}
            <div className="p-4 bg-cosmic-950/80 rounded-2xl border border-cosmic-border text-xs text-slate-300 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-indigo-300">Sensitivity Policy Assessment: </span>
                {file.risk_reason || 'Document scanned for Indian PII categories.'}
              </div>
            </div>

            {/* Detection Counts Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-cosmic-950/60 rounded-xl border border-cosmic-border">
                <span className="text-slate-400 block text-[11px]">Aadhaar Numbers</span>
                <span className="text-lg font-bold text-rose-400 font-mono">{d.aadhaar || 0}</span>
                <span className="text-[10px] text-slate-500 block">Weight: HIGH (5m TTL)</span>
              </div>
              <div className="p-3.5 bg-cosmic-950/60 rounded-xl border border-cosmic-border">
                <span className="text-slate-400 block text-[11px]">PAN Card IDs</span>
                <span className="text-lg font-bold text-amber-400 font-mono">{d.pan || 0}</span>
                <span className="text-[10px] text-slate-500 block">Weight: HIGH (5m TTL)</span>
              </div>
              <div className="p-3.5 bg-cosmic-950/60 rounded-xl border border-cosmic-border">
                <span className="text-slate-400 block text-[11px]">Phone Numbers</span>
                <span className="text-lg font-bold text-blue-400 font-mono">{d.phone || 0}</span>
                <span className="text-[10px] text-slate-500 block">Weight: MEDIUM (10m TTL)</span>
              </div>
              <div className="p-3.5 bg-cosmic-950/60 rounded-xl border border-cosmic-border">
                <span className="text-slate-400 block text-[11px]">Email Addresses</span>
                <span className="text-lg font-bold text-purple-400 font-mono">{d.email || 0}</span>
                <span className="text-[10px] text-slate-500 block">Weight: LOW (15m TTL)</span>
              </div>
            </div>
          </div>

          {/* View Mode Controls */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Document Comparison Viewer:</span>
            <div className="flex bg-cosmic-900 border border-cosmic-border p-1 rounded-xl text-xs space-x-1">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'side-by-side' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setViewMode('original')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'original' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Original (Owner Only)
              </button>
              <button
                onClick={() => setViewMode('masked')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewMode === 'masked' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Masked Protected Copy
              </button>
            </div>
          </div>

          {/* Side-by-Side Document Comparison Display (Reference 4) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Original Preview (Owner Only) */}
            {(viewMode === 'side-by-side' || viewMode === 'original') && (
              <div className="glass-panel rounded-3xl p-5 border border-cosmic-border space-y-3">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-cosmic-border">
                  <span className="font-semibold text-slate-200 flex items-center">
                    <Lock className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                    Original Vault Document (Unredacted)
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    OWNER ACCESS ONLY
                  </span>
                </div>

                <div className="h-[460px] bg-cosmic-950 rounded-2xl border border-cosmic-border flex items-center justify-center p-3 overflow-hidden">
                  <img
                    src={originalUrl}
                    alt="Original Document"
                    className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                  />
                </div>
              </div>
            )}

            {/* Masked Preview */}
            {(viewMode === 'side-by-side' || viewMode === 'masked') && (
              <div className="glass-panel rounded-3xl p-5 border border-cosmic-border space-y-3">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-cosmic-border">
                  <span className="font-semibold text-slate-200 flex items-center">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    Protected Masked Copy (Safe for Sharing)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    OPAQUE BLACK REDACTION
                  </span>
                </div>

                <div className="h-[460px] bg-cosmic-950 rounded-2xl border border-cosmic-border flex items-center justify-center p-3 overflow-hidden">
                  {maskedUrl ? (
                    <img
                      src={maskedUrl}
                      alt="Masked Document"
                      className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-500 text-xs">
                      <CheckCircle className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
                      <p className="text-slate-300 font-semibold">No Sensitive PII Detected</p>
                      <p className="text-slate-500 mt-1">This document contains no Aadhaar, PAN, phone or email identifiers.</p>
                    </div>
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
