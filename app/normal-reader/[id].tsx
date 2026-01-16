import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Text, 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useLibrary } from '@/lib/library-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const WORDS_PER_PAGE = 250;

export default function NormalReaderScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { getBook, settings, updateBookProgress, incrementWordsRead } = useLibrary();
  
  useKeepAwake();

  const book = getBook(params.id || '');
  const content = book?.content || '';
  const words = useMemo(() => 
    content.split(/\s+/).filter(w => w.length > 0) || [], 
    [content]
  );
  
  const [scrollPosition, setScrollPosition] = useState(0);
  const [contentHeight, setContentHeight] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);
  const lastSavedPosition = useRef(book?.currentPosition || 0);

  // Calculate progress based on scroll position
  const progress = contentHeight > SCREEN_HEIGHT 
    ? (scrollPosition / (contentHeight - SCREEN_HEIGHT)) * 100 
    : 0;

  // Estimate current word position based on scroll
  const estimatedWordPosition = Math.floor((progress / 100) * words.length);

  // Calculate current page
  const totalPages = Math.ceil(words.length / WORDS_PER_PAGE);
  const currentPage = Math.floor(estimatedWordPosition / WORDS_PER_PAGE) + 1;

  // Font size based on settings
  const fontSize = settings.fontSize === 'small' ? 16 : settings.fontSize === 'large' ? 22 : 18;

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setScrollPosition(contentOffset.y);
    setContentHeight(contentSize.height);
  }, []);

  // Save progress periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (book && estimatedWordPosition !== lastSavedPosition.current) {
        updateBookProgress(book.id, estimatedWordPosition);
        const wordsRead = Math.max(0, estimatedWordPosition - lastSavedPosition.current);
        if (wordsRead > 0) {
          incrementWordsRead(wordsRead);
        }
        lastSavedPosition.current = estimatedWordPosition;
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [book, estimatedWordPosition, updateBookProgress, incrementWordsRead]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (book && estimatedWordPosition > 0) {
        updateBookProgress(book.id, estimatedWordPosition);
      }
    };
  }, []);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (book) {
      updateBookProgress(book.id, estimatedWordPosition);
    }
    router.back();
  };

  if (!book || !book.content) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenContainer edges={['top', 'left', 'right', 'bottom']} className="flex-1 items-center justify-center">
          <Text style={[styles.loadingText, { color: colors.muted }]}>
            Loading...
          </Text>
        </ScreenContainer>
      </>
    );
  }

  // Split content into paragraphs for better rendering
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);

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
          <Text style={[styles.pageInfo, { color: colors.muted }]}>
            {currentPage} / {totalPages}
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            {book.title}
          </Text>
          <Text style={[styles.author, { color: colors.muted }]}>
            {book.author}
          </Text>
          
          <View style={styles.textContent}>
            {paragraphs.map((paragraph, index) => (
              <Text 
                key={index} 
                style={[
                  styles.paragraph, 
                  { color: colors.foreground, fontSize, lineHeight: fontSize * 1.7 }
                ]}
              >
                {paragraph.trim()}
              </Text>
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { backgroundColor: colors.foreground, width: `${Math.min(100, Math.max(0, progress))}%` }
              ]} 
            />
          </View>
          <View style={styles.footerInfo}>
            <Text style={[styles.progressText, { color: colors.muted }]}>
              {Math.round(Math.min(100, Math.max(0, progress)))}%
            </Text>
            <Text style={[styles.modeText, { color: colors.muted }]}>
              Normal Mode
            </Text>
          </View>
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  pageInfo: {
    fontSize: 13,
    fontWeight: '300',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: '400',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  author: {
    fontSize: 14,
    fontWeight: '300',
    marginBottom: 32,
  },
  textContent: {
    gap: 20,
  },
  paragraph: {
    fontWeight: '300',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '300',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '300',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '300',
  },
});
