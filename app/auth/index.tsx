// app/auth/index.tsx
import { useAuth } from '@/context/auth-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
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
     View
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PRIMARY_COLOR = '#f68a00';
const CREDENTIALS_KEY = 'nestlink_last_login';

type RootStackParamList = {
     Auth: undefined;
     ResetPassword: undefined;
     Main: undefined;
     Modal: undefined;
     RequestAccess: undefined; // Added this line
};

type NavigationProps = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

const AuthScreen = () => {
     const navigation = useNavigation<NavigationProps>();
     const { signIn, signInWithGoogle } = useAuth();

     const [activeTab, setActiveTab] = useState<'password' | 'google'>('password');
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const [submitting, setSubmitting] = useState(false);
     const [error, setError] = useState<string | null>(null);
     const [showPassword, setShowPassword] = useState(false);
     const [rememberMe, setRememberMe] = useState(false);
     const [savedEmails, setSavedEmails] = useState<string[]>([]);
     const [emailFocused, setEmailFocused] = useState(false);

     useEffect(() => {
          const loadCredentials = async () => {
               try {
                    const saved = await SecureStore.getItemAsync(CREDENTIALS_KEY);
                    if (saved) {
                         const parsed = JSON.parse(saved) as {
                              email?: string;
                              password?: string;
                              emails?: string[];
                         };
                         const emailsArray = Array.isArray(parsed.emails)
                              ? parsed.emails.filter((e) => typeof e === 'string')
                              : [];
                         const combined = [
                              parsed.email,
                              ...emailsArray,
                         ].filter(Boolean) as string[];

                         const uniqueEmails = Array.from(new Set(combined)).slice(0, 5);

                         setEmail(parsed.email ?? '');
                         setPassword(parsed.password ?? '');
                         setSavedEmails(uniqueEmails);
                         setRememberMe(true);
                    }
               } catch (err) {
                    console.log('Failed to load saved credentials', err);
               }
          };

          loadCredentials();
     }, []);

     const persistCredentials = async (nextEmail: string, nextPassword: string) => {
          if (!rememberMe) {
               await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
               return;
          }

          try {
               const nextEmails = [nextEmail, ...savedEmails.filter((e) => e !== nextEmail)].slice(0, 5);
               setSavedEmails(nextEmails);

               await SecureStore.setItemAsync(
                    CREDENTIALS_KEY,
                    JSON.stringify({ email: nextEmail, password: nextPassword, emails: nextEmails })
               );
          } catch (err) {
               console.log('Failed to store credentials', err);
          }
     };

     useEffect(() => {
          if (!rememberMe) {
               SecureStore.deleteItemAsync(CREDENTIALS_KEY).catch((err) =>
                    console.log('Failed to clear saved credentials', err)
               );
          }
     }, [rememberMe]);

     const emailSuggestions = useMemo(() => {
          const query = email.trim().toLowerCase();
          return savedEmails.filter((e) =>
               !query ? true : e.toLowerCase().includes(query)
          );
     }, [savedEmails, email]);

     const handlePasswordLogin = async () => {
          setError(null);

          if (!email.trim() || !password) {
               setError('Please enter email and password.');
               return;
          }

          setSubmitting(true);
          const result = await signIn(email.trim(), password);
          if (!result.success) {
               setError(result.message);
               setSubmitting(false);
               return;
          }

          await persistCredentials(email.trim(), password);

          // On success, AuthContext session is set and RootNavigator
          // will switch from Auth stack to Main automatically.
          setSubmitting(false);
     };

     const handleGoogleLogin = async () => {
          setSubmitting(true);
          setError(null);

          const result = await signInWithGoogle();
          if (!result.success) {
               setError(result.message);
          }
          setSubmitting(false);
     };

     const handleResetPassword = () => {
          navigation.navigate('ResetPassword');
     };

     const isPasswordTab = activeTab === 'password';

     return (
          <ImageBackground
               source={require('../../assets/images/login-bg.png')}
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
                                        source={require('../../assets/images/login-bg.png')}
                                        style={styles.logo}
                                        resizeMode="contain"
                                   />
                                   <Text style={styles.appName}>
                                        <Text style={{ fontWeight: '600' }}>NestLink</Text>{' '}
                                        <Text style={{ color: PRIMARY_COLOR, fontWeight: '700' }}>APP</Text>
                                   </Text>
                              </View>

                              {/* Title + subtitle */}
                              <Text style={styles.title}>Log in</Text>
                              <Text style={styles.subtitle}>Choose your preferred login method</Text>

                              {/* Tabs */}
                              <View style={styles.tabsRow}>
                                   <TouchableOpacity
                                        style={[
                                             styles.tabItem,
                                             isPasswordTab && styles.tabItemActive,
                                        ]}
                                        onPress={() => setActiveTab('password')}
                                   >
                                        <Text
                                             style={[
                                                  styles.tabLabel,
                                                  isPasswordTab && styles.tabLabelActive,
                                             ]}
                                        >
                                             Password
                                        </Text>
                                   </TouchableOpacity>

                                   <TouchableOpacity
                                        style={[
                                             styles.tabItem,
                                             !isPasswordTab && styles.tabItemActive,
                                        ]}
                                        onPress={() => setActiveTab('google')}
                                   >
                                        <Text
                                             style={[
                                                  styles.tabLabel,
                                                  !isPasswordTab && styles.tabLabelActive,
                                             ]}
                                        >
                                             Google
                                        </Text>
                                   </TouchableOpacity>
                              </View>

                              {isPasswordTab ? (
                                   <>
                                        <Text style={styles.tabDescription}>
                                             Sign in with your email and password
                                        </Text>

                                        {/* Email */}
                                        <View style={styles.fieldGroup}>
                                             <Text style={styles.fieldLabel}>Email</Text>
                                             <TextInput
                                                  style={styles.input}
                                                  autoCapitalize="none"
                                                   keyboardType="email-address"
                                                  autoComplete="email"
                                                  placeholder="Email"
                                                  placeholderTextColor="#888"
                                                  value={email}
                                                  onChangeText={setEmail}
                                                  onFocus={() => setEmailFocused(true)}
                                                  onBlur={() => setEmailFocused(false)}
                                             />
                                             {emailFocused && emailSuggestions.length > 0 ? (
                                                  <View style={styles.suggestionsBox}>
                                                       {emailSuggestions.map((item) => (
                                                            <TouchableOpacity
                                                                 key={item}
                                                                 style={styles.suggestionItem}
                                                                 onPress={() => {
                                                                      setEmail(item);
                                                                      setEmailFocused(false);
                                                                 }}
                                                                 activeOpacity={0.8}
                                                            >
                                                                 <Text style={styles.suggestionText}>{item}</Text>
                                                            </TouchableOpacity>
                                                       ))}
                                                  </View>
                                             ) : null}
                                         </View>

                                        {/* Password */}
                                        <View style={styles.fieldGroup}>
                                             <Text style={styles.fieldLabel}>Password</Text>
                                             <View style={styles.passwordRow}>
                                                  <TextInput
                                                       style={[styles.input, styles.passwordInput]}
                                                       placeholder="Password"
                                                       placeholderTextColor="#888"
                                                       secureTextEntry={!showPassword}
                                                       value={password}
                                                       onChangeText={setPassword}
                                                  />
                                                  <TouchableOpacity
                                                       style={styles.eyeButton}
                                                       onPress={() => setShowPassword((prev) => !prev)}
                                                  >
                                                       <Text style={styles.eyeIcon}>
                                                            {showPassword ? '🙈' : '👁️'}
                                                       </Text>
                                                  </TouchableOpacity>
                                             </View>
                                        </View>

                                        <TouchableOpacity
                                             style={styles.rememberRow}
                                             onPress={() => setRememberMe((prev) => !prev)}
                                             activeOpacity={0.8}
                                        >
                                             <View style={[styles.rememberBox, rememberMe && styles.rememberBoxChecked]}>
                                                  {rememberMe ? <Text style={styles.rememberCheck}>✓</Text> : null}
                                             </View>
                                             <Text style={styles.rememberLabel}>Remember me</Text>
                                        </TouchableOpacity>

                                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                        <TouchableOpacity
                                             style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                                             onPress={handlePasswordLogin}
                                             disabled={submitting}
                                        >
                                             {submitting ? (
                                                  <ActivityIndicator color="#fff" />
                                             ) : (
                                                  <Text style={styles.primaryButtonLabel}>Sign in</Text>
                                             )}
                                        </TouchableOpacity>
                                   </>
                              ) : (
                                   <>
                                        <Text style={styles.tabDescription}>
                                             Sign in with your Google account
                                        </Text>

                                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                                        <TouchableOpacity
                                             style={[
                                                  styles.primaryButton,
                                                  styles.googleButton,
                                                  submitting && styles.buttonDisabled,
                                             ]}
                                             onPress={handleGoogleLogin}
                                             disabled={submitting}
                                        >
                                             {submitting ? (
                                                  <ActivityIndicator color="#fff" />
                                             ) : (
                                                  <Text style={styles.primaryButtonLabel}>Continue with Google</Text>
                                             )}
                                        </TouchableOpacity>
                                   </>
                              )}

                              {/* Divider */}
                              <View style={styles.divider} />

                              <Text style={styles.bottomText}>
                                   Need access?{' '}
                                   <Text style={styles.linkText} onPress={() => navigation.navigate('RequestAccess')}>
                                        Request access
                                   </Text>
                              </Text>

                              <Text style={styles.bottomText}>
                                   Forgot password?{' '}
                                   <Text style={styles.linkText} onPress={handleResetPassword}>
                                        Reset password!
                                   </Text>
                              </Text>
                         </View>
                    </KeyboardAvoidingView>
               </View>
          </ImageBackground>
     );
};

export default AuthScreen;

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
          paddingVertical: 28,
          backgroundColor: 'rgba(255,255,255,0.9)',
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 20,
          elevation: 6,
     },
     logoRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 24,
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
          fontSize: 26,
          fontWeight: '700',
          marginBottom: 4,
     },
     subtitle: {
          fontSize: 14,
          color: '#555',
          marginBottom: 20,
     },
     tabsRow: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(0,0,0,0.08)',
          marginBottom: 10,
     },
     tabItem: {
          flex: 1,
          paddingVertical: 8,
          alignItems: 'center',
          borderBottomWidth: 2,
          borderBottomColor: 'transparent',
     },
     tabItemActive: {
          borderBottomColor: PRIMARY_COLOR,
     },
     tabLabel: {
          fontSize: 14,
          color: '#777',
          fontWeight: '500',
     },
     tabLabelActive: {
          color: PRIMARY_COLOR,
          fontWeight: '600',
     },
     tabDescription: {
          fontSize: 13,
          color: '#666',
          marginBottom: 16,
     },
     fieldGroup: {
          marginBottom: 12,
     },
     fieldLabel: {
          fontSize: 13,
          color: '#444',
          marginBottom: 4,
     },
     input: {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.1)',
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: '#f7f7fb',
          fontSize: 14,
     },
     passwordRow: {
          flexDirection: 'row',
          alignItems: 'center',
     },
     passwordInput: {
          flex: 1,
     },
     eyeButton: {
          paddingHorizontal: 8,
          paddingVertical: 4,
     },
     eyeIcon: {
          fontSize: 18,
     },
     errorText: {
          color: '#d00',
          fontSize: 13,
          marginTop: 4,
          marginBottom: 8,
     },
     primaryButton: {
          marginTop: 8,
          borderRadius: 16,
          paddingVertical: 12,
          alignItems: 'center',
          backgroundColor: PRIMARY_COLOR,
     },
     googleButton: {
          // If you want a different style for Google, tweak here
     },
     primaryButtonLabel: {
          color: '#fff',
          fontSize: 15,
          fontWeight: '600',
     },
     buttonDisabled: {
          opacity: 0.7,
     },
     divider: {
          height: 1,
          backgroundColor: 'rgba(0,0,0,0.08)',
          marginVertical: 18,
     },
     bottomText: {
          fontSize: 13,
          color: '#555',
          marginBottom: 4,
     },
     linkText: {
          color: PRIMARY_COLOR,
          textDecorationLine: 'underline',
     },
     rememberRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
          marginTop: 2,
     },
     rememberBox: {
          width: 18,
          height: 18,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: 'rgba(0,0,0,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
          backgroundColor: '#fff',
     },
     rememberBoxChecked: {
          borderColor: PRIMARY_COLOR,
          backgroundColor: 'rgba(246,138,0,0.15)',
     },
     rememberCheck: {
          color: PRIMARY_COLOR,
          fontWeight: '700',
          fontSize: 12,
     },
     rememberLabel: {
          fontSize: 13,
          color: '#333',
     },
     suggestionsBox: {
          marginTop: 6,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.1)',
          backgroundColor: '#fff',
          overflow: 'hidden',
     },
     suggestionItem: {
          paddingVertical: 8,
          paddingHorizontal: 10,
     },
     suggestionText: {
          fontSize: 13,
          color: '#333',
     },
});
