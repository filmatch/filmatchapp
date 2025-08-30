// src/screens/SwipeScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  Dimensions,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/MainApp';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height * 0.7;
const CARD_WIDTH = width * 0.9;

type NavProp = StackNavigationProp<RootStackParamList>;

// User interface for matching
interface User {
  id: string;
  displayName: string;
  age: number;
  compatibility: number;
  commonMovies: string[];
  topGenres: string[];
  recentWatch?: string;
  favoriteMovie?: string;
  bio?: string;
  location?: string;
  lastActive: string;
}

// Mock users data
const SAMPLE_USERS: User[] = [
  {
    id: '1',
    displayName: 'alex',
    age: 28,
    compatibility: 94,
    commonMovies: ['the dark knight', 'parasite', 'moonlight'],
    topGenres: ['drama', 'thriller', 'sci-fi'],
    recentWatch: 'dune: part two',
    favoriteMovie: 'blade runner 2049',
    bio: 'cinephile who loves discussing plot twists and cinematography',
    location: '2.5 km away',
    lastActive: '2 hours ago',
  },
  {
    id: '2',
    displayName: 'jordan',
    age: 25,
    compatibility: 89,
    commonMovies: ['blade runner 2049', 'her', 'la la land'],
    topGenres: ['sci-fi', 'romance', 'drama'],
    recentWatch: 'everything everywhere all at once',
    favoriteMovie: 'her',
    bio: 'love films that make me cry and think about existence',
    location: '1.2 km away',
    lastActive: '1 hour ago',
  },
  {
    id: '3',
    displayName: 'sam',
    age: 31,
    compatibility: 87,
    commonMovies: ['get out', 'mad max: fury road', 'the witch'],
    topGenres: ['horror', 'action', 'thriller'],
    recentWatch: 'nope',
    favoriteMovie: 'hereditary',
    bio: 'horror enthusiast seeking someone brave enough for movie nights',
    location: '3.8 km away',
    lastActive: '30 minutes ago',
  },
  {
    id: '4',
    displayName: 'casey',
    age: 26,
    compatibility: 85,
    commonMovies: ['spirited away', 'the godfather', 'princess mononoke'],
    topGenres: ['animation', 'crime', 'drama'],
    recentWatch: 'turning red',
    favoriteMovie: 'spirited away',
    bio: 'animation lover with a soft spot for studio ghibli magic',
    location: '0.8 km away',
    lastActive: '2 hours ago',
  },
  {
    id: '5',
    displayName: 'riley',
    age: 29,
    compatibility: 82,
    commonMovies: ['pulp fiction', 'goodfellas', 'fight club'],
    topGenres: ['crime', 'drama', 'thriller'],
    recentWatch: 'the batman',
    favoriteMovie: 'goodfellas',
    bio: 'tarantino fanatic looking for someone to debate film theories with',
    location: '4.2 km away',
    lastActive: '45 minutes ago',
  },
];

interface SwipeCardProps {
  user: User;
  isTop: boolean;
  onSwipe: (direction: 'left' | 'right') => void;
  style?: any;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ user, isTop, onSwipe, style }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const getCompatibilityColor = (score: number) => {
    if (score >= 90) return '#2ecc71';
    if (score >= 80) return '#f39c12';
    if (score >= 70) return '#e67e22';
    return '#e74c3c';
  };

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const handleStateChange = (event: any) => {
    if (event.nativeEvent.state === 5) { // GESTURE_STATE_END
      const { translationX } = event.nativeEvent;
      const threshold = width * 0.3;

      if (Math.abs(translationX) > threshold) {
        const direction = translationX > 0 ? 'right' : 'left';
        
        // Animate card off screen
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: direction === 'right' ? width : -width,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onSwipe(direction);
        });
      } else {
        // Snap back to center
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }
  };

  const cardTransform = {
    transform: [
      { translateX },
      { translateY },
      {
        rotate: translateX.interpolate({
          inputRange: [-width / 2, 0, width / 2],
          outputRange: ['-10deg', '0deg', '10deg'],
          extrapolate: 'clamp',
        })
      },
    ],
  };

  return (
    <PanGestureHandler
      enabled={isTop}
      onGestureEvent={handleGestureEvent}
      onHandlerStateChange={handleStateChange}
    >
      <Animated.View style={[styles.card, style, cardTransform, { opacity }]}>
        {/* Compatibility Badge */}
        <View
          style={[
            styles.compatibilityBadge,
            { backgroundColor: getCompatibilityColor(user.compatibility) },
          ]}
        >
          <Text style={styles.compatibilityText}>{user.compatibility}%</Text>
        </View>

        {/* User Info */}
        <View style={styles.cardContent}>
          <View style={styles.userHeader}>
            <Text style={styles.displayName}>{user.displayName}</Text>
            <Text style={styles.age}>{user.age}</Text>
          </View>

          <Text style={styles.location}>{user.location}</Text>

          {user.bio && (
            <Text style={styles.bio}>"{user.bio}"</Text>
          )}

          {/* Favorite Movie */}
          {user.favoriteMovie && (
            <View style={styles.favoriteSection}>
              <Text style={styles.sectionLabel}>favorite movie:</Text>
              <Text style={styles.favoriteMovie}>{user.favoriteMovie}</Text>
            </View>
          )}

          {/* Recently Watched */}
          {user.recentWatch && (
            <View style={styles.recentSection}>
              <Text style={styles.sectionLabel}>recently watched:</Text>
              <Text style={styles.recentMovie}>{user.recentWatch}</Text>
            </View>
          )}

          {/* Common Movies */}
          <View style={styles.commonSection}>
            <Text style={styles.sectionLabel}>movies you both love:</Text>
            <Text style={styles.commonMovies}>
              {user.commonMovies.slice(0, 3).join(', ')}
              {user.commonMovies.length > 3 && ` +${user.commonMovies.length - 3} more`}
            </Text>
          </View>

          {/* Top Genres */}
          <View style={styles.genresSection}>
            <Text style={styles.sectionLabel}>top genres:</Text>
            <View style={styles.genreChips}>
              {user.topGenres.slice(0, 3).map((genre) => (
                <View key={genre} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Last Active */}
          <Text style={styles.lastActive}>active {user.lastActive}</Text>
        </View>

        {/* Swipe Indicators */}
        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.likeIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [0, width * 0.3],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Text style={styles.indicatorText}>LIKE</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.swipeIndicator,
            styles.passIndicator,
            {
              opacity: translateX.interpolate({
                inputRange: [-width * 0.3, 0],
                outputRange: [1, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        >
          <Text style={styles.indicatorText}>PASS</Text>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
};

export default function SwipeScreen() {
  const navigation = useNavigation<NavProp>();
  const [users, setUsers] = useState<User[]>(SAMPLE_USERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentUser = users[currentIndex];
    
    if (direction === 'right') {
      console.log(`Liked ${currentUser.displayName}`);
      
      // Simulate match chance
      if (Math.random() < 0.3) {
        setTimeout(() => {
          Alert.alert(
            "It's a Match!",
            `You and ${currentUser.displayName} both liked each other!`,
            [
              { text: 'Keep Swiping', style: 'default' },
              { 
                text: 'Send Message', 
                onPress: () => navigation.navigate('Chat', { chatId: `match_${currentUser.id}` })
              },
            ]
          );
        }, 500);
      }
    } else {
      console.log(`Passed on ${currentUser.displayName}`);
    }

    // Move to next user
    setCurrentIndex(prev => prev + 1);

    // Load more users if needed
    if (currentIndex >= users.length - 2) {
      loadMoreUsers();
    }
  };

  const handleButtonAction = (action: 'pass' | 'like') => {
    handleSwipe(action === 'like' ? 'right' : 'left');
  };

  const loadMoreUsers = () => {
    setLoading(true);
    // Simulate loading more users
    setTimeout(() => {
      setUsers(prev => [...prev, ...SAMPLE_USERS.map(u => ({ ...u, id: u.id + '_' + Date.now() }))]);
      setLoading(false);
    }, 1000);
  };

  if (currentIndex >= users.length) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>no more users</Text>
          <Text style={styles.emptyText}>
            check back later for new potential matches
          </Text>
          <TouchableOpacity style={styles.reloadButton} onPress={() => setCurrentIndex(0)}>
            <Text style={styles.reloadButtonText}>start over</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>discover</Text>
        <Text style={styles.headerSubtitle}>
          {users.length - currentIndex} potential matches
        </Text>
      </View>

      {/* Cards Stack */}
      <View style={styles.cardStack}>
        {/* Show next card behind */}
        {currentIndex + 1 < users.length && (
          <SwipeCard
            user={users[currentIndex + 1]}
            isTop={false}
            onSwipe={() => {}}
            style={styles.cardBehind}
          />
        )}
        
        {/* Current card on top */}
        <SwipeCard
          user={users[currentIndex]}
          isTop={true}
          onSwipe={handleSwipe}
          style={styles.cardTop}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handleButtonAction('pass')}
        >
          <Text style={styles.passButtonText}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleButtonAction('like')}
        >
          <Text style={styles.likeButtonText}>♥</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F0E4C1" />
          <Text style={styles.loadingText}>finding more matches...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111C2A',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F0E4C1',
    fontSize: 28,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  headerSubtitle: {
    color: '#F0E4C1',
    opacity: 0.7,
    marginTop: 4,
    fontSize: 16,
  },
  cardStack: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: 'rgba(240,228,193,0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(240,228,193,0.2)',
    position: 'absolute',
  },
  cardBehind: {
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
  },
  cardTop: {
    transform: [{ scale: 1 }],
    opacity: 1,
  },
  compatibilityBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 1,
  },
  compatibilityText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  cardContent: {
    padding: 24,
    paddingTop: 60,
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 8,
  },
  displayName: {
    color: '#F0E4C1',
    fontSize: 32,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  age: {
    color: '#F0E4C1',
    opacity: 0.7,
    fontSize: 24,
    marginBottom: 4,
  },
  location: {
    color: '#F0E4C1',
    opacity: 0.6,
    fontSize: 14,
    marginBottom: 16,
  },
  bio: {
    color: '#F0E4C1',
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 20,
    opacity: 0.9,
  },
  favoriteSection: {
    marginBottom: 16,
  },
  recentSection: {
    marginBottom: 16,
  },
  commonSection: {
    marginBottom: 16,
  },
  genresSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#F0E4C1',
    opacity: 0.6,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'lowercase',
  },
  favoriteMovie: {
    color: '#511619',
    fontWeight: '700',
    fontSize: 16,
  },
  recentMovie: {
    color: '#511619',
    fontWeight: '700',
    fontSize: 16,
  },
  commonMovies: {
    color: '#F0E4C1',
    fontSize: 14,
    lineHeight: 20,
  },
  genreChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    backgroundColor: 'rgba(81, 22, 25, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(81, 22, 25, 0.3)',
  },
  genreText: {
    color: '#511619',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  lastActive: {
    color: '#F0E4C1',
    opacity: 0.5,
    fontSize: 12,
    position: 'absolute',
    bottom: 24,
    left: 24,
  },
  swipeIndicator: {
    position: 'absolute',
    top: '50%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeIndicator: {
    right: 20,
    borderColor: '#2ecc71',
    transform: [{ rotate: '-20deg' }],
  },
  passIndicator: {
    left: 20,
    borderColor: '#e74c3c',
    transform: [{ rotate: '20deg' }],
  },
  indicatorText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F0E4C1',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 16,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  passButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderColor: '#e74c3c',
  },
  passButtonText: {
    color: '#e74c3c',
    fontSize: 24,
    fontWeight: '700',
  },
  likeButton: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderColor: '#2ecc71',
  },
  likeButtonText: {
    color: '#2ecc71',
    fontSize: 24,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#F0E4C1',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  emptyText: {
    color: '#F0E4C1',
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 24,
  },
  reloadButton: {
    backgroundColor: '#511619',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  reloadButtonText: {
    color: '#F0E4C1',
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17, 28, 42, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#F0E4C1',
    opacity: 0.7,
  },
});