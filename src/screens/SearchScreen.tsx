// src/screens/SearchScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import TMDbService, { Movie } from '../services/TMDbService';
import debounce from 'lodash.debounce';

const { width } = Dimensions.get('window');

export default function SearchScreen() {
  // if you have proper RootStack types, you can type this:
  // const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const navigation = useNavigation<any>();

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDiscoverContent();
  }, []);

  const loadDiscoverContent = async () => {
    try {
      const [trending, popular] = await Promise.all([
        TMDbService.getTrendingMovies('week'),
        TMDbService.getPopularMovies(),
      ]);
      setTrendingMovies((trending ?? []).slice(0, 10));
      setPopularMovies((popular ?? []).slice(0, 10));
    } catch (error) {
      console.error('Error loading discover content:', error);
      Alert.alert('error', 'failed to load movies. please check your connection.');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDiscoverContent();
    setRefreshing(false);
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }
      try {
        const results = await TMDbService.searchMovies(searchQuery);
        setSearchResults(results ?? []);
      } catch (error) {
        console.error('Search error:', error);
        Alert.alert('error', 'search failed. please try again.');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    // cleanup debounce on unmount to prevent memory leaks
    return () => {
      // @ts-ignore lodash.debounce has cancel
      debouncedSearch.cancel?.();
    };
  }, [debouncedSearch]);

  const handleSearchChange = (text: string) => {
    setQuery(text);
    setSearchLoading(true);
    debouncedSearch(text);
  };

  const handlePress = (movie: Movie) => {
    navigation.navigate('MovieDetail', { movie });
  };

  // Render movie item for search results (list style)
  const renderSearchItem = ({ item }: { item: Movie }) => {
    const year = (item as any).year ?? (item as any).release_year ?? '';
    const ratingNum = (item as any).rating ?? (item as any).vote_average ?? 0;
    const rating = Number.isFinite(ratingNum) ? ratingNum : 0;
    const genres = Array.isArray((item as any).genres) ? (item as any).genres : [];

    return (
      <TouchableOpacity style={styles.searchItem} onPress={() => handlePress(item)}>
        <View style={styles.posterContainer}>
          {item.poster_path ? (
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
              style={styles.posterImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Text style={styles.posterPlaceholderText}>🎬</Text>
            </View>
          )}
        </View>

        <View style={styles.movieInfo}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.meta}>
            {year || '—'} • ⭐ {rating.toFixed(1)}
          </Text>
          {!!genres.length && (
            <Text style={styles.genres} numberOfLines={1}>
              {genres.slice(0, 3).join(', ')}
            </Text>
          )}
          {item.director && (
            <Text style={styles.director} numberOfLines={1}>
              directed by {item.director}
            </Text>
          )}
          {item.overview && (
            <Text style={styles.overview} numberOfLines={2}>
              {item.overview}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Discover card (horizontal)
  const renderDiscoverCard = ({ item }: { item: Movie }) => {
    const year = (item as any).year ?? (item as any).release_year ?? '';
    const ratingNum = (item as any).rating ?? (item as any).vote_average ?? 0;
    const rating = Number.isFinite(ratingNum) ? ratingNum : 0;
    const genres = Array.isArray((item as any).genres) ? (item as any).genres : [];

    return (
      <TouchableOpacity style={styles.discoverCard} onPress={() => handlePress(item)}>
        <View style={styles.cardPoster}>
          {item.poster_path ? (
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
              style={styles.cardPosterImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.cardPosterPlaceholder}>
              <Text style={styles.cardPosterPlaceholderText}>🎬</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cardMeta}>
          {year || '—'} • ⭐ {rating.toFixed(1)}
        </Text>
        {!!genres.length && (
          <Text style={styles.cardGenres} numberOfLines={1}>
            {genres.slice(0, 2).join(', ')}
          </Text>
        )}
        {item.director && (
          <Text style={styles.cardDirector} numberOfLines={1}>
            {item.director}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // Grid card (2-column)
  const renderGridCard = ({ item }: { item: Movie }) => {
    const year = (item as any).year ?? (item as any).release_year ?? '';
    const ratingNum = (item as any).rating ?? (item as any).vote_average ?? 0;
    const rating = Number.isFinite(ratingNum) ? ratingNum : 0;
    const genres = Array.isArray((item as any).genres) ? (item as any).genres : [];

    return (
      <TouchableOpacity style={styles.gridCard} onPress={() => handlePress(item)}>
        <View style={styles.gridPoster}>
          {item.poster_path ? (
            <Image
              source={{ uri: `https://image.tmdb.org/t/p/w500${item.poster_path}` }}
              style={styles.gridPosterImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.gridPosterPlaceholder}>
              <Text style={styles.gridPosterPlaceholderText}>🎬</Text>
            </View>
          )}
        </View>
        <Text style={styles.gridTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.gridMeta}>
          {year || '—'} • ⭐ {rating.toFixed(1)}
        </Text>
        {!!genres.length && (
          <Text style={styles.gridGenres} numberOfLines={1}>
            {genres.slice(0, 2).join(', ')}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderDiscoverSection = (title: string, data: Movie[], isGrid: boolean = false) => (
    <View style={styles.discoverSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{data.length} movies</Text>
      </View>

      {isGrid ? (
        <FlatList
          data={data}
          keyExtractor={(item) => `${title}-${item.id}`}
          renderItem={renderGridCard}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          scrollEnabled={false}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => `${title}-${item.id}`}
          renderItem={renderDiscoverCard}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      )}
    </View>
  );

  // Show search results if there's a query
  if (query.trim()) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>search movies</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            value={query}
            onChangeText={handleSearchChange}
            placeholder="search for movies..."
            placeholderTextColor="rgba(240, 228, 193, 0.5)"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchLoading && (
            <View style={styles.searchLoader}>
              <ActivityIndicator size="small" color="#F0E4C1" />
            </View>
          )}
        </View>

        {/* Search Results */}
        {searchLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#F0E4C1" />
            <Text style={styles.loadingText}>searching movies...</Text>
          </View>
        ) : searchResults.length > 0 ? (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => `search-${item.id}`}
            renderItem={renderSearchItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.searchListContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyTitle}>no results found</Text>
            <Text style={styles.emptyText}>try searching with different keywords</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Show discover content when no search query
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.discoverContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F0E4C1" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>discover & search</Text>
          <Text style={styles.subheading}>find your next favorite film</Text>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <TextInput
            value={query}
            onChangeText={handleSearchChange}
            placeholder="search for movies..."
            placeholderTextColor="rgba(240, 228, 193, 0.5)"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        {discoverLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#F0E4C1" />
            <Text style={styles.loadingText}>loading featured movies...</Text>
          </View>
        ) : (
          <View>
            {trendingMovies.length > 0 && renderDiscoverSection('trending this week', trendingMovies)}
            {popularMovies.length > 0 &&
              renderDiscoverSection('popular movies', popularMovies.slice(0, 6), true)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_W = width * 0.55;
const GRID_CARD_W = (width - 48) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111C2A',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heading: {
    color: '#F0E4C1',
    fontSize: 28,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  subheading: {
    color: '#F0E4C1',
    opacity: 0.7,
    marginTop: 4,
    fontSize: 16,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  searchInput: {
    backgroundColor: 'rgba(240,228,193,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(240,228,193,0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#F0E4C1',
    fontSize: 16,
    paddingRight: 50,
  },
  searchLoader: {
    position: 'absolute',
    right: 16,
    top: 12,
  },
  discoverContent: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,
  },
  loadingText: {
    color: '#F0E4C1',
    marginTop: 12,
    opacity: 0.7,
  },
  emptyTitle: {
    color: '#F0E4C1',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  emptyText: {
    color: '#F0E4C1',
    opacity: 0.7,
    textAlign: 'center',
  },

  // Search Results Styles
  searchListContent: {
    paddingBottom: 32,
  },
  searchItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  posterContainer: {
    width: 60,
    height: 90,
    borderRadius: 8,
    backgroundColor: 'rgba(240,228,193,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(240,228,193,0.2)',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    fontSize: 24,
  },
  movieInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  meta: {
    color: '#F0E4C1',
    opacity: 0.7,
    marginBottom: 4,
    fontSize: 13,
  },
  genres: {
    color: '#511619',
    fontWeight: '700',
    textTransform: 'lowercase',
    fontSize: 12,
    marginBottom: 4,
  },
  director: {
    color: '#F0E4C1',
    opacity: 0.6,
    fontSize: 12,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  overview: {
    color: '#F0E4C1',
    opacity: 0.5,
    fontSize: 12,
    lineHeight: 16,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
    marginHorizontal: 16,
  },

  // Discover Section Styles
  discoverSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F0E4C1',
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  sectionCount: {
    color: '#F0E4C1',
    opacity: 0.5,
    fontSize: 12,
  },
  horizontalList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  discoverCard: {
    width: CARD_W,
    borderRadius: 16,
    backgroundColor: 'rgba(240,228,193,0.06)',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(240,228,193,0.15)',
  },
  cardPoster: {
    height: CARD_W * 1.2,
    borderRadius: 12,
    backgroundColor: 'rgba(240,228,193,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardPosterImage: {
    width: '100%',
    height: '100%',
  },
  cardPosterPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPosterPlaceholderText: {
    fontSize: 48,
  },
  cardTitle: {
    color: '#F0E4C1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  cardMeta: {
    color: '#F0E4C1',
    opacity: 0.7,
    marginBottom: 4,
    fontSize: 12,
  },
  cardGenres: {
    color: '#511619',
    fontWeight: '700',
    textTransform: 'lowercase',
    fontSize: 12,
    marginBottom: 2,
  },
  cardDirector: {
    color: '#F0E4C1',
    opacity: 0.6,
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Grid Styles
  gridContent: {
    paddingHorizontal: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridCard: {
    width: GRID_CARD_W,
    borderRadius: 16,
    backgroundColor: 'rgba(240,228,193,0.06)',
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(240,228,193,0.15)',
  },
  gridPoster: {
    height: GRID_CARD_W * 1.2,
    borderRadius: 12,
    backgroundColor: 'rgba(240,228,193,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  gridPosterImage: {
    width: '100%',
    height: '100%',
  },
  gridPosterPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridPosterPlaceholderText: {
    fontSize: 32,
  },
  gridTitle: {
    color: '#F0E4C1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 18,
  },
  gridMeta: {
    color: '#F0E4C1',
    opacity: 0.7,
    marginBottom: 4,
    fontSize: 11,
  },
  gridGenres: {
    color: '#511619',
    fontWeight: '700',
    textTransform: 'lowercase',
    fontSize: 11,
  },
});
