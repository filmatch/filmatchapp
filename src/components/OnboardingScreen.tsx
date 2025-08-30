import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirestoreService } from '../services/FirestoreService';
import { FirebaseAuthService } from '../services/FirebaseAuthService';
import TMDbService, { Movie } from '../services/TMDbService';

const { width } = Dimensions.get('window');

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

interface GenreExample {
  genre: string;
  movies: Movie[];
  rating: number;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

// ---- Sample fallback (keep minimal fields)
const SAMPLE_GENRE_EXAMPLES: GenreExample[] = [
  {
    genre: 'action',
    movies: [
      { id: 101, title: 'mad max: fury road', year: 2015, poster_path: null, genres: ['Action'] } as Movie,
      { id: 102, title: 'john wick', year: 2014, poster_path: null, genres: ['Action'] } as Movie,
      { id: 103, title: 'mission impossible', year: 1996, poster_path: null, genres: ['Action'] } as Movie,
    ],
    rating: 0,
  },
  {
    genre: 'horror',
    movies: [
      { id: 201, title: 'get out', year: 2017, poster_path: null, genres: ['Horror'] } as Movie,
      { id: 202, title: 'hereditary', year: 2018, poster_path: null, genres: ['Horror'] } as Movie,
      { id: 203, title: 'the exorcist', year: 1973, poster_path: null, genres: ['Horror'] } as Movie,
    ],
    rating: 0,
  },
  {
    genre: 'romance',
    movies: [
      { id: 301, title: 'before sunrise', year: 1995, poster_path: null, genres: ['Romance'] } as Movie,
      { id: 302, title: 'the notebook', year: 2004, poster_path: null, genres: ['Romance'] } as Movie,
      { id: 303, title: 'her', year: 2013, poster_path: null, genres: ['Romance'] } as Movie,
    ],
    rating: 0,
  },
  {
    genre: 'comedy',
    movies: [
      { id: 401, title: 'superbad', year: 2007, poster_path: null, genres: ['Comedy'] } as Movie,
      { id: 402, title: 'grand budapest hotel', year: 2014, poster_path: null, genres: ['Comedy'] } as Movie,
      { id: 403, title: 'borat', year: 2006, poster_path: null, genres: ['Comedy'] } as Movie,
    ],
    rating: 0,
  },
  {
    genre: 'sci-fi',
    movies: [
      { id: 501, title: 'blade runner 2049', year: 2017, poster_path: null, genres: ['Science Fiction'] } as Movie,
      { id: 502, title: 'arrival', year: 2016, poster_path: null, genres: ['Science Fiction'] } as Movie,
      { id: 503, title: '2001: space odyssey', year: 1968, poster_path: null, genres: ['Science Fiction'] } as Movie,
    ],
    rating: 0,
  },
  {
    genre: 'drama',
    movies: [
      { id: 601, title: 'moonlight', year: 2016, poster_path: null, genres: ['Drama'] } as Movie,
      { id: 602, title: 'there will be blood', year: 2007, poster_path: null, genres: ['Drama'] } as Movie,
      { id: 603, title: 'the godfather', year: 1972, poster_path: null, genres: ['Drama'] } as Movie,
    ],
    rating: 0,
  },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState<'favorites' | 'recent' | 'genres'>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [searching, setSearching] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [recentWatches, setRecentWatches] = useState<RecentWatch[]>([]);
  const [genreRatings, setGenreRatings] = useState<GenreExample[]>(SAMPLE_GENRE_EXAMPLES);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [movieToRate, setMovieToRate] = useState<Movie | null>(null);
  const [tempRating, setTempRating] = useState(0);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [checkingExisting, setCheckingExisting] = useState(true);

  const getKeysForUser = (uid: string) => ({
    HAS: `@hasOnboarded:${uid}`,
    PREF: `@userPreferences:${uid}`,
  });

  // check existing
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const user = FirebaseAuthService.getCurrentUser?.();
        if (!user?.uid) {
          setCheckingExisting(false);
          return;
        }
        const { HAS, PREF } = getKeysForUser(user.uid);

        let remote: any = null;
        const fsAny = FirestoreService as any;
        if (typeof fsAny.getOnboardingData === 'function') {
          remote = await fsAny.getOnboardingData(user.uid);
        } else if (typeof fsAny.getUserPreferences === 'function') {
          remote = await fsAny.getUserPreferences(user.uid);
        } else if (typeof fsAny.getUserProfile === 'function') {
          remote = await fsAny.getUserProfile(user.uid);
        }

        if (remote?.completedAt) {
          await AsyncStorage.setItem(HAS, 'true');
          await AsyncStorage.setItem(PREF, JSON.stringify(remote));
          onComplete();
          return;
        }
        const localHas = await AsyncStorage.getItem(HAS);
        if (localHas === 'true') {
          onComplete();
          return;
        }
      } catch (e) {
        console.log('onboarding check failed:', e);
      } finally {
        setCheckingExisting(false);
      }
    };
    checkExisting();
  }, []);

  // load genres
  useEffect(() => {
    const loadGenreExamples = async () => {
      try {
        const popular = await TMDbService.getPopularMovies();
        const updated = SAMPLE_GENRE_EXAMPLES.map((g) => {
          const pick = popular
            .filter((m) =>
              m.genres?.some(
                (gg) =>
                  gg.toLowerCase().includes(g.genre.toLowerCase()) ||
                  (g.genre === 'sci-fi' && gg.toLowerCase().includes('science'))
              )
            )
            .slice(0, 3);
          return { ...g, movies: pick.length >= 3 ? (pick as Movie[]) : g.movies };
        });
        setGenreRatings(updated);
      } catch {
        // keep sample
      } finally {
        setLoadingGenres(false);
      }
    };
    loadGenreExamples();
  }, []);

  // search movies
  useEffect(() => {
    const search = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const results = await TMDbService.searchMovies(searchQuery.trim());
        setSearchResults(results.slice(0, 10));
      } catch (e) {
        console.error('search error:', e);
      } finally {
        setSearching(false);
      }
    };
    const t = setTimeout(search, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const addFavorite = (movie: Movie) => {
    if (favorites.length >= 4) return Alert.alert('limit', 'max 4 favorites');
    if (favorites.some((f) => f.title === movie.title)) return Alert.alert('duplicate', 'already added');
    setFavorites((prev) => [...prev, { id: `fav_${movie.id}_${Date.now()}`, title: movie.title, year: movie.year }]);
    setSearchQuery('');
  };
  const removeFavorite = (id: string) => setFavorites((prev) => prev.filter((f) => f.id !== id));

  const addRecentWatch = (movie: Movie) => {
    if (recentWatches.length >= 5) return Alert.alert('limit', 'max 5 recents');
    if (recentWatches.some((w) => w.title === movie.title)) return Alert.alert('duplicate', 'already added');
    setMovieToRate(movie);
    setTempRating(0);
    setShowRatingModal(true);
  };
  const confirmAddRecentWatch = () => {
    if (!movieToRate || tempRating === 0) return Alert.alert('rating required');
    setRecentWatches((prev) => [
      ...prev,
      { id: `recent_${movieToRate.id}_${Date.now()}`, title: movieToRate.title, year: movieToRate.year, rating: tempRating },
    ]);
    setShowRatingModal(false);
    setMovieToRate(null);
    setTempRating(0);
    setSearchQuery('');
  };
  const cancelAddRecentWatch = () => { setShowRatingModal(false); setMovieToRate(null); setTempRating(0); };
  const removeRecentWatch = (id: string) => setRecentWatches((prev) => prev.filter((r) => r.id !== id));
  const updateRecentRating = (id: string, rating: number) =>
    setRecentWatches((prev) => prev.map((r) => (r.id === id ? { ...r, rating } : r)));

  const rateGenre = (idx: number, rating: number) =>
    setGenreRatings((prev) => prev.map((g, i) => (i === idx ? { ...g, rating } : g)));

  const canProceedFromStep = () => {
    if (step === 'favorites') return favorites.length >= 2;
    if (step === 'recent') return recentWatches.length >= 3 && recentWatches.every((w) => w.rating > 0);
    if (step === 'genres') return genreRatings.filter((g) => g.rating > 0).length >= 4;
    return false;
  };

  const handleNext = async () => {
    if (step === 'favorites') return setStep('recent');
    if (step === 'recent') return setStep('genres');

    try {
      const currentUser = FirebaseAuthService.getCurrentUser();
      if (!currentUser) return Alert.alert('Error', 'No user found');
      await (FirestoreService as any).updateOnboardingData(
        currentUser.uid,
        favorites,
        recentWatches,
        genreRatings.map((g) => ({ genre: g.genre, rating: g.rating }))
      );
      const { HAS, PREF } = getKeysForUser(currentUser.uid);
      await AsyncStorage.setItem(HAS, 'true');
      await AsyncStorage.setItem(
        PREF,
        JSON.stringify({ favorites, recentWatches, genreRatings, completedAt: new Date().toISOString() })
      );
      onComplete();
    } catch (e) {
      console.error(e);
      Alert.alert('Save error', 'Could not save onboarding');
    }
  };

  const starFontFamily = Platform.select({ ios: 'System', android: 'sans-serif' });

  const renderFavoritesStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="search for movies..."
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
                  <Text style={styles.posterPlaceholderText}>No\nImage</Text>
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

      <View style={styles.selectedMovies}>
        {favorites.map((movie) => (
          <View key={movie.id} style={styles.selectedMovie}>
            <Text style={styles.selectedMovieTitle}>
              {movie.title} ({movie.year})
            </Text>
            <TouchableOpacity onPress={() => removeFavorite(movie.id)}>
              <Text style={styles.removeButton}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  const renderRecentStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="search for recent watches..."
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
                  <Text style={styles.posterPlaceholderText}>No\nImage</Text>
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

      <View style={styles.selectedMovies}>
        {recentWatches.map((movie) => (
          <View key={movie.id} style={styles.recentWatchItem}>
            <View style={styles.movieHeader}>
              <Text style={styles.selectedMovieTitle}>
                {movie.title} ({movie.year})
              </Text>
              <TouchableOpacity onPress={() => removeRecentWatch(movie.id)}>
                <Text style={styles.removeButton}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => updateRecentRating(movie.id, star)} style={styles.starButton}>
                  <Text
                    style={[
                      styles.starTextSmall,
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

  const renderGenresStep = () => {
    if (loadingGenres) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F0E4C1" />
          <Text style={styles.loadingText}>loading movie genres...</Text>
        </View>
      );
    }
    return (
      <ScrollView style={styles.stepContainer}>
        {genreRatings.map((g, index) => (
          <View key={g.genre} style={styles.genreCard}>
            <Text style={styles.genreTitle}>{g.genre}</Text>
            <View style={styles.genreMovies}>
              {g.movies.map((m) => (
                <View key={m.id} style={styles.genreMovieItem}>
                  <Text style={styles.genreMovieTitle}>{m.title}</Text>
                  <Text style={styles.genreMovieYear}>({m.year})</Text>
                </View>
              ))}
            </View>
            <View style={styles.genreRating}>
              <Text style={styles.genreRatingLabel}>how do you feel about {g.genre}?</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => rateGenre(index, star)} style={styles.starButton}>
                    <Text
                      style={[
                        styles.starText,
                        { fontFamily: starFontFamily },
                        g.rating >= star ? styles.starFilled : styles.starEmpty,
                      ]}
                    >
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.numericRating}>{g.rating}/5</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  if (checkingExisting) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#F0E4C1" />
        <Text style={{ color: '#F0E4C1', marginTop: 12, opacity: 0.7 }}>checking your preferences…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>{step === 'favorites' ? 'your favorite movies' : step === 'recent' ? 'recent watches' : 'rate these genres'}</Text>
        <Text style={styles.subtitle}>
          {step === 'favorites'
            ? `add your 4 all-time favorites (${favorites.length}/4)`
            : step === 'recent'
            ? `add and rate movies you've watched recently (${recentWatches.length}/5)`
            : 'how do you feel about these genres?'}
        </Text>

        <View style={styles.stepIndicator}>
          {['favorites', 'recent', 'genres'].map((name) => (
            <View
              key={name}
              style={[
                styles.stepDot,
                step === name && styles.activeStep,
                (step === 'recent' && name === 'favorites') ||
                (step === 'genres' && (name === 'favorites' || name === 'recent'))
                  ? styles.completedStep
                  : undefined,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.content}>
        {step === 'favorites' && renderFavoritesStep()}
        {step === 'recent' && renderRecentStep()}
        {step === 'genres' && renderGenresStep()}
      </View>

      <View style={styles.bottomActions}>
        {canProceedFromStep() && (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>{step === 'genres' ? 'complete setup' : 'next step'}</Text>
          </TouchableOpacity>
        )}
        {!canProceedFromStep() && (
          <Text style={styles.helpText}>
            {step === 'favorites'
              ? `add ${Math.max(0, 2 - favorites.length)} more favorites`
              : step === 'recent'
              ? `add ${Math.max(0, 3 - recentWatches.length)} more recent watches and rate them`
              : `rate ${Math.max(0, 4 - genreRatings.filter((x) => x.rating > 0).length)} more genres`}
          </Text>
        )}
      </View>

      {/* Rating modal */}
      <Modal visible={showRatingModal} transparent animationType="fade" onRequestClose={cancelAddRecentWatch}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>rate this movie</Text>
            {movieToRate && <Text style={styles.modalMovieTitle}>{movieToRate.title} ({movieToRate.year})</Text>}

            <View style={styles.modalStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setTempRating(star)} style={styles.modalStarButton}>
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
              <TouchableOpacity style={styles.modalCancelButton} onPress={cancelAddRecentWatch}>
                <Text style={styles.modalCancelText}>cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, tempRating === 0 && styles.modalConfirmButtonDisabled]}
                onPress={confirmAddRecentWatch}
                disabled={tempRating === 0}
              >
                <Text style={[styles.modalConfirmText, tempRating === 0 && styles.modalConfirmTextDisabled]}>add movie</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111C2A' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#F0E4C1', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#F0E4C1', opacity: 0.7, textAlign: 'center', marginBottom: 20 },

  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(240, 228, 193, 0.3)', marginHorizontal: 4 },
  activeStep: { backgroundColor: '#511619', width: 12, height: 12, borderRadius: 6 },
  completedStep: { backgroundColor: '#511619' },

  content: { flex: 1, paddingHorizontal: 20 },
  stepContainer: { flex: 1 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#F0E4C1', opacity: 0.7 },

  searchContainer: { marginBottom: 20, position: 'relative' },
  searchInput: {
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    color: '#F0E4C1',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.2)',
  },
  searchIndicator: { position: 'absolute', right: 16, top: 18 },
  searchResults: { maxHeight: 220, marginBottom: 20 },

  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(240, 228, 193, 0.05)',
    marginBottom: 8,
    borderRadius: 8,
  },

  posterThumb: {
    width: 40,
    height: 60,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: 'rgba(240, 228, 193, 0.06)',
  },
  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.15)',
  },
  posterPlaceholderText: {
    color: 'rgba(240, 228, 193, 0.5)',
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },

  movieInfo: { flex: 1 },
  movieTitle: { color: '#F0E4C1', fontSize: 16, fontWeight: '500' },
  movieYear: { color: '#F0E4C1', fontSize: 14, opacity: 0.7 },
  addButton: { color: '#511619', fontSize: 24, fontWeight: 'bold' },

  selectedMovies: { flex: 1 },
  selectedMovie: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(81, 22, 25, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedMovieTitle: { color: '#F0E4C1', fontSize: 16, flex: 1 },
  removeButton: { color: '#F0E4C1', fontSize: 24, opacity: 0.7, marginLeft: 12 },

  recentWatchItem: { backgroundColor: 'rgba(81, 22, 25, 0.2)', padding: 12, borderRadius: 8, marginBottom: 8 },
  movieHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },

  starsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  starButton: { padding: 2 },

  // Non-emoji star look
  starText: { fontSize: 24, fontWeight: 'bold' },
  starTextSmall: { fontSize: 16, fontWeight: 'bold' },
  starFilled: { color: '#F0E4C1' },
  starEmpty: { color: 'rgba(240, 228, 193, 0.3)' },

  numericRating: { color: '#F0E4C1', fontSize: 13, marginLeft: 8, opacity: 0.9 },

  genreCard: {
    backgroundColor: 'rgba(240, 228, 193, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.1)',
  },
  genreTitle: { fontSize: 20, fontWeight: 'bold', color: '#F0E4C1', textAlign: 'center', marginBottom: 16 },
  genreMovies: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  genreMovieItem: { alignItems: 'center', flex: 1 },
  genreMovieTitle: { color: '#F0E4C1', fontSize: 13, textAlign: 'center', fontWeight: '500', marginBottom: 2 },
  genreMovieYear: { color: '#F0E4C1', fontSize: 10, opacity: 0.7, textAlign: 'center' },
  genreRating: { alignItems: 'center' },
  genreRatingLabel: { color: '#F0E4C1', fontSize: 14, opacity: 0.8, marginBottom: 12 },

  bottomActions: { paddingHorizontal: 20, paddingBottom: 30, alignItems: 'center' },
  nextButton: { backgroundColor: '#511619', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 25, marginBottom: 15 },
  nextButtonText: { color: '#F0E4C1', fontSize: 16, fontWeight: '600' },
  helpText: { color: '#F0E4C1', fontSize: 14, opacity: 0.6, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: {
    backgroundColor: '#1A2B3D',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.2)',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F0E4C1', marginBottom: 6, textTransform: 'lowercase' },
  modalMovieTitle: { color: '#F0E4C1', opacity: 0.85, marginBottom: 12 },
  modalStarsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalStarButton: { paddingHorizontal: 4, paddingVertical: 2 },
  modalStarText: { fontSize: 28, fontWeight: 'bold' },
  modalNumeric: { color: '#F0E4C1', fontSize: 14, marginLeft: 8, opacity: 0.9 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 10, marginTop: 6 },
  modalCancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(240, 228, 193, 0.3)', alignItems: 'center' },
  modalCancelText: { color: '#F0E4C1', fontSize: 15 },
  modalConfirmButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#511619', alignItems: 'center' },
  modalConfirmButtonDisabled: { opacity: 0.5 },
  modalConfirmText: { color: '#F0E4C1', fontSize: 15, fontWeight: '600' },
  modalConfirmTextDisabled: { opacity: 0.8 },
});
