import React from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '../themed-view';

type AuthLayoutProps = {
     children: React.ReactNode;
     centered?: boolean;
     padded?: boolean;
     footer?: React.ReactNode;
     header?: React.ReactNode;
};

export function AuthLayout({
     children,
     centered = true,
     padded = true,
     footer,
     header,
}: AuthLayoutProps) {
     return (
          <ThemedView style={styles.root} lightColor="#fff" darkColor="#000">
               <SafeAreaView style={styles.flex}>
                    {header && <View style={[styles.section, styles.header]}>{header}</View>}
                    <KeyboardAvoidingView
                         style={[styles.flex, centered && styles.center]}
                         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                         <View style={[styles.content, padded && styles.padded]}>{children}</View>
                    </KeyboardAvoidingView>
                    {footer && <View style={[styles.section, styles.footer]}>{footer}</View>}
               </SafeAreaView>
          </ThemedView>
     );
}

const styles = StyleSheet.create({
     root: { flex: 1 },
     flex: { flex: 1 },
     center: { justifyContent: 'center' },
     content: { width: '100%' },
     padded: { paddingHorizontal: 24 },
     section: { width: '100%' },
     header: { paddingHorizontal: 24, paddingTop: 8 },
     footer: { paddingHorizontal: 24, paddingBottom: 16 },
});
