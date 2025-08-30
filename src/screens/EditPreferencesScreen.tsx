// src/screens/EditPreferencesScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { FirebaseAuthService } from '../services/FirebaseAuthService';
import { FirestoreService, UserProfile } from '../services/FirestoreService';
import TMDbService, { Movie } from '../services/TMDbService';

interface FavoriteMovie {
  id: string;
  title: string;
  year: number;
}

interface RecentWatch {
  id: string;
  title: string;
  year: number;
  rating: number;
}

interface GenreRating {
  genre: string;
  rating: number;
}

export default function EditPreferencesScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'favorites' | 'recent' | 'genres'>('favorites');
  
  // Data states
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [recentWatches, setRecentWatches] = useState<RecentWatch[]>([]);
  const [genreRatings, setGenreRatings] = useState<GenreRating[]>([]);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  
  // Modal states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [movieToRate, setMovieToRate] = useState<Movie | null>(null);
  const [tempRating, setTempRating] = useState(0);

  const starFontFamily = Platform.select({ ios: 'System', android: 'sans-serif' });

  useEffect(() => {
    loadUserData();
  }, []);

  // Search movies effect
  useEffect(() => {
    const search = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const results = await TMDbService.searchMovies(searchQuery.trim());
        setSearchResults(results.slice(0, 8));
      } catch (e) {
        console.error('search error:', e);
      } finally {
        setSearching(false);
      }
    };
    const t = setTimeout(search, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadUserData = async () => {
    try {
      const currentUser = FirebaseAuthService.getCurrentUser();
      if (!currentUser) return;

      const profile = await FirestoreService.getUserProfile(currentUser.uid);
      if (profile) {
        setFavorites(profile.favorites || []);
        setRecentWatches(profile.recentWatches || []);
        setGenreRatings(profile.genreRatings || []);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load your preferences');
    } finally {
      setLoading(false);
    }
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      const currentUser = FirebaseAuthService.getCurrentUser();
      if (!currentUser) return;

      await FirestoreService.updateUserPreferences(currentUser.uid, {
        favorites,
        recentWatches,
        genreRatings,
      });

      Alert.alert('Success', 'Your preferences have been updated!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Favorites functions
  const addFavorite = (movie: Movie) => {
    if (favorites.length >= 4) {
      return Alert.alert('Limit Reached', 'You can only have 4 favorite movies');
    }
    if (favorites.some((f) => f.title === movie.title && f.year === movie.year)) {
      return Alert.alert('Already Added', 'This movie is already in your favorites');
    }
    setFavorites(prev => [...prev, {
      id: `fav_${movie.id}_${Date.now()}`,
      title: movie.title,
      year: movie.year
    }]);
    setSearchQuery('');
  };

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  // Recent watches functions
  const addRecentWatch = (movie: Movie) => {
    if (recentWatches.length >= 10) {
      return Alert.alert('Limit Reached', 'You can only have 10 recent watches');
    }
    if (recentWatches.some((w) => w.title === movie.title && w.year === movie.year)) {
      return Alert.alert('Already Added', 'This movie is already in your recent watches');
    }
    setMovieToRate(movie);
    setTempRating(0);
    setShowRatingModal(true);
  };

  const confirmAddRecentWatch = () => {
    if (!movieToRate || tempRating === 0) {
      return Alert.alert('Rating Required', 'Please select a rating for this movie');
    }
    setRecentWatches(prev => [...prev, {
      id: `recent_${movieToRate.id}_${Date.now()}`,
      title: movieToRate.title,
      year: movieToRate.year,
      rating: tempRating
    }]);
    setShowRatingModal(false);
    setMovieToRate(null);
    setTempRating(0);
    setSearchQuery('');
  };

  const removeRecentWatch = (id: string) => {
    setRecentWatches(prev => prev.filter(w => w.id !== id));
  };

  const updateRecentRating = (id: string, rating: number) => {
    setRecentWatches(prev => prev.map(w => 
      w.id === id ? { ...w, rating } : w
    ));
  };

  // Genre functions
  const updateGenreRating = (genre: string, rating: number) => {
    setGenreRatings(prev => {
      const existing = prev.find(g => g.genre === genre);
      if (existing) {
        return prev.map(g => g.genre === genre ? { ...g, rating } : g);
      } else {
        return [...prev, { genre, rating }];
      }
    });
  };

  const renderTabContent = () => {
    if (activeTab === 'favorites') {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Favorite Movies ({favorites.length}/4)</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for movies to add..."
              placeholderTextColor="rgba(240, 228, 193, 0.5)"
            />
            {searching && <ActivityIndicator style={styles.searchIndicator} color="#F0E4C1" />}
          </View>

          {searchResults.length > 0 && (
            <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
              {searchResults.map((movie) => (
                <TouchableOpacity key={movie.id} style={styles.searchResultItem} onPress={() => addFavorite(movie)}>
                  {movie.poster_path ? (
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w92${movie.poster_path}` }}
                      style={styles.posterThumb}
                    />
                  ) : (
                    <View style={[styles.posterThumb, styles.posterPlaceholder]}>
                      <Text style={styles.posterPlaceholderText}>No{'\n'}Image</Text>
                    </View>
                  )}
                  <View style={styles.movieInfo}>
                    <Text style={styles.movieTitle}>{movie.title}</Text>
                    <Text style={styles.movieYear}>{movie.year}</Text>
                  </View>
                  <Text style={styles.addButton}>+</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.currentItems}>
            {favorites.map((movie) => (
              <View key={movie.id} style={styles.currentItem}>
                <View style={styles.movieInfo}>
                  <Text style={styles.currentItemTitle}>{movie.title}</Text>
                  <Text style={styles.currentItemYear}>({movie.year})</Text>
                </View>
                <TouchableOpacity onPress={() => removeFavorite(movie.id)}>
                  <Text style={styles.removeButton}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (activeTab === 'recent') {
      return (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Recent Watches ({recentWatches.length}/10)</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search for movies to add..."
              placeholderTextColor="rgba(240, 228, 193, 0.5)"
            />
            {searching && <ActivityIndicator style={styles.searchIndicator} color="#F0E4C1" />}
          </View>

          {searchResults.length > 0 && (
            <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
              {searchResults.map((movie) => (
                <TouchableOpacity key={movie.id} style={styles.searchResultItem} onPress={() => addRecentWatch(movie)}>
                  {movie.poster_path ? (
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w92${movie.poster_path}` }}
                      style={styles.posterThumb}
                    />
                  ) : (
                    <View style={[styles.posterThumb, styles.posterPlaceholder]}>
                      <Text style={styles.posterPlaceholderText}>No{'\n'}Image</Text>
                    </View>
                  )}
                  <View style={styles.movieInfo}>
                    <Text style={styles.movieTitle}>{movie.title}</Text>
                    <Text style={styles.movieYear}>{movie.year}</Text>
                  </View>
                  <Text style={styles.addButton}>+</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.currentItems}>
            {recentWatches.map((movie) => (
              <View key={movie.id} style={styles.recentItem}>
                <View style={styles.movieHeader}>
                  <View style={styles.movieInfo}>
                    <Text style={styles.currentItemTitle}>{movie.title}</Text>
                    <Text style={styles.currentItemYear}>({movie.year})</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeRecentWatch(movie.id)}>
                    <Text style={styles.removeButton}>×</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity 
                      key={star} 
                      onPress={() => updateRecentRating(movie.id, star)}
                      style={styles.starButton}
                    >
                      <Text
                        style={[
                          styles.starText,
                          { fontFamily: starFontFamily },
                          movie.rating >= star ? styles.starFilled : styles.starEmpty,
                        ]}
                      >
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.numericRating}>{movie.rating}/5</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      );
    }

    if (activeTab === 'genres') {
      const genres = ['action', 'adventure', 'animation', 'comedy', 'crime', 'documentary', 'drama', 'family', 'fantasy', 'horror', 'music', 'mystery', 'romance', 'sci-fi', 'thriller', 'western'];
      
      return (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Genre Preferences</Text>
          <Text style={styles.sectionSubtitle}>Rate genres from 1-5 stars (0 = not interested)</Text>
          
          <ScrollView style={styles.genresList}>
            {genres.map((genre) => {
              const currentRating = genreRatings.find(g => g.genre === genre)?.rating || 0;
              return (
                <View key={genre} style={styles.genreItem}>
                  <Text style={styles.genreTitle}>{genre}</Text>
                  <View style={styles.starsRow}>
                    <TouchableOpacity 
                      onPress={() => updateGenreRating(genre, 0)}
                      style={[styles.zeroButton, currentRating === 0 && styles.zeroButtonActive]}
                    >
                      <Text style={[styles.zeroText, currentRating === 0 && styles.zeroTextActive]}>0</Text>
                    </TouchableOpacity>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity 
                        key={star} 
                        onPress={() => updateGenreRating(genre, star)}
                        style={styles.starButton}
                      >
                        <Text
                          style={[
                            styles.starText,
                            { fontFamily: starFontFamily },
                            currentRating >= star ? styles.starFilled : styles.starEmpty,
                          ]}
                        >
                          ★
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <Text style={styles.numericRating}>{currentRating}/5</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F0E4C1" />
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Preferences</Text>
        <TouchableOpacity 
          onPress={saveChanges} 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#F0E4C1" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['favorites', 'recent', 'genres'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {renderTabContent()}
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate this movie</Text>
            {movieToRate && (
              <Text style={styles.modalMovieTitle}>
                {movieToRate.title} ({movieToRate.year})
              </Text>
            )}

            <View style={styles.modalStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity 
                  key={star} 
                  onPress={() => setTempRating(star)}
                  style={styles.modalStarButton}
                >
                  <Text
                    style={[
                      styles.modalStarText,
                      { fontFamily: starFontFamily },
                      tempRating >= star ? styles.starFilled : styles.starEmpty,
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.modalNumeric}>{tempRating}/5</Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton} 
                onPress={() => {
                  setShowRatingModal(false);
                  setMovieToRate(null);
                  setTempRating(0);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  tempRating === 0 && styles.modalConfirmButtonDisabled
                ]}
                onPress={confirmAddRecentWatch}
                disabled={tempRating === 0}
              >
                <Text style={[
                  styles.modalConfirmText,
                  tempRating === 0 && styles.modalConfirmTextDisabled
                ]}>
                  Add Movie
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111C2A',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#F0E4C1',
    opacity: 0.7,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 228, 193, 0.2)',
  },
  backButton: {
    padding: 4,
  },
  backText: {
    color: '#F0E4C1',
    fontSize: 16,
  },
  headerTitle: {
    color: '#F0E4C1',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#511619',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '600',
  },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 228, 193, 0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#511619',
  },
  tabText: {
    color: 'rgba(240, 228, 193, 0.6)',
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  activeTabText: {
    color: '#F0E4C1',
  },

  content: {
    flex: 1,
  },

  tabContent: {
    flex: 1,
    padding: 20,
  },

  sectionTitle: {
    color: '#F0E4C1',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  sectionSubtitle: {
    color: 'rgba(240, 228, 193, 0.7)',
    fontSize: 14,
    marginBottom: 20,
  },

  searchContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#F0E4C1',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.2)',
  },
  searchIndicator: {
    position: 'absolute',
    right: 16,
    top: 14,
  },

  searchResults: {
    maxHeight: 200,
    marginBottom: 20,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(240, 228, 193, 0.05)',
    marginBottom: 8,
    borderRadius: 8,
  },
  posterThumb: {
    width: 35,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  posterPlaceholder: {
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterPlaceholderText: {
    color: 'rgba(240, 228, 193, 0.5)',
    fontSize: 8,
    textAlign: 'center',
  },
  movieInfo: {
    flex: 1,
  },
  movieTitle: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '500',
  },
  movieYear: {
    color: 'rgba(240, 228, 193, 0.7)',
    fontSize: 14,
  },
  addButton: {
    color: '#511619',
    fontSize: 24,
    fontWeight: 'bold',
  },

  currentItems: {
    gap: 8,
  },
  currentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(81, 22, 25, 0.2)',
    padding: 12,
    borderRadius: 8,
  },
  currentItemTitle: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '500',
  },
  currentItemYear: {
    color: 'rgba(240, 228, 193, 0.7)',
    fontSize: 14,
  },
  removeButton: {
    color: 'rgba(240, 228, 193, 0.7)',
    fontSize: 24,
    fontWeight: 'bold',
  },

  recentItem: {
    backgroundColor: 'rgba(81, 22, 25, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  movieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    padding: 2,
  },
  starText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  starFilled: {
    color: '#F0E4C1',
  },
  starEmpty: {
    color: 'rgba(240, 228, 193, 0.3)',
  },
  numericRating: {
    color: '#F0E4C1',
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.8,
  },

  genresList: {
    flex: 1,
  },
  genreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 228, 193, 0.1)',
  },
  genreTitle: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '500',
    textTransform: 'capitalize',
    flex: 1,
  },
  zeroButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.3)',
  },
  zeroButtonActive: {
    backgroundColor: '#511619',
    borderColor: '#511619',
  },
  zeroText: {
    color: 'rgba(240, 228, 193, 0.6)',
    fontSize: 14,
    fontWeight: 'bold',
  },
  zeroTextActive: {
    color: '#F0E4C1',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#1A2B3D',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F0E4C1',
    marginBottom: 8,
  },
  modalMovieTitle: {
    color: 'rgba(240, 228, 193, 0.8)',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalStarButton: {
    padding: 4,
  },
  modalStarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalNumeric: {
    color: '#F0E4C1',
    fontSize: 16,
    marginLeft: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.3)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#F0E4C1',
    fontSize: 16,
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#511619',
    alignItems: 'center',
  },
  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmTextDisabled: {
    opacity: 0.7,
  },
});