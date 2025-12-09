import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '../themed-view';

type DashboardLayoutProps = {
     header?: React.ReactNode;
     footer?: React.ReactNode;
     children: React.ReactNode;
     scroll?: boolean;
     stickyHeader?: boolean;
     refreshing?: boolean;
     onRefresh?: () => void | Promise<void>;
     refreshControlProps?: Omit<
          React.ComponentProps<typeof RefreshControl>,
          'refreshing' | 'onRefresh'
     >;
};

export function DashboardLayout({
     header,
     footer,
     children,
     scroll = true,
     stickyHeader = false,
     refreshing = false,
     onRefresh,
     refreshControlProps,
}: DashboardLayoutProps) {
     const content = scroll ? (
          <ScrollView
               contentContainerStyle={styles.scrollContent}
               refreshControl={
                    onRefresh ? (
                         <RefreshControl
                              refreshing={refreshing}
                              onRefresh={onRefresh}
                              {...refreshControlProps}
                         />
                    ) : undefined
               }
          >
               {children}
          </ScrollView>
     ) : (
          <View style={styles.fill}>{children}</View>
     );

     return (
          <ThemedView
               style={styles.root}
               lightColor="transparent"
               darkColor="transparent"
          >
               <SafeAreaView style={styles.safe}>
                    {header && (
                         <View style={[styles.header, stickyHeader && styles.stickyShadow]}>{header}</View>
                    )}
                    <View style={styles.content}>{content}</View>
                    {footer && <View style={styles.footer}>{footer}</View>}
               </SafeAreaView>
          </ThemedView>
     );
}

const styles = StyleSheet.create({
     root: { flex: 1 },
     safe: { flex: 1 },
     content: { flex: 1 },
     fill: { flex: 1 },
     scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
     header: { paddingHorizontal: 16, paddingVertical: 12 },
     footer: { paddingHorizontal: 16, paddingVertical: 12 },
     stickyShadow: {
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 4,
     },
});
