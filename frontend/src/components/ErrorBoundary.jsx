import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080b12] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#0d121f] border border-rose-500/30 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Security Enclave Exception</h1>
              <p className="text-xs text-slate-400 mt-1">
                A client component encountered an unhandled state transition.
              </p>
            </div>

            <div className="p-3 bg-cosmic-950 rounded-xl border border-cosmic-border text-left font-mono text-[11px] text-rose-300 max-h-36 overflow-auto">
              {this.state.error?.message || 'Unknown render exception'}
            </div>

            <div className="pt-2 flex items-center justify-center space-x-3">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs inline-flex items-center space-x-2 transition-colors shadow-violet-glow"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
