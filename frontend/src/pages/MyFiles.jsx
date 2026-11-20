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
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import RiskBadge from '../components/RiskBadge';

export default function MyFiles({ files = [], onRefresh }) {
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file and all its masked copies?')) return;
    try {
      await api.deleteFile(fileId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Delete failed');
    }
  };

  const filteredFiles = files.filter(f => {
    if (filterRisk !== 'ALL' && (f.risk_level || 'NONE') !== filterRisk) return false;
    if (searchTerm && !f.filename.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <Files className="w-6 h-6 text-indigo-400" />
            <span>Vault Files & Cloud Drive</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Original images remain stored in encrypted private buckets. Only masked copies can be shared externally.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-cosmic-900 border border-cosmic-border p-1 rounded-xl text-xs">
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterRisk(lvl)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterRisk === lvl
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-panel rounded-2xl p-3 border border-cosmic-border flex items-center space-x-3">
        <Search className="w-4 h-4 text-slate-500 ml-2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter files by name..."
          className="bg-transparent border-none text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
        />
      </div>

      {/* Files Table */}
      <div className="glass-panel rounded-3xl p-6 border border-cosmic-border shadow-xl">
        {filteredFiles.length === 0 ? (
          <div className="py-16 text-center">
            <FileImage className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No documents found matching the filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-cosmic-border text-slate-400 font-semibold">
                  <th className="pb-3.5 pl-3">Document</th>
                  <th className="pb-3.5">Size</th>
                  <th className="pb-3.5">Uploaded</th>
                  <th className="pb-3.5">Risk Level</th>
                  <th className="pb-3.5">Detected PII</th>
                  <th className="pb-3.5 text-right pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cosmic-border/60">
                {filteredFiles.map((file) => {
                  const d = file.detected_info || {};
                  return (
                    <tr key={file.id} className="hover:bg-cosmic-800/30 transition-colors">
                      <td className="py-3.5 pl-3 font-medium text-slate-200">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                            <FileImage className="w-4 h-4" />
                          </div>
                          <span className="truncate max-w-xs font-mono text-xs">{file.filename}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                        {(file.size_bytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3.5 text-slate-400 font-mono text-[11px]">
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5">
                        <RiskBadge level={file.risk_level} />
                      </td>
                      <td className="py-3.5 text-slate-400">
                        <div className="flex flex-wrap gap-1.5">
                          {d.aadhaar > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 text-[10px] border border-rose-500/20">Aadhaar: {d.aadhaar}</span>}
                          {d.pan > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[10px] border border-amber-500/20">PAN: {d.pan}</span>}
                          {d.phone > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] border border-blue-500/20">Phone: {d.phone}</span>}
                          {d.email > 0 && <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] border border-purple-500/20">Email: {d.email}</span>}
                          {d.aadhaar === 0 && d.pan === 0 && d.phone === 0 && d.email === 0 && (
                            <span className="text-slate-500 text-[11px]">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 text-right pr-3 space-x-2">
                        <Link
                          to={`/privacy-analysis?file=${file.id}`}
                          className="px-2.5 py-1 bg-cosmic-800 hover:bg-cosmic-700 text-slate-200 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center space-x-1"
                        >
                          <ScanEye className="w-3 h-3" />
                          <span>Analyze</span>
                        </Link>
                        <Link
                          to={`/shares?file=${file.id}`}
                          className="px-2.5 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center space-x-1"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Share</span>
                        </Link>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition-colors inline-flex items-center"
                          title="Delete"
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

    </div>
  );
}
