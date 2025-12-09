import { BurgerMenu } from '@/components/burger-menu';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { TAB_BAR_SCROLL_EVENT } from '@/hooks/use-tab-bar-scroll';
import { supabase } from '@/lib/supabase';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
     ActivityIndicator,
     Alert,
     Animated,
     DeviceEventEmitter,
     Image,
     Platform,
     StyleSheet,
     TouchableOpacity,
     View
} from 'react-native';
import { ProfileMenu } from './profile-menu';

const AVATAR_SOURCES: Record<string, any> = {
     'avatar-alcides-antonio.png': require('@/assets/avatars/avatar-alcides-antonio.png'),
     'avatar-anika-visser.png': require('@/assets/avatars/avatar-anika-visser.png'),
     'avatar-cao-yu.png': require('@/assets/avatars/avatar-cao-yu.png'),
     'avatar-carson-darrin.png': require('@/assets/avatars/avatar-carson-darrin.png'),
     'avatar-chinasa-neo.png': require('@/assets/avatars/avatar-chinasa-neo.png'),
     'avatar-fran-perez.png': require('@/assets/avatars/avatar-fran-perez.png'),
     'avatar-iulia-albu.png': require('@/assets/avatars/avatar-iulia-albu.png'),
     'avatar-jane-rotanson.png': require('@/assets/avatars/avatar-jane-rotanson.png'),
     'avatar-jie-yan-song.png': require('@/assets/avatars/avatar-jie-yan-song.png'),
     'avatar-marcus-finn.png': require('@/assets/avatars/avatar-marcus-finn.png'),
     'avatar-miron-vitold.png': require('@/assets/avatars/avatar-miron-vitold.png'),
     'avatar-nasimiyu-danai.png': require('@/assets/avatars/avatar-nasimiyu-danai.png'),
     'avatar-neha-punita.png': require('@/assets/avatars/avatar-neha-punita.png'),
     'avatar-omar-darboe.png': require('@/assets/avatars/avatar-omar-darboe.png'),
     'avatar-penjani-inyene.png': require('@/assets/avatars/avatar-penjani-inyene.png'),
     'avatar-seo-hyeon-ji.png': require('@/assets/avatars/avatar-seo-hyeon-ji.png'),
     'avatar-siegbert-gottfried.png': require('@/assets/avatars/avatar-siegbert-gottfried.png'),
};

export function CustomTabBar(props: BottomTabBarProps) {
     const { session, tenantId } = useAuth();
     const [burgerVisible, setBurgerVisible] = useState(false);
     const [profileVisible, setProfileVisible] = useState(false);
     const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
     const [loadingAvatar, setLoadingAvatar] = useState(false);
     const translateY = useRef(new Animated.Value(0)).current;
     const [isHidden, setIsHidden] = useState(false);

     const initials = useMemo(() => {
          const fullName =
               (session?.user?.user_metadata?.full_name as string | undefined) ||
               (session?.user?.user_metadata?.name as string | undefined) ||
               session?.user?.email ||
               'User';
          return fullName
               .split(' ')
               .map((part) => part[0])
               .join('')
               .slice(0, 2)
               .toUpperCase();
     }, [session?.user]);

     const avatarSource = useMemo(() => {
          if (!avatarUrl) return null;
          const lower = avatarUrl.toLowerCase();
          const matchedKey = Object.keys(AVATAR_SOURCES).find((key) =>
               lower.includes(key.toLowerCase())
          );
          if (matchedKey) return AVATAR_SOURCES[matchedKey];
          if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
               return { uri: avatarUrl };
          }
          return null;
     }, [avatarUrl]);

     useEffect(() => {
          const loadAvatar = async () => {
               const userId = session?.user?.id ?? null;
               const tenantFilterColumn = tenantId ? 'id' : 'user_id';
               const tenantFilterValue = tenantId ?? userId;

               if (!tenantFilterValue) return;

               setLoadingAvatar(true);
               try {
                    const { data: tenant, error: tenantError } = await supabase
                         .from('tblTenants')
                         .select('id, avatar_url')
                         .eq(tenantFilterColumn, tenantFilterValue)
                         .maybeSingle();

                    if (tenantError && tenantError.code !== 'PGRST116') {
                         setLoadingAvatar(false);
                         return;
                    }

                    let nextAvatar = (tenant?.avatar_url as string | null | undefined) ?? null;
                    const resolvedTenantId = tenantId ?? (tenant?.id as string | undefined) ?? null;

                    if (resolvedTenantId) {
                         const { data: profile, error: profileError } = await supabase
                              .from('tblTenantProfiles')
                              .select('avatar_url')
                              .eq('tenant_id', resolvedTenantId)
                              .maybeSingle();

                         if (!profileError && profile?.avatar_url) {
                              nextAvatar = profile.avatar_url as string;
                         }
                    }

                    setAvatarUrl(nextAvatar);
               } catch (_err) {
                    // swallow errors; fallback to initials/icon
               } finally {
                    setLoadingAvatar(false);
               }
          };

          loadAvatar();
     }, [session?.user?.id, tenantId, profileVisible]);

     useEffect(() => {
          const listener = DeviceEventEmitter.addListener(TAB_BAR_SCROLL_EVENT, (payload?: { direction?: string }) => {
               const direction = payload?.direction;
               if (direction === 'up' && !isHidden) {
                    setIsHidden(true);
                    Animated.timing(translateY, {
                         toValue: 100,
                         duration: 200,
                         useNativeDriver: true,
                    }).start();
               } else if (direction === 'down' && isHidden) {
                    setIsHidden(false);
                    Animated.timing(translateY, {
                         toValue: 0,
                         duration: 200,
                         useNativeDriver: true,
                    }).start();
               }
          });

          return () => {
               listener.remove();
          };
     }, [isHidden, translateY]);

     const handleCamera = useCallback(async () => {
          try {
               const permission = await ImagePicker.requestCameraPermissionsAsync();
               if (permission.status !== 'granted') {
                    Alert.alert('Camera permission needed', 'Enable camera access to take a photo.');
                    return;
               }

               const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.85,
               });

               if (!result.canceled) {
                    const uri = result.assets?.[0]?.uri;
                    if (uri) {
                         // Jump to Issues tab with the captured photo so user can file a request
                         props.navigation.navigate('Issues', { initialPhotoUri: uri });
                    }
               }
          } catch (error) {
               console.warn('Unable to open camera', error);
               Alert.alert('Camera error', 'Could not open the camera. Please try again.');
          }
     }, []);

     return (
          <>
               <Animated.View
                    style={[
                         styles.container,
                         {
                              paddingBottom: (props.insets?.bottom ?? 0) + 12,
                              transform: [{ translateY }],
                         },
                    ]}
               >
                    {/* Left - Burger Menu */}
                    <TouchableOpacity
                         style={styles.iconButton}
                         onPress={() => {
                              setBurgerVisible(true);
                         }}
                         activeOpacity={0.7}
                    >
                         <IconSymbol name="line.horizontal.3" size={28} color={Colors.primary.main} />
                    </TouchableOpacity>

                    {/* Center - Camera */}
                    <TouchableOpacity style={styles.cameraButton} onPress={handleCamera} activeOpacity={0.8}>
                         <IconSymbol name="camera.fill" size={28} color="#fff" />
                    </TouchableOpacity>

                    {/* Right - Profile Menu */}
                    <TouchableOpacity
                         style={styles.iconButton}
                         onPress={() => {
                              setProfileVisible(true);
                         }}
                         activeOpacity={0.7}
                         >
                              <View style={styles.avatar}>
                                   {loadingAvatar ? (
                                        <ActivityIndicator color="#fff" />
                                   ) : avatarSource ? (
                                        <Image source={avatarSource} style={styles.avatarImage} />
                                   ) : (
                                        <IconSymbol name="person.fill" size={24} color="#fff" />
                                   )}
                         </View>
                    </TouchableOpacity>
               </Animated.View>

               <BurgerMenu visible={burgerVisible} onClose={() => setBurgerVisible(false)} />
               <ProfileMenu visible={profileVisible} onClose={() => setProfileVisible(false)} />
          </>
     );
}

const styles = StyleSheet.create({
     container: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#fff',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
          minHeight: 70,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
     },
     iconButton: {
          padding: 8,
          borderRadius: 20,
          minWidth: 44,
          minHeight: 44,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(247, 150, 34, 0.1)',
     },
     avatar: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: Colors.primary.main,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
     },
     avatarImage: {
          width: '100%',
          height: '100%',
     },
     cameraButton: {
          backgroundColor: Colors.primary.main,
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: Colors.primary.dark,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 6,
     },
});
