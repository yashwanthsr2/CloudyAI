import crypto from 'crypto';

const AUTH_SECRET = process.env.JWT_SECRET || 'privacloud-secure-enclave-secret-token-key-2026';

/**
 * Hash password with PBKDF2 (SHA-512) and 100,000 iterations
 */
export function hashPassword(password, existingSalt = null) {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

/**
 * Verify password against stored hash using timing-safe comparison
 */
export function verifyPassword(password, salt, storedHash) {
  if (!password || !salt || !storedHash) return false;
  try {
    const { hash } = hashPassword(password, salt);
    const hashBuffer = Buffer.from(hash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    if (hashBuffer.length !== storedBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, storedBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Generate a cryptographically signed HMAC-SHA256 session token
 */
export function generateAuthToken(user) {
  const payload = Buffer.from(JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name || user.email.split('@')[0],
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days TTL
  })).toString('base64url');

  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verify HMAC-SHA256 token and return payload if valid and unexpired
 */
export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(payloadB64).digest('base64url');
    
    // Constant-time signature comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(jsonStr);

    if (payload.exp && payload.exp < Date.now()) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}
