import { isConfigured, supabase } from '../config/supabase.js';
import { verifyAuthToken } from '../utils/authUtils.js';

/**
 * Authentication Middleware
 * Validates cryptographically signed local enclave tokens or Supabase JWTs.
 * Supports Bearer header, x-demo-user-id, and ?token= query parameter (for media/image tags).
 */
export async function requireAuth(req, res, next) {
  try {
    // 1. Check for explicit demo / dev user header or query param
    const demoUserId = req.headers['x-demo-user-id'] || req.query.demoUserId;
    if (demoUserId) {
      req.user = {
        id: demoUserId,
        email: req.headers['x-demo-user-email'] || req.query.demoUserEmail || 'demo@privacloud.ai'
      };
      return next();
    }

    // 2. Extract token from Authorization header OR ?token= query parameter
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Authentication token is required.'
      });
    }

    // 3. Validate Local Enclave Auth Token (PBKDF2/HMAC-SHA256)
    const localPayload = verifyAuthToken(token);
    if (localPayload) {
      req.user = {
        id: localPayload.id,
        email: localPayload.email,
        name: localPayload.name
      };
      return next();
    }

    // 4. Validate Supabase Session Token if Supabase is active
    if (isConfigured && supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = user;
        return next();
      }
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session token. Please log in again.'
    });
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
}
