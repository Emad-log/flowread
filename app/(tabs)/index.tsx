import { Text, View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useLibrary } from '@/lib/library-context';
import { Book } from '@/types';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function LibraryScreen() {
  const colors = useColors();
  const router = useRouter();
  const { books, isLoading } = useLibrary();

  const handleBookPress = (book: Book) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/book/[id]',
      params: {
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || '',
        description: book.description || '',
        pageCount: book.pageCount?.toString() || '',
        publishYear: book.publishYear?.toString() || '',
        subjects: book.subjects?.join(',') || '',
      },
    });
  };

  const handleDiscover = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/(tabs)/discover');
  };

  const renderBook = ({ item }: { item: Book }) => {
    const progress = item.currentPosition && item.totalWords 
      ? Math.round((item.currentPosition / item.totalWords) * 100)
      : 0;

    return (
      <TouchableOpacity
        onPress={() => handleBookPress(item)}
        style={styles.bookItem}
        activeOpacity={0.6}
      >
        <View style={styles.bookContent}>
          {item.coverUrl ? (
            <Image
              source={{ uri: item.coverUrl }}
              style={[styles.cover, { backgroundColor: colors.surface }]}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.cover, { backgroundColor: colors.surface }]}>
              <Text style={[styles.coverLetter, { color: colors.muted }]}>
                {item.title.charAt(0)}
              </Text>
            </View>
          )}
          <View style={styles.bookInfo}>
            <Text style={[styles.bookTitle, { color: colors.foreground }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.bookAuthor, { color: colors.muted }]} numberOfLines={1}>
              {item.author}
            </Text>
            {progress > 0 && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { backgroundColor: colors.foreground, width: `${progress}%` }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.muted }]}>
                  {progress}%
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center">
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="flex-1">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Library</Text>
      </View>

      {books.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No books yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Add books to start reading
          </Text>
          <TouchableOpacity
            onPress={handleDiscover}
            style={[styles.discoverButton, { borderColor: colors.foreground }]}
            activeOpacity={0.6}
          >
            <Text style={[styles.discoverButtonText, { color: colors.foreground }]}>
              Browse Books
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={books.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0))}
          renderItem={renderBook}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: -1,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  bookItem: {
    paddingVertical: 16,
  },
  bookContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cover: {
    width: 48,
    height: 72,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLetter: {
    fontSize: 20,
    fontWeight: '300',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 16,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  bookAuthor: {
    fontSize: 14,
    fontWeight: '300',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '300',
  },
  separator: {
    height: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '300',
    marginTop: 8,
    textAlign: 'center',
  },
  discoverButton: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 24,
  },
  discoverButtonText: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '300',
  },
});
