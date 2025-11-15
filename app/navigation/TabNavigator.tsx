import { CustomTabBar } from '@/components/custom-tab-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

// Import tab screens
import AnnouncementsScreen from '../(tabs)/announcements';
import CalendarScreen from '../(tabs)/calendar';
import ChatScreen from '../(tabs)/chat';
import ExploreScreen from '../(tabs)/explore';
import HomeScreen from '../(tabs)/index';
import IssuesScreen from '../(tabs)/issues';
import PollsScreen from '../(tabs)/polls';
import ProfileScreen from '../(tabs)/profile';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
     return (
          <Tab.Navigator
               tabBar={(props) => <CustomTabBar {...props} />}
               screenOptions={{
                    headerShown: false,
               }}
          >
               <Tab.Screen name="Home" component={HomeScreen} />
               <Tab.Screen name="Explore" component={ExploreScreen} />
               <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
               <Tab.Screen name="Calendar" component={CalendarScreen} />
               <Tab.Screen name="Polls" component={PollsScreen} />
               <Tab.Screen name="Chat" component={ChatScreen} />
               <Tab.Screen name="Issues" component={IssuesScreen} />
               <Tab.Screen name="Profile" component={ProfileScreen} />
          </Tab.Navigator>
     );
}
