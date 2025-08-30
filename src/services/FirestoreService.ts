// src/services/FirestoreService.ts
import { db as firestore } from "../config/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp,
  DocumentData 
} from 'firebase/firestore';

export interface FavoriteMovie {
  id: string;
  title: string;
  year: number;
}

export interface RecentWatch {
  id: string;
  title: string;
  year: number;
  rating: number;
}

export interface GenreRating {
  genre: string;
  rating: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: any; // Firebase timestamp
  hasCompletedOnboarding: boolean;
  favorites: FavoriteMovie[];
  recentWatches: RecentWatch[];
  genreRatings: GenreRating[];
  lastUpdated: any; // Firebase timestamp
}

export class FirestoreService {
  // Create user profile when they first sign up
  static async createUserProfile(
    uid: string, 
    email: string, 
    displayName: string
  ): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', uid);
      
      const userProfile: UserProfile = {
        uid,
        email,
        displayName,
        createdAt: serverTimestamp(),
        hasCompletedOnboarding: false,
        favorites: [],
        recentWatches: [],
        genreRatings: [],
        lastUpdated: serverTimestamp(),
      };

      await setDoc(userRef, userProfile);
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Get user profile
  static async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(firestore, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user onboarding data
  static async updateOnboardingData(
    uid: string, 
    favorites: FavoriteMovie[], 
    recentWatches: RecentWatch[], 
    genreRatings: GenreRating[]
  ): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', uid);
      
      await updateDoc(userRef, {
        favorites,
        recentWatches,
        genreRatings,
        hasCompletedOnboarding: true,
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating onboarding data:', error);
      throw error;
    }
  }

  // Get onboarding data - used by onboarding screen to check existing data
  static async getOnboardingData(uid: string) {
    try {
      const ref = doc(firestore, 'users', uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      
      const data = snap.data() || {};
      return {
        favorites: data.favorites ?? [],
        recentWatches: data.recentWatches ?? [],
        genreRatings: data.genreRatings ?? [],
        completedAt: data.hasCompletedOnboarding ? data.lastUpdated : null,
      };
    } catch (error) {
      console.error('Error getting onboarding data:', error);
      return null;
    }
  }

  // Check if user has completed onboarding
  static async hasCompletedOnboarding(uid: string): Promise<boolean> {
    try {
      const profile = await this.getUserProfile(uid);
      return profile?.hasCompletedOnboarding ?? false;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }

  // Update user preferences - this is the key method for the edit preferences screen
  static async updateUserPreferences(
    uid: string, 
    preferences: {
      favorites: FavoriteMovie[];
      recentWatches: RecentWatch[];
      genreRatings: GenreRating[];
    }
  ): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', uid);
      
      await updateDoc(userRef, {
        favorites: preferences.favorites,
        recentWatches: preferences.recentWatches,
        genreRatings: preferences.genreRatings,
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Reset onboarding status - removes the need for the annoying "sign out" flow
  static async resetOnboardingStatus(uid: string): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', uid);
      await updateDoc(userRef, {
        hasCompletedOnboarding: false,
        favorites: [],
        recentWatches: [],
        genreRatings: [],
        lastUpdated: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error resetting onboarding status:', error);
      throw error;
    }
  }
}