// src/screens/ChatScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
/*************  ✨ Windsurf Command ⭐  *************/
/**
 * Screen for a chat with a match.
 *
 * @param {{ route: { params: { match: Match } }, navigation: any }} props
 * @returns {React.ReactElement}
 */
/*******  c587843d-91bc-419c-923c-92e38febe799  *******/  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { getAuth } from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../config/firebase';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: any;
  createdAt: Date;
}

interface ChatUser {
  id: string;
  displayName: string;
  email: string;
}

export default function ChatScreen({ route, navigation }: any) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const chatId = route?.params?.chatId;
  const matchId = route?.params?.matchId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to chat');
      navigation.goBack();
      return;
    }

    if (!chatId) {
      Alert.alert('Error', 'Invalid chat ID');
      navigation.goBack();
      return;
    }

    initializeChat();
    setupMessageListener();
  }, [chatId, currentUser]);

  const initializeChat = async () => {
    try {
      // In a real app, you'd extract the other user's ID from the chatId
      // For now, we'll create a mock chat user
      const mockUser: ChatUser = {
        id: 'mock-user',
        displayName: 'Alex',
        email: 'alex@example.com',
      };
      setChatUser(mockUser);

      // Create chat document if it doesn't exist
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      
      
      if (currentUser && !chatDoc.exists()) {
  await updateDoc(chatRef, {
    participants: [currentUser.uid, mockUser.id],
    createdAt: serverTimestamp(),
    lastMessage: null,
    lastMessageTime: null,
  });
}
    } catch (error) {
      console.error('Error initializing chat:', error);
      Alert.alert('Error', 'Failed to initialize chat');
    }
  };

  const setupMessageListener = () => {
    if (!chatId) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const newMessages: Message[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          newMessages.push({
            id: doc.id,
            text: data.text,
            senderId: data.senderId,
            senderName: data.senderName,
            timestamp: data.timestamp,
            createdAt: data.timestamp?.toDate() || new Date(),
          });
        });
        setMessages(newMessages);
        setLoading(false);

        // Scroll to bottom when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error) => {
        console.error('Error listening to messages:', error);
        Alert.alert('Error', 'Failed to load messages');
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUser || !chatId || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      // Add message to subcollection
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        text: messageText,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Anonymous',
        timestamp: serverTimestamp(),
      });

      // Update chat document with last message
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: messageText,
        lastMessageTime: serverTimestamp(),
      });

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setInputText(messageText); // Restore the message
    } finally {
      setSending(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isCurrentUser = item.senderId === currentUser?.uid;
    const showTime = index === 0 || 
      (messages[index - 1].createdAt.getTime() - item.createdAt.getTime()) > 60000; // 1 minute

    return (
      <View style={styles.messageContainer}>
        {showTime && (
          <Text style={styles.timeStamp}>
            {formatTime(item.createdAt)}
          </Text>
        )}
        <View
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText,
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e6edf3" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {chatUser?.displayName || 'Chat'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {messages.length} messages
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Start the conversation</Text>
            <Text style={styles.emptyText}>
              Say hello to {chatUser?.displayName || 'your match'}!
            </Text>
          </View>
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="rgba(230, 237, 243, 0.5)"
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: '#0d1117',
  card: '#11161d',
  text: '#e6edf3',
  sub: 'rgba(230,237,243,0.7)',
  accent: '#1C6F75',
  currentUser: '#2ea043',
  otherUser: 'rgba(230,237,243,0.1)',
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: COLORS.text,
    marginTop: 12,
    opacity: 0.7,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(230, 237, 243, 0.1)',
  },
  backButton: { 
    color: COLORS.sub, 
    fontSize: 18,
    fontWeight: '600',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: { 
    color: COLORS.text, 
    fontSize: 18, 
    fontWeight: '700',
  },
  headerSubtitle: {
    color: COLORS.sub,
    fontSize: 12,
    marginTop: 2,
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: 200,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    color: COLORS.sub,
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 12,
  },
  timeStamp: {
    color: COLORS.sub,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  currentUserBubble: {
    backgroundColor: COLORS.currentUser,
    alignSelf: 'flex-end',
  },
  otherUserBubble: {
    backgroundColor: COLORS.otherUser,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: '#ffffff',
  },
  otherUserText: {
    color: COLORS.text,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(230, 237, 243, 0.1)',
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(230, 237, 243, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});