// src/navigation/AuthNavigator.tsx
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { User } from 'firebase/auth';
import { FirebaseAuthService, UserData } from '../services/FirebaseAuthService';
import { FirestoreService } from '../services/FirestoreService';

// Import your screens
import AuthScreen from '../components/AuthScreen'; // Your login/signup screen
import OnboardingScreen from '../components/OnboardingScreen'; // Updated onboarding
import MainApp from './MainApp'; // Your main app navigator

type AuthState = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated';

export default function AuthNavigator() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = FirebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email);
      
      if (!firebaseUser) {
        // User is signed out
        setUser(null);
        setAuthState('unauthenticated');
        return;
      }

      // User is signed in, check onboarding status
      setUser(firebaseUser);
      
      try {
        // Check if user has completed onboarding
        const hasCompleted = await FirestoreService.hasCompletedOnboarding(firebaseUser.uid);
        console.log('Has completed onboarding:', hasCompleted);
        
        if (hasCompleted) {
          setAuthState('authenticated');
        } else {
          setAuthState('onboarding');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // If we can't check onboarding status, assume they need to do it
        setAuthState('onboarding');
      }
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  const handleOnboardingComplete = () => {
    console.log('Onboarding completed, navigating to main app');
    setAuthState('authenticated');
  };

  // Loading state
  if (authState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F0E4C1" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show appropriate screen based on auth state
  switch (authState) {
    case 'unauthenticated':
      return <AuthScreen onAuthComplete={function (user: UserData): void {
          throw new Error('Function not implemented.');
      } } onBack={function (): void {
          throw new Error('Function not implemented.');
      } } />;
    
    case 'onboarding':
      return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    
    case 'authenticated':
      return <MainApp />;
    
    default:
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Something went wrong</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111C2A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#F0E4C1',
    fontSize: 16,
    opacity: 0.7,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
});