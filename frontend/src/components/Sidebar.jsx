import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Files, 
  UploadCloud, 
  ScanEye, 
  Share2, 
  ShieldAlert, 
  LogOut, 
  Shield, 
  HardDrive,
  Lock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ quota }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard, badge: null },
    { label: 'Vault Files', path: '/files', icon: Files, badge: null },
    { label: 'Upload & Scan', path: '/upload', icon: UploadCloud, badge: 'DLP' },
    { label: 'Privacy Analysis', path: '/privacy-analysis', icon: ScanEye, badge: null },
    { label: 'Secure Sharing', path: '/shares', icon: Share2, badge: 'OTP' },
    { label: 'Security Activity', path: '/activity', icon: ShieldAlert, badge: null },
  ];

  const usedBytes = quota?.used_bytes || 0;
  const usedFormatted = usedBytes < 1024 * 1024
    ? `${(usedBytes / 1024).toFixed(0)} KB`
    : `${(usedBytes / (1024 * 1024)).toFixed(1)} MB`;
  const totalMb = 100;
  const percentUsed = Math.min(100, Math.round((usedBytes / (100 * 1024 * 1024)) * 100));

  const userEmail = user?.email || 'security.officer@privacloud.ai';
  const userInitials = userEmail.substring(0, 2).toUpperCase();

  return (
    <aside className="w-64 bg-cosmic-900 border-r border-cosmic-border flex flex-col justify-between h-screen sticky top-0 z-30 select-none shadow-2xl">
      
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-cosmic-border/80 flex items-center space-x-3 bg-cosmic-950/40">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[1px] shadow-violet-glow shrink-0">
            <div className="w-full h-full bg-cosmic-950 rounded-[11px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-cosmic-950 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-sm tracking-wider text-white">PRIVACLOUD</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-500/20 text-cyan-300 border border-violet-500/30 font-mono">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-tight truncate flex items-center space-x-1">
              <Lock className="w-2.5 h-2.5 text-emerald-400 inline shrink-0" />
              <span>Zero-Plaintext Vault</span>
            </p>
          </div>
        </div>

        {/* Section Label */}
        <div className="px-5 pt-5 pb-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
          Data Room & Storage
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-gradient-to-r from-violet-600/20 via-violet-600/10 to-transparent text-white border border-violet-500/40 shadow-violet-glow' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-cosmic-800/60 border border-transparent'}
                `}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300">
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-violet-400 transition-colors" />
                </div>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Storage Quota & User Profile */}
      <div className="p-4 border-t border-cosmic-border/80 space-y-3 bg-cosmic-950/40">
        
        {/* Storage Quota Card */}
        <div className="p-3.5 bg-cosmic-950/80 rounded-xl border border-cosmic-border text-xs space-y-2.5 shadow-panel">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center space-x-1.5 font-medium">
              <HardDrive className="w-3.5 h-3.5 text-violet-400" />
              <span>Encrypted Quota</span>
            </span>
            <span className="font-mono text-cyan-300 font-bold">{percentUsed}%</span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden p-[0.5px]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentUsed > 85 ? 'bg-rose-500' : percentUsed > 60 ? 'bg-amber-400' : 'bg-gradient-to-r from-violet-500 to-cyan-400'
              }`}
              style={{ width: `${Math.max(4, percentUsed)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>{usedFormatted} used</span>
            <span>{totalMb} MB limit</span>
          </div>
        </div>

        {/* User Profile Bar */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-cosmic-850/60 border border-cosmic-border/60">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 p-[1px] shrink-0">
              <div className="w-full h-full bg-cosmic-950 rounded-[7px] flex items-center justify-center text-[10px] font-bold text-cyan-300 font-mono">
                {userInitials}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-200 truncate leading-tight">{userEmail}</p>
              <div className="flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-mono font-medium">Armored Vault</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

    </aside>
  );
}
