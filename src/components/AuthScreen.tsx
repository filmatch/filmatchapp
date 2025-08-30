import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  TouchableOpacity, 
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { FirebaseAuthService, type User, type UserData } from '../services/FirebaseAuthService';

interface AuthScreenProps {
  onAuthComplete: (user: UserData) => void;
  onBack: () => void;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  displayName?: string;
  general?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete, onBack }) => {
  const [currentStep, setCurrentStep] = useState<'auth' | 'verification'>('auth');
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [canResendEmail, setCanResendEmail] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  // Check email verification status periodically when on verification screen
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentStep === 'verification') {
      interval = setInterval(async () => {
        try {
          const isVerified = await FirebaseAuthService.checkEmailVerification(email);
          if (isVerified) {
            const currentUser = FirebaseAuthService.getCurrentUser();
            if (currentUser) {
              const userData = FirebaseAuthService.formatUserData(currentUser);
              clearInterval(interval);
              Alert.alert(
                'Email Verified!', 
                `Welcome to Filmatch, ${userData.displayName}!`,
                [{ text: 'Continue', onPress: () => onAuthComplete(userData) }]
              );
            }
          }
        } catch (error) {
          console.error('Error checking verification status:', error);
        }
      }, 3000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentStep, onAuthComplete]);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const validateDisplayName = (name: string): boolean => {
    return name.trim().length >= 2;
  };

  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignUp) {
      if (!displayName.trim()) {
        newErrors.displayName = 'Display name is required';
      } else if (!validateDisplayName(displayName)) {
        newErrors.displayName = 'Display name must be at least 2 characters';
      }

      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    return newErrors;
  };

  const clearErrors = () => {
    setErrors({});
  };

  const handleAuth = async () => {
    clearErrors();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        await FirebaseAuthService.signUp(email, password, displayName);
        Alert.alert(
          'Account Created!',
          'Please check your email and click the verification link to complete registration.',
          [{ text: 'OK', onPress: () => setCurrentStep('verification') }]
        );
      } else {
        const userData = await FirebaseAuthService.signIn(email, password);
        onAuthComplete(userData);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      
      if (errorMessage.includes('verify your email')) {
        setCurrentStep('verification');
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!canResendEmail) return;

    setIsLoading(true);
    try {
      await FirebaseAuthService.checkEmailVerification(email);
      setCanResendEmail(false);
      setResendTimer(60);
      
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResendEmail(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      Alert.alert('Verification Email Sent', 'Please check your email for the verification link.');
    } catch (error) {
      setErrors({ general: 'Failed to resend verification email. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      await FirebaseAuthService.sendPasswordReset(email);
      Alert.alert(
        'Password Reset Email Sent', 
        `A password reset link has been sent to ${email}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset email. Please try again.');
    }
  };

  const handleToggleMode = () => {
    setIsSignUp(!isSignUp);
    setCurrentStep('auth');
    clearErrors();
    setConfirmPassword('');
    setDisplayName('');
  };

  const getInputStyle = (fieldName: keyof ValidationErrors) => [
    styles.input,
    errors[fieldName] && styles.inputError
  ];

  // Verification Screen
  if (currentStep === 'verification') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => setCurrentStep('auth')} 
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← back</Text>
          </TouchableOpacity>
          <Text style={styles.logo}>filmatch</Text>
          <Text style={styles.subtitle}>verify your email</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.card}>
            <View style={styles.verificationHeader}>
              <Text style={styles.verificationTitle}>check your email</Text>
              <Text style={styles.verificationDescription}>
                We've sent a verification link to
              </Text>
              <Text style={styles.emailAddress}>{email}</Text>
              <Text style={styles.verificationInstructions}>
                Click the link in your email to verify your account. This page will automatically update once verified.
              </Text>
            </View>

            {errors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>didn't receive the email?</Text>
              <TouchableOpacity 
                onPress={handleResendVerification}
                disabled={!canResendEmail || isLoading}
                style={styles.resendButton}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#511619" />
                ) : (
                  <Text style={[
                    styles.resendButtonText,
                    (!canResendEmail || isLoading) && styles.resendDisabled
                  ]}>
                    {canResendEmail ? 'resend email' : `resend in ${resendTimer}s`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.demoHelper}>
              <Text style={styles.demoText}>
                Check your email inbox and spam folder for the verification link
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main Auth Screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← back</Text>
            </TouchableOpacity>
            <Text style={styles.logo}>filmatch</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'create your account' : 'welcome back'}
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.card}>
              <View style={styles.toggleContainer}>
                <TouchableOpacity 
                  style={[styles.toggleButton, isSignUp && styles.activeToggle]}
                  onPress={handleToggleMode}
                  disabled={isLoading}
                >
                  <Text style={[styles.toggleText, isSignUp && styles.activeToggleText]}>
                    sign up
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleButton, !isSignUp && styles.activeToggle]}
                  onPress={handleToggleMode}
                  disabled={isLoading}
                >
                  <Text style={[styles.toggleText, !isSignUp && styles.activeToggleText]}>
                    sign in
                  </Text>
                </TouchableOpacity>
              </View>

              {errors.general && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errors.general}</Text>
                </View>
              )}

              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>display name</Text>
                  <TextInput
                    style={getInputStyle('displayName')}
                    value={displayName}
                    onChangeText={(text) => {
                      setDisplayName(text);
                      if (errors.displayName) {
                        setErrors(prev => ({ ...prev, displayName: undefined }));
                      }
                    }}
                    placeholder="what should we call you?"
                    placeholderTextColor="rgba(240, 228, 193, 0.5)"
                    autoCapitalize="words"
                    editable={!isLoading}
                  />
                  {errors.displayName && (
                    <Text style={styles.fieldError}>{errors.displayName}</Text>
                  )}
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>email</Text>
                <TextInput
                  style={getInputStyle('email')}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: undefined }));
                    }
                  }}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(240, 228, 193, 0.5)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                {errors.email && (
                  <Text style={styles.fieldError}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>password</Text>
                <TextInput
                  style={getInputStyle('password')}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) {
                      setErrors(prev => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(240, 228, 193, 0.5)"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                {errors.password && (
                  <Text style={styles.fieldError}>{errors.password}</Text>
                )}
              </View>

              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>confirm password</Text>
                  <TextInput
                    style={getInputStyle('confirmPassword')}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(240, 228, 193, 0.5)"
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                  {errors.confirmPassword && (
                    <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
                  )}
                </View>
              )}

              <TouchableOpacity 
                style={[styles.button, isLoading && styles.buttonDisabled]} 
                onPress={handleAuth}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#F0E4C1" />
                    <Text style={styles.buttonText}>
                      {isSignUp ? 'creating account...' : 'signing in...'}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>
                    {isSignUp ? 'create account' : 'sign in'}
                  </Text>
                )}
              </TouchableOpacity>

              {!isSignUp && (
                <TouchableOpacity 
                  style={styles.linkButton} 
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.linkText}>forgot password?</Text>
                </TouchableOpacity>
              )}

              <View style={styles.demoHelper}>
                <Text style={styles.demoText}>
                  {isSignUp ? 'You\'ll receive an email verification link after signup' : 'Sign in with your verified account'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111C2A',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 20,
  },
  backButtonText: {
    color: '#F0E4C1',
    fontSize: 16,
    opacity: 0.8,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#F0E4C1',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#F0E4C1',
    opacity: 0.7,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: 'rgba(240, 228, 193, 0.05)',
    borderRadius: 20,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.1)',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
    borderRadius: 25,
    padding: 4,
    marginBottom: 30,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeToggle: {
    backgroundColor: '#511619',
  },
  toggleText: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.7,
  },
  activeToggleText: {
    opacity: 1,
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#F0E4C1',
    marginBottom: 15,
  },
  verificationDescription: {
    fontSize: 16,
    color: '#F0E4C1',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 5,
  },
  emailAddress: {
    fontSize: 16,
    color: '#F0E4C1',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 15,
  },
  verificationInstructions: {
    fontSize: 14,
    color: '#F0E4C1',
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#F0E4C1',
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  input: {
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: '#F0E4C1',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.2)',
  },
  inputError: {
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
  fieldError: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#511619',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#F0E4C1',
    fontSize: 14,
    opacity: 0.7,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: '#F0E4C1',
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  resendButtonText: {
    color: '#511619',
    fontSize: 14,
    fontWeight: '600',
  },
  resendDisabled: {
    opacity: 0.5,
  },
  demoHelper: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.2)',
  },
  demoText: {
    color: '#3498db',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default AuthScreen;