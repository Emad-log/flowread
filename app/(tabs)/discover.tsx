import { useState, useEffect, useCallback } from 'react';
import { 
  Text, 
  View, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { searchBooks, getTrendingBooks } from '@/lib/open-library';
import { Book } from '@/types';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const colors = useColors();
  const router = useRouter();

  // Load trending books on mount
  useEffect(() => {
    const loadTrending = async () => {
      setIsLoading(true);
      const trending = await getTrendingBooks();
      setResults(trending);
      setIsLoading(false);
    };
    loadTrending();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    Keyboard.dismiss();
    setIsLoading(true);
    setHasSearched(true);
    
    try {
      const searchResults = await searchBooks(query.trim());
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

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

  const renderBook = ({ item }: { item: Book }) => (
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
          <Text style={[styles.bookTitle, { color: colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.bookAuthor, { color: colors.muted }]} numberOfLines={1}>
            {item.author}
          </Text>
          {item.publishYear && (
            <Text style={[styles.bookYear, { color: colors.muted }]}>
              {item.publishYear}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer className="flex-1">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Discover</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput, 
            { 
              color: colors.foreground, 
              borderColor: colors.border,
              backgroundColor: colors.background,
            }
          ]}
          placeholder="Search books..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {!hasSearched && results.length > 0 && (
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>
          Popular
        </Text>
      )}

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      ) : hasSearched && results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.noResults, { color: colors.muted }]}>
            No results found
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.hint, { color: colors.muted }]}>
            Search for books to add to your library
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: -1,
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '300',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginBottom: 8,
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
    alignItems: 'flex-start',
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
    lineHeight: 22,
  },
  bookAuthor: {
    fontSize: 14,
    fontWeight: '300',
    marginTop: 4,
  },
  bookYear: {
    fontSize: 12,
    fontWeight: '300',
    marginTop: 4,
  },
  separator: {
    height: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResults: {
    fontSize: 14,
    fontWeight: '300',
  },
  hint: {
    fontSize: 14,
    fontWeight: '300',
    textAlign: 'center',
    paddingHorizontal: 48,
  },
});
