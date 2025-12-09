import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { useAuth } from '@/context/auth-context';

export default function IndexScreen() {
  const { session, loading } = useAuth();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (loading) return;

    if (session) {
      // User is authenticated -> go to Profile tab
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { screen: 'Profile' } }],
      });
    } else {
      // No session -> go to Auth stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  }, [session, loading, navigation]);

}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
