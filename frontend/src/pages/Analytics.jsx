import React, { useState, useEffect } from 'react';
import { BarChart3, ShieldCheck, Eye, Download, Clock, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { api } from '../services/api';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(res => setData(res.analytics))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-slate-500">
        Loading privacy analytics...
      </div>
    );
  }

  // Risk Distribution Data for Pie Chart
  const riskData = [
    { name: 'Low Risk', value: data?.risk_distribution?.Low || 0, color: '#10b981' },
    { name: 'Medium Risk', value: data?.risk_distribution?.Medium || 0, color: '#f59e0b' },
    { name: 'High Risk', value: data?.risk_distribution?.High || 0, color: '#f43f5e' },
  ].filter(d => d.value > 0);

  // If no files yet, show empty placeholder slice
  const displayRiskData = riskData.length > 0 ? riskData : [
    { name: 'No Scans Yet', value: 1, color: '#334155' }
  ];

  // PII Frequency Data for Bar Chart
  const piiData = [
    { category: 'Aadhaar (40pts)', count: data?.pii_counts?.aadhaar || 0, fill: '#f43f5e' },
    { category: 'PAN (30pts)', count: data?.pii_counts?.pan || 0, fill: '#f59e0b' },
    { category: 'Phone (10pts)', count: data?.pii_counts?.phone || 0, fill: '#3b82f6' },
    { category: 'Email (10pts)', count: data?.pii_counts?.email || 0, fill: '#a855f7' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          <span>Privacy & Share Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Aggregated scan metadata and access telemetry. Zero raw sensitive data is stored or logged.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Total Scanned Files</span>
          <div className="text-2xl font-bold text-white mt-1">{data?.total_scans || 0}</div>
          <span className="text-[11px] text-slate-500">Across {data?.total_files || 0} stored documents</span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Average Risk Score</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {data?.average_risk_score || 0} <span className="text-sm text-slate-400">/ 100</span>
          </div>
          <span className="text-[11px] text-slate-500">Weighted sensitivity metric</span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Total Masked Views</span>
          <div className="text-2xl font-bold text-teal-400 mt-1">
            {data?.shares?.total_views || 0}
          </div>
          <span className="text-[11px] text-slate-500">Verified transfer page accesses</span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-slate-400 text-xs font-medium block">Masked Downloads</span>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {data?.shares?.total_downloads || 0}
          </div>
          <span className="text-[11px] text-slate-500">Protected image copies fetched</span>
        </div>

      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Risk Level Distribution (Pie) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-1">Document Sensitivity Distribution</h2>
          <p className="text-xs text-slate-400 mb-4">Categorization by computed risk score (High/Med/Low)</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayRiskData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={4}
                >
                  {displayRiskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detected PII Distribution (Bar) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-bold text-white mb-1">Detected Sensitive Elements Breakdown</h2>
          <p className="text-xs text-slate-400 mb-4">Total count of detected PII occurrences across all documents</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={piiData}>
                <XAxis dataKey="category" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Sharing Lifecycles & Security Compliance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Link Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-3">Share Link Lifecycle</h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Total Links Generated:</span>
              <span className="font-bold text-white">{data?.shares?.total_links || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Active Links:</span>
              <span className="font-bold text-emerald-400">{data?.shares?.active_links || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400">Expired Links (HTTP 410):</span>
              <span className="font-bold text-amber-400">{data?.shares?.expired_links || 0}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Expired Access Attempts:</span>
              <span className="font-bold text-rose-400">{data?.shares?.expired_attempts || 0}</span>
            </div>
          </div>
        </div>

        {/* Privacy Architecture Guarantee Card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center space-x-2 text-emerald-400 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">Privacy-Safe Storage Architecture</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            AI CLOUD DRIVE enforces mathematical zero-knowledge privacy guarantees. Raw Aadhaar numbers, PAN identifiers, email addresses, and phone numbers are parsed entirely in transient memory during the OCR execution phase.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="font-semibold text-emerald-400 mb-1">No Plaintext Storage</div>
              <p className="text-slate-400 text-[11px]">
                Only aggregate counts (e.g. "count_aadhaar: 1") and risk scores are persisted to PostgreSQL.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="font-semibold text-emerald-400 mb-1">Server-Enforced Expiration</div>
              <p className="text-slate-400 text-[11px]">
                Tokens are validated on the backend against server clocks. Expired tokens yield HTTP 410 with zero data.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
