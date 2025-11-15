import { BurgerMenu } from '@/components/burger-menu';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ProfileMenu } from './profile-menu';

export function CustomTabBar(props: BottomTabBarProps) {
     const [burgerVisible, setBurgerVisible] = useState(false);
     const [profileVisible, setProfileVisible] = useState(false);

     const handleCamera = () => {
          // TODO: Open camera or photo upload
          console.log('Camera pressed');
     };

     return (
          <>
               <View style={styles.container}>
                    {/* Left - Burger Menu */}
                    <TouchableOpacity
                         style={styles.iconButton}
                         onPress={() => {
                              console.log('Burger menu pressed');
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
                              console.log('Profile menu pressed');
                              setProfileVisible(true);
                         }}
                         activeOpacity={0.7}
                    >
                         <IconSymbol name="person.circle.fill" size={28} color={Colors.primary.main} />
                    </TouchableOpacity>
               </View>

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
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
          minHeight: 70,
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
