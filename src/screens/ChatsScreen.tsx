// src/screens/ChatsScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/MainApp';

type NavProp = StackNavigationProp<RootStackParamList>;

interface ChatPreview {
  id: string;
  userId: string;
  displayName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
  compatibility: number;
  commonMovies: string[];
  matchedOn: string;
}

const SAMPLE_CHATS: ChatPreview[] = [
  {
    id: 'chat_1',
    userId: 'user1',
    displayName: 'alex',
    lastMessage: 'have you seen the new dune movie yet?',
    lastMessageTime: '2m ago',
    unreadCount: 2,
    isOnline: true,
    compatibility: 94,
    commonMovies: ['the dark knight', 'parasite', 'moonlight'],
    matchedOn: '2 days ago',
  },
  {
    id: 'chat_2',
    userId: 'user2',
    displayName: 'jordan',
    lastMessage: 'that cinematography in blade runner 2049 though ✨',
    lastMessageTime: '1h ago',
    unreadCount: 0,
    isOnline: false,
    compatibility: 89,
    commonMovies: ['blade runner 2049', 'her', 'la la land'],
    matchedOn: '1 week ago',
  },
  {
    id: 'chat_3',
    userId: 'user3',
    displayName: 'sam',
    lastMessage: 'you: totally! the sound design was incredible',
    lastMessageTime: '3h ago',
    unreadCount: 0,
    isOnline: true,
    compatibility: 87,
    commonMovies: ['get out', 'mad max: fury road'],
    matchedOn: '3 days ago',
  },
  {
    id: 'chat_4',
    userId: 'user4',
    displayName: 'casey',
    lastMessage: 'studio ghibli marathon this weekend?',
    lastMessageTime: '1d ago',
    unreadCount: 1,
    isOnline: false,
    compatibility: 85,
    commonMovies: ['spirited away', 'the godfather'],
    matchedOn: '5 days ago',
  },
];

interface ChatItemProps {
  chat: ChatPreview;
  onPress: (chatId: string) => void;
}

const ChatItem: React.FC<ChatItemProps> = ({ chat, onPress }) => {
  const isFromUser = chat.lastMessage.startsWith('you:');
  const displayMessage = isFromUser 
    ? chat.lastMessage.substring(4).trim() 
    : chat.lastMessage;

  return (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => onPress(chat.id)}
      activeOpacity={0.7}
    >
      {/* Online indicator */}
      {chat.isOnline && <View style={styles.onlineIndicator} />}
      
      <View style={styles.chatContent}>
        {/* Header */}
        <View style={styles.chatHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.displayName}>{chat.displayName}</Text>
            <Text style={styles.compatibility}>{chat.compatibility}%</Text>
          </View>
          <View style={styles.timeAndBadge}>
            <Text style={styles.lastMessageTime}>{chat.lastMessageTime}</Text>
            {chat.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Last Message */}
        <Text 
          style={[
            styles.lastMessage,
            chat.unreadCount > 0 && styles.lastMessageUnread,
            isFromUser && styles.lastMessageFromUser,
          ]} 
          numberOfLines={1}
        >
          {displayMessage}
        </Text>

        {/* Common Movies */}
        <Text style={styles.commonMovies} numberOfLines={1}>
          {chat.commonMovies.slice(0, 2).join(', ')}
          {chat.commonMovies.length > 2 && ' +more'}
        </Text>

        {/* Match Info */}
        <Text style={styles.matchInfo}>matched {chat.matchedOn}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatsScreen() {
  const navigation = useNavigation<NavProp>();
  const [chats, setChats] = useState<ChatPreview[]>(SAMPLE_CHATS);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChatPress = (chatId: string) => {
    navigation.navigate('Chat', { chatId });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate network request
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const sortedChats = [...chats].sort((a, b) => {
    // Sort by unread first, then by time
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    
    // Then by recency (mock sort by lastMessageTime)
    const timeA = a.lastMessageTime;
    const timeB = b.lastMessageTime;
    
    if (timeA.includes('m') && timeB.includes('h')) return -1;
    if (timeA.includes('h') && timeB.includes('m')) return 1;
    if (timeA.includes('h') && timeB.includes('d')) return -1;
    if (timeA.includes('d') && timeB.includes('h')) return 1;
    
    return 0;
  });

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>your chats</Text>
        <Text style={styles.headerSubtitle}>
          {chats.length} conversations
          {totalUnread > 0 && ` • ${totalUnread} unread`}
        </Text>
      </View>

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F0E4C1" />
          <Text style={styles.loadingText}>loading chats...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ChatItem chat={item} onPress={handleChatPress} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#F0E4C1"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.listContent,
            sortedChats.length === 0 && { flex: 1 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>no chats yet</Text>
              <Text style={styles.emptyText}>
                start swiping to find matches and begin conversations
              </Text>
            </View>
          }
        />
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
  listContent: {
    paddingBottom: 32,
  },
  chatItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ecc71',
    zIndex: 1,
  },
  chatContent: {
    marginLeft: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  displayName: {
    color: '#F0E4C1',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  compatibility: {
    color: '#511619',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(81, 22, 25, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  timeAndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastMessageTime: {
    color: '#F0E4C1',
    opacity: 0.6,
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor: '#511619',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: '#F0E4C1',
    fontSize: 12,
    fontWeight: '700',
  },
  lastMessage: {
    color: '#F0E4C1',
    opacity: 0.8,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  lastMessageUnread: {
    opacity: 1,
    fontWeight: '600',
  },
  lastMessageFromUser: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  commonMovies: {
    color: '#F0E4C1',
    opacity: 0.5,
    fontSize: 12,
    marginBottom: 2,
  },
  matchInfo: {
    color: '#F0E4C1',
    opacity: 0.4,
    fontSize: 11,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(240, 228, 193, 0.1)',
    marginLeft: 32,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#F0E4C1',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'lowercase',
  },
  emptyText: {
    color: '#F0E4C1',
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 20,
  },
});