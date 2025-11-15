import { useAuth } from '@/context/auth-context';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

/**
 * Hook to protect routes - redirects to auth if no session
 * Use this in screens that require authentication
 */
export function useProtectedRoute() {
     const { session, loading } = useAuth();
     const segments = useSegments();
     const router = useRouter();

     useEffect(() => {
          if (loading) return;

          const inAuthGroup = segments[0] === 'auth';
          const inTabsGroup = segments[0] === '(tabs)';
          const isRoot = segments.length === 0;

          if (!session && !inAuthGroup) {
               // Redirect to auth if not authenticated
               // Use a timeout to ensure the route is ready
               setTimeout(() => {
                    router.replace('/auth/index' as any);
               }, 50);
          } else if (session && (inAuthGroup || isRoot)) {
               // Redirect to tabs if authenticated and on auth screen or root
               setTimeout(() => {
                    router.replace('/(tabs)' as any);
               }, 50);
          }
     }, [session, loading, segments, router]);

     return { session, loading };
}
