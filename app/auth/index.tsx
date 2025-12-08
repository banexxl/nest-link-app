import { useAuth } from '@/context/auth-context';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
     ScrollView,
     StyleSheet,
     Text,
     TextInput,
     TouchableOpacity,
     View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthMethod = 'password' | 'google' | 'magic';

const LoginScreen = () => {
     const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const [loading, setLoading] = useState(false);
     const [emailError, setEmailError] = useState('');
     const [passwordError, setPasswordError] = useState('');
     const [error, setError] = useState('');
     const { signIn } = useAuth();
     const navigation = useNavigation();

     const validateEmail = (email: string) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
     };

     const onSignIn = async () => {
          if (loading) return;
          if (authMethod !== 'password') return;

          // Reset errors
          setEmailError('');
          setPasswordError('');
          setError('');

          // Validate email
          if (!email.trim()) {
               setEmailError('Email is required');
               return;
          }
          if (!validateEmail(email)) {
               setEmailError('Please enter a valid email address');
               return;
          }

          // Validate password
          if (!password) {
               setPasswordError('Password is required');
               return;
          }
          if (password.length < 6) {
               setPasswordError('Password must be at least 6 characters');
               return;
          }

          setLoading(true);
          const result = await signIn(email, password);
          if (result && result.error) {
               setError(result.error.message || 'Sign in failed. Please check your credentials.');
          }
          setLoading(false);
     };

     const onGoToNestLink = () => {
          // TODO: navigation
     };

     // const onResetPassword = () => {
     //      navigation.navigate('ResetPassword' as any);
     // };

     return (
          <SafeAreaView style={styles.safeArea}>
               <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Top logo + title */}
                    <View style={styles.logoWrapper}>
                         <View style={styles.logoCircle} />
                         <Text style={styles.appName}>
                              NestLink <Text style={styles.appNameAccent}>APP</Text>
                         </Text>
                    </View>

                    <View style={styles.card}>
                         {/* Heading */}
                         <Text style={styles.heading}>Log in</Text>
                         <Text style={styles.subheading}>
                              Choose your preferred login method
                         </Text>

                         {/* Tabs */}
                         <View style={styles.tabsRow}>
                              <AuthTab
                                   label="Password"
                                   active={authMethod === 'password'}
                                   onPress={() => setAuthMethod('password')}
                              />
                              <AuthTab
                                   label="Google"
                                   active={authMethod === 'google'}
                                   onPress={() => setAuthMethod('google')}
                              />
                         </View>

                         {/* Content per tab */}
                         {authMethod === 'password' && (
                              <>
                                   <Text style={styles.sectionHint}>
                                        Sign in with your email and password
                                   </Text>

                                   {/* Email field */}
                                   <View style={styles.fieldContainer}>
                                        <Text style={styles.fieldLabel}>Email</Text>
                                        <TextInput
                                             style={[styles.textInput, emailError && styles.textInputError]}
                                             placeholder="you@example.com"
                                             keyboardType="email-address"
                                             autoCapitalize="none"
                                             value={email}
                                             onChangeText={(text) => {
                                                  setEmail(text);
                                                  setEmailError('');
                                             }}
                                        />
                                        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                                   </View>

                                   {/* Password field */}
                                   <View style={styles.fieldContainer}>
                                        <Text style={styles.fieldLabel}>Password</Text>
                                        <TextInput
                                             style={[styles.textInput, passwordError && styles.textInputError]}
                                             placeholder="••••••••"
                                             secureTextEntry
                                             value={password}
                                             onChangeText={(text) => {
                                                  setPassword(text);
                                                  setPasswordError('');
                                             }}
                                        />
                                        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                                   </View>
                              </>
                         )}

                         {authMethod === 'google' && (
                              <View style={styles.altMethodContainer}>
                                   <Text style={styles.sectionHintCentered}>
                                        Continue with your Google account
                                   </Text>
                                   <TouchableOpacity style={styles.googleButton}>
                                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                                   </TouchableOpacity>
                              </View>
                         )}

                         {/* Error message */}
                         {error ? (
                              <View style={styles.errorContainer}>
                                   <Text style={styles.errorTextGeneral}>{error}</Text>
                              </View>
                         ) : null}

                         {/* Sign in button (only shows for password tab) */}
                         {authMethod === 'password' && (
                              <TouchableOpacity style={styles.primaryButton} onPress={onSignIn} disabled={loading}>
                                   <Text style={styles.primaryButtonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
                              </TouchableOpacity>
                         )}

                         {/* Bottom links */}
                         <View style={styles.footerLinksContainer}>
                              <Text style={styles.footerText}>
                                   Don&apos;t have an account?{' '}
                                   <Text style={styles.footerLink} onPress={onGoToNestLink}>
                                        Go to Nest-Link
                                   </Text>
                              </Text>

                              <Text style={styles.footerText}>
                                   Forgot password?{' '}
                                   {/*  <Text style={styles.footerLink} onPress={onResetPassword}>
                                        Reset password!
                                   </Text>*/}
                              </Text>
                         </View>
                    </View>
               </ScrollView>
          </SafeAreaView>
     );
};

interface AuthTabProps {
     label: string;
     active: boolean;
     onPress: () => void;
}

const AuthTab: React.FC<AuthTabProps> = ({ label, active, onPress }) => {
     return (
          <TouchableOpacity
               style={[styles.tabButton, active && styles.tabButtonActive]}
               onPress={onPress}
               activeOpacity={0.8}
          >
               <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {label}
               </Text>
          </TouchableOpacity>
     );
};

export default LoginScreen;

const PURPLE = '#9B5CFF';
const PURPLE_DARK = '#7B3FE0';
const INPUT_BG = '#EFF5FF';
const TEXT_MUTED = '#6B7280';
const CARD_BG = '#FFFFFF';

const styles = StyleSheet.create({
     safeArea: {
          flex: 1,
          backgroundColor: '#F5F5F9',
     },
     scrollContent: {
          paddingHorizontal: 24,
          paddingVertical: 32,
          flexGrow: 1,
          justifyContent: 'flex-start',
     },
     logoWrapper: {
          alignItems: 'center',
          marginBottom: 32,
     },
     logoCircle: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#FFE6C7', // placeholder for your real logo
          marginBottom: 8,
     },
     appName: {
          fontSize: 20,
          fontWeight: '600',
          color: '#111827',
     },
     appNameAccent: {
          color: PURPLE,
     },
     card: {
          backgroundColor: CARD_BG,
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
     },
     heading: {
          fontSize: 24,
          fontWeight: '700',
          color: '#111827',
          marginBottom: 4,
     },
     subheading: {
          fontSize: 14,
          color: TEXT_MUTED,
          marginBottom: 20,
     },
     tabsRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
     },
     tabButton: {
          flex: 1,
          paddingVertical: 8,
          alignItems: 'center',
     },
     tabButtonActive: {},
     tabLabel: {
          fontSize: 14,
          color: TEXT_MUTED,
     },
     tabLabelActive: {
          fontWeight: '600',
          color: PURPLE,
     },
     activeUnderlineContainer: {
          height: 2,
          marginTop: 4,
          marginBottom: 16,
          backgroundColor: '#E5E7EB',
          borderRadius: 999,
          overflow: 'hidden',
     },
     activeUnderline: {
          position: 'absolute',
          width: '50%',
          height: '100%',
          backgroundColor: PURPLE,
     },
     sectionHint: {
          fontSize: 13,
          color: TEXT_MUTED,
          marginBottom: 16,
     },
     sectionHintCentered: {
          fontSize: 13,
          color: TEXT_MUTED,
          textAlign: 'center',
          marginBottom: 16,
     },
     fieldContainer: {
          marginBottom: 12,
     },
     fieldLabel: {
          fontSize: 12,
          color: TEXT_MUTED,
          marginBottom: 4,
     },
     textInput: {
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: INPUT_BG,
          fontSize: 14,
          borderWidth: 1,
          borderColor: '#E5E7EB',
     },
     textInputError: {
          borderColor: '#dc2626',
          backgroundColor: '#fef2f2',
     },
     errorText: {
          fontSize: 12,
          color: '#dc2626',
          marginTop: 4,
     },
     errorContainer: {
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          padding: 12,
          marginTop: 12,
          borderWidth: 1,
          borderColor: '#fecaca',
     },
     errorTextGeneral: {
          fontSize: 14,
          color: '#dc2626',
          textAlign: 'center',
     },
     primaryButton: {
          marginTop: 20,
          borderRadius: 999,
          paddingVertical: 14,
          alignItems: 'center',
          backgroundColor: PURPLE,
          shadowColor: PURPLE_DARK,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 3,
     },
     primaryButtonText: {
          color: '#FFFFFF',
          fontWeight: '600',
          fontSize: 16,
     },
     footerLinksContainer: {
          marginTop: 20,
          gap: 6,
     },
     footerText: {
          fontSize: 13,
          color: TEXT_MUTED,
          textAlign: 'center',
     },
     footerLink: {
          color: PURPLE,
          fontWeight: '600',
     },
     altMethodContainer: {
          marginTop: 8,
     },
     googleButton: {
          marginTop: 8,
          borderRadius: 999,
          paddingVertical: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#D1D5DB',
          backgroundColor: '#FFFFFF',
     },
     googleButtonText: {
          fontSize: 14,
          fontWeight: '500',
          color: '#111827',
     },
     magicButton: {
          marginTop: 12,
          borderRadius: 999,
          paddingVertical: 12,
          alignItems: 'center',
          backgroundColor: PURPLE,
     },
     magicButtonText: {
          fontSize: 14,
          fontWeight: '600',
          color: '#FFFFFF',
     },
});
