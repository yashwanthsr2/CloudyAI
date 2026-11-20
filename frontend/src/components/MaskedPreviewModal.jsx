import React from 'react';
import { X, ShieldAlert, Download, Eye } from 'lucide-react';
import { api } from '../services/api';

export default function MaskedPreviewModal({ file, onClose }) {
  const scan = file.scans?.[0];
  const previewUrl = api.getMaskedPreviewUrl(file.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Masked Document Preview</h3>
            <p className="text-xs text-slate-400">{file.filename} &bull; Redacted copy for safe external sharing</p>
          </div>
        </div>

        {/* Info Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
          <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-slate-400 block text-[11px]">Aadhaar Masked</span>
            <span className="font-semibold text-white">{scan?.count_aadhaar || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-slate-400 block text-[11px]">PAN Masked</span>
            <span className="font-semibold text-white">{scan?.count_pan || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-slate-400 block text-[11px]">Phone Masked</span>
            <span className="font-semibold text-white">{scan?.count_phone || 0}</span>
          </div>
          <div className="p-2.5 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-slate-400 block text-[11px]">Email Masked</span>
            <span className="font-semibold text-white">{scan?.count_email || 0}</span>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-4 min-h-[300px]">
          <img
            src={previewUrl}
            alt="Masked Document Preview"
            className="max-h-[60vh] max-w-full object-contain rounded shadow-lg"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200"><rect width="400" height="200" fill="%230f172a"/><text x="50%" y="50%" fill="%2364748b" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14">Masked image rendered on server</text></svg>';
            }}
          />
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span className="flex items-center text-emerald-400">
            <ShieldAlert className="w-4 h-4 mr-1.5" />
            Sensitive data is visually obscured with solid pixel masks. Original remains unmodified in private vault.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
