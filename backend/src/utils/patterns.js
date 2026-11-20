import crypto from 'crypto';

/**
 * PII Detection Patterns & Risk Scoring Constants
 * PRIVACLOUD AI Specification
 */
export const PII_PATTERNS = {
  // Aadhaar: 12 digits, often formatted as 4-4-4 with space or hyphen
  aadhaar: /\b[2-9]\d{3}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
  
  // PAN: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F)
  pan: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
  
  // Phone: Indian mobile numbers (10 digits starting with 6-9, optionally with +91 or 0)
  phone: /\b(?:\+?91[\-\s]?|0)?[6-9]\d{9}\b/g,
  
  // Email: Standard email pattern
  email: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
};

export const RISK_WEIGHTS = {
  aadhaar: 40,
  pan: 30,
  phone: 10,
  email: 10,
};

export const RISK_THRESHOLDS = {
  HIGH_MIN: 50,
  MEDIUM_MIN: 20,
};

export const RISK_TTL_MINUTES = {
  High: 5,    // High risk files expire in 5 minutes
  Medium: 10, // Medium risk files expire in 10 minutes
  Low: 15,    // Low risk files expire in 15 minutes
};

/**
 * Calculates risk score and classifies into Low/Medium/High
 * Score is capped at 100.
 */
export function calculateRisk(counts) {
  const rawScore = 
    (counts.aadhaar || 0) * RISK_WEIGHTS.aadhaar +
    (counts.pan || 0) * RISK_WEIGHTS.pan +
    (counts.phone || 0) * RISK_WEIGHTS.phone +
    (counts.email || 0) * RISK_WEIGHTS.email;

  const riskScore = Math.min(100, Math.max(0, rawScore));

  let riskLevel = 'Low';
  if (riskScore >= RISK_THRESHOLDS.HIGH_MIN) {
    riskLevel = 'High';
  } else if (riskScore >= RISK_THRESHOLDS.MEDIUM_MIN) {
    riskLevel = 'Medium';
  }

  return { riskScore, riskLevel };
}

/**
 * Computes TTL in minutes and exact expiration Date based on risk level
 */
export function calculateExpiry(riskLevel) {
  const ttlMinutes = RISK_TTL_MINUTES[riskLevel] || 15;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  return { ttlMinutes, expiresAt };
}

/**
 * Generates a cryptographically secure 256-bit random token
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
