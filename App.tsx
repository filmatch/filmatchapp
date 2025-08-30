import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FirebaseAuthService, UserData } from './src/services/FirebaseAuthService';
import { FirestoreService } from './src/services/FirestoreService';
import AuthScreen from './src/components/AuthScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/components/OnboardingScreen';
import MainApp from './src/navigation/MainApp';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'loading' | 'welcome' | 'auth' | 'onboarding' | 'main'>('loading');
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const unsubscribe = FirebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        const userData = FirebaseAuthService.formatUserData(firebaseUser);
        setUser(userData);

        try {
          // First check Firestore for onboarding status (cloud data)
          const hasCompletedOnboarding = await FirestoreService.hasCompletedOnboarding(firebaseUser.uid);
          
          if (hasCompletedOnboarding) {
            setCurrentScreen('main');
          } else {
            // If no cloud data, check if this is a returning user with local data
            const localOnboarding = await AsyncStorage.getItem('@hasOnboarded');
            if (localOnboarding === 'true') {
              // They have local data but not cloud data, go to onboarding to re-sync
              console.log('Found local onboarding data but no cloud data, redirecting to onboarding');
              setCurrentScreen('onboarding');
            } else {
              // New user, needs onboarding
              setCurrentScreen('onboarding');
            }
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
          // Fallback to onboarding on error
          setCurrentScreen('onboarding');
        }
      } else {
        setUser(null);
        setCurrentScreen('welcome');
      }
    });

    return unsubscribe;
  }, []);

  const handleAuthComplete = async (userData: UserData) => {
    setUser(userData);
    
    try {
      // Create user profile in Firestore if it doesn't exist
      const existingProfile = await FirestoreService.getUserProfile(userData.uid);
      if (!existingProfile) {
        await FirestoreService.createUserProfile(
          userData.uid, 
          userData.email || '', 
          userData.displayName || ''
        );
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
    }
    
    setCurrentScreen('onboarding');
  };

  // THIS IS THE KEY FIX - Updated function signature
  const handleOnboardingComplete = async () => {
    console.log('Onboarding completed, navigating to main app');
    setCurrentScreen('main');
  };

  const handleLogout = async () => {
    try {
      await FirebaseAuthService.signOut();
      // Clear local cache on logout
      await AsyncStorage.removeItem('@hasOnboarded');
      await AsyncStorage.removeItem('@userPreferences');
      setUser(null);
      setCurrentScreen('welcome');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleEditPreferences = async () => {
    setCurrentScreen('onboarding');
  };

  if (currentScreen === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar style="light" />
        <Text style={styles.logo}>filmatch</Text>
        <Text style={styles.tagline}>loading...</Text>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'auth') {
    return (
      <AuthScreen 
        onAuthComplete={handleAuthComplete}
        onBack={() => setCurrentScreen('welcome')}
      />
    );
  }

  if (currentScreen === 'onboarding') {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
      />
    );
  }

  if (currentScreen === 'main') {
    return <MainApp />;
  }

  // Welcome screen (default)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>filmatch</Text>
        <Text style={styles.tagline}>match people by taste, not looks</Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.welcomeTitle}>welcome to filmatch</Text>
          <Text style={styles.welcomeText}>
            discover your perfect movie companion by sharing your taste in films
          </Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => setCurrentScreen('auth')}
          >
            <Text style={styles.buttonText}>get started</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>rate movies • find matches • start conversations</Text>
      </View>
    </SafeAreaView>
  );
}

// Keep all your existing styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111C2A',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F0E4C1',
    letterSpacing: -1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#F0E4C1',
    opacity: 0.7,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'rgba(240, 228, 193, 0.05)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.1)',
  },
  userWelcome: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F0E4C1',
    marginBottom: 15,
    textAlign: 'center',
  },
  userInfo: {
    fontSize: 14,
    color: '#F0E4C1',
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#F0E4C1',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#511619',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    marginBottom: 15,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#511619',
  },
  buttonText: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#511619',
  },
  linkButton: {
    marginTop: 10,
    paddingVertical: 10,
  },
  linkText: {
    color: '#F0E4C1',
    opacity: 0.6,
    fontSize: 14,
  },
  footer: {
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#F0E4C1',
    opacity: 0.6,
    fontSize: 12,
    textAlign: 'center',
  },
});