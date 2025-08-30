// src/screens/MatchesScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// ---- Types ----
interface Match {
  id: string;
  userId: string;
  displayName: string;
  age?: number;
  compatibility: number;
  commonMovies: string[];
  topGenres: string[];
  recentWatch?: string;
  isLiked: boolean;
  isMatched: boolean;
  lastActive: string;
}

// ---- Mock data ----
const SAMPLE_MATCHES: Match[] = [
  {
    id: '1',
    userId: 'user1',
    displayName: 'alex',
    age: 28,
    compatibility: 94,
    commonMovies: ['the dark knight', 'parasite', 'moonlight'],
    topGenres: ['drama', 'thriller', 'sci-fi'],
    recentWatch: 'dune: part two',
    isLiked: false,
    isMatched: false,
    lastActive: '2 hours ago',
  },
  {
    id: '2',
    userId: 'user2',
    displayName: 'jordan',
    age: 25,
    compatibility: 89,
    commonMovies: ['blade runner 2049', 'her', 'la la land'],
    topGenres: ['sci-fi', 'romance', 'drama'],
    recentWatch: 'everything everywhere all at once',
    isLiked: true,
    isMatched: true,
    lastActive: '1 day ago',
  },
  {
    id: '3',
    userId: 'user3',
    displayName: 'sam',
    age: 31,
    compatibility: 87,
    commonMovies: ['get out', 'mad max: fury road'],
    topGenres: ['horror', 'action', 'thriller'],
    recentWatch: 'nope',
    isLiked: false,
    isMatched: false,
    lastActive: '3 hours ago',
  },
  {
    id: '4',
    userId: 'user4',
    displayName: 'casey',
    age: 26,
    compatibility: 85,
    commonMovies: ['spirited away', 'the godfather'],
    topGenres: ['animation', 'crime', 'drama'],
    recentWatch: 'turning red',
    isLiked: true,
    isMatched: false,
    lastActive: '5 hours ago',
  },
  {
    id: '5',
    userId: 'user5',
    displayName: 'riley',
    age: 29,
    compatibility: 82,
    commonMovies: ['pulp fiction', 'goodfellas', 'fight club'],
    topGenres: ['crime', 'drama', 'thriller'],
    recentWatch: 'the batman',
    isLiked: false,
    isMatched: false,
    lastActive: '1 hour ago',
  },
];

// ---- Card ----
interface MatchCardProps {
  match: Match;
  onLike: (matchId: string) => void;
  onPass: (matchId: string) => void;
  onMessage: (match: Match) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onLike, onPass, onMessage }) => {
  const getCompatibilityColor = (score: number) => {
    if (score >= 90) return '#2ecc71';
    if (score >= 80) return '#f39c12';
    if (score >= 70) return '#e67e22';
    return '#e74c3c';
  };

  return (
    <View style={styles.matchCard}>
      {/* Header */}
      <View style={styles.matchHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{match.displayName}</Text>
          {match.age != null && <Text style={styles.age}>{match.age}</Text>}
        </View>
        <View
          style={[
            styles.compatibilityBadge,
            { backgroundColor: getCompatibilityColor(match.compatibility) },
          ]}
        >
          <Text style={styles.compatibilityText}>{match.compatibility}%</Text>
        </View>
      </View>

      {/* Common Movies */}
      <View style={styles.commonSection}>
        <Text style={styles.sectionLabel}>you both loved:</Text>
        <Text style={styles.commonMovies}>
          {match.commonMovies.slice(0, 3).join(', ')}
          {match.commonMovies.length > 3 && ` +${match.commonMovies.length - 3} more`}
        </Text>
      </View>

      {/* Top Genres */}
      <View style={styles.genresSection}>
        <Text style={styles.sectionLabel}>top genres:</Text>
        <View style={styles.genreChips}>
          {match.topGenres.slice(0, 3).map((genre) => (
            <View key={genre} style={styles.genreChip}>
              <Text style={styles.genreText}>{genre}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity */}
      {match.recentWatch && (
        <View style={styles.recentSection}>
          <Text style={styles.recentText}>
            recently watched: <Text style={styles.recentMovie}>{match.recentWatch}</Text>
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionButtons}>
        {match.isMatched ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={() => onMessage(match)}
          >
            <Text style={styles.messageButtonText}>message</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.passButton]}
              onPress={() => onPass(match.id)}
            >
              <Text style={styles.passButtonText}>pass</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.likeButton,
                match.isLiked && styles.likeButtonActive,
              ]}
              onPress={() => onLike(match.id)}
            >
              <Text
                style={[
                  styles.likeButtonText,
                  match.isLiked && styles.likeButtonTextActive,
                ]}
              >
                {match.isLiked ? 'liked' : 'like'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Match Badge */}
      {match.isMatched && (
        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeText}>matched!</Text>
        </View>
      )}

      {/* Last Active */}
      <Text style={styles.lastActive}>active {match.lastActive}</Text>
    </View>
  );
};

// ---- Screen ----
interface MatchesScreenProps {
  navigation: any;
}

export default function MatchesScreen({ navigation }: MatchesScreenProps) {
  const [matches, setMatches] = useState<Match[]>(SAMPLE_MATCHES);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'matches' | 'liked'>('all');

  const filteredMatches = matches.filter((m) => {
    switch (filter) {
      case 'matches':
        return m.isMatched;
      case 'liked':
        return m.isLiked && !m.isMatched;
      default:
        return true;
    }
  });

  const handleLike = (matchId: string) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, isLiked: !m.isLiked } : m)),
    );

    // Simulate mutual match chance when you like someone new
    const justLiked = matches.find((m) => m.id === matchId);
    if (justLiked && !justLiked.isLiked) {
      setTimeout(() => {
        if (Math.random() < 0.3) {
          setMatches((prev) =>
            prev.map((m) =>
              m.id === matchId ? { ...m, isMatched: true, isLiked: true } : m,
            ),
          );
        }
      }, 800);
    }
  };

  const handlePass = (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
  };

  // UPDATED: generate a chatId and navigate with it
  const handleMessage = (match: Match) => {
    const chatId = `chat_${match.userId}_${Date.now()}`;
    navigation.navigate('Chat', { chatId });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // fake network delay
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  const getFilterCount = (filterType: 'all' | 'matches' | 'liked') => {
    switch (filterType) {
      case 'matches':
        return matches.filter((m) => m.isMatched).length;
      case 'liked':
        return matches.filter((m) => m.isLiked && !m.isMatched).length;
      default:
        return matches.length;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>your matches</Text>
        <Text style={styles.headerSubtitle}>
          {filteredMatches.length} potential connections
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'matches', 'liked'] as const).map((filterType) => (
          <TouchableOpacity
            key={filterType}
            style={[styles.filterTab, filter === filterType && styles.filterTabActive]}
            onPress={() => setFilter(filterType)}
          >
            <Text
              style={[
                styles.filterText,
                filter === filterType && styles.filterTextActive,
              ]}
            >
              {filterType} ({getFilterCount(filterType)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            filteredMatches.length === 0 && { flex: 1 },
          ]}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              onLike={handleLike}
              onPass={handlePass}
              onMessage={handleMessage}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>no results</Text>
              <Text style={styles.emptyText}>
                try changing the filter or check back later
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ---- Styles ----
// (Dark base with your brand-ish accents: teal + gold + sand)
const COLORS = {
  bg: '#0d1117',
  card: '#11161d',
  text: '#e6edf3',
  sub: 'rgba(230,237,243,0.6)',
  line: 'rgba(220,216,167,0.12)', // sand tint
  accent: '#1C6F75', // teal
  accentSoft: 'rgba(28,111,117,0.18)',
  gold: '#E1B604',
  sand: '#DCD8A7',
  danger: '#e74c3c',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  headerSubtitle: {
    color: COLORS.sub,
    marginTop: 4,
  },

  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 4,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  filterTabActive: {
    backgroundColor: COLORS.accentSoft,
    borderColor: COLORS.accent,
  },
  filterText: {
    color: COLORS.sub,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  filterTextActive: {
    color: COLORS.text,
  },

  listContent: {
    padding: 12,
    paddingBottom: 24,
  },

  matchCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  displayName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  age: {
    color: COLORS.sub,
    fontSize: 16,
  },
  compatibilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  compatibilityText: {
    color: '#0b0f14',
    fontWeight: '800',
  },

  commonSection: {
    marginTop: 4,
  },
  sectionLabel: {
    color: COLORS.sub,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'lowercase',
  },
  commonMovies: {
    color: COLORS.text,
  },

  genresSection: {
    marginTop: 10,
  },
  genreChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.accentSoft,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  genreText: {
    color: COLORS.text,
    fontWeight: '600',
    textTransform: 'lowercase',
  },

  recentSection: {
    marginTop: 10,
  },
  recentText: {
    color: COLORS.sub,
  },
  recentMovie: {
    color: COLORS.sand,
    fontWeight: '700',
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  passButton: {
    borderColor: COLORS.line,
    backgroundColor: 'transparent',
  },
  passButtonText: {
    color: COLORS.sub,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  likeButton: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  likeButtonActive: {
    backgroundColor: COLORS.accent,
  },
  likeButtonText: {
    color: COLORS.accent,
    fontWeight: '800',
    textTransform: 'lowercase',
  },
  likeButtonTextActive: {
    color: '#0b0f14',
  },
  messageButton: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(225,182,4,0.18)',
  },
  messageButtonText: {
    color: COLORS.gold,
    fontWeight: '800',
    textTransform: 'lowercase',
  },

  matchBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: 'rgba(225,182,4,0.15)',
    borderColor: COLORS.gold,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchBadgeText: {
    color: COLORS.gold,
    fontWeight: '700',
    textTransform: 'lowercase',
  },

  lastActive: {
    color: COLORS.sub,
    marginTop: 8,
    fontSize: 12,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'lowercase',
  },
  emptyText: {
    color: COLORS.sub,
    textAlign: 'center',
  },
});
