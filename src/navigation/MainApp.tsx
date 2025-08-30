// src/navigation/MainApp.tsx
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import SearchScreen from '../screens/SearchScreen';
import MovieDetailScreen from '../screens/MovieDetailScreen';
import SwipeScreen from '../screens/SwipeScreen'; // New swiping screen
import ChatsScreen from '../screens/ChatsScreen'; // Renamed from MatchesScreen
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import EditPreferencesScreen from '../screens/EditPreferencesScreen';
import { Movie } from "../types"; 

export type RootStackParamList = {
  MainTabs: undefined;
  MovieDetail: { movie: Movie };
  Chat: { chatId?: string } | undefined;
  EditPreferences: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111C2A',
          borderTopColor: 'rgba(240, 228, 193, 0.2)',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#511619',
        tabBarInactiveTintColor: 'rgba(240, 228, 193, 0.6)',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          textTransform: 'lowercase',
        },
      }}
    >
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
      <Tab.Screen
        name="Match"
        component={SwipeScreen}
        options={{
          tabBarLabel: 'match',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💫</Text>,
        }}
      />
      <Tab.Screen
        name="Chats"
        component={ChatsScreen}
        options={{
          tabBarLabel: 'chats',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'search',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔍</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default function MainApp() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: '#111C2A' },
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="MovieDetail"
          component={MovieDetailScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="EditPreferences"
          component={EditPreferencesScreen}
          options={{ presentation: 'card' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}