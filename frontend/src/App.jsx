import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyFiles from './pages/MyFiles';
import UploadScan from './pages/UploadScan';
import PrivacyAnalysis from './pages/PrivacyAnalysis';
import SecureSharing from './pages/SecureSharing';
import SecurityActivity from './pages/SecurityActivity';
import Analytics from './pages/Analytics';
import TransferPage from './pages/TransferPage';
import { api } from './services/api';

function AppLayout({ children, files, quota, onRefresh, searchQuery, onSearch }) {
  return (
    <div className="min-h-screen flex bg-cosmic-950 text-slate-100 antialiased selection:bg-violet-600/30 selection:text-violet-200">
      {/* Reference 2 Left Navigation Sidebar */}
      <Sidebar quota={quota} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header searchQuery={searchQuery} onSearch={onSearch} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [files, setFiles] = useState([]);
  const [quota, setQuota] = useState(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshFiles = async () => {
    try {
      setLoadingFiles(true);
      const res = await api.listFiles();
      setFiles(res.files || []);
      setQuota(res.quota || null);
    } catch (err) {
      console.error('Failed to load files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshFiles();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-wide">Initializing PrivaCloud Security Enclave...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout
      files={files}
      quota={quota}
      onRefresh={refreshFiles}
      searchQuery={searchQuery}
      onSearch={setSearchQuery}
    >
      <Routes>
        {/* Reference 2: Main Cloud Dashboard */}
        <Route path="/" element={<Dashboard files={files} quota={quota} onRefresh={refreshFiles} />} />

        {/* Reference 2: My Files Drive View */}
        <Route path="/files" element={<MyFiles files={files} onRefresh={refreshFiles} />} />

        {/* Reference 3: Drag-and-Drop Upload & Real-Time Scan */}
        <Route path="/upload" element={<UploadScan onUploadComplete={refreshFiles} quota={quota} />} />

        {/* Reference 4: DLP Privacy Analysis & Visual Redaction Comparison */}
        <Route path="/privacy-analysis" element={<PrivacyAnalysis files={files} />} />

        {/* Reference 5: Secure Sharing Management */}
        <Route path="/shares" element={<SecureSharing files={files} />} />

        {/* Reference 6: Security Activity Audit Log Stream */}
        <Route path="/activity" element={<SecurityActivity />} />

        {/* Supplementary Analytics View */}
        <Route path="/analytics" element={<Analytics files={files} quota={quota} />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Reference 1: Cosmic Animated Login / Signup */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />

          {/* Reference 1 & 5: Public Recipient Transfer Portal (Zero Auth Required, 6-digit OTP verification) */}
          <Route path="/transfer/:token" element={<TransferPage />} />

          {/* Authenticated Vault Routes */}
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
