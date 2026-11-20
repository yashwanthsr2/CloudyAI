import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  FileCheck2,
  HardDrive,
  Lock,
  Layers,
  Sparkles,
  Eye,
  Share2,
  Info,
  ShieldAlert
} from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function UploadScan({ onUploadComplete, quota, files = [] }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanStep, setScanStep] = useState(''); // 'uploading' | 'preprocessing' | 'ocr' | 'redacting' | 'completed'
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const navigate = useNavigate();

  const totalStoredBytes = quota?.used_bytes !== undefined ? quota.used_bytes : files.reduce((acc, f) => acc + (f.size_bytes || 0), 0);
  const maxBytes = 100 * 1024 * 1024;
  const usedFormatted = totalStoredBytes < 1024 * 1024 
    ? `${(totalStoredBytes / 1024).toFixed(1)} KB` 
    : `${(totalStoredBytes / (1024 * 1024)).toFixed(2)} MB`;
  const percentUsed = Math.min(100, (totalStoredBytes / maxBytes) * 100).toFixed(1);
  const remainingMb = Math.max(0, (maxBytes - totalStoredBytes) / (1024 * 1024)).toFixed(1);

  const validateAndSelectFile = (file) => {
    setError(null);
    setScanResult(null);

    // 1. Strict validation: JPG, JPEG, PNG only
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = /\.(jpe?g|png)$/i;

    if (!validTypes.includes(file.type.toLowerCase()) && !validExtensions.test(file.name)) {
      setError('Unsupported File Format: Only JPG, JPEG, and PNG images are accepted. PDF documents are strictly rejected to eliminate hidden vector text risks.');
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // 2. Strict 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5.0 MB maximum allowed limit.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // 3. Strict 100 MB user quota
    if (usedBytes + file.size > 100 * 1024 * 1024) {
      setError(`Storage Limit Exceeded: Uploading this file would exceed your 100 MB vault quota.`);
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);

    // Generate local preview
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
      setProgress(15);
      setScanStep('uploading');

      // Upload file to encrypted vault
      const formData = new FormData();
      formData.append('file', selectedFile);
      const uploadRes = await api.uploadFile(formData);
      const uploadedFile = uploadRes.file;

      setProgress(45);
      setScanStep('ocr');

      // Execute OCR and automatic redaction
      const scanRes = await api.scanFile(uploadedFile.id);

      setProgress(85);
      setScanStep('redacting');

      setTimeout(() => {
        setProgress(100);
        setScanStep('completed');
        setScanResult({
          file: scanRes.file,
          scan: scanRes.scan
        });
        if (onUploadComplete) onUploadComplete();
      }, 400);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Scanning pipeline failed. Please ensure the image is clear and valid.');
    } finally {
      setUploading(false);
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setError(null);
    setProgress(0);
    setScanStep('');
  };

  const d = scanResult?.file?.detected_info || {};
  const aadhaarCount = d.aadhaar_count || d.count_aadhaar || 0;
  const panCount = d.pan_count || d.count_pan || 0;
  const phoneCount = d.phone_count || d.count_phone || 0;
  const emailCount = d.email_count || d.count_email || 0;
  const totalPii = aadhaarCount + panCount + phoneCount + emailCount;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cosmic-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/20 text-cyan-300 border border-violet-500/30">
              PIPELINE INGESTION
            </span>
            <span className="text-slate-400 text-xs">• Air-Gapped Scanning</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5 mt-1">
            <UploadCloud className="w-6 h-6 text-violet-400" />
            <span>Document Upload & Privacy Engine</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Ingest identity documents (Aadhaar, PAN, utility records) into your encrypted vault. Our automated Tesseract.js OCR and Sharp engine extracts coordinates, applies strict risk classification, and permanently bakes opaque masks over detected PII.
          </p>
        </div>

        {/* Compact Quota & Format Ribbon */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-cosmic-900 border border-cosmic-border flex items-center space-x-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>JPG / PNG only</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-cosmic-900 border border-cosmic-border flex items-center space-x-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span>Max: 5.0 MB</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-cosmic-900 border border-violet-500/30 flex items-center space-x-2 text-cyan-300">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold">{usedFormatted} / 100 MB Used</span>
            <span className="text-[10px] text-slate-400">({remainingMb} MB Free)</span>
          </div>
        </div>
      </div>

      {/* Error Alert Notice */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-2xl flex items-start space-x-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Security Ingestion Notice</p>
            <p className="mt-0.5 text-slate-300 leading-relaxed">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Balanced 2-Column Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Ingestion Dropzone & Selection (5 or 6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          
          {!selectedFile ? (
            /* Empty State Dropzone */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`cyber-panel rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer relative group overflow-hidden border-2 border-dashed ${
                dragActive 
                  ? 'border-cyan-400 bg-violet-950/30 scale-[1.01] shadow-cyan-glow' 
                  : 'border-cosmic-border hover:border-violet-500/50 hover:bg-cosmic-850/60'
              }`}
            >
              {/* Animated Radar Scanning Line */}
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-cyber-radar pointer-events-none" />

              <input
                type="file"
                id="file-upload-input"
                accept="image/jpeg,image/png,image/jpg"
                onChange={(e) => e.target.files && e.target.files[0] && validateAndSelectFile(e.target.files[0])}
                className="hidden"
              />

              <label htmlFor="file-upload-input" className="cursor-pointer block space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-violet-600/30 to-cyan-500/30 border border-violet-500/40 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shadow-violet-glow">
                  <UploadCloud className="w-8 h-8 text-cyan-300 group-hover:text-white transition-colors" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Drag & Drop Document Image
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Select a high-resolution identity photo or document scan. Images are streamed to secure memory and parsed locally.
                  </p>
                </div>

                <div className="pt-2">
                  <span className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-violet-glow transition-all active:scale-[0.98]">
                    <FileImage className="w-4 h-4 text-cyan-300" />
                    <span>Browse Local Files</span>
                  </span>
                </div>

                <div className="pt-4 border-t border-cosmic-border/60 flex items-center justify-center space-x-4 text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>JPG, JPEG, PNG</span>
                  </span>
                  <span>•</span>
                  <span>Up to 5 MB</span>
                  <span>•</span>
                  <span>Zero-Plaintext</span>
                </div>
              </label>
            </div>
          ) : (
            /* Selected File Preview & Ingestion Card */
            <div className="cyber-panel-elevated rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-cosmic-border/60">
                <span className="text-xs font-mono font-bold text-cyan-300 flex items-center space-x-1.5">
                  <FileCheck2 className="w-4 h-4 text-violet-400" />
                  <span>DOCUMENT STAGED FOR INGESTION</span>
                </span>
                {!uploading && (
                  <button
                    onClick={resetSelection}
                    className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                    title="Deselect file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Thumbnail and Meta */}
              <div className="flex items-start space-x-4">
                <div className="w-24 h-24 rounded-xl bg-cosmic-950 border border-cosmic-border overflow-hidden shrink-0 flex items-center justify-center p-1 relative">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <FileImage className="w-8 h-8 text-slate-600" />
                  )}
                  <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-mono bg-cosmic-950/90 text-cyan-300 border border-cosmic-border">
                    {selectedFile.type.split('/')[1]?.toUpperCase()}
                  </span>
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-bold text-white truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || 'image/jpeg'}
                  </p>
                  <div className="pt-2 flex items-center space-x-2 text-[10px] text-emerald-400 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Memory buffered • Isolated sandbox</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar during Scanning */}
              {uploading && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 flex items-center space-x-1.5">
                      <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                      <span>
                        {scanStep === 'uploading' && 'Streaming file to private storage...'}
                        {scanStep === 'ocr' && 'Extracting text coordinates (Tesseract.js)...'}
                        {scanStep === 'redacting' && 'Baking opaque pixel masks (Sharp)...'}
                        {scanStep === 'completed' && 'DLP Scan complete!'}
                      </span>
                    </span>
                    <span className="text-cyan-300 font-bold">{progress}%</span>
                  </div>

                  <div className="w-full h-2 bg-cosmic-950 rounded-full overflow-hidden border border-cosmic-border/60">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Execution CTA Buttons */}
              {!uploading && !scanResult && (
                <div className="pt-2 flex items-center space-x-3">
                  <button
                    onClick={handleUploadAndScan}
                    className="flex-1 inline-flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-violet-glow transition-all active:scale-[0.98]"
                  >
                    <ScanEye className="w-4 h-4 text-cyan-300" />
                    <span>Execute Privacy Scan & Redaction</span>
                  </button>

                  <button
                    onClick={resetSelection}
                    className="px-4 py-3 rounded-xl bg-cosmic-800 hover:bg-cosmic-750 text-slate-300 font-semibold text-xs border border-cosmic-border transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {scanResult && (
                <button
                  onClick={resetSelection}
                  className="w-full py-2.5 rounded-xl bg-cosmic-800 hover:bg-cosmic-750 text-slate-300 font-medium text-xs border border-cosmic-border transition-colors"
                >
                  Upload Another Document
                </button>
              )}
            </div>
          )}

          {/* Compliance & Privacy Guarantees */}
          <div className="p-4 rounded-xl bg-cosmic-900/60 border border-cosmic-border text-xs text-slate-400 space-y-2">
            <div className="flex items-center space-x-1.5 text-slate-300 font-semibold text-[11px]">
              <Lock className="w-3.5 h-3.5 text-violet-400" />
              <span>Zero-Plaintext Guarantee</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Extracted sensitive credentials (Aadhaar, PAN, phone, email) exist only in volatile server memory during OCR processing. No plaintext values are ever saved to database tables or application logs.
            </p>
          </div>

          {/* Stored Vault Status & Inventory Card */}
          <div className="p-4 rounded-xl bg-cosmic-900/70 border border-cosmic-border text-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-semibold text-[11px] flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Vault Storage Meter</span>
              </span>
              <span className="font-mono text-cyan-300 font-bold text-[11px]">
                {usedFormatted} / 100 MB ({percentUsed}%)
              </span>
            </div>

            {/* Storage Progress Bar */}
            <div className="w-full bg-cosmic-950 h-2.5 rounded-full overflow-hidden border border-cosmic-border/60">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, parseFloat(percentUsed))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="text-emerald-400 font-semibold">✓ {files.length} Documents in Vault</span>
              <Link to="/files" className="text-violet-400 hover:text-cyan-300 font-bold transition-colors inline-flex items-center space-x-1">
                <span>View Drive</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {files.length > 0 && (
              <div className="pt-2 border-t border-cosmic-border/60 space-y-1.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Recent Stored Files:</span>
                {files.slice(0, 3).map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-cosmic-950/60 border border-cosmic-border text-[11px]">
                    <span className="text-slate-200 truncate max-w-[170px]" title={f.filename}>{f.filename}</span>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-slate-400 font-mono text-[10px]">{(f.size_bytes / 1024).toFixed(0)} KB</span>
                      <RiskBadge level={f.risk_level} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Results OR Engine Specifications (6 or 7 cols) */}
        <div className="lg:col-span-6 space-y-4">
          
          {scanResult ? (
            /* Structured Scan Results Card (Reference 4) */
            <div className="cyber-panel-elevated rounded-2xl p-6 space-y-6 shadow-2xl border-violet-500/30">
              
              {/* Header with Risk Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-cosmic-border/60">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    DLP Security Assessment
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {scanResult.file.filename}
                  </h3>
                </div>
                <RiskBadge level={scanResult.file.risk_level} size="lg" />
              </div>

              {/* Storage Confirmation Banner */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center space-x-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate"><strong>Stored in Vault:</strong> "{scanResult.file.filename}" is safely saved.</span>
                </div>
                <Link
                  to="/files"
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-mono text-[10px] font-bold transition-colors inline-flex items-center space-x-1 shrink-0 ml-2"
                >
                  <span>My Files ({files.length}) &rarr;</span>
                </Link>
              </div>

              {/* Detected Entity Counters */}
              <div>
                <p className="text-xs font-mono font-semibold text-slate-400 mb-2.5 flex items-center justify-between">
                  <span>DETECTED SENSITIVE ENTITIES</span>
                  <span className="text-cyan-300 font-bold">{totalPii} Found</span>
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-cosmic-950/80 rounded-xl border border-cosmic-border text-center">
                    <p className="text-[10px] font-mono text-slate-400">Aadhaar</p>
                    <p className={`text-base font-bold font-mono mt-1 ${aadhaarCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                      {aadhaarCount}
                    </p>
                    <span className="text-[9px] text-slate-400">40 pts • High</span>
                  </div>

                  <div className="p-3 bg-cosmic-950/80 rounded-xl border border-cosmic-border text-center">
                    <p className="text-[10px] font-mono text-slate-400">PAN Card</p>
                    <p className={`text-base font-bold font-mono mt-1 ${panCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                      {panCount}
                    </p>
                    <span className="text-[9px] text-slate-400">30 pts • High</span>
                  </div>

                  <div className="p-3 bg-cosmic-950/80 rounded-xl border border-cosmic-border text-center">
                    <p className="text-[10px] font-mono text-slate-400">Phone</p>
                    <p className={`text-base font-bold font-mono mt-1 ${phoneCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {phoneCount}
                    </p>
                    <span className="text-[9px] text-slate-400">10 pts • Med</span>
                  </div>

                  <div className="p-3 bg-cosmic-950/80 rounded-xl border border-cosmic-border text-center">
                    <p className="text-[10px] font-mono text-slate-400">Email</p>
                    <p className={`text-base font-bold font-mono mt-1 ${emailCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {emailCount}
                    </p>
                    <span className="text-[9px] text-slate-400">10 pts • Low</span>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Dual Previews (Original vs Masked) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-300 font-semibold flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Redaction Visual Inspection</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Permanent Pixel Burn</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Original (Authenticated Owner Only) */}
                  <div className="p-2.5 bg-cosmic-950/80 rounded-xl border border-cosmic-border space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Vault Original</span>
                      <span className="text-amber-400 font-semibold">Owner Only</span>
                    </div>
                    <div className="h-32 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
                      <img 
                        src={api.getOriginalPreviewUrl(scanResult.file.id)} 
                        alt="Original" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Redacted or Clean (Public Safe Copy) */}
                  <div className="p-2.5 bg-cosmic-950/80 rounded-xl border border-violet-500/30 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{scanResult.file.storage_path_masked ? 'Protected Masked Copy' : 'Verified Clean Copy'}</span>
                      <span className="text-emerald-400 font-semibold">
                        {scanResult.file.storage_path_masked ? 'Share Safe (Redacted)' : 'Share Safe (Clean)'}
                      </span>
                    </div>
                    <div className="h-32 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
                      <img 
                        src={api.getMaskedPreviewUrl(scanResult.file.id)} 
                        alt={scanResult.file.storage_path_masked ? "Protected Masked Copy" : "Verified Clean Copy"}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = api.getOriginalPreviewUrl(scanResult.file.id);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  to={`/shares?file=${scanResult.file.id}`}
                  className="w-full sm:flex-1 inline-flex items-center justify-center space-x-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-cyan-glow transition-all duration-200"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Create 1-to-1 Secure Share</span>
                </Link>

                <Link
                  to={`/privacy-analysis?file=${scanResult.file.id}`}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-cosmic-800 hover:bg-cosmic-750 text-slate-200 font-semibold text-xs border border-cosmic-border inline-flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-violet-400" />
                  <span>Full DLP Review</span>
                </Link>
              </div>

            </div>
          ) : (
            /* Idle State: Privacy Engine Architecture Specifications */
            <div className="cyber-panel rounded-2xl p-6 space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b border-cosmic-border/60">
                <ShieldAlert className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Automated Security Engine Protocol
                </h3>
              </div>

              {/* Detection Specs */}
              <div className="space-y-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  PRIVACLOUD AI applies automated OCR pattern discovery and deterministic regular expression scanning to neutralize document credential leakage:
                </p>

                <div className="space-y-2">
                  <div className="p-3 bg-cosmic-950/60 rounded-xl border border-cosmic-border flex items-start space-x-3">
                    <span className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">Aadhaar & PAN Identification</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Detects 12-digit triple sequence (`w1 w2 w3`) and 10-character alphanumeric PAN (`[A-Z]{5}\d{4}[A-Z]`). Immediately sets <strong>HIGH RISK</strong> with a strict <strong>5-minute TTL</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-cosmic-950/60 rounded-xl border border-cosmic-border flex items-start space-x-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">Phone & Contact Info</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Matches 10-digit Indian mobile patterns. Assigns <strong>MEDIUM RISK</strong> with a <strong>10-minute TTL</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-cosmic-950/60 rounded-xl border border-cosmic-border flex items-start space-x-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">Email Address Neutralization</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Matches RFC-compliant email strings. Assigns <strong>LOW RISK</strong> with a <strong>15-minute TTL</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redaction Guarantee */}
              <div className="p-3.5 bg-gradient-to-r from-violet-950/40 to-cyan-950/40 rounded-xl border border-violet-500/20 text-xs space-y-1">
                <span className="font-semibold text-cyan-300 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Pixel-Level Permanent Redaction</span>
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Sharp composites solid black SVG rectangles (#000000) with +4px boundary padding. Pixel bytes are permanently overwritten with [0, 0, 0, 255] — no CSS blur or reversible overlays.
                </p>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
