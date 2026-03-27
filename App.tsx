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
import TasksScreen from './src/screens/TasksScreen';
import MoreScreen from './src/screens/MoreScreen';
import GrowthScreen from './src/screens/GrowthScreen';
import VaccinationScreen from './src/screens/VaccinationScreen';
import MediaScreen from './src/screens/MediaScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ChatScreen from './src/screens/ChatScreen';
import ExportScreen from './src/screens/ExportScreen';
import SettingsScreen from './src/screens/SettingsScreen';

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
            case 'Tasks':
              iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
              break;
            case 'More':
              iconName = focused ? 'grid' : 'grid-outline';
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
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={HomeTabs} />
        <Stack.Screen name="Growth" component={GrowthScreen} />
        <Stack.Screen name="Vaccinations" component={VaccinationScreen} />
        <Stack.Screen name="Media" component={MediaScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Export" component={ExportScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
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
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
    } : {}),
  },
});
