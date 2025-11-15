import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function PollsScreen() {
  const primary = useThemeColor({}, 'primary', 'main');
  const secondary = useThemeColor({}, 'secondary', 'dark');

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: primary }]}>Polls</Text>
      <Text style={[styles.subtitle, { color: secondary }]}>Vote and see results</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, fontWeight: '500' },
});

