import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Files, 
  UploadCloud, 
  ScanEye, 
  Share2, 
  ShieldAlert, 
  Settings, 
  LogOut, 
  Shield, 
  HardDrive 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ quota }) {
  const { user, logout, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'My Files', path: '/files', icon: Files },
    { label: 'Upload & Scan', path: '/upload', icon: UploadCloud },
    { label: 'Privacy Analysis', path: '/privacy-analysis', icon: ScanEye },
    { label: 'Secure Sharing', path: '/shares', icon: Share2 },
    { label: 'Security Activity', path: '/activity', icon: ShieldAlert },
  ];

  const usedMb = ((quota?.used_bytes || 0) / (1024 * 1024)).toFixed(1);
  const totalMb = 100;
  const percentUsed = Math.min(100, Math.round(((quota?.used_bytes || 0) / (100 * 1024 * 1024)) * 100));

  return (
    <aside className="w-64 bg-cosmic-900/90 border-r border-cosmic-border backdrop-blur-xl flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-cosmic-border flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-cosmic-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">PRIVACLOUD</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-tight">Your Cloud. Your Privacy.</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all
                  ${isActive 
                    ? 'bg-gradient-to-r from-indigo-500/20 to-indigo-500/5 text-indigo-300 border border-indigo-500/30 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-cosmic-800/50'}
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Storage Quota & User Profile */}
      <div className="p-4 border-t border-cosmic-border space-y-4">
        
        {/* Storage Usage Widget (Reference 2) */}
        <div className="p-3.5 bg-cosmic-950/60 rounded-xl border border-cosmic-border text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400 flex items-center">
              <HardDrive className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Vault Quota
            </span>
            <span className="font-mono text-slate-300 font-semibold">{percentUsed}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentUsed > 85 ? 'bg-rose-500' : percentUsed > 60 ? 'bg-amber-400' : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
              }`}
              style={{ width: `${Math.max(4, percentUsed)}%` }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>{usedMb} MB used</span>
            <span>{totalMb} MB total</span>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2.5 truncate max-w-[170px]">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
              {user?.email ? user.email.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.email || 'Authenticated User'}</p>
              <p className="text-[10px] text-emerald-400 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                Active Session
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>

    </aside>
  );
}
