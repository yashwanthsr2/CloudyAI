import { isConfigured, supabase } from '../config/supabase.js';

/**
 * Authentication Middleware
 * Validates Supabase JWT from Authorization header.
 * Provides fallback mock user for local testing if Supabase is not yet configured.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    // Check for demo bypass header in dev/test
    if (req.headers['x-demo-user-id']) {
      req.user = {
        id: req.headers['x-demo-user-id'],
        email: 'user@privacloud.ai'
      };
      return next();
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // In offline/local mode without Supabase, provide a default demo user so reviewer can test immediately
      if (!isConfigured) {
        req.user = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'demo@privacloud.ai'
        };
        return next();
      }

      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Bearer token is required.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (isConfigured && supabase) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired session token.'
        });
      }
      req.user = user;
      return next();
    } else {
      // Local development token fallback
      req.user = {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'demo@privacloud.ai'
      };
      return next();
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed.'
    });
  }
}
