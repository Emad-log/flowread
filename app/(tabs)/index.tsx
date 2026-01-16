import { FlatList, Text, View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BookCard } from '@/components/book-card';
import { useLibrary } from '@/lib/library-context';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Book } from '@/types';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2; // 2 columns with padding and gap

export default function LibraryScreen() {
  const { books, isLoading } = useLibrary();
  const colors = useColors();
  const router = useRouter();

  const handleBookPress = (book: Book) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/reader/${book.id}`);
  };

  const handleDiscoverPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/(tabs)/discover');
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surface }]}>
        <IconSymbol name="books.vertical.fill" size={48} color={colors.muted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Your Library is Empty
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Discover books to start building your personal reading collection
      </Text>
      <TouchableOpacity
        onPress={handleDiscoverPress}
        style={[styles.discoverButton, { backgroundColor: colors.primary }]}
        activeOpacity={0.8}
      >
        <Text style={[styles.discoverButtonText, { color: colors.background }]}>
          Discover Books
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderBook = ({ item }: { item: Book }) => (
    <TouchableOpacity
      onPress={() => handleBookPress(item)}
      style={[styles.cardWrapper, { width: CARD_WIDTH }]}
      activeOpacity={0.7}
    >
      <BookCard book={item} showProgress />
    </TouchableOpacity>
  );

  // Sort books by most recently added
  const sortedBooks = [...books].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

  return (
    <ScreenContainer className="flex-1">
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Library</Text>
        {books.length > 0 && (
          <Text style={[styles.bookCount, { color: colors.muted }]}>
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </Text>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.muted }]}>Loading...</Text>
        </View>
      ) : books.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={sortedBooks}
          renderItem={renderBook}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  bookCount: {
    fontSize: 15,
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  row: {
    gap: 16,
    marginBottom: 16,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: CARD_WIDTH,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    paddingBottom: 100,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  discoverButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  discoverButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
  },
});
