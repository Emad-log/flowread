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
import { IconSymbol } from '@/components/ui/icon-symbol';
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
  const [isDownloading, setIsDownloading] = useState(false);
  const colors = useColors();
  const router = useRouter();
  const { books, addBook, updateBookContent } = useLibrary();

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
    setIsDownloading(true);
    
    try {
      // Add book to library first
      await addBook(book);
      
      // Then fetch content
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
      setIsDownloading(false);
    }
  };

  const handleStartReading = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/reader/${params.id}`);
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
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
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
              <View style={[styles.cover, styles.placeholderCover, { backgroundColor: colors.surface }]}>
                <Text style={[styles.placeholderText, { color: colors.muted }]}>
                  {book.title.charAt(0)}
                </Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.foreground }]}>{book.title}</Text>
            <Text style={[styles.author, { color: colors.muted }]}>{book.author}</Text>
            
            {(book.publishYear || book.pageCount) && (
              <View style={styles.meta}>
                {book.publishYear && (
                  <Text style={[styles.metaText, { color: colors.muted }]}>
                    {book.publishYear}
                  </Text>
                )}
                {book.publishYear && book.pageCount && (
                  <Text style={[styles.metaDot, { color: colors.muted }]}>•</Text>
                )}
                {book.pageCount && (
                  <Text style={[styles.metaText, { color: colors.muted }]}>
                    {book.pageCount} pages
                  </Text>
                )}
              </View>
            )}

            {book.description && (
              <Text style={[styles.description, { color: colors.foreground }]}>
                {book.description}
              </Text>
            )}

            {book.subjects.length > 0 && (
              <View style={styles.subjects}>
                {book.subjects.slice(0, 4).map((subject, index) => (
                  <View 
                    key={index} 
                    style={[styles.subjectTag, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <Text style={[styles.subjectText, { color: colors.muted }]}>
                      {subject}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={[styles.actions, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {isInLibrary ? (
            <TouchableOpacity
              onPress={handleStartReading}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              disabled={!existingBook?.content}
            >
              {existingBook?.content ? (
                <>
                  <IconSymbol name="play.fill" size={20} color={colors.background} />
                  <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                    {existingBook.currentPosition ? 'Continue Reading' : 'Start Reading'}
                  </Text>
                </>
              ) : (
                <>
                  <ActivityIndicator size="small" color={colors.background} />
                  <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                    Downloading...
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleAddToLibrary}
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
              disabled={isAdding}
            >
              {isAdding ? (
                <>
                  <ActivityIndicator size="small" color={colors.background} />
                  <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                    {isDownloading ? 'Downloading...' : 'Adding...'}
                  </Text>
                </>
              ) : (
                <>
                  <IconSymbol name="plus" size={20} color={colors.background} />
                  <Text style={[styles.primaryButtonText, { color: colors.background }]}>
                    Add to Library
                  </Text>
                </>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 120,
  },
  coverContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  cover: {
    width: 180,
    height: 270,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  placeholderCover: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 64,
    fontWeight: '300',
  },
  info: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  author: {
    fontSize: 17,
    marginTop: 8,
    textAlign: 'center',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  metaText: {
    fontSize: 14,
  },
  metaDot: {
    marginHorizontal: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 24,
    textAlign: 'center',
  },
  subjects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  subjectTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0.5,
  },
  subjectText: {
    fontSize: 12,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 0.5,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
