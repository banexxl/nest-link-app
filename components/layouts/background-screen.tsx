import React from 'react';
import { ImageBackground, StyleSheet, View, type ViewStyle } from 'react-native';

const BACKGROUND_IMAGE = require('@/assets/images/login-bg.png');

type BackgroundScreenProps = {
     children: React.ReactNode;
     style?: ViewStyle | ViewStyle[];
};

const BackgroundScreen: React.FC<BackgroundScreenProps> = ({ children, style }) => {
     return (
          <View style={[styles.root, style]}>
               <ImageBackground
                    source={BACKGROUND_IMAGE}
                    style={styles.background}
                    resizeMode="cover"
                    blurRadius={6}
               >
                    <View style={styles.overlay}>{children}</View>
               </ImageBackground>
          </View>
     );
};

export default BackgroundScreen;

const styles = StyleSheet.create({
     root: {
          flex: 1,
          marginTop: 30,
     },
     background: {
          flex: 1,
     },
     overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.25)',
     },
});
