import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  FileImage, 
  AlertTriangle, 
  CheckCircle2, 
  ScanEye, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  X,
  FileCheck2
} from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function UploadScan({ onUploadComplete, quota }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanStep, setScanStep] = useState(''); // 'uploading' | 'scanning' | 'masking' | 'completed'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const navigate = useNavigate();

  const validateAndSelectFile = (file) => {
    setError(null);
    setScanResult(null);

    // 1. Enforce JPG, JPEG, PNG only
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = /\.(jpe?g|png)$/i;

    if (!validTypes.includes(file.type.toLowerCase()) && !validExtensions.test(file.name)) {
      setError('Invalid file format: Only JPG, JPEG, and PNG images are supported. PDF documents are not accepted.');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // 2. Enforce 5 MB individual limit
    if (file.size > 5 * 1024 * 1024) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB maximum limit.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // 3. Enforce 100 MB total quota
    const used = quota?.used_bytes || 0;
    if (used + file.size > 100 * 1024 * 1024) {
      setError(`Cannot upload: Adding this file would exceed your 100 MB vault storage quota.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);

    // Create image preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadAndScan = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);
      setProgress(20);

      // Step 1: Upload to private storage
      setScanStep('uploading');
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadRes = await api.uploadFile(formData);
      const uploadedFile = uploadRes.file;

      setProgress(60);

      // Step 2: Trigger OCR Privacy Scan & Masking
      setScanStep('scanning');
      const scanRes = await api.scanFile(uploadedFile.id);

      setProgress(100);
      setScanStep('completed');
      setScanResult({
        file: scanRes.file,
        scan: scanRes.scan
      });

      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Scan process encountered an error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
          <UploadCloud className="w-6 h-6 text-indigo-400" />
          <span>Upload & Privacy Scan</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Strictly accepts JPG, JPEG, and PNG images up to 5 MB. Documents are stored in an encrypted vault and analyzed via OCR for Aadhaar, PAN, phone, and email detection.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <p className="font-semibold">Upload Validation Notice</p>
            <p className="mt-0.5 text-slate-300">{error}</p>
          </div>
        </div>
      )}

      {/* Main Upload / Drag-and-Drop Area (Reference 3) */}
      {!scanResult ? (
        <div className="glass-panel rounded-3xl p-8 border border-cosmic-border shadow-2xl space-y-6">
          
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer relative group ${
              dragActive 
                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]' 
                : 'border-cosmic-border hover:border-indigo-500/50 bg-cosmic-950/40'
            }`}
          >
            <input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={(e) => e.target.files?.[0] && validateAndSelectFile(e.target.files[0])}
              disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 group-hover:scale-110 flex items-center justify-center text-indigo-400 mb-4 transition-transform shadow-lg shadow-indigo-500/10">
                <UploadCloud className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {selectedFile ? selectedFile.name : 'Click to browse or drag and drop image here'}
              </p>
              <p className="text-xs text-slate-500 mt-1.5 font-mono">
                JPG &bull; JPEG &bull; PNG &bull; Max 5 MB per document
              </p>
            </div>
          </div>

          {/* Selected File Details & Preview */}
          {selectedFile && (
            <div className="p-4 bg-cosmic-950/80 rounded-2xl border border-cosmic-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5 truncate">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded-xl object-cover border border-cosmic-border shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                    <FileImage className="w-6 h-6" />
                  </div>
                )}
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB &bull; {selectedFile.type || 'image'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  disabled={uploading}
                  className="p-2 text-slate-400 hover:text-white rounded-lg"
                  title="Remove"
                >
                  <X className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleUploadAndScan}
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition-all disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {scanStep === 'uploading' && 'Encrypting & Storing...'}
                        {scanStep === 'scanning' && 'Running OCR & PII Detection...'}
                        {scanStep === 'completed' && 'Finalizing...'}
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
            </div>
          )}

          {/* Progress bar during scan */}
          {uploading && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>{scanStep === 'uploading' ? 'Vault Upload' : 'Tesseract OCR & Masking'}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

        </div>
      ) : (
        /* Scan Completed Summary Card */
        <div className="glass-panel rounded-3xl p-8 border border-cosmic-border shadow-2xl space-y-6">
          <div className="flex items-center justify-between pb-5 border-b border-cosmic-border">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/15 rounded-xl border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Privacy Scan Complete</h2>
                <p className="text-xs text-slate-400">{scanResult.file.filename}</p>
              </div>
            </div>
            <RiskBadge level={scanResult.scan.risk_level} size="lg" />
          </div>

          {/* Reason Box */}
          <div className="p-4 bg-cosmic-950/80 rounded-2xl border border-cosmic-border text-xs text-slate-300">
            <span className="font-semibold text-indigo-400">Classification Assessment: </span>
            {scanResult.scan.risk_reason}
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-cosmic-950/60 rounded-xl border border-cosmic-border">
              <span className="text-[11px] text-slate-400 block">Aadhaar Numbers</span>
              <span className="text-xl font-bold text-rose-400 font-mono">{scanResult.scan.counts?.aadhaar || 0}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Priority: HIGH (5m)</span>
            </div>
            <div className="p-4 bg-cosmic-950/60 rounded-xl border border-cosmic-border">
              <span className="text-[11px] text-slate-400 block">PAN Cards</span>
              <span className="text-xl font-bold text-amber-400 font-mono">{scanResult.scan.counts?.pan || 0}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Priority: HIGH (5m)</span>
            </div>
            <div className="p-4 bg-cosmic-950/60 rounded-xl border border-cosmic-border">
              <span className="text-[11px] text-slate-400 block">Phone Numbers</span>
              <span className="text-xl font-bold text-blue-400 font-mono">{scanResult.scan.counts?.phone || 0}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Priority: MEDIUM (10m)</span>
            </div>
            <div className="p-4 bg-cosmic-950/60 rounded-xl border border-cosmic-border">
              <span className="text-[11px] text-slate-400 block">Email Addresses</span>
              <span className="text-xl font-bold text-purple-400 font-mono">{scanResult.scan.counts?.email || 0}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Priority: LOW (15m)</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => { setSelectedFile(null); setScanResult(null); }}
              className="text-xs text-slate-400 hover:text-white font-medium"
            >
              &larr; Upload another image
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(`/privacy-analysis?file=${scanResult.file.id}`)}
                className="px-4 py-2.5 rounded-xl bg-cosmic-800 hover:bg-cosmic-700 text-slate-200 text-xs font-semibold border border-cosmic-border flex items-center space-x-1.5 transition-all"
              >
                <ScanEye className="w-4 h-4 text-indigo-400" />
                <span>Open Privacy Analysis</span>
              </button>

              <button
                onClick={() => navigate(`/shares?file=${scanResult.file.id}`)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center space-x-1.5 transition-all"
              >
                <span>Share Securely</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
