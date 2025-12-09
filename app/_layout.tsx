import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppState, Platform, Text, View } from 'react-native';
import AuthScreen from './auth/index';
import RequestAccessScreen from './auth/request-access';
import ResetPasswordScreen from './auth/reset-password';
import TabNavigator from './navigation/TabNavigator';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { session, loading } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade', // smooth fade between screens
      }}
    >
      {session ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="Modal"
            component={() => <View><Text>Modal</Text></View>}
            options={{ presentation: 'modal' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          <Stack.Screen name="RequestAccess" component={RequestAccessScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Keep the native splash screen visible until we decide to hide it
  useEffect(() => {
    SplashScreen.preventAutoHideAsync().catch(() => { });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const hideNavigationBar = () => {
      NavigationBar.setVisibilityAsync('hidden').catch(() => { });
    };

    hideNavigationBar();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') hideNavigationBar();
    });

    return () => sub.remove();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer
        theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
      >
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
