import { supabase } from '@/lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus, Linking } from 'react-native';

type SignInResult =
     | { success: true }
     | { success: false; message: string };

type AuthContextValue = {
     session: Session | null;
     tenantId: string | null;
     loading: boolean;
     signIn: (email: string, password: string) => Promise<SignInResult>;
     signInWithGoogle: () => Promise<SignInResult>;
     signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
     const [session, setSession] = useState<Session | null>(null);
     const [loading, setLoading] = useState(true);
     const [tenantId, setTenantId] = useState<string | null>(null);

     type TenantCheckResult =
          | { success: true; tenantId: string }
          | { success: false; message: string };

     const ensureTenantExists = async (userId: string): Promise<TenantCheckResult> => {
          try {
               const { data, error } = await supabase
                    .from('tblTenants')
                    .select('id')
                    .eq('user_id', userId)
                    .maybeSingle();

               if (error) {
                    console.error('Tenant check failed:', error);
                    return {
                         success: false,
                         message: 'Unable to verify tenant access. Please try again.',
                    };
               }

               if (!data) {
                    return {
                         success: false,
                         message: 'Your account is not registered as a tenant.',
                    };
               }

               return { success: true, tenantId: data.id as string };
          } catch (err) {
               console.error('Tenant check unexpected error:', err);
               return {
                    success: false,
                    message: 'Unexpected error while verifying tenant.',
               };
          }
     };

     // Check session validity
     const checkSession = async () => {
          try {
               const { data, error } = await supabase.auth.getSession();
               if (error || !data.session) {
                    setSession(null);
                    setLoading(false);
                    return;
               }

               // Set session immediately
               setSession(data.session);
               setLoading(false);

               // Load tenant id for this user in background
               try {
                    const { data: tenantData, error: tenantError } = await supabase
                         .from('tblTenants')
                         .select('id')
                         .eq('user_id', data.session.user.id)
                         .maybeSingle();

                    if (tenantError || !tenantData) {
                         setTenantId(null);
                    } else {
                         setTenantId(tenantData.id as string);
                    }
               } catch (tenantErr) {
                    console.error('Error loading tenant for session:', tenantErr);
                    setTenantId(null);
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

     const signIn = async (
          email: string,
          password: string,
     ): Promise<SignInResult> => {
          const { data, error } = await supabase.auth.signInWithPassword({
               email,
               password,
          });

          if (error || !data.session || !data.session.user) {
               return {
                    success: false,
                    message: error?.message ?? 'Invalid email or password.',
               };
          }

          const tenantResult = await ensureTenantExists(data.session.user.id);
          if (!tenantResult.success) {
               await supabase.auth.signOut();
               setTenantId(null);
               return tenantResult;
          }

          setTenantId(tenantResult.tenantId);
          return { success: true };
     };

     const signInWithGoogle = async (): Promise<SignInResult> => {
          try {
               const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                         // Use the mobile app deep link so the session
                         // comes back to this client instead of the web app
                         redirectTo: 'nestlinkapp://auth/callback',
                    },
               });

               if (error) {
                    return {
                         success: false,
                         message: error.message ?? 'Google sign-in failed.',
                    };
               }

               // On React Native, Supabase returns an auth URL to open.
               if (data?.url) {
                    await Linking.openURL(data.url);
               }

               // After the browser flow, the deep link will bring the user
               // back into the app via nestlinkapp://auth/callback. From
               // there, Supabase will finalize the session and our auth
               // listener will pick it up.
               return { success: true };
          } catch (err: any) {
               console.error('Google sign-in error:', err);
               return {
                    success: false,
                    message: err?.message ?? 'Google sign-in failed.',
               };
          }
     };

     const signOut = async () => {
          setSession(null);
          setTenantId(null);
          await supabase.auth.signOut();
     };

     return (
          <AuthContext.Provider
               value={{ session, loading, tenantId, signIn, signInWithGoogle, signOut }}
          >
               {children}
          </AuthContext.Provider>
     );
}

export function useAuth() {
     const ctx = useContext(AuthContext);
     if (!ctx) throw new Error('useAuth must be used within AuthProvider');
     return ctx;
}
