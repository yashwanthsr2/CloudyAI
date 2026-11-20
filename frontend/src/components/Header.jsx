import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ShieldCheck, Zap, Bell, Command } from 'lucide-react';

export default function Header({ onSearch, searchQuery }) {
  return (
    <header className="h-16 border-b border-cosmic-border bg-cosmic-900/60 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-20">
      
      {/* Search Input Bar with Keyboard shortcut */}
      <div className="relative max-w-md w-full">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery || ''}
          onChange={(e) => onSearch && onSearch(e.target.value)}
          placeholder="Search encrypted files, risk levels, tags..."
          className="w-full pl-9 pr-12 py-2 bg-cosmic-950/80 border border-cosmic-border rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/60 transition-all shadow-panel font-medium"
        />
        <div className="absolute right-3 top-2.5 flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[10px] text-slate-400 font-mono">
          <Command className="w-2.5 h-2.5 mr-0.5" />
          <span>K</span>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center space-x-3">
        {/* Security Enclave Shield Status */}
        <div className="hidden md:inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-[11px] tracking-wide">Zero-Plaintext Enclave</span>
        </div>

        {/* Quick Upload CTA Button */}
        <Link
          to="/upload"
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-violet-glow transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 text-cyan-300" />
          <span>Upload & Scan</span>
        </Link>
      </div>

    </header>
  );
}
