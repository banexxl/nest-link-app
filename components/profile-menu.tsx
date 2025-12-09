import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
     ActivityIndicator,
     Image,
     Modal,
     Pressable,
     StyleSheet,
     Text,
     TouchableOpacity,
     View,
} from 'react-native';

type ProfileMenuProps = {
     visible: boolean;
     onClose: () => void;
};

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

export function ProfileMenu({ visible, onClose }: ProfileMenuProps) {
     // Use the generic type for navigation to allow passing params
     const navigation = useNavigation<any>();
     const { signOut, session, tenantId } = useAuth();

     const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
     const [loadingAvatar, setLoadingAvatar] = useState(false);

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
          if (!visible) return;

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
               } catch (err) {
                    // silent fail keeps initials fallback
               } finally {
                    setLoadingAvatar(false);
               }
          };

          loadAvatar();
     }, [visible, session?.user?.id, tenantId]);

     const handleProfile = () => {
          onClose();
          navigation.navigate('Main', { screen: 'Profile' });
     };

     const handleLogout = async () => {
          onClose();
          await signOut();
          // Explicitly navigate to auth after sign out
          setTimeout(() => {
               navigation.dispatch(
                    CommonActions.reset({
                         index: 0,
                         routes: [{ name: 'Auth' }],
                    })
               );
          }, 100);
     };

     if (!visible) return null;

     return (
          <Modal
               visible={visible}
               transparent
               animationType="fade"
               onRequestClose={onClose}
               statusBarTranslucent
          >
               <Pressable style={styles.overlay} onPress={onClose}>
                    <View style={styles.menuContainer}>
                         <View style={styles.menu}>
                              {/* User Info */}
                              <View style={styles.userInfo}>
                                  <View style={styles.avatar}>
                                       {loadingAvatar ? (
                                            <ActivityIndicator color="#fff" />
                                       ) : avatarSource ? (
                                            <Image source={avatarSource} style={styles.avatarImage} />
                                       ) : (
                                            <Text style={styles.avatarText}>{initials}</Text>
                                       )}
                                  </View>
                                  <Text style={styles.userName}>{session?.user?.email || 'User'}</Text>
                              </View>

                              {/* Menu Items */}
                              <TouchableOpacity style={styles.menuItem} onPress={handleProfile}>
                                   <IconSymbol name="person.fill" size={20} color="#374151" />
                                   <Text style={styles.menuItemText}>Profile</Text>
                              </TouchableOpacity>

                              <View style={styles.divider} />

                              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                                   <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color="#dc2626" />
                                   <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
                              </TouchableOpacity>
                         </View>
                    </View>
               </Pressable>
          </Modal>
     );
}

const styles = StyleSheet.create({
     overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          justifyContent: 'flex-end',
     },
     menuContainer: {
          paddingHorizontal: 16,
          paddingBottom: 100, // Account for custom tab bar
          alignItems: 'flex-end',
     },
     menu: {
          backgroundColor: '#fff',
          borderRadius: 12,
          width: 240,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          overflow: 'hidden',
     },
     userInfo: {
          padding: 16,
          alignItems: 'center',
          gap: 8,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
     },
     avatar: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: Colors.primary.main,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
     },
     avatarImage: {
          width: '100%',
          height: '100%',
          borderRadius: 28,
     },
     avatarText: {
          color: '#fff',
          fontSize: 18,
          fontWeight: '700',
     },
     userName: {
          fontSize: 14,
          fontWeight: '600',
          color: '#111827',
     },
     menuItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 12,
     },
     menuItemText: {
          fontSize: 16,
          color: '#374151',
          fontWeight: '500',
     },
     logoutText: {
          color: '#dc2626',
     },
     divider: {
          height: 1,
          backgroundColor: '#e5e7eb',
          marginHorizontal: 16,
     },
});
