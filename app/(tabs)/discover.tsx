import { useState, useEffect, useCallback } from 'react';
import { 
  FlatList, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { BookCard } from '@/components/book-card';
import { useColors } from '@/hooks/use-colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Book } from '@/types';
import { searchBooks, getTrendingBooks } from '@/lib/open-library';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2;

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const colors = useColors();
  const router = useRouter();

  // Load trending books on mount
  useEffect(() => {
    const loadTrending = async () => {
      setIsLoading(true);
      const trending = await getTrendingBooks();
      setBooks(trending);
      setIsLoading(false);
    };
    loadTrending();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    Keyboard.dismiss();
    setIsLoading(true);
    setHasSearched(true);
    
    const results = await searchBooks(searchQuery.trim());
    setBooks(results);
    setIsLoading(false);
  }, [searchQuery]);

  const handleBookPress = (book: Book) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/book/[id]' as const,
      params: { 
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl || '',
        description: book.description,
        pageCount: book.pageCount?.toString() || '',
        publishYear: book.publishYear?.toString() || '',
        subjects: book.subjects.join(','),
      },
    });
  };

  const renderBook = ({ item }: { item: Book }) => (
    <TouchableOpacity
      onPress={() => handleBookPress(item)}
      style={[styles.cardWrapper, { width: CARD_WIDTH }]}
      activeOpacity={0.7}
    >
      <BookCard book={item} />
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <IconSymbol name="magnifyingglass" size={48} color={colors.muted} />
        <Text style={[styles.emptyText, { color: colors.muted }]}>
          {hasSearched ? 'No books found' : 'Search for books to read'}
        </Text>
      </View>
    );
  };

  return (
    <ScreenContainer className="flex-1">
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discover</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search books, authors..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <IconSymbol name="xmark" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!hasSearched && books.length > 0 && (
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          Popular Books
        </Text>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : books.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={books}
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
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 0.5,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 24,
    marginBottom: 12,
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
    paddingBottom: 100,
    gap: 16,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
});
