import crypto from 'crypto';
import { isConfigured, supabase, localStore } from '../config/supabase.js';
import { hashPassword, verifyPassword, generateAuthToken } from '../utils/authUtils.js';

/**
 * Handle User Registration
 */
export async function signup(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Production Supabase Auth
    if (isConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { name: name || cleanEmail.split('@')[0] }
        }
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }

      return res.status(201).json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email.split('@')[0]
        },
        token: data.session?.access_token || generateAuthToken(data.user)
      });
    }

    // 2. Standalone / Local Enclave Mode with Real Local Persistence
    const existingUser = await localStore.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.'
      });
    }

    const { salt, hash } = hashPassword(password);
    const userId = crypto.randomUUID();
    const newUser = {
      id: userId,
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      password_hash: hash,
      salt: salt,
      created_at: new Date().toISOString()
    };

    await localStore.insertUser(newUser);

    const token = generateAuthToken(newUser);

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      },
      token
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create vault account. Please try again.'
    });
  }
}

/**
 * Handle User Login & Credential Verification
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email address and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Production Supabase Auth
    if (isConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) {
        return res.status(401).json({
          success: false,
          error: error.message || 'Invalid email or password.'
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email.split('@')[0]
        },
        token: data.session?.access_token || generateAuthToken(data.user)
      });
    }

    // 2. Standalone / Local Enclave Mode with Real Local Verification
    const user = await localStore.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isValid = verifyPassword(password, user.salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = generateAuthToken(user);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0]
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed. Please verify your credentials.'
    });
  }
}

/**
 * Return Authenticated User Info
 */
export async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  return res.json({
    success: true,
    user: req.user
  });
}
