import React from 'react';
import { AlertTriangle, AlertCircle, ShieldCheck, CheckCircle } from 'lucide-react';

export default function RiskBadge({ level = 'NONE', size = 'sm' }) {
  const norm = (level || 'NONE').toUpperCase();

  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]';

  if (norm === 'HIGH') {
    return (
      <span className={`inline-flex items-center rounded-full font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 ${sizeClasses}`}>
        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-400 animate-pulse" />
        HIGH RISK (5m TTL)
      </span>
    );
  }

  if (norm === 'MEDIUM') {
    return (
      <span className={`inline-flex items-center rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 ${sizeClasses}`}>
        <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />
        MEDIUM RISK (10m TTL)
      </span>
    );
  }

  if (norm === 'LOW') {
    return (
      <span className={`inline-flex items-center rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ${sizeClasses}`}>
        <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
        LOW RISK (15m TTL)
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses}`}>
      <CheckCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
      NO PII DETECTED
    </span>
  );
}
