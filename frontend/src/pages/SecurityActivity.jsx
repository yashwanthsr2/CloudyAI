import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Upload, 
  Scan, 
  FileCheck, 
  Share2, 
  KeyRound, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Clock, 
  AlertTriangle,
  Ban,
  RefreshCw,
  Lock,
  Layers
} from 'lucide-react';
import { api } from '../services/api';

export default function SecurityActivity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadEvents();
  }, [typeFilter, statusFilter]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('event_type', typeFilter);
      if (statusFilter !== 'ALL') params.append('event_status', statusFilter);

      const res = await api.getAnalyticsSummary(params.toString());
      setEvents(res.summary?.security_events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'FILE_UPLOAD': return <Upload className="w-4 h-4 text-violet-400" />;
      case 'SCAN_COMPLETED': return <Scan className="w-4 h-4 text-cyan-400" />;
      case 'MASK_CREATED': return <FileCheck className="w-4 h-4 text-emerald-400" />;
      case 'SHARE_CREATED': return <Share2 className="w-4 h-4 text-violet-400" />;
      case 'SHARE_REVOKED': return <Ban className="w-4 h-4 text-rose-400" />;
      case 'OTP_REQUESTED': return <KeyRound className="w-4 h-4 text-amber-400" />;
      case 'OTP_VERIFIED': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'OTP_REJECTED': return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'DOWNLOAD_COMPLETED': return <Download className="w-4 h-4 text-cyan-400" />;
      case 'ACCESS_DENIED': return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'LINK_EXPIRED': return <Clock className="w-4 h-4 text-slate-400" />;
      default: return <ShieldAlert className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredEvents = events.filter((e) => {
    if (search) {
      const s = search.toLowerCase();
      const matchType = (e.event_type || '').toLowerCase().includes(s);
      const matchStatus = (e.event_status || '').toLowerCase().includes(s);
      const matchMeta = JSON.stringify(e.safe_metadata || {}).toLowerCase().includes(s);
      if (!matchType && !matchStatus && !matchMeta) return false;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-cosmic-border/60">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-500/20 text-cyan-300 border border-violet-500/30">
              AUDIT LOG
            </span>
            <span className="text-slate-400 text-xs">• Immutable Record Stream</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5 mt-1">
            <ShieldAlert className="w-6 h-6 text-violet-400" />
            <span>Security Activity & Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Chronological audit log tracking ingestions, OCR scans, pixel redactions, OTP challenges, and atomic download claims.
          </p>
        </div>

        <button
          onClick={loadEvents}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-cosmic-900 border border-cosmic-border text-xs text-slate-300 hover:text-white transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Audit Stream</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search event type, status, metadata..."
            className="w-full pl-9 pr-4 py-2 bg-cosmic-900 border border-cosmic-border rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500/60 font-medium"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-cosmic-900 border border-cosmic-border p-1 rounded-xl text-xs font-mono self-end sm:self-auto overflow-x-auto max-w-full">
          {[
            { id: 'ALL', label: 'All Events' },
            { id: 'FILE_UPLOAD', label: 'Uploads' },
            { id: 'SCAN_COMPLETED', label: 'Scans' },
            { id: 'SHARE_CREATED', label: 'Shares' },
            { id: 'OTP_VERIFIED', label: 'Auth' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                typeFilter === tab.id
                  ? 'bg-violet-600 text-white shadow-violet-glow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="cyber-panel rounded-2xl p-6">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-mono space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto text-slate-600" />
            <p>No audit events match your current filter parameters.</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-cosmic-border">
            {filteredEvents.map((evt) => {
              const Icon = getEventIcon(evt.event_type);
              const meta = evt.safe_metadata || {};

              return (
                <div key={evt.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-cosmic-950 border-2 border-violet-500/60 flex items-center justify-center group-hover:border-cyan-400 transition-colors">
                    <span className="w-1 h-1 rounded-full bg-cyan-400" />
                  </div>

                  {/* Event Card */}
                  <div className="cyber-panel cyber-card-interactive rounded-xl p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                      <div className="flex items-center space-x-2">
                        {Icon}
                        <span className="font-bold font-mono text-white tracking-tight">
                          {evt.event_type}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          evt.event_status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          evt.event_status === 'DENIED' || evt.event_status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {evt.event_status}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.created_at).toLocaleString()}
                      </span>
                    </div>

                    {/* Metadata Chips */}
                    {Object.keys(meta).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1 font-mono text-[10px]">
                        {Object.entries(meta).map(([key, val]) => (
                          <span
                            key={key}
                            className="px-2 py-0.5 rounded bg-cosmic-950/80 border border-cosmic-border text-slate-300"
                          >
                            <span className="text-slate-400">{key}:</span> {String(val)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
