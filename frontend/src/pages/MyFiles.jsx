import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Files, 
  Trash2, 
  Share2, 
  ScanEye, 
  Shield, 
  FileImage, 
  Search,
  Filter,
  LayoutGrid,
  List,
  UploadCloud,
  Eye,
  Calendar,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function MyFiles({ files = [], onRefresh }) {
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file and all its masked copies? This action is permanent.')) return;
    try {
      await api.deleteFile(fileId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Delete operation failed');
    }
  };

  const filteredFiles = files.filter(f => {
    if (filterRisk === 'HIGH' && f.risk_level !== 'HIGH') return false;
    if (filterRisk === 'MEDIUM' && f.risk_level !== 'MEDIUM') return false;
    if (filterRisk === 'LOW' && f.risk_level !== 'LOW') return false;
    if (filterRisk === 'CLEAN' && (f.risk_level && f.risk_level !== 'NONE')) return false;

    if (searchTerm && !f.filename.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cosmic-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              SECURE DRIVE
            </span>
            <span className="text-slate-400 text-xs">• Encrypted Tenant Isolation</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5 mt-1">
            <Files className="w-6 h-6 text-violet-400" />
            <span>Vault Files & Cloud Drive</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Private object storage. Pristine originals are sealed in your enclave; only server-masked versions are provisioned for external transfer.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-violet-glow transition-all shrink-0 self-start md:self-auto"
        >
          <UploadCloud className="w-4 h-4 text-cyan-300" />
          <span>Upload Document</span>
        </Link>
      </div>

      {/* Filter and View Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter files by name..."
            className="w-full pl-9 pr-4 py-2 bg-cosmic-900 border border-cosmic-border rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500/60 font-medium"
          />
        </div>

        {/* Risk Filter Tabs & View Toggle */}
        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <div className="flex items-center space-x-1 bg-cosmic-900 border border-cosmic-border p-1 rounded-xl text-xs font-mono">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'HIGH', label: 'High' },
              { id: 'MEDIUM', label: 'Med' },
              { id: 'LOW', label: 'Low' },
              { id: 'CLEAN', label: 'Clean' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterRisk(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterRisk === tab.id
                    ? 'bg-violet-600 text-white shadow-violet-glow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-cosmic-900 border border-cosmic-border p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-cosmic-750 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-cosmic-750 text-cyan-300' : 'text-slate-400 hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="cyber-panel rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-cosmic-850 border border-cosmic-border flex items-center justify-center">
            <Files className="w-8 h-8 text-slate-500" />
          </div>
          <div className="max-w-sm mx-auto">
            <p className="text-base font-bold text-white">No Matching Documents</p>
            <p className="text-xs text-slate-400 mt-1">
              {files.length === 0
                ? "Your encrypted vault has no uploaded files yet. Upload a JPG or PNG identity document to begin."
                : "No files match your current search and risk filters."}
            </p>
          </div>
          {files.length === 0 && (
            <Link
              to="/upload"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-violet-glow transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const d = file.detected_info || {};
            const aadhaar = d.aadhaar_count || d.count_aadhaar || 0;
            const pan = d.pan_count || d.count_pan || 0;
            const phone = d.phone_count || d.count_phone || 0;
            const email = d.email_count || d.count_email || 0;

            const previewSrc = file.storage_path_masked 
              ? api.getMaskedPreviewUrl(file.id) 
              : api.getOriginalPreviewUrl(file.id);

            return (
              <div
                key={file.id}
                className="cyber-panel cyber-card-interactive rounded-2xl overflow-hidden flex flex-col justify-between group"
              >
                {/* Image Preview Canvas */}
                <div className="h-44 bg-cosmic-950/80 p-2 relative overflow-hidden border-b border-cosmic-border/60">
                  <img
                    src={previewSrc}
                    alt={file.filename}
                    className="w-full h-full object-contain rounded-lg transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <RiskBadge level={file.risk_level} size="sm" />
                  </div>
                  <div className="absolute top-3 right-3 px-1.5 py-0.5 rounded text-[9px] font-mono bg-cosmic-950/90 text-cyan-300 border border-cosmic-border">
                    {file.mime_type?.split('/')[1]?.toUpperCase() || 'IMAGE'}
                  </div>
                </div>

                {/* File Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors" title={file.filename}>
                      {file.filename}
                    </h3>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-1">
                      <span>{(file.size_bytes / 1024).toFixed(0)} KB</span>
                      <span>•</span>
                      <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                    </div>

                    {/* Detected PII Badges */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {aadhaar > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          Aadhaar ({aadhaar})
                        </span>
                      )}
                      {pan > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          PAN ({pan})
                        </span>
                      )}
                      {phone > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Phone ({phone})
                        </span>
                      )}
                      {email > 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Email ({email})
                        </span>
                      )}
                      {aadhaar === 0 && pan === 0 && phone === 0 && email === 0 && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono text-slate-400 bg-slate-800">
                          Clean
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-3 border-t border-cosmic-border/60 flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Link
                        to={`/privacy-analysis?file=${file.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-cosmic-800 hover:bg-violet-600/30 text-slate-300 hover:text-white text-[11px] font-medium border border-cosmic-border inline-flex items-center space-x-1 transition-colors"
                      >
                        <ScanEye className="w-3.5 h-3.5 text-violet-400" />
                        <span>DLP</span>
                      </Link>

                      <Link
                        to={`/shares?file=${file.id}`}
                        className="px-2.5 py-1.5 rounded-lg bg-cosmic-800 hover:bg-cyan-600/30 text-slate-300 hover:text-white text-[11px] font-medium border border-cosmic-border inline-flex items-center space-x-1 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Share</span>
                      </Link>
                    </div>

                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="cyber-panel rounded-2xl overflow-hidden border border-cosmic-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-cosmic-950/80 text-[10px] font-mono uppercase text-slate-400 border-b border-cosmic-border">
              <tr>
                <th className="p-4">Document</th>
                <th className="p-4">Risk Classification</th>
                <th className="p-4">Detected PII</th>
                <th className="p-4">File Size</th>
                <th className="p-4">Ingestion Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cosmic-border/50">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-cosmic-850/40 transition-colors">
                  <td className="p-4 flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-cosmic-950 border border-cosmic-border overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                      <img
                        src={file.storage_path_masked ? api.getMaskedPreviewUrl(file.id) : api.getOriginalPreviewUrl(file.id)}
                        alt={file.filename}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <span className="font-bold text-slate-200 truncate max-w-xs">{file.filename}</span>
                  </td>
                  <td className="p-4">
                    <RiskBadge level={file.risk_level} size="sm" />
                  </td>
                  <td className="p-4 text-slate-400 font-mono text-[11px]">
                    {Object.values(file.detected_info || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)} entities
                  </td>
                  <td className="p-4 font-mono text-slate-400 text-[11px]">
                    {(file.size_bytes / 1024).toFixed(0)} KB
                  </td>
                  <td className="p-4 font-mono text-slate-400 text-[11px]">
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Link
                      to={`/privacy-analysis?file=${file.id}`}
                      className="inline-flex p-1.5 rounded-lg bg-cosmic-800 hover:bg-violet-600/30 text-slate-300 hover:text-white"
                      title="Inspect DLP"
                    >
                      <ScanEye className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to={`/shares?file=${file.id}`}
                      className="inline-flex p-1.5 rounded-lg bg-cosmic-800 hover:bg-cyan-600/30 text-slate-300 hover:text-white"
                      title="Create Share"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
