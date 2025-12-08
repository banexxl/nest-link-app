// app/auth/reset.tsx
import { supabase } from '@/lib/supabase';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
     ActivityIndicator,
     Image,
     ImageBackground,
     KeyboardAvoidingView,
     Platform,
     StyleSheet,
     Text,
     TextInput,
     TouchableOpacity,
     View,
} from 'react-native';

const PRIMARY_COLOR = '#f68a00';

type RootStackParamList = {
     Auth: undefined;
     ResetPassword: undefined;
     RequestAccess: undefined;
     Main: undefined;
     Modal: undefined;
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

const ResetPasswordScreen = () => {
     const navigation = useNavigation<NavigationProps>();

     const [email, setEmail] = useState('');
     const [submitting, setSubmitting] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [info, setInfo] = useState<string | null>(null);

     const handleBackToLogin = () => {
          navigation.goBack();
     };

     const handleSendRecovery = async () => {
          setError(null);
          setInfo(null);

          if (!email.trim()) {
               setError('Please enter your email address.');
               return;
          }

          setSubmitting(true);
          try {
               const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                    // TODO: adjust redirectTo to your web / deep-link route that handles password update
                    redirectTo: 'https://nest-link.app/auth/update-password',
               });

               if (error) {
                    setError(error.message);
               } else {
                    setInfo('If that email exists, we have sent a recovery link.');
               }
          } catch (err: any) {
               setError(err?.message ?? 'Failed to send recovery email.');
          } finally {
               setSubmitting(false);
          }
     };

     return (
          <ImageBackground
               source={require('@/assets/images/login-bg.png')}
               style={styles.background}
               resizeMode="cover"
               blurRadius={6}
          >
               <View style={styles.overlay}>
                    <KeyboardAvoidingView
                         behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                         style={styles.keyboardContainer}
                    >
                         <View style={styles.card}>
                              {/* Logo + app name */}
                              <View style={styles.logoRow}>
                                   <Image
                                        source={require('@/assets/images/nestlink-logo.png')}
                                        style={styles.logo}
                                        resizeMode="contain"
                                   />
                                   <Text style={styles.appName}>
                                        <Text style={{ fontWeight: '600' }}>NestLink</Text>{' '}
                                        <Text style={{ color: PRIMARY_COLOR, fontWeight: '700' }}>APP</Text>
                                   </Text>
                              </View>

                              {/* Title + description */}
                              <Text style={styles.title}>Send Password Recovery Email</Text>

                              <View style={styles.inputCard}>
                                   <Text style={styles.fieldLabel}>Email *</Text>
                                   <TextInput
                                        style={styles.input}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        placeholder="Email"
                                        placeholderTextColor="#999"
                                        value={email}
                                        onChangeText={setEmail}
                                   />
                              </View>

                              <Text style={styles.subtitle}>
                                   Enter your email address and we&apos;ll send you a link to reset your
                                   password.
                              </Text>

                              {error ? <Text style={styles.errorText}>{error}</Text> : null}
                              {info ? <Text style={styles.infoText}>{info}</Text> : null}

                              {/* Send button */}
                              <TouchableOpacity
                                   style={[
                                        styles.primaryButton,
                                        submitting && styles.buttonDisabled,
                                   ]}
                                   onPress={handleSendRecovery}
                                   disabled={submitting}
                                   activeOpacity={0.8}
                              >
                                   {submitting ? (
                                        <ActivityIndicator color="#fff" />
                                   ) : (
                                        <Text style={styles.primaryButtonLabel}>Send Recovery Email</Text>
                                   )}
                              </TouchableOpacity>

                              {/* Back to login */}
                              <TouchableOpacity
                                   style={styles.backButton}
                                   onPress={handleBackToLogin}
                                   activeOpacity={0.7}
                              >
                                   <Text style={styles.backButtonLabel}>Back to Login</Text>
                              </TouchableOpacity>
                         </View>
                    </KeyboardAvoidingView>
               </View>
          </ImageBackground>
     );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
     background: {
          flex: 1,
     },
     overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16,
     },
     keyboardContainer: {
          width: '100%',
     },
     card: {
          width: '100%',
          maxWidth: 380,
          alignSelf: 'center',
          borderRadius: 24,
          paddingHorizontal: 24,
          paddingVertical: 26,
          backgroundColor: 'rgba(255,255,255,0.96)',
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 20,
          elevation: 6,
     },
     logoRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 22,
     },
     logo: {
          width: 40,
          height: 40,
          marginRight: 8,
     },
     appName: {
          fontSize: 18,
     },
     title: {
          fontSize: 22,
          fontWeight: '700',
          marginBottom: 16,
     },
     inputCard: {
          borderRadius: 18,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.8)',
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: 'rgba(255,255,255,0.85)',
          marginBottom: 12,
     },
     fieldLabel: {
          fontSize: 13,
          color: '#555',
          marginBottom: 4,
     },
     input: {
          borderRadius: 10,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.12)',
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: '#f7f7fb',
          fontSize: 14,
     },
     subtitle: {
          fontSize: 13,
          color: '#555',
          marginBottom: 14,
     },
     errorText: {
          color: '#d00',
          fontSize: 13,
          marginBottom: 8,
     },
     infoText: {
          color: '#0b7a0b',
          fontSize: 13,
          marginBottom: 8,
     },
     primaryButton: {
          borderRadius: 20,
          paddingVertical: 12,
          alignItems: 'center',
          backgroundColor: PRIMARY_COLOR,
          marginTop: 4,
     },
     primaryButtonLabel: {
          color: '#fff',
          fontSize: 15,
          fontWeight: '600',
     },
     buttonDisabled: {
          opacity: 0.7,
     },
     backButton: {
          marginTop: 16,
          borderRadius: 20,
          paddingVertical: 11,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: PRIMARY_COLOR,
          backgroundColor: 'rgba(246,138,0,0.06)',
     },
     backButtonLabel: {
          fontSize: 14,
          color: PRIMARY_COLOR,
          fontWeight: '600',
     },
});
