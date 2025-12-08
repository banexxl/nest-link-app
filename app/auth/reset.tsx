import { AuthLayout } from '@/components/layouts';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Redirect } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';

export default function ResetPasswordScreen() {
     return (
          <AuthLayout header={<ThemedText type="title">Reset Password</ThemedText>}>
               <ThemedView style={styles.container}>
                    <ThemedText>Enter your email to receive a reset link.</ThemedText>
                    <TextInput style={styles.input} placeholder="you@example.com" />
                    <TouchableOpacity style={styles.button} onPress={() => <Redirect href="/auth" />}>
                         <Text style={styles.buttonText}>Send Reset Link (TODO)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => <Redirect href="/auth" />} style={styles.backLink}>
                         <Text style={styles.backLinkText}>Back to Login</Text>
                    </TouchableOpacity>
               </ThemedView>
          </AuthLayout>
     );
}

const styles = StyleSheet.create({
     container: { gap: 16 },
     input: {
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
          backgroundColor: 'rgba(255,255,255,0.9)',
     },
     button: {
          backgroundColor: '#2563eb',
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: 'center',
     },
     buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
     backLink: {
          alignItems: 'center',
          marginTop: 8,
     },
     backLinkText: {
          color: '#2563eb',
          fontSize: 14,
     },
});
