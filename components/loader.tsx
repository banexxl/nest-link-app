import React from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, View } from 'react-native';


const PRIMARY_COLOR = '#f68a00';

const Loader: React.FC = () => {
     return (
          <ImageBackground
               source={require('../assets/images/login-bg.png')}
               style={styles.background}
               resizeMode="cover"
               blurRadius={6}
          >
               <View style={styles.overlay}>
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} />
               </View>
          </ImageBackground>
     );
};

export default Loader;

const styles = StyleSheet.create({
     background: {
          flex: 1,
     },
     overlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.35)',
          alignItems: 'center',
          justifyContent: 'center',
     },
});
