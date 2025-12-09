import { Tabs } from 'expo-router';
import React from 'react';

import { CustomTabBar } from '@/components/custom-tab-bar';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors.primary.main,
        tabBarInactiveTintColor:
          colorScheme === 'dark' ? Colors.secondary.light : Colors.secondary.dark,
        headerShown: false,
        animation: 'fade',
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="announcements"
        options={{
          title: 'News',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="megaphone.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="polls"
        options={{
          title: 'Polls',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bubble.left.and.bubble.right.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="issues"
        options={{
          title: 'Issues',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="exclamationmark.bubble.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
