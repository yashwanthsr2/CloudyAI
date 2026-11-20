import React, { useState } from 'react';
import { UploadCloud, Shield, CheckCircle2, AlertTriangle, Eye, Share2, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import ShareModal from '../components/ShareModal';
import MaskedPreviewModal from '../components/MaskedPreviewModal';

export default function UploadScan() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanStage, setScanStage] = useState(''); // 'uploading' | 'scanning' | 'masking' | 'done'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit. Please choose a smaller document.');
      return;
    }

    setFile(selected);
    setError(null);
    setResult(null);

    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const handleUploadAndScan = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      // Stage 1: Upload to private storage
      setScanStage('uploading');
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.uploadFile(formData);
      const uploadedFile = uploadRes.file;

      // Stage 2: Trigger Privacy Scanner
      setScanStage('scanning');
      const scanRes = await api.scanFile(uploadedFile.id);

      setScanStage('done');
      setResult({
        file: {
          ...uploadedFile,
          scans: [scanRes.scan]
        },
        scan: scanRes.scan
      });
    } catch (err) {
      setError(err.message || 'Scan process encountered an error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <UploadCloud className="w-6 h-6 text-emerald-400" />
          <span>Upload & Privacy Scan</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload any identity document (Aadhaar, PAN card, utility bill, statement). The system will automatically detect sensitive text and generate an opaque redacted copy.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Box */}
      {!result ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-8 text-center transition-colors relative cursor-pointer group">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 group-hover:bg-emerald-500/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-400 transition-colors mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {file ? file.name : 'Click to browse or drag and drop document'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports JPEG, PNG, WebP, PDF &bull; Maximum file size: 5MB
              </p>
            </div>
          </div>

          {/* Selected File Card */}
          {file && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-800 rounded-xl text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{file.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>

              <button
                onClick={handleUploadAndScan}
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {scanStage === 'uploading' && 'Saving to Private Vault...'}
                      {scanStage === 'scanning' && 'Running OCR & Detecting PII...'}
                      {scanStage === 'masking' && 'Generating Masked Copy...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span>Upload & Privacy Scan</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Results Card */
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Privacy Scan Complete</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{result.file.filename}</p>
            </div>
            <RiskBadge level={result.scan.risk_level} score={result.scan.risk_score} />
          </div>

          {/* Detection Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Aadhaar Numbers</span>
              <span className="text-lg font-bold text-rose-400">{result.scan.counts.aadhaar}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">40 pts weight each</span>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">PAN Cards</span>
              <span className="text-lg font-bold text-amber-400">{result.scan.counts.pan}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">30 pts weight each</span>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Phone Numbers</span>
              <span className="text-lg font-bold text-blue-400">{result.scan.counts.phone}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">10 pts weight each</span>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Email Addresses</span>
              <span className="text-lg font-bold text-purple-400">{result.scan.counts.email}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">10 pts weight each</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-emerald-300">
              <Shield className="w-5 h-5 shrink-0" />
              <span>
                Opaque masked copy generated. The private original is secured and will not be shared.
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {result.scan.has_masked_copy && (
                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Mask</span>
                </button>
              )}
              <button
                onClick={() => setShowShareModal(true)}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors font-semibold flex items-center space-x-1 shadow-lg shadow-emerald-500/20"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Create Share Link</span>
              </button>
            </div>
          </div>

          {/* Upload another button */}
          <div className="text-center pt-2">
            <button
              onClick={() => {
                setFile(null);
                setResult(null);
              }}
              className="text-xs text-slate-400 hover:text-white font-medium"
            >
              &larr; Upload another document
            </button>
          </div>
        </div>
      )}

      {showShareModal && result?.file && (
        <ShareModal
          file={result.file}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showPreviewModal && result?.file && (
        <MaskedPreviewModal
          file={result.file}
          onClose={() => setShowPreviewModal(false)}
        />
      )}

    </div>
  );
}
