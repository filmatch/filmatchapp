// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/MainApp';
import { FirebaseAuthService } from '../services/FirebaseAuthService';
import { FirestoreService, UserProfile } from '../services/FirestoreService';
import TMDbService from '../services/TMDbService';

type PosterCache = Record<string, string | null>;

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [posterCache, setPosterCache] = useState<PosterCache>({});
  const [postersLoading, setPostersLoading] = useState(false);

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const starFontFamily = Platform.select({ ios: 'System', android: 'sans-serif' });

  useEffect(() => {
    loadUserProfile();
  }, []);

  useEffect(() => {
    if (!userProfile) return;
    fetchMissingPosters(userProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.favorites, userProfile?.recentWatches]);

  const loadUserProfile = async () => {
    try {
      const currentUser = FirebaseAuthService.getCurrentUser();
      if (!currentUser) {
        Alert.alert('error', 'no user found. please sign in again.');
        return;
      }
      const profile = await FirestoreService.getUserProfile(currentUser.uid);
      if (profile) {
        setUserProfile(profile);
      } else {
        Alert.alert('error', 'could not load user profile.');
      }
    } catch (error) {
      console.error('error loading user profile:', error);
      Alert.alert('error', 'failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await FirebaseAuthService.signOut();
    } catch (error) {
      console.error('error signing out:', error);
      Alert.alert('error', 'failed to sign out.');
    }
  };

  const confirmSignOut = () => {
    Alert.alert('sign out', 'are you sure you want to sign out?', [
      { text: 'cancel', style: 'cancel' },
      { text: 'sign out', onPress: handleSignOut, style: 'destructive' },
    ]);
  };

  const keyFor = (title: string, year?: number) =>
    `${(title || '').trim().toLowerCase()}-${year || ''}`;

  const fetchMissingPosters = async (profile: UserProfile) => {
    const want: { title: string; year?: number }[] = [];

    const favs = (profile.favorites || []).slice(0, 4);
    favs.forEach((f) => {
      const k = keyFor(f.title, f.year as any);
      if (!(k in posterCache)) want.push({ title: f.title, year: f.year as any });
    });

    (profile.recentWatches || []).forEach((r) => {
      const k = keyFor(r.title, r.year as any);
      if (!(k in posterCache)) want.push({ title: r.title, year: r.year as any });
    });

    if (!want.length) return;

    setPostersLoading(true);
    try {
      const updates: PosterCache = {};
      for (const w of want) {
        try {
          const results = await TMDbService.searchMovies(w.title);
          let match = results.find((m) => (m.year ? m.year === w.year : false)) || results[0];
          updates[keyFor(w.title, w.year)] = match?.poster_path ?? null;
        } catch (_) {
          updates[keyFor(w.title, w.year)] = null;
        }
      }
      setPosterCache((prev) => ({ ...prev, ...updates }));
    } finally {
      setPostersLoading(false);
    }
  };

  const fourFavorites = useMemo(
    () => (userProfile?.favorites || []).slice(0, 4),
    [userProfile?.favorites]
  );

const handleEditPreferences = () => {
  navigation.navigate('EditPreferences');
};

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F0E4C1" />
          <Text style={styles.loadingText}>loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>could not load profile data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUserProfile}>
            <Text style={styles.retryButtonText}>retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalWatches = (userProfile.recentWatches || []).length;
  const totalFavorites = (userProfile.favorites || []).length;
  const ratedGenres = (userProfile.genreRatings || []).filter(g => g.rating > 0).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile Header - Letterboxd style */}
        <View style={styles.profileHeader}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {(userProfile.displayName || userProfile.email || 'u').charAt(0).toLowerCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.displayName}>
                {(userProfile.displayName || 'movie lover').toLowerCase()}
              </Text>
              <Text style={styles.userEmail}>{(userProfile.email || '').toLowerCase()}</Text>
            </View>
          </View>
          
          <View style={styles.profileStats}>
            <View style={styles.statColumn}>
              <Text style={styles.statNumber}>{totalFavorites}</Text>
              <Text style={styles.statLabel}>films</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statNumber}>{totalWatches}</Text>
              <Text style={styles.statLabel}>this year</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statNumber}>{ratedGenres}</Text>
              <Text style={styles.statLabel}>genres</Text>
            </View>
          </View>
        </View>

        {/* Favorite Films - Letterboxd 2x2 grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>favorite films</Text>
            <Text style={styles.sectionMeta}>{fourFavorites.length}/4</Text>
          </View>

          <View style={styles.favoritesGrid}>
            {Array.from({ length: 4 }).map((_, idx) => {
  const fav = fourFavorites[idx];
  if (!fav) {
    return (
      <View key={`empty-${idx}`} style={[styles.posterSlot, styles.emptySlot]} />
    );
  }
              const k = keyFor(fav.title, fav.year as any);
              const poster = posterCache[k];

              return (
                <TouchableOpacity key={fav.id} style={styles.posterSlot}>
                  {poster ? (
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w342${poster}` }}
                      style={styles.posterImage}
                    />
                  ) : (
                    <View style={[styles.posterImage, styles.posterPlaceholder]}>
                      <Text style={styles.posterPlaceholderText}>no{'\n'}image</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Recent Diary Entries - Letterboxd style */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>recent diary entries</Text>
            <Text style={styles.sectionMeta}>
              {totalWatches > 0 ? `last ${Math.min(totalWatches, 5)}` : 'none yet'}
            </Text>
          </View>

          <View style={styles.diaryContainer}>
            {(userProfile.recentWatches || []).length === 0 ? (
              <Text style={styles.emptyText}>no diary entries yet</Text>
            ) : (
              (userProfile.recentWatches || []).map((movie) => {
                const k = keyFor(movie.title, movie.year as any);
                const poster = posterCache[k];
                return (
                  <View key={movie.id} style={styles.diaryEntry}>
                    <View style={styles.diaryPoster}>
                      {poster ? (
                        <Image
                          source={{ uri: `https://image.tmdb.org/t/p/w154${poster}` }}
                          style={styles.diaryPosterImage}
                        />
                      ) : (
                        <View style={[styles.diaryPosterImage, styles.posterPlaceholder]}>
                          <Text style={styles.posterPlaceholderText}>no{'\n'}image</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.diaryContent}>
                      <Text style={styles.diaryTitle}>
                        {movie.title.toLowerCase()}
                      </Text>
                      <Text style={styles.diaryYear}>{movie.year}</Text>
                      
                      <View style={styles.diaryRating}>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Text
                              key={star}
                              style={[
                                styles.starText,
                                { fontFamily: starFontFamily },
                                movie.rating >= star ? styles.starFilled : styles.starEmpty,
                              ]}
                            >
                              ★
                            </Text>
                          ))}
                        </View>
                        <Text style={styles.ratingNumber}>{movie.rating}/5</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Genre Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>top genres</Text>
            <Text style={styles.sectionMeta}>
              {ratedGenres > 0 ? `${ratedGenres} rated` : 'none rated'}
            </Text>
          </View>

          <View style={styles.genresGrid}>
            {(userProfile.genreRatings || []).length === 0 ? (
              <Text style={styles.emptyText}>no genre preferences set</Text>
            ) : (
              (userProfile.genreRatings || [])
                .filter((g) => g.rating > 0)
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 6)
                .map((genre) => (
                  <View key={genre.genre} style={styles.genreChip}>
                    <Text style={styles.genreTitle}>{genre.genre.toLowerCase()}</Text>
                    <View style={styles.genreStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text
                          key={star}
                          style={[
                            styles.genreStarText,
                            { fontFamily: starFontFamily },
                            genre.rating >= star ? styles.starFilled : styles.starEmpty,
                          ]}
                        >
                          ★
                        </Text>
                      ))}
                    </View>
                  </View>
                ))
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleEditPreferences}>
            <Text style={styles.primaryButtonText}>edit preferences</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={confirmSignOut}>
            <Text style={styles.secondaryButtonText}>sign out</Text>
          </TouchableOpacity>
        </View>

        {postersLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color="#F0E4C1" />
            <Text style={styles.loadingText}>fetching posters...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const POSTER_SIZE = (width - 60) / 4 - 6; 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111C2A',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#F0E4C1',
    fontSize: 16,
    opacity: 0.8,
    textTransform: 'lowercase',
  },

  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 40,
  },
  errorText: {
    color: '#F0E4C1',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    textTransform: 'lowercase',
  },
  retryButton: {
    backgroundColor: '#511619',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'lowercase',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Profile Header - Letterboxd inspired
  profileHeader: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(240, 228, 193, 0.1)',
  },

  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#511619',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#F0E4C1',
    fontSize: 24,
    fontWeight: 'bold',
    textTransform: 'lowercase',
  },

  userDetails: {
    flex: 1,
  },
  displayName: {
    color: '#F0E4C1',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'lowercase',
  },
  userEmail: {
    color: '#F0E4C1',
    fontSize: 14,
    opacity: 0.7,
    textTransform: 'lowercase',
  },

  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(240, 228, 193, 0.05)',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.1)',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: '#F0E4C1',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: '#F0E4C1',
    fontSize: 12,
    opacity: 0.7,
    textTransform: 'lowercase',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(240, 228, 193, 0.2)',
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#F0E4C1',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'lowercase',
  },
  sectionMeta: {
    color: '#F0E4C1',
    fontSize: 14,
    opacity: 0.6,
    textTransform: 'lowercase',
  },

  // Favorites - Letterboxd 2x2 grid
favoritesGrid: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 8,
},
  posterSlot: {
    width: POSTER_SIZE,
    height: POSTER_SIZE * 1.5, // Movie poster ratio
    borderRadius: 4,
    overflow: 'hidden',
  },
  posterImage: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
  },

 emptySlot: {
  backgroundColor: 'rgba(240, 228, 193, 0.03)',
  borderWidth: 1,
  borderColor: 'rgba(240, 228, 193, 0.1)',
  borderStyle: 'dashed',
  },

  posterPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.15)',
  },
  posterPlaceholderText: {
    color: '#F0E4C1',
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.5,
    textTransform: 'lowercase',
    lineHeight: 12,
  },

  // Diary Entries - Letterboxd style
  diaryContainer: {
    gap: 10,
  },
  diaryEntry: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 228, 193, 0.03)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.08)',
  },
  diaryPoster: {
    marginRight: 12,
  },
  diaryPosterImage: {
    width: 50,
    height: 75,
    borderRadius: 4,
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
  },
  diaryContent: {
    flex: 1,
    justifyContent: 'center',
  },
  diaryTitle: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'lowercase',
  },
  diaryYear: {
    color: '#F0E4C1',
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
  },
  diaryRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  starsRow: {
    flexDirection: 'row',
    marginRight: 8,
  },
  starText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 1,
  },
  starFilled: {
    color: '#F0E4C1',
  },
  starEmpty: {
    color: 'rgba(240, 228, 193, 0.3)',
  },
  ratingNumber: {
    color: '#F0E4C1',
    fontSize: 12,
    opacity: 0.7,
  },

  // Genres
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    backgroundColor: 'rgba(240, 228, 193, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genreTitle: {
    color: '#F0E4C1',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  genreStars: {
    flexDirection: 'row',
  },
  genreStarText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Empty states
  emptyText: {
    color: '#F0E4C1',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.5,
    fontStyle: 'italic',
    paddingVertical: 20,
    textTransform: 'lowercase',
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#511619',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(240, 228, 193, 0.3)',
  },
  secondaryButtonText: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'lowercase',
  },

  // Loading indicator
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
  },
});