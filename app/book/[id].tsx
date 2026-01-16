import { useState } from 'react';
import { 
  Text, 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useLibrary } from '@/lib/library-context';
import { fetchBookContent } from '@/lib/open-library';
import { Book } from '@/types';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function BookDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    author: string;
    coverUrl: string;
    description: string;
    pageCount: string;
    publishYear: string;
    subjects: string;
  }>();
  
  const [isAdding, setIsAdding] = useState(false);
  const colors = useColors();
  const router = useRouter();
  const { books, settings, addBook, updateBookContent } = useLibrary();

  const isInLibrary = books.some(b => b.id === params.id);
  const existingBook = books.find(b => b.id === params.id);

  const book: Book = {
    id: params.id || '',
    title: params.title || 'Unknown Title',
    author: params.author || 'Unknown Author',
    coverUrl: params.coverUrl || null,
    description: params.description || '',
    pageCount: params.pageCount ? parseInt(params.pageCount) : null,
    publishYear: params.publishYear ? parseInt(params.publishYear) : null,
    subjects: params.subjects ? params.subjects.split(',') : [],
  };

  const handleAddToLibrary = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setIsAdding(true);
    
    try {
      await addBook(book);
      const content = await fetchBookContent(book.id, book.title);
      if (content) {
        await updateBookContent(book.id, content);
      }
      
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Failed to add book:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartReading = (mode: 'rsvp' | 'normal') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (mode === 'normal') {
      router.push(`/normal-reader/${params.id}`);
    } else {
      router.push(`/reader/${params.id}`);
    }
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer edges={['top', 'left', 'right', 'bottom']} className="flex-1">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.6}
          >
            <Text style={[styles.backText, { color: colors.foreground }]}>←</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Cover */}
          <View style={styles.coverContainer}>
            {book.coverUrl ? (
              <Image
                source={{ uri: book.coverUrl }}
                style={[styles.cover, { backgroundColor: colors.surface }]}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.cover, { backgroundColor: colors.surface }]}>
                <Text style={[styles.coverLetter, { color: colors.muted }]}>
                  {book.title.charAt(0)}
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.foreground }]}>{book.title}</Text>
            <Text style={[styles.author, { color: colors.muted }]}>{book.author}</Text>
            
            {book.publishYear && (
              <Text style={[styles.year, { color: colors.muted }]}>
                {book.publishYear}
              </Text>
            )}

            {book.description && (
              <Text style={[styles.description, { color: colors.foreground }]}>
                {book.description}
              </Text>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actions, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {isInLibrary ? (
            existingBook?.content ? (
              <View style={styles.readingOptions}>
                <TouchableOpacity
                  onPress={() => handleStartReading('rsvp')}
                  style={[styles.readButton, { borderColor: colors.foreground }]}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.readButtonText, { color: colors.foreground }]}>
                    RSVP
                  </Text>
                  <Text style={[styles.readButtonSubtext, { color: colors.muted }]}>
                    Speed Read
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleStartReading('normal')}
                  style={[styles.readButton, { borderColor: colors.foreground }]}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.readButtonText, { color: colors.foreground }]}>
                    Normal
                  </Text>
                  <Text style={[styles.readButtonSubtext, { color: colors.muted }]}>
                    Scroll Read
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.primaryButton, { borderColor: colors.border }]}>
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.muted} />
                  <Text style={[styles.primaryButtonText, { color: colors.muted }]}>
                    Loading book...
                  </Text>
                </View>
              </View>
            )
          ) : (
            <TouchableOpacity
              onPress={handleAddToLibrary}
              style={[styles.primaryButton, { borderColor: colors.foreground }]}
              activeOpacity={0.6}
              disabled={isAdding}
            >
              {isAdding ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.muted} />
                  <Text style={[styles.primaryButtonText, { color: colors.muted }]}>
                    Adding...
                  </Text>
                </View>
              ) : (
                <Text style={[styles.primaryButtonText, { color: colors.foreground }]}>
                  Add to Library
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 24,
    fontWeight: '300',
  },
  content: {
    paddingBottom: 140,
  },
  coverContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  cover: {
    width: 140,
    height: 210,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLetter: {
    fontSize: 48,
    fontWeight: '200',
  },
  info: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  author: {
    fontSize: 15,
    fontWeight: '300',
    marginTop: 8,
    textAlign: 'center',
  },
  year: {
    fontSize: 13,
    fontWeight: '300',
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 22,
    marginTop: 24,
    textAlign: 'center',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  readingOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  readButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  readButtonText: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  readButtonSubtext: {
    fontSize: 11,
    fontWeight: '300',
    marginTop: 2,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
