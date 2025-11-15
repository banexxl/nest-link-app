import { supabase } from '@/lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

type AuthContextValue = {
     session: Session | null;
     loading: boolean;
     signIn: (email: string, password: string) => Promise<{ error: any } | void>;
     signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
     const [session, setSession] = useState<Session | null>(null);
     const [loading, setLoading] = useState(true);

     // Check session validity
     const checkSession = async () => {
          try {
               const { data, error } = await supabase.auth.getSession();
               if (error || !data.session) {
                    setSession(null);
                    setLoading(false);
                    return;
               }

               // Set session immediately, don't wait for user verification
               setSession(data.session);
               setLoading(false);

               // Verify token in background (optional)
               const { error: userError } = await supabase.auth.getUser();
               if (userError) {
                    setSession(null);
                    await supabase.auth.signOut();
               }
          } catch (err) {
               console.error('Session check error:', err);
               setSession(null);
               setLoading(false);
          }
     };

     useEffect(() => {
          let mounted = true;

          // Timeout to prevent infinite loading
          const loadingTimeout = setTimeout(() => {
               if (mounted && loading) {
                    console.warn('Auth check timed out, setting loading to false');
                    setLoading(false);
                    setSession(null);
               }
          }, 5000); // 5 second timeout

          // Initial session check
          checkSession().finally(() => {
               clearTimeout(loadingTimeout);
          });

          // Listen for auth changes
          const { data: listener } = supabase.auth.onAuthStateChange(
               (_event: AuthChangeEvent, currentSession) => {
                    if (mounted) {
                         setSession(currentSession);
                    }
               }
          );

          // Re-check session when app comes to foreground
          const appStateSubscription = AppState.addEventListener(
               'change',
               (state: AppStateStatus) => {
                    if (state === 'active' && mounted) {
                         checkSession();
                    }
               }
          );

          return () => {
               mounted = false;
               clearTimeout(loadingTimeout);
               listener.subscription.unsubscribe();
               appStateSubscription.remove();
          };
     }, []);

     const signIn = async (email: string, password: string) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { error };
     };

     const signOut = async () => {
          setSession(null);
          await supabase.auth.signOut();
     };

     return (
          <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
               {children}
          </AuthContext.Provider>
     );
}

export function useAuth() {
     const ctx = useContext(AuthContext);
     if (!ctx) throw new Error('useAuth must be used within AuthProvider');
     return ctx;
}
