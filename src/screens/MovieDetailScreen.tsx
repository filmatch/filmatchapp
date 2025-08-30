// src/screens/MovieDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { getAuth } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase' ;
import { TMDbService } from '../services/TMDbService';
import { Movie, MovieWithUserData, UserStatus } from '../types';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  MainTabs: undefined;
  MovieDetail: { movie: MovieWithUserData };
  Chat: { chatId?: string } | undefined;
};

type MovieDetailRouteProp = RouteProp<RootStackParamList, 'MovieDetail'>;
type MovieDetailNavProp = StackNavigationProp<RootStackParamList, 'MovieDetail'>;

export default function MovieDetailScreen() {
  const navigation = useNavigation<MovieDetailNavProp>();
  const route = useRoute<MovieDetailRouteProp>();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  const initialMovie = route.params.movie;
  const [movie, setMovie] = useState<MovieWithUserData>(initialMovie);
  const [detailedMovie, setDetailedMovie] = useState<MovieWithUserData | null>(null);
  const [tempRating, setTempRating] = useState<number>(initialMovie.userRating || 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(true);

  useEffect(() => {
    loadMovieDetails();
    loadUserData();
  }, []);

  const loadMovieDetails = async () => {
    try {
      const details = await TMDbService.getMovieDetails(movie.tmdb_id || movie.id);
      if (details) {
        const movieWithUserData: MovieWithUserData = {
          ...details,
          userRating: movie.userRating || undefined,
          userStatus: movie.userStatus || undefined,
          release_date: '',
          vote_average: 0
        };
        setDetailedMovie(movieWithUserData);
        setMovie(movieWithUserData);
      }
    } catch (error) {
      console.error('Error loading movie details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadUserData = async () => {
    if (!currentUser) return;

    try {
      const userMovieDoc = await getDoc(
        doc(db, 'users', currentUser.uid, 'movies', movie.id.toString())
      );
      
      if (userMovieDoc.exists()) {
        const userData = userMovieDoc.data();
        setMovie(prev => ({
  ...prev,
  userRating: userData.rating || undefined,
  userStatus: userData.status || undefined,
}));
        setTempRating(userData.rating || 0);
      }
    } catch (error) {
      console.error('Error loading user movie data:', error);
    }
  };

  const handleRatingChange = (rating: number) => {
    const newRating = tempRating === rating ? 0 : rating;
    setTempRating(newRating);
    setHasChanges(true);
    
    if (newRating > 0) {
      setMovie(prev => ({ ...prev, userStatus: 'watched' }));
    }
  };

  const handleStatusChange = (status: 'watched' | 'watchlist') => {
    const newStatus = movie.userStatus === status ? null : status;
    setMovie(prev => ({ ...prev, userStatus: newStatus }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to save movie data');
      return;
    }

    setIsLoading(true);
    try {
      const finalStatus = tempRating > 0 ? 'watched' : movie.userStatus;
      
      // Save to user's movies subcollection
      const userMovieRef = doc(db, 'users', currentUser.uid, 'movies', movie.id.toString());
      await setDoc(userMovieRef, {
        movieId: movie.id,
        tmdbId: movie.tmdb_id || movie.id,
        title: movie.title,
        year: movie.year,
        rating: tempRating || null,
        status: finalStatus,
        posterPath: movie.poster_path,
        genres: movie.genres,
        updatedAt: new Date(),
      }, { merge: true });

      // Update user's stats
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        let watchedCount = userData.watchedMovies || 0;
        let watchlistCount = userData.watchlistMovies || 0;
        
        // Adjust counts based on status change
        if (finalStatus === 'watched' && movie.userStatus !== 'watched') {
          watchedCount += 1;
          if (movie.userStatus === 'watchlist') watchlistCount -= 1;
        } else if (finalStatus === 'watchlist' && movie.userStatus !== 'watchlist') {
          watchlistCount += 1;
          if (movie.userStatus === 'watched') watchedCount -= 1;
        } else if (finalStatus === null) {
          if (movie.userStatus === 'watched') watchedCount -= 1;
          if (movie.userStatus === 'watchlist') watchlistCount -= 1;
        }
        
        await updateDoc(userRef, {
          watchedMovies: Math.max(0, watchedCount),
          watchlistMovies: Math.max(0, watchlistCount),
        });
      }

      const updatedMovie = {
        ...movie,
        userRating: tempRating || undefined,
        userStatus: finalStatus,
      };

      setMovie(updatedMovie);
      setHasChanges(false);

      Alert.alert(
        'Saved!',
        tempRating > 0
          ? `You rated "${movie.title}" ${tempRating} star${tempRating !== 1 ? 's' : ''}`
          : `Updated "${movie.title}" status`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error saving movie data:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const formatRuntime = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const displayMovie = detailedMovie || movie;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>

        {hasChanges && (
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#F0E4C1" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Poster & Basic Info */}
        <View style={styles.posterSection}>
          <View style={styles.posterContainer}>
            {displayMovie.poster_path ? (
              <Image
                source={movie.poster_path ? { uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` } : undefined}
                style={styles.posterImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.posterPlaceholder}>
                <Text style={styles.posterPlaceholderText}>🎬</Text>
              </View>
            )}
            {loadingDetails && (
              <View style={styles.posterOverlay}>
                <ActivityIndicator size="small" color="#F0E4C1" />
              </View>
            )}
          </View>

          <View style={styles.basicInfo}>
            <Text style={styles.title}>{displayMovie.title}</Text>
            <Text style={styles.metadata}>
              {displayMovie.year} • {formatRuntime(displayMovie.runtime)} • ⭐ {displayMovie.vote_average.toFixed(1)}
            </Text>
            {displayMovie.director && (
              <Text style={styles.director}>Directed by {displayMovie.director}</Text>
            )}
            <View style={styles.genreContainer}>
              {displayMovie.genres?.map((genre, index) => (
                <View key={`${genre}-${index}`} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>Rate This Movie</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity 
                key={star} 
                onPress={() => handleRatingChange(star)} 
                style={styles.starButton}
              >
                <Text style={[styles.star, tempRating >= star && styles.starFilled]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          {tempRating > 0 && (
            <Text style={styles.ratingLabel}>
              {tempRating} star{tempRating !== 1 ? 's' : ''}{' '}
              {tempRating === 1 && '(hated it)'}
              {tempRating === 2 && "(didn't like it)"}
              {tempRating === 3 && '(it was okay)'}
              {tempRating === 4 && '(liked it)'}
              {tempRating === 5 && '(loved it)'}
            </Text>
          )}
        </View>

        {/* Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Movie Status</Text>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                movie.userStatus === 'watched' && styles.statusButtonActive,
              ]}
              onPress={() => handleStatusChange('watched')}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  movie.userStatus === 'watched' && styles.statusButtonTextActive,
                ]}
              >
                Watched
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                movie.userStatus === 'watchlist' && styles.statusButtonActive,
              ]}
              onPress={() => handleStatusChange('watchlist')}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  movie.userStatus === 'watchlist' && styles.statusButtonTextActive,
                ]}
              >
                Watchlist
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Overview */}
        {displayMovie.overview && (
          <View style={styles.overviewSection}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.overviewText}>{displayMovie.overview}</Text>
          </View>
        )}

        {/* Cast */}
        {displayMovie.cast && displayMovie.cast.length > 0 && (
          <View style={styles.castSection}>
            <Text style={styles.sectionTitle}>Cast</Text>
            <View style={styles.castContainer}>
              {displayMovie.cast.slice(0, 5).map((actor: string, index: number) => (
                <View key={`${actor}-${index}`} style={styles.castMember}>
                  <Text style={styles.castName}>{actor}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111C2A' },
  header: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 15,
  },
  closeButton: {
    width: 40, 
    height: 40, 
    borderRadius: 20,
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  closeButtonText: { color: '#F0E4C1', fontSize: 24, fontWeight: '300' },
  saveButton: { 
    backgroundColor: '#511619', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 16 
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#F0E4C1', fontSize: 14, fontWeight: '600' },
  content: { flex: 1 },
  posterSection: { 
    paddingHorizontal: 20, 
    paddingBottom: 30, 
    alignItems: 'center' 
  },
  posterContainer: { 
    marginBottom: 20, 
    position: 'relative' 
  },
  posterImage: {
    width: width * 0.6,
    height: width * 0.9,
    borderRadius: 16,
  },
  posterPlaceholder: {
    width: width * 0.6, 
    height: width * 0.9,
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: 'rgba(240, 228, 193, 0.2)',
  },
  posterPlaceholderText: { fontSize: 48 },
  posterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  basicInfo: { alignItems: 'center' },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#F0E4C1', 
    textAlign: 'center', 
    marginBottom: 8 
  },
  metadata: { 
    fontSize: 16, 
    color: '#F0E4C1', 
    opacity: 0.7, 
    marginBottom: 4 
  },
  director: { 
    fontSize: 14, 
    color: '#F0E4C1', 
    opacity: 0.8, 
    marginBottom: 16 
  },
  genreContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center', 
    gap: 8 
  },
  genreChip: {
    backgroundColor: 'rgba(81, 22, 25, 0.2)', 
    paddingHorizontal: 12, 
    paddingVertical: 6,
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(81, 22, 25, 0.3)',
  },
  genreText: { color: '#511619', fontSize: 12, fontWeight: '600' },
  ratingSection: {
    paddingHorizontal: 20, 
    paddingBottom: 30, 
    alignItems: 'center',
    borderTopWidth: 1, 
    borderTopColor: 'rgba(240, 228, 193, 0.1)', 
    paddingTop: 30,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#F0E4C1', 
    marginBottom: 20 
  },
  starsContainer: { flexDirection: 'row', marginBottom: 12 },
  starButton: { padding: 8 },
  star: { fontSize: 32, color: 'rgba(240, 228, 193, 0.3)' },
  starFilled: { color: '#511619' },
  ratingLabel: { color: '#F0E4C1', fontSize: 14, opacity: 0.8 },
  statusSection: { 
    paddingHorizontal: 20, 
    paddingBottom: 30, 
    alignItems: 'center' 
  },
  statusButtons: { flexDirection: 'row', gap: 16 },
  statusButton: {
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 20,
    backgroundColor: 'rgba(240, 228, 193, 0.1)', 
    borderWidth: 1, 
    borderColor: 'rgba(240, 228, 193, 0.2)',
  },
  statusButtonActive: { 
    backgroundColor: '#511619', 
    borderColor: '#511619' 
  },
  statusButtonText: { 
    color: '#F0E4C1', 
    fontSize: 14, 
    fontWeight: '600', 
    opacity: 0.7 
  },
  statusButtonTextActive: { opacity: 1 },
  overviewSection: {
    paddingHorizontal: 20, 
    paddingBottom: 30,
    borderTopWidth: 1, 
    borderTopColor: 'rgba(240, 228, 193, 0.1)', 
    paddingTop: 30,
  },
  overviewText: { 
    color: '#F0E4C1', 
    fontSize: 16, 
    lineHeight: 24, 
    opacity: 0.8 
  },
  castSection: { paddingHorizontal: 20, paddingBottom: 30 },
  castContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  castMember: {
    backgroundColor: 'rgba(240, 228, 193, 0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 8,
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(240, 228, 193, 0.2)',
  },
  castName: { color: '#F0E4C1', fontSize: 14, opacity: 0.9 },
  bottomSpacing: { height: 100 },
});