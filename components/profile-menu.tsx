import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import React from 'react';
import {
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

export function ProfileMenu({ visible, onClose }: ProfileMenuProps) {
     const navigation = useNavigation();
     const { signOut, session } = useAuth();

     const handleProfile = () => {
          onClose();
          navigation.navigate('Main' as any, {
               screen: 'Profile',
          });
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
                                   <IconSymbol name="person.circle.fill" size={48} color={Colors.primary.main} />
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
