import React from 'react';
import { AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';

export default function RiskBadge({ level = 'Low', score = 0, showScore = true }) {
  const normalizedLevel = level ? level.toLowerCase() : 'low';

  if (normalizedLevel === 'high') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-400" />
        High Risk {showScore && `(${score}/100)`}
      </span>
    );
  }

  if (normalizedLevel === 'medium') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
        <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-400" />
        Medium Risk {showScore && `(${score}/100)`}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
      <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
      Low Risk {showScore && `(${score}/100)`}
    </span>
  );
}
