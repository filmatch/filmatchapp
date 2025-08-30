import { auth } from "../config/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { FirestoreService } from './FirestoreService'; // Import FirestoreService

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

export class FirebaseAuthService {
  static formatUserData(user: User): UserData {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified
    };
  }

  static onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  static async signIn(email: string, password: string): Promise<User> {
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  static async signUp(email: string, password: string, displayName: string): Promise<User> {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // CRITICAL FIX: Create user profile in Firestore immediately after signup
      await FirestoreService.createUserProfile(
        userCredential.user.uid,
        email,
        displayName
      );
      
      // Send email verification
      await sendEmailVerification(userCredential.user);
      
      return userCredential.user;
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  }

  static async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  }

  static async checkEmailVerification(): Promise<boolean> {
    const user = FirebaseAuthService.getCurrentUser();
    if (user) {
      return user.emailVerified;
    }
    return false;
  }

  static getCurrentUser(): User | null {
    return auth.currentUser;
  }

  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  }

  // NEW: Method to check if user has completed onboarding
  static async checkOnboardingStatus(): Promise<boolean> {
    try {
      const user = FirebaseAuthService.getCurrentUser();
      if (!user) return false;
      
      return await FirestoreService.hasCompletedOnboarding(user.uid);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  }
}

// Legacy exports for backward compatibility
export const signIn = FirebaseAuthService.signIn;
export const signUp = FirebaseAuthService.signUp;
export const logOut = FirebaseAuthService.signOut;

// Export auth instance and User type for use in components
export { auth };
export type { User };