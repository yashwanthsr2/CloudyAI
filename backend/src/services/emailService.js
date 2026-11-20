import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

function getTransporter() {
  const host = process.env.SMTP_HOST || '';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const service = process.env.SMTP_SERVICE || '';

  if (!user || !pass) return null;

  if (service.toLowerCase() === 'gmail' || host.toLowerCase().includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }

  return nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: port,
    secure: port === 465,
    auth: { user, pass }
  });
}

export function isSmtpConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Sends a Secure Share Invitation to the recipient
 */
export async function sendShareInvitationEmail({ toEmail, senderEmail, shareUrl, ttlMinutes, riskLevel, filename }) {
  const subject = `🔒 AI CLOUD DRIVE: Confidential document shared with you (${filename})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0; }
        .card { max-width: 560px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
        .logo { color: #06b6d4; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 24px; display: flex; align-items: center; }
        h2 { color: #ffffff; font-size: 22px; margin-top: 0; margin-bottom: 12px; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 16px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
        .badge-high { background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }
        .badge-med { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-low { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .btn { display: inline-block; background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; margin: 20px 0; text-align: center; }
        .warning-box { background: #0f172a; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #cbd5e1; margin-top: 24px; }
        .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 32px; border-top: 1px solid #1f2937; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🛡️ AI CLOUD DRIVE</div>
        <h2>One-Time Secure Document Share</h2>
        <p><strong>${senderEmail}</strong> has shared a privacy-protected document with you: <code>${filename}</code>.</p>
        
        <div>
          <span class="badge ${riskLevel === 'HIGH' ? 'badge-high' : riskLevel === 'MEDIUM' ? 'badge-med' : 'badge-low'}">
            Risk: ${riskLevel} &bull; Server Expiry: ${ttlMinutes} Minutes
          </span>
        </div>

        <p>This transfer enforces strict security protocols: you must verify your identity via a 6-digit email OTP. The document can only be downloaded <strong>once</strong>, after which the link becomes permanently invalid.</p>

        <a href="${shareUrl}" class="btn">Access Secure Transfer &rarr;</a>

        <div class="warning-box">
          ⚠️ <strong>Security Notice:</strong> Do not forward this email. Forwarded links cannot be unlocked by other email addresses. Link automatically revokes after ${ttlMinutes} minutes.
        </div>

        <div class="footer">
          AI CLOUD DRIVE &bull; Privacy-Aware Cloud Storage &bull; Cryptographically Enforced TTL
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();
  if (transporter) {
    try {
      const from = process.env.SMTP_FROM || `"AI CLOUD DRIVE Security" <${process.env.SMTP_USER}>`;
      await transporter.sendMail({ from, to: toEmail, subject, html });
      console.log(`[Email] Invitation sent to ${toEmail}`);
      return { sent: true, mock: false };
    } catch (err) {
      console.error('[Email Error] Failed to send email:', err.message);
      return { sent: false, mock: true, shareUrl, error: err.message };
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`[MOCK SMTP DISPATCH] Share Invitation Email`);
    console.log(`To: ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link: ${shareUrl}`);
    console.log(`Expiry: ${ttlMinutes} minutes`);
    console.log(`======================================================\n`);
    return { sent: true, mock: true, shareUrl };
  }
}

/**
 * Sends a 6-digit OTP to the recipient
 */
export async function sendOtpEmail({ toEmail, otp, filename }) {
  const subject = `🔐 Your Verification OTP: ${otp} (AI CLOUD DRIVE)`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 24px; margin: 0; }
        .card { max-width: 480px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center; }
        .logo { color: #06b6d4; font-size: 20px; font-weight: 800; margin-bottom: 20px; }
        h2 { color: #ffffff; font-size: 20px; margin: 0 0 10px 0; }
        p { color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 24px; }
        .otp-box { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #06b6d4; background: #0f172a; padding: 18px 24px; border-radius: 12px; border: 2px dashed #06b6d4; margin: 20px 0; display: inline-block; }
        .countdown { color: #f43f5e; font-size: 12px; font-weight: 600; margin-top: 8px; }
        .footer { font-size: 11px; color: #64748b; margin-top: 28px; border-top: 1px solid #1f2937; padding-top: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">🛡️ AI CLOUD DRIVE</div>
        <h2>One-Time Passcode (OTP)</h2>
        <p>Use the following 6-digit code to authorize your single-use download of <strong>${filename}</strong>:</p>

        <div class="otp-box">${otp}</div>
        <div class="countdown">⏳ Valid for 5 minutes only &bull; Single-use verification</div>

        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
          If you did not request access to this document, ignore this email.
        </p>

        <div class="footer">
          AI CLOUD DRIVE Security Shield &bull; Zero-Plaintext Cloud Transfer
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = getTransporter();
  if (transporter) {
    try {
      const from = process.env.SMTP_FROM || `"AI CLOUD DRIVE Security" <${process.env.SMTP_USER}>`;
      await transporter.sendMail({ from, to: toEmail, subject, html });
      console.log(`[Email] REAL OTP sent to ${toEmail}`);
      return { sent: true, mock: false };
    } catch (err) {
      console.error('[Email Error] Failed to send real OTP email:', err.message);
      // Fallback to mock for review safety if real send fails
      return { sent: false, mock: true, otp, error: err.message };
    }
  } else {
    console.log(`\n======================================================`);
    console.log(`[MOCK SMTP DISPATCH] 6-Digit OTP`);
    console.log(`To: ${toEmail}`);
    console.log(`OTP: >>> ${otp} <<<`);
    console.log(`Valid: 5 Minutes (Max 3 attempts)`);
    console.log(`======================================================\n`);
    return { sent: true, mock: true, otp };
  }
}
