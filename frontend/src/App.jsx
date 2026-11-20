import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useOutletContext } from 'react-router-dom';
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

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [files, setFiles] = useState([]);
  const [quota, setQuota] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshFiles = async () => {
    try {
      const res = await api.getFiles();
      setFiles(res.files || []);
      setQuota(res.quota || null);
    } catch (err) {
      console.error('Failed to load files:', err);
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
    <div className="min-h-screen flex bg-cosmic-950 text-slate-100 antialiased selection:bg-violet-600/30 selection:text-violet-200">
      {/* Reference 2 Left Navigation Sidebar */}
      <Sidebar quota={quota} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header searchQuery={searchQuery} onSearch={setSearchQuery} />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ files, quota, refreshFiles, searchQuery }} />
        </main>
      </div>
    </div>
  );
}

// Route Outlet Wrappers
function DashboardView() {
  const { files, quota, refreshFiles } = useOutletContext();
  return <Dashboard files={files} quota={quota} onRefresh={refreshFiles} />;
}

function MyFilesView() {
  const { files, refreshFiles } = useOutletContext();
  return <MyFiles files={files} onRefresh={refreshFiles} />;
}

function UploadScanView() {
  const { refreshFiles, quota, files } = useOutletContext();
  return <UploadScan onUploadComplete={refreshFiles} quota={quota} files={files} />;
}

function PrivacyAnalysisView() {
  const { files } = useOutletContext();
  return <PrivacyAnalysis files={files} />;
}

function SecureSharingView() {
  const { files } = useOutletContext();
  return <SecureSharing files={files} />;
}

function AnalyticsView() {
  const { files, quota } = useOutletContext();
  return <Analytics files={files} quota={quota} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Reference 1: Cosmic Animated Login / Signup */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Login />} />

          {/* Reference 1 & 5: Public Recipient Transfer Portal */}
          <Route path="/transfer/:token" element={<TransferPage />} />

          {/* Authenticated Vault Routes using Single Canonical Tree */}
          <Route element={<ProtectedLayout />}>
            <Route index element={<DashboardView />} />
            <Route path="files" element={<MyFilesView />} />
            <Route path="upload" element={<UploadScanView />} />
            <Route path="privacy-analysis" element={<PrivacyAnalysisView />} />
            <Route path="shares" element={<SecureSharingView />} />
            <Route path="activity" element={<SecurityActivity />} />
            <Route path="analytics" element={<AnalyticsView />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
