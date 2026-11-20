import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clear any stale persistent demo user from localStorage so fresh visits always land on login screen first
    try {
      localStorage.removeItem('privacloud_demo_user');
    } catch (_) {}

    const initAuth = async () => {
      const hasActiveSession = sessionStorage.getItem('privacloud_session_active');
      const token = sessionStorage.getItem('privacloud_token');

      if (hasActiveSession && token) {
        try {
          const res = await api.getMe();
          if (res?.success && res.user) {
            setUser(res.user);
          } else {
            sessionStorage.removeItem('privacloud_token');
            sessionStorage.removeItem('privacloud_demo_user');
            sessionStorage.removeItem('privacloud_session_active');
            setUser(null);
          }
        } catch (e) {
          sessionStorage.removeItem('privacloud_token');
          sessionStorage.removeItem('privacloud_demo_user');
          sessionStorage.removeItem('privacloud_session_active');
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginWithPassword = async (email, password) => {
    const res = await api.login(email, password);
    if (!res || !res.success) {
      throw new Error(res?.error || 'Authentication failed. Please verify your credentials.');
    }

    const { user: authedUser, token } = res;
    sessionStorage.setItem('privacloud_token', token);
    sessionStorage.setItem('privacloud_demo_user', authedUser.id);
    sessionStorage.setItem('privacloud_user_email', authedUser.email);
    sessionStorage.setItem('privacloud_session_active', 'true');
    setUser(authedUser);
    return res;
  };

  const signupWithPassword = async (email, password) => {
    const res = await api.signup(email, password);
    if (!res || !res.success) {
      throw new Error(res?.error || 'Failed to create vault account.');
    }

    const { user: newUser, token } = res;
    sessionStorage.setItem('privacloud_token', token);
    sessionStorage.setItem('privacloud_demo_user', newUser.id);
    sessionStorage.setItem('privacloud_user_email', newUser.email);
    sessionStorage.setItem('privacloud_session_active', 'true');
    setUser(newUser);
    return res;
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (_) {}
    }
    localStorage.removeItem('privacloud_token');
    localStorage.removeItem('privacloud_demo_user');
    sessionStorage.removeItem('privacloud_token');
    sessionStorage.removeItem('privacloud_demo_user');
    sessionStorage.removeItem('privacloud_user_email');
    sessionStorage.removeItem('privacloud_session_active');
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isSupabaseConfigured,
      loginWithPassword,
      signupWithPassword,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
