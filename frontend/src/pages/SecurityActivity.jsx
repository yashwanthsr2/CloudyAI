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
  RefreshCw
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
      case 'FILE_UPLOAD': return <Upload className="w-4 h-4 text-indigo-400" />;
      case 'SCAN_COMPLETED': return <Scan className="w-4 h-4 text-blue-400" />;
      case 'MASK_CREATED': return <FileCheck className="w-4 h-4 text-emerald-400" />;
      case 'SHARE_CREATED': return <Share2 className="w-4 h-4 text-purple-400" />;
      case 'SHARE_REVOKED': return <Ban className="w-4 h-4 text-rose-400" />;
      case 'OTP_REQUESTED': return <KeyRound className="w-4 h-4 text-amber-400" />;
      case 'OTP_VERIFIED': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'OTP_REJECTED': return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'DOWNLOAD_COMPLETED': return <Download className="w-4 h-4 text-teal-400" />;
      case 'ACCESS_DENIED': return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'LINK_EXPIRED': return <Clock className="w-4 h-4 text-slate-400" />;
      default: return <ShieldAlert className="w-4 h-4 text-slate-400" />;
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const type = (ev.event_type || '').toLowerCase();
    const meta = JSON.stringify(ev.safe_metadata || {}).toLowerCase();
    return type.includes(s) || meta.includes(s);
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            <span>Security Activity & Audit Log</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable security telemetry recording every upload, scan, OTP verification, access attempt, and one-time download event.
          </p>
        </div>

        <button
          onClick={loadEvents}
          className="p-2.5 bg-cosmic-900 border border-cosmic-border rounded-xl text-slate-300 hover:text-white transition-colors self-start sm:self-auto"
          title="Refresh Events"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar (Reference 6) */}
      <div className="glass-panel rounded-2xl p-4 border border-cosmic-border flex flex-col sm:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search security log by event or metadata..."
            className="w-full pl-9 pr-4 py-2 bg-cosmic-950/80 border border-cosmic-border rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 shrink-0" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-cosmic-950/80 border border-cosmic-border rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-auto font-mono"
          >
            <option value="ALL">All Event Types</option>
            <option value="FILE_UPLOAD">File Uploads</option>
            <option value="SCAN_COMPLETED">DLP Scans</option>
            <option value="MASK_CREATED">Mask Redactions</option>
            <option value="SHARE_CREATED">Shares Created</option>
            <option value="OTP_REQUESTED">OTP Requests</option>
            <option value="OTP_VERIFIED">OTP Verifications</option>
            <option value="DOWNLOAD_COMPLETED">Downloads</option>
            <option value="ACCESS_DENIED">Access Denied</option>
            <option value="LINK_EXPIRED">Link Expirations</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-cosmic-950/80 border border-cosmic-border rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-auto font-mono"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
            <option value="WARNING">WARNING</option>
            <option value="INFO">INFO</option>
          </select>
        </div>
      </div>

      {/* Events Timeline List */}
      <div className="glass-panel rounded-3xl p-6 border border-cosmic-border shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white tracking-tight">Activity Stream ({filteredEvents.length} Events)</h2>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">Loading audit trail...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            No events found matching your search and filter criteria.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-4 bg-cosmic-950/60 rounded-2xl border border-cosmic-border hover:border-indigo-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-cosmic-900 border border-cosmic-border shrink-0 mt-0.5">
                    {getEventIcon(ev.event_type)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-200 tracking-tight font-mono">{ev.event_type}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        ev.event_status === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-400' :
                        ev.event_status === 'FAILURE' ? 'bg-rose-500/15 text-rose-400' :
                        ev.event_status === 'WARNING' ? 'bg-amber-500/15 text-amber-400' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {ev.event_status}
                      </span>
                    </div>

                    {/* Metadata summary (NO plaintext secrets) */}
                    <p className="text-slate-400 text-[11px] mt-1 font-mono">
                      {ev.safe_metadata && Object.keys(ev.safe_metadata).length > 0
                        ? Object.entries(ev.safe_metadata).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' • ')
                        : 'Standard verified operation'}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono shrink-0 pl-11 sm:pl-0">
                  {new Date(ev.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
