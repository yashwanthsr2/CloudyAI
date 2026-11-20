import crypto from 'crypto';

/**
 * PII Detection Patterns & Strict Risk Priority Classification
 * PRIVACLOUD AI Specification
 */
export const PII_PATTERNS = {
  // Aadhaar: 12 digits, grouped 4-4-4 or contiguous, or masked XXXX XXXX 1234
  aadhaar: /(?:\b\d{4}[\s\-\.\/]{1,3}\d{4}[\s\-\.\/]{1,3}\d{4}\b|\b\d{12}\b|\b[xX\*•]{4}[\s\-\.\/]?[xX\*•]{4}[\s\-\.\/]?\d{4}\b)/g,
  
  // PAN: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F)
  pan: /\b[A-Za-z]{5}[0-9]{4}[A-Za-z]\b/g,
  
  // Phone: Indian mobile numbers (10 digits starting with 6-9, with or without +91 or 0)
  phone: /(?:\+?91[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}\b|(?:\+?91[\s\-]?)?[6-9]\d{9}\b/g,
  
  // Email: Standard RFC email format
  email: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
};

export const RISK_TTL_MINUTES = {
  HIGH: 5,    // 5 minutes strictly enforced
  MEDIUM: 10, // 10 minutes
  LOW: 15,    // 15 minutes
  NONE: 15,   // Safe sharing default
};

/**
 * Exact Risk Priority Classification:
 * - Aadhaar or PAN -> HIGH (5 min TTL)
 * - Phone (without Aadhaar or PAN) -> MEDIUM (10 min TTL)
 * - Email only -> LOW (15 min TTL)
 * - None detected -> NONE
 */
export function calculateRisk(counts) {
  const hasAadhaar = (counts.aadhaar || 0) > 0;
  const hasPan = (counts.pan || 0) > 0;
  const hasPhone = (counts.phone || 0) > 0;
  const hasEmail = (counts.email || 0) > 0;

  if (hasAadhaar || hasPan) {
    const reasons = [];
    if (hasAadhaar) reasons.push(`${counts.aadhaar} Aadhaar number(s)`);
    if (hasPan) reasons.push(`${counts.pan} PAN card identifier(s)`);
    return {
      riskLevel: 'HIGH',
      riskReason: `Critical Government ID detected: ${reasons.join(', ')}. Maximum 5-minute link expiration enforced.`,
      ttlMinutes: 5
    };
  }

  if (hasPhone) {
    return {
      riskLevel: 'MEDIUM',
      riskReason: `Direct contact PII detected: ${counts.phone} mobile phone number(s). 10-minute link expiration enforced.`,
      ttlMinutes: 10
    };
  }

  if (hasEmail) {
    return {
      riskLevel: 'LOW',
      riskReason: `Low-impact contact info detected: ${counts.email} email address(es). 15-minute link expiration enforced.`,
      ttlMinutes: 15
    };
  }

  return {
    riskLevel: 'NONE',
    riskReason: 'No sensitive personal identity elements detected. Ready for controlled one-time sharing.',
    ttlMinutes: 15
  };
}

/**
 * Computes TTL in minutes and exact expiration Date based on risk level
 */
export function calculateExpiry(riskLevel) {
  const normalizedLevel = (riskLevel || 'LOW').toUpperCase();
  const ttlMinutes = RISK_TTL_MINUTES[normalizedLevel] || 15;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  return { ttlMinutes, expiresAt };
}

/**
 * Generates a cryptographically secure 256-bit random share token
 */
export function generateShareToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * SHA-256 hashes a token for secure database storage
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Generates a 6-digit cryptographically random OTP
 */
export function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * SHA-256 hashes an OTP with optional salt
 */
export function hashOTP(otp, salt = 'privacloud-otp-salt') {
  return crypto.createHash('sha256').update(`${otp}:${salt}`).digest('hex');
}
