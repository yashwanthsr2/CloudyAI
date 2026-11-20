import React, { useState, useEffect } from 'react';
import { Shield, Eye, Share2, Trash2, RefreshCw, AlertCircle, FileText, Lock } from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';
import ShareModal from '../components/ShareModal';
import MaskedPreviewModal from '../components/MaskedPreviewModal';

export default function MyFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState(null);
  const [error, setError] = useState(null);
  const [filterRisk, setFilterRisk] = useState('ALL');

  const [selectedFileForShare, setSelectedFileForShare] = useState(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getFiles();
      setFiles(res.files || []);
    } catch (err) {
      setError(err.message || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (fileId) => {
    try {
      setScanningId(fileId);
      setError(null);
      await api.scanFile(fileId);
      await loadFiles();
    } catch (err) {
      setError(err.message || 'Scanning failed');
    } finally {
      setScanningId(null);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file and all its masked copies?')) return;
    try {
      await api.deleteFile(fileId);
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  const filteredFiles = files.filter(f => {
    if (filterRisk === 'ALL') return true;
    const level = f.scans?.[0]?.risk_level || 'Unscanned';
    return level.toUpperCase() === filterRisk;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            <span>My Files & Vault Documents</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Original files remain private. Only redacted masked copies can be shared externally.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterRisk(lvl)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterRisk === lvl
                  ? 'bg-slate-800 text-emerald-400 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Files List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
            <span>Loading files from vault...</span>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-slate-700 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No documents found matching the filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-semibold">
                  <th className="py-3.5 pl-4">Filename</th>
                  <th className="py-3.5">Size</th>
                  <th className="py-3.5">Uploaded</th>
                  <th className="py-3.5">Sensitivity Risk</th>
                  <th className="py-3.5">Detected PII Counts</th>
                  <th className="py-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFiles.map((file) => {
                  const scan = file.scans?.[0];
                  const isScanning = scanningId === file.id;

                  return (
                    <tr key={file.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pl-4 font-medium text-slate-200">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="truncate max-w-xs">{file.filename}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                        {(file.size_bytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3.5 text-slate-400">
                        {new Date(file.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5">
                        {scan ? (
                          <RiskBadge level={scan.risk_level} score={scan.risk_score} />
                        ) : (
                          <span className="text-slate-500 italic">Not scanned</span>
                        )}
                      </td>
                      <td className="py-3.5 text-slate-400">
                        {scan ? (
                          <div className="flex flex-wrap gap-1.5">
                            {scan.count_aadhaar > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 text-[10px] border border-rose-500/20">
                                Aadhaar: {scan.count_aadhaar}
                              </span>
                            )}
                            {scan.count_pan > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/20">
                                PAN: {scan.count_pan}
                              </span>
                            )}
                            {scan.count_phone > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] border border-blue-500/20">
                                Phone: {scan.count_phone}
                              </span>
                            )}
                            {scan.count_email > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] border border-purple-500/20">
                                Email: {scan.count_email}
                              </span>
                            )}
                            {scan.count_aadhaar === 0 && scan.count_pan === 0 && scan.count_phone === 0 && scan.count_email === 0 && (
                              <span className="text-emerald-400 text-[11px]">None detected</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right pr-4 space-x-1.5 whitespace-nowrap">
                        
                        {/* Rescan Button */}
                        <button
                          onClick={() => handleScan(file.id)}
                          disabled={isScanning}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors inline-flex items-center"
                          title="Scan / Rescan OCR"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-emerald-400' : ''}`} />
                        </button>

                        {/* View Masked Copy */}
                        {scan?.masked_path && (
                          <button
                            onClick={() => setSelectedFileForPreview(file)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 transition-colors inline-flex items-center"
                            title="Preview Masked Image"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Share Button */}
                        <button
                          onClick={() => setSelectedFileForShare(file)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold text-[11px] transition-colors inline-flex items-center space-x-1"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors inline-flex items-center"
                          title="Delete file"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {selectedFileForShare && (
        <ShareModal
          file={selectedFileForShare}
          onClose={() => setSelectedFileForShare(null)}
        />
      )}

      {selectedFileForPreview && (
        <MaskedPreviewModal
          file={selectedFileForPreview}
          onClose={() => setSelectedFileForPreview(null)}
        />
      )}

    </div>
  );
}
