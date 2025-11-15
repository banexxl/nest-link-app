import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
     Animated,
     Dimensions,
     Modal,
     Pressable,
     StyleSheet,
     Text,
     TouchableOpacity,
     View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

type MenuItem = {
     label: string;
     route: string;
     icon: any;
};

const menuItems: MenuItem[] = [
     { label: 'Home', route: 'Home', icon: 'house.fill' },
     { label: 'Explore', route: 'Explore', icon: 'paperplane.fill' },
     { label: 'Announcements', route: 'Announcements', icon: 'megaphone.fill' },
     { label: 'Calendar', route: 'Calendar', icon: 'calendar' },
     { label: 'Polls', route: 'Polls', icon: 'chart.bar.fill' },
     { label: 'Chat', route: 'Chat', icon: 'bubble.left.and.bubble.right.fill' },
     { label: 'Issues', route: 'Issues', icon: 'exclamationmark.bubble.fill' },
];

type BurgerMenuProps = {
     visible: boolean;
     onClose: () => void;
};

export function BurgerMenu({ visible, onClose }: BurgerMenuProps) {
     const [slideAnim] = useState(new Animated.Value(-DRAWER_WIDTH));
     const navigation = useNavigation();

     React.useEffect(() => {
          if (visible) {
               Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
               }).start();
          } else {
               Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 250,
                    useNativeDriver: true,
               }).start();
          }
     }, [visible, slideAnim]);

     const handleNavigation = (route: string) => {
          onClose();
          setTimeout(() => {
               navigation.navigate('Main' as any, {
                    screen: route,
               });
          }, 300);
     };

     return (
          <Modal
               visible={visible}
               transparent
               animationType="none"
               onRequestClose={onClose}
               statusBarTranslucent
          >
               <View style={styles.modalContainer}>
                    <Pressable style={styles.overlay} onPress={onClose} />
                    <Animated.View
                         style={[
                              styles.drawer,
                              {
                                   transform: [{ translateX: slideAnim }],
                              },
                         ]}
                    >
                         <SafeAreaView style={styles.drawerContent}>
                              {/* Header */}
                              <View style={styles.header}>
                                   <Text style={styles.appTitle}>Menu</Text>
                                   <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                        <IconSymbol name="xmark" size={24} color="#666" />
                                   </TouchableOpacity>
                              </View>

                              {/* Menu Items */}
                              <View style={styles.menuItems}>
                                   {menuItems.map((item, index) => (
                                        <TouchableOpacity
                                             key={index}
                                             style={styles.menuItem}
                                             onPress={() => handleNavigation(item.route)}
                                        >
                                             <IconSymbol name={item.icon} size={22} color={Colors.primary.main} />
                                             <Text style={styles.menuItemText}>{item.label}</Text>
                                        </TouchableOpacity>
                                   ))}
                              </View>
                         </SafeAreaView>
                    </Animated.View>
               </View>
          </Modal>
     );
}

const styles = StyleSheet.create({
     burgerButton: {
          padding: 8,
     },
     modalContainer: {
          flex: 1,
          flexDirection: 'row',
     },
     overlay: {
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
     },
     drawer: {
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: '#fff',
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
          elevation: 5,
     },
     drawerContent: {
          flex: 1,
     },
     header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
     },
     appTitle: {
          fontSize: 24,
          fontWeight: '700',
          color: Colors.primary.main,
     },
     closeButton: {
          padding: 4,
     },
     menuItems: {
          flex: 1,
          paddingTop: 12,
     },
     menuItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 14,
          gap: 16,
     },
     menuItemText: {
          fontSize: 16,
          color: '#111827',
          fontWeight: '500',
     },
     footer: {
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingHorizontal: 20,
          paddingVertical: 16,
     },
     logoutButton: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          paddingVertical: 12,
     },
     logoutText: {
          fontSize: 16,
          color: '#dc2626',
          fontWeight: '600',
     },
});
