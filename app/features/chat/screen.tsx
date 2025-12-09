import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useTabBarScroll } from '@/hooks/use-tab-bar-scroll';
import { useThemeColor } from '@/hooks/use-theme-color';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';

export default function ChatScreen() {
  const primary = useThemeColor({}, 'primary', 'main');
  const secondary = useThemeColor({}, 'secondary', 'dark');
  const { refreshing, onRefresh } = usePullToRefresh();
  const { handleScroll } = useTabBarScroll();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      alwaysBounceVertical
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={primary}
          colors={[primary]}
        />
      }
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <Text style={[styles.title, { color: primary }]}>Chat</Text>
      <Text style={[styles.subtitle, { color: secondary }]}>Conversations and direct messages</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, fontWeight: '500' },
});
