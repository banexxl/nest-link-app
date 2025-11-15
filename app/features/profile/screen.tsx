import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ProfileScreen() {
  const primary = useThemeColor({}, 'primary', 'main');
  const secondary = useThemeColor({}, 'secondary', 'dark');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: primary }]}>Profile</Text>
      </View>
      <Text style={[styles.subtitle, { color: secondary }]}>Manage your account and settings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, fontWeight: '500' },
});

