import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ShieldCheck, Bell } from 'lucide-react';

export default function Header({ onSearch, searchQuery }) {
  return (
    <header className="h-16 border-b border-cosmic-border bg-cosmic-950/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      
      {/* Search Input */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery || ''}
          onChange={(e) => onSearch && onSearch(e.target.value)}
          placeholder="Search files by name or category..."
          className="w-full pl-9 pr-4 py-2 bg-cosmic-900/80 border border-cosmic-border rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
        />
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-3">
        {/* Security Shield Status */}
        <div className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
          <span>Zero-Plaintext Vault Active</span>
        </div>

        {/* Upload Button */}
        <Link
          to="/upload"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Image</span>
        </Link>
      </div>

    </header>
  );
}
