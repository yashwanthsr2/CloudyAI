import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Shield, 
  Lock, 
  Clock, 
  Mail, 
  KeyRound, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  ArrowRight, 
  Loader2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import CosmicBackground from '../components/CosmicBackground';

export default function TransferPage() {
  const { token } = useParams();

  // Screen state: 'loading' | 'email_entry' | 'otp_entry' | 'verified_download' | 'expired_or_used'
  const [step, setStep] = useState('loading');
  const [shareInfo, setShareInfo] = useState(null);
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpRemainingSeconds, setOtpRemainingSeconds] = useState(300);
  const [devOtp, setDevOtp] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [linkRemainingSeconds, setLinkRemainingSeconds] = useState(0);

  const digitInputRefs = useRef([]);

  useEffect(() => {
    checkLinkStatus();
  }, [token]);

  // Overall link TTL countdown
  useEffect(() => {
    if (linkRemainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setLinkRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStep('expired_or_used');
          setError('HTTP 410 Gone: This secure share link has expired and is no longer accessible.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [linkRemainingSeconds]);

  // OTP 5-minute countdown
  useEffect(() => {
    if (step !== 'otp_entry' || otpRemainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setOtpRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpRemainingSeconds]);

  const checkLinkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTransferInfo(token);
      setShareInfo(res);

      if (res.is_expired || res.status === 'EXPIRED') {
        setStep('expired_or_used');
        setError('HTTP 410 Gone: This secure link has expired.');
        return;
      }

      if (res.status === 'USED') {
        setStep('expired_or_used');
        setError('HTTP 410 Gone: This one-time link has already been consumed and destroyed.');
        return;
      }

      if (res.status === 'REVOKED') {
        setStep('expired_or_used');
        setError('Access Denied: This link has been revoked by the sender.');
        return;
      }

      if (res.seconds_remaining) {
        setLinkRemainingSeconds(res.seconds_remaining);
      }

      setStep('email_entry');
    } catch (err) {
      setStep('expired_or_used');
      setError(err.message || 'Unable to access share token.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.requestOtp(token, email);

      if (res.otp_expires_at) {
        setOtpExpiresAt(res.otp_expires_at);
        setOtpRemainingSeconds(300);
      }
      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
      }

      setStep('otp_entry');
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err.message || 'Access denied. Please verify your email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < paste.length; i++) {
      newDigits[i] = paste[i];
    }
    setOtpDigits(newDigits);

    const nextIndex = Math.min(paste.length, 5);
    digitInputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of your one-time verification code.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.verifyOtp(token, email, otp);
      setStep('verified_download');
    } catch (err) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.downloadMaskedFile(token, email);
      setStep('expired_or_used');
      setError('HTTP 410 Gone: Download completed. This one-time link has now been permanently destroyed.');
    } catch (err) {
      setError(err.message || 'Download failed or share expired.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-cosmic-950 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-violet-600/30">
      
      {/* Cosmic Animated Starfield Background */}
      <CosmicBackground />

      {/* Main Recipient Card */}
      <div className="relative z-10 max-w-lg w-full cyber-panel-elevated rounded-3xl p-8 border border-cosmic-border shadow-2xl">
        
        {/* Top Security Banner */}
        <div className="flex items-center justify-between pb-5 border-b border-cosmic-border/60 mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-500 p-[1px] shadow-violet-glow">
              <div className="w-full h-full bg-cosmic-950 rounded-[11px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xs text-white tracking-wider">PRIVACLOUD AI</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 font-mono">Zero-Trust Ephemeral Portal</span>
            </div>
          </div>

          {linkRemainingSeconds > 0 && step !== 'expired_or_used' && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[11px] font-bold">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>TTL: {formatTimer(linkRemainingSeconds)}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl mb-6 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* State 1: Email Verification Form */}
        {step === 'email_entry' && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-bold text-white tracking-tight">Authorized Recipient Verification</h2>
              <p className="text-xs text-slate-400">
                A confidential document <code>{shareInfo?.filename}</code> has been shared with an authorized email recipient.
              </p>
              {shareInfo?.authorized_email_hint && (
                <p className="text-[11px] text-cyan-300 font-mono">
                  Authorized hint: {shareInfo.authorized_email_hint}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">ENTER YOUR EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recipient@company.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-cosmic-950 border border-cosmic-border rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-violet-glow flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Recipient Authorization...</span>
                </>
              ) : (
                <>
                  <span>Request 6-Digit OTP</span>
                  <ArrowRight className="w-4 h-4 text-cyan-300" />
                </>
              )}
            </button>
          </form>
        )}

        {/* State 2: OTP Verification Screen */}
        {step === 'otp_entry' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-cyan-300 mb-3">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">Enter Verification Code</h2>
              <p className="text-xs text-slate-400">
                We sent a 6-digit numeric OTP to <strong className="text-white">{email}</strong>
              </p>
            </div>

            {/* Dev Mock Banner if SMTP in simulation mode */}
            {devOtp && (
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-center">
                <p className="text-[10px] text-cyan-300 font-mono uppercase tracking-wider">Evaluation Code (Local Mode):</p>
                <p className="text-xl font-bold font-mono text-white tracking-widest mt-0.5">{devOtp}</p>
              </div>
            )}

            {/* 6 Individual Digit Inputs with Auto-Focus */}
            <div className="flex justify-center space-x-2.5 onPaste={handleOtpPaste}">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (digitInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  className="w-11 h-13 text-center text-lg font-bold font-mono bg-cosmic-950 border border-cosmic-border rounded-xl text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Code expires in: <strong className="text-cyan-300">{formatTimer(otpRemainingSeconds)}</strong></span>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={loading}
                className="text-violet-400 hover:text-violet-300 underline"
              >
                Resend Code
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-violet-glow flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating OTP Hash...</span>
                </>
              ) : (
                <>
                  <span>Verify Code & Unlock Download</span>
                  <ArrowRight className="w-4 h-4 text-cyan-300" />
                </>
              )}
            </button>
          </form>
        )}

        {/* State 3: Download Claim Ready */}
        {step === 'verified_download' && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-emerald-glow">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-white tracking-tight">Identity Verified Successfully</h2>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                You are authorized to claim one single-use download of the server-redacted document:
              </p>
              <p className="font-mono text-xs font-bold text-cyan-300">{shareInfo?.filename}</p>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 text-left space-y-1">
              <p className="font-semibold flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Single-Use Atomic Protection</span>
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Clicking download triggers an atomic PostgreSQL lock. The share transitions to <code>USED</code> status immediately and cannot be claimed again.
              </p>
            </div>

            <button
              onClick={handleDownload}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-emerald-glow flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Streaming Redacted Binary...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Redacted Document (Single Use)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State 4: Expired or Used */}
        {step === 'expired_or_used' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white">Transfer Link Closed</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                This secure one-time link has expired or has already been downloaded.
              </p>
            </div>

            <p className="text-[11px] font-mono text-slate-400">HTTP 410 GONE • Zero Plaintext Retained</p>
          </div>
        )}

      </div>

    </div>
  );
}
