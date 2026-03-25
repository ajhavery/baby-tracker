import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import FeedsScreen from './src/screens/FeedsScreen';
import DiapersScreen from './src/screens/DiapersScreen';
import GrowthScreen from './src/screens/GrowthScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MediaScreen from './src/screens/MediaScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Feeds':
              iconName = focused ? 'nutrition' : 'nutrition-outline';
              break;
            case 'Diapers':
              iconName = focused ? 'layers' : 'layers-outline';
              break;
            case 'Growth':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
            case 'Media':
              iconName = focused ? 'camera' : 'camera-outline';
              break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#636E72',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#E0E0E0',
          paddingBottom: Platform.OS === 'web' ? 8 : 24,
          paddingTop: 8,
          height: Platform.OS === 'web' ? 64 : 88,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Feeds" component={FeedsScreen} />
      <Tab.Screen name="Diapers" component={DiapersScreen} />
      <Tab.Screen name="Growth" component={GrowthScreen} />
      <Tab.Screen name="Media" component={MediaScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={HomeTabs} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // On web desktop, constrain to phone-width for native feel
  if (Platform.OS === 'web') {
    return (
      <View style={webStyles.outer}>
        <View style={webStyles.phone}>
          <AppContent />
        </View>
      </View>
    );
  }

  return <AppContent />;
}

const webStyles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#E8E8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: '100%',
    height: '100%',
    maxWidth: 430,
    backgroundColor: '#F8F9FE',
    overflow: 'hidden',
    // On actual phones this fills the screen; on desktop it's centered
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
    } : {}),
  },
});
