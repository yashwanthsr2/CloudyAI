import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // 1. Check active Supabase session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.access_token) {
          localStorage.setItem('privacloud_token', session.access_token);
        }
        setLoading(false);
      });

      // 2. Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.access_token) {
          localStorage.setItem('privacloud_token', session.access_token);
        } else {
          localStorage.removeItem('privacloud_token');
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Offline / Local Demo Mode
      const storedDemo = localStorage.getItem('privacloud_demo_user');
      if (storedDemo) {
        setUser({
          id: storedDemo,
          email: 'demo.developer@privacloud.ai',
          user_metadata: { name: 'Demo Privacy Officer' }
        });
      }
      setLoading(false);
    }
  }, []);

  const loginWithPassword = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } else {
      // Local demo login
      const demoId = '00000000-0000-0000-0000-000000000001';
      localStorage.setItem('privacloud_demo_user', demoId);
      setUser({
        id: demoId,
        email: email || 'demo.developer@privacloud.ai',
        user_metadata: { name: 'Demo Privacy Officer' }
      });
      return { user: { id: demoId, email } };
    }
  };

  const signupWithPassword = async (email, password) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    } else {
      const demoId = '00000000-0000-0000-0000-000000000001';
      localStorage.setItem('privacloud_demo_user', demoId);
      setUser({
        id: demoId,
        email,
        user_metadata: { name: 'Demo Privacy Officer' }
      });
      return { user: { id: demoId, email } };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('privacloud_token');
    localStorage.removeItem('privacloud_demo_user');
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
