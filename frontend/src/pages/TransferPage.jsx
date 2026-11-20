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
  RefreshCw
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
      setOtpRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpRemainingSeconds]);

  const checkLinkStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTransferInfo(token);
      setShareInfo(res.share);
      setLinkRemainingSeconds(res.share.remaining_seconds || 0);

      if (res.share.status === 'USED') {
        setStep('expired_or_used');
        setError('HTTP 410 Gone: This one-time document has already been accessed and consumed.');
      } else if (res.share.status === 'REVOKED') {
        setStep('expired_or_used');
        setError('HTTP 410 Gone: This share link was revoked by the sender.');
      } else {
        setStep('email_entry');
      }
    } catch (err) {
      setStep('expired_or_used');
      setError(err.message || 'This transfer link is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Submit recipient email & request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.requestOtp(token, email);
      setStep('otp_entry');
      setOtpExpiresAt(res.otp_expires_at);
      setOtpRemainingSeconds(300);
      if (res.dev_otp) setDevOtp(res.dev_otp);
    } catch (err) {
      setError(err.message || 'Access denied: You are not the authorized recipient.');
    } finally {
      setLoading(false);
    }
  };

  // Handle 6 individual OTP digit boxes with auto-focus (Reference 1)
  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input box
    if (value && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePasteOtp = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''));
      digitInputRefs.current[5]?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.verifyOtp(token, email, fullOtp);
      setStep('verified_download');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Atomic One-Time Download
  const handleDownload = async () => {
    try {
      setLoading(true);
      const blob = await api.downloadMaskedFile(token, email);
      
      // Trigger browser file download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `masked-${shareInfo?.filename || 'document.png'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      // Immediately transition to consumed state
      setStep('expired_or_used');
      setError('HTTP 410 Gone: Download completed. This one-time link is now closed.');
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
    <div className="min-h-screen bg-cosmic-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Cosmic Animated Starfield Background */}
      <CosmicBackground />

      {/* Main Recipient Card */}
      <div className="relative z-10 max-w-lg w-full glass-panel rounded-3xl p-8 border border-cosmic-border shadow-2xl">
        
        {/* Top Security Banner */}
        <div className="flex items-center justify-between pb-5 border-b border-cosmic-border mb-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs text-white tracking-tight">PRIVACLOUD AI</span>
              <span className="text-[10px] text-slate-400 block -mt-0.5">Secure One-Time Transfer</span>
            </div>
          </div>

          {linkRemainingSeconds > 0 && step !== 'expired_or_used' && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-[11px] font-semibold">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>{formatTimer(linkRemainingSeconds)}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl mb-6 flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* State 1: Email Verification Form */}
        {step === 'email_entry' && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-bold text-white tracking-tight">Authorized Identity Verification</h2>
              <p className="text-xs text-slate-400">
                A confidential document <code>{shareInfo?.filename}</code> has been shared with an authorized recipient.
              </p>
              {shareInfo?.authorized_email_hint && (
                <p className="text-[11px] text-indigo-400 font-mono">
                  Authorized hint: {shareInfo.authorized_email_hint}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Enter Your Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@organization.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-cosmic-950/80 border border-cosmic-border rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Recipient...</span>
                </>
              ) : (
                <>
                  <span>Request 6-Digit Passcode</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* State 2: Six-Digit OTP Input Interface (Reference 1) */}
        {step === 'otp_entry' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">Enter 6-Digit OTP</h2>
              <p className="text-xs text-slate-400">
                A verification code was dispatched to <strong>{email}</strong>.
              </p>
            </div>

            {/* Development OTP Banner for seamless demo testing */}
            {devOtp && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-center text-xs text-emerald-300">
                <span className="font-mono font-bold">Demo OTP: {devOtp}</span> (Displayed in standalone evaluation mode)
              </div>
            )}

            {/* 6 Individual Digit Boxes */}
            <div className="flex justify-center space-x-2.5 sm:space-x-3" onPaste={handlePasteOtp}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (digitInputRefs.current[idx] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 bg-cosmic-950 border border-cosmic-border rounded-xl text-center font-mono text-xl font-bold text-emerald-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-inner"
                />
              ))}
            </div>

            {/* OTP Expiry Countdown & Resend */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center font-mono">
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-400" />
                Code expires: {formatTimer(otpRemainingSeconds)}
              </span>

              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={otpRemainingSeconds > 240}
                className="text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:hover:text-indigo-400 font-medium"
              >
                Resend Code
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating Passcode...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Authorize Single-Use Download</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* State 3: Verified & Ready for Atomic One-Time Download */}
        {step === 'verified_download' && (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white tracking-tight">Identity Verified & Access Granted</h2>
              <p className="text-xs text-slate-400">
                Document: <strong>{shareInfo?.filename}</strong> &bull; Sensitivity: {shareInfo?.risk_level}
              </p>
            </div>

            <div className="p-4 bg-cosmic-950/80 rounded-2xl border border-cosmic-border text-xs text-slate-300 text-left space-y-2">
              <div className="font-semibold text-emerald-400 flex items-center">
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                DLP Privacy Redaction Applied:
              </div>
              <p className="text-[11px] text-slate-400">
                All personal identifiers (Aadhaar, PAN, phone numbers) are permanently obscured with solid pixel masks. The unredacted original remains secure in the vault.
              </p>
              <div className="text-[10px] text-rose-400 font-semibold pt-1 border-t border-cosmic-border">
                ⚠️ Strict Single-Use Policy: This document can only be downloaded once. After downloading, this link will be closed permanently.
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-xl shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Streaming Masked Copy...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Masked Copy (One-Time)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State 4: Expired or Already Used */}
        {step === 'expired_or_used' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-cosmic-950 text-slate-400 border border-cosmic-border">
                HTTP 410 GONE
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight mt-2">Access Closed</h2>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                This transfer link has either reached its time-to-live expiration or has already been consumed through a verified one-time download.
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-cosmic-border text-center text-[10px] text-slate-500">
          Powered by PRIVACLOUD AI &bull; Cryptographically Enforced Cloud Privacy
        </div>

      </div>
    </div>
  );
}
