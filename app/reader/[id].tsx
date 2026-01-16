import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Text, 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useLibrary } from '@/lib/library-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WORDS_PER_PAGE = 250; // Approximate words per "page"

interface Chapter {
  title: string;
  startIndex: number;
}

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { getBook, settings, updateBookProgress, incrementWordsRead } = useLibrary();
  
  useKeepAwake();

  const book = getBook(params.id || '');
  const words = useMemo(() => 
    book?.content?.split(/\s+/).filter(w => w.length > 0) || [], 
    [book?.content]
  );
  
  const [currentIndex, setCurrentIndex] = useState(book?.currentPosition || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(settings.wordsPerMinute);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordsReadRef = useRef(0);
  const sliderWidth = useSharedValue(0);

  // Calculate total pages
  const totalPages = Math.ceil(words.length / WORDS_PER_PAGE);
  const currentPage = Math.floor(currentIndex / WORDS_PER_PAGE) + 1;

  // Detect chapters (look for common chapter markers)
  const chapters = useMemo(() => {
    const chapterList: Chapter[] = [{ title: 'Beginning', startIndex: 0 }];
    const content = book?.content || '';
    
    // Common chapter patterns
    const chapterPatterns = [
      /\bCHAPTER\s+(\d+|[IVXLC]+)/gi,
      /\bPART\s+(\d+|[IVXLC]+)/gi,
      /\bBOOK\s+(\d+|[IVXLC]+)/gi,
      /\bSECTION\s+(\d+|[IVXLC]+)/gi,
    ];

    let wordIndex = 0;
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      for (const pattern of chapterPatterns) {
        pattern.lastIndex = 0;
        const match = pattern.exec(trimmedLine);
        if (match && trimmedLine.length < 50) {
          chapterList.push({
            title: trimmedLine,
            startIndex: wordIndex,
          });
          break;
        }
      }
      wordIndex += line.split(/\s+/).filter(w => w.length > 0).length;
    }

    return chapterList;
  }, [book?.content]);

  // Calculate ORP (Optimal Recognition Point) index
  const getORPIndex = (word: string): number => {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return Math.floor(len / 3);
    return Math.floor(len / 3);
  };

  const currentWord = words[currentIndex] || '';
  const orpIndex = getORPIndex(currentWord);

  // Progress percentage
  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  const play = useCallback(() => {
    if (currentIndex >= words.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
    setShowNavigator(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentIndex, words.length]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Handle word advancement
  useEffect(() => {
    if (isPlaying && words.length > 0) {
      const interval = Math.round(60000 / wpm);
      
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= words.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          wordsReadRef.current += 1;
          return prev + 1;
        });
      }, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isPlaying, wpm, words.length]);

  // Save progress periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (book && currentIndex > 0) {
        updateBookProgress(book.id, currentIndex);
        if (wordsReadRef.current > 0) {
          incrementWordsRead(wordsReadRef.current);
          wordsReadRef.current = 0;
        }
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [book, currentIndex, updateBookProgress, incrementWordsRead]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (book && currentIndex > 0) {
        updateBookProgress(book.id, currentIndex);
        if (wordsReadRef.current > 0) {
          incrementWordsRead(wordsReadRef.current);
        }
      }
    };
  }, []);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (book) {
      updateBookProgress(book.id, currentIndex);
    }
    router.back();
  };

  const adjustSpeed = useCallback((delta: number) => {
    setWpm(prev => Math.max(100, Math.min(800, prev + delta)));
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const jumpToPosition = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(words.length - 1, index));
    setCurrentIndex(clampedIndex);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [words.length]);

  const jumpToPage = useCallback((page: number) => {
    const index = (page - 1) * WORDS_PER_PAGE;
    jumpToPosition(index);
  }, [jumpToPosition]);

  const jumpToChapter = useCallback((chapter: Chapter) => {
    jumpToPosition(chapter.startIndex);
    setShowChapters(false);
  }, [jumpToPosition]);

  const toggleNavigator = useCallback(() => {
    if (isPlaying) {
      pause();
    }
    setShowNavigator(prev => !prev);
  }, [isPlaying, pause]);

  // Gesture handlers
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      if (showNavigator) {
        setShowNavigator(false);
      } else {
        togglePlayPause();
      }
    });

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 50) {
        if (event.translationX > 0) {
          adjustSpeed(-50);
        } else {
          adjustSpeed(50);
        }
      }
    });

  const composedGesture = Gesture.Race(tapGesture, panGesture);

  // Handle slider drag
  const handleSliderPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const sliderTrackWidth = SCREEN_WIDTH - 48; // Account for padding
    const percentage = Math.max(0, Math.min(1, locationX / sliderTrackWidth));
    const newIndex = Math.floor(percentage * (words.length - 1));
    jumpToPosition(newIndex);
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

  // Render word with ORP highlight
  const renderWord = () => {
    if (!currentWord) return null;
    
    const before = currentWord.slice(0, orpIndex);
    const orp = currentWord[orpIndex] || '';
    const after = currentWord.slice(orpIndex + 1);

    return (
      <View style={styles.wordContainer}>
        <Text style={[styles.word, { color: colors.foreground }]}>
          {before}
          <Text style={[styles.orpChar, { color: colors.muted }]}>{orp}</Text>
          {after}
        </Text>
      </View>
    );
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
          <TouchableOpacity
            onPress={() => setShowChapters(true)}
            style={styles.chaptersButton}
            activeOpacity={0.6}
          >
            <Text style={[styles.wpmDisplay, { color: colors.muted }]}>
              {wpm} wpm
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main reading area */}
        <GestureDetector gesture={composedGesture}>
          <View style={styles.readerArea}>
            {/* ORP guide line */}
            <View style={[styles.orpLine, { backgroundColor: colors.border }]} />
            
            {/* Word display */}
            {renderWord()}

            {/* Status indicator */}
            <Text style={[styles.statusText, { color: colors.muted }]}>
              {isPlaying ? '' : 'tap to start'}
            </Text>

            {/* Position indicator */}
            <TouchableOpacity 
              onPress={toggleNavigator}
              style={styles.positionButton}
              activeOpacity={0.6}
            >
              <Text style={[styles.positionText, { color: colors.muted }]}>
                {currentIndex.toLocaleString()} / {words.length.toLocaleString()}
              </Text>
            </TouchableOpacity>
          </View>
        </GestureDetector>

        {/* Navigation Panel */}
        {showNavigator && (
          <View style={[styles.navigatorPanel, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {/* Page navigation */}
            <View style={styles.pageNav}>
              <TouchableOpacity
                onPress={() => jumpToPage(Math.max(1, currentPage - 1))}
                style={[styles.pageButton, { borderColor: colors.border }]}
                activeOpacity={0.6}
              >
                <Text style={[styles.pageButtonText, { color: colors.foreground }]}>←</Text>
              </TouchableOpacity>
              <View style={styles.pageInfo}>
                <Text style={[styles.pageNumber, { color: colors.foreground }]}>
                  Page {currentPage}
                </Text>
                <Text style={[styles.pageTotal, { color: colors.muted }]}>
                  of {totalPages}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => jumpToPage(Math.min(totalPages, currentPage + 1))}
                style={[styles.pageButton, { borderColor: colors.border }]}
                activeOpacity={0.6}
              >
                <Text style={[styles.pageButtonText, { color: colors.foreground }]}>→</Text>
              </TouchableOpacity>
            </View>

            {/* Slider */}
            <TouchableOpacity 
              onPress={handleSliderPress}
              style={styles.sliderContainer}
              activeOpacity={1}
            >
              <View style={[styles.sliderTrack, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.sliderFill, 
                    { backgroundColor: colors.foreground, width: `${progress}%` }
                  ]} 
                />
                <View 
                  style={[
                    styles.sliderThumb, 
                    { backgroundColor: colors.foreground, left: `${progress}%` }
                  ]} 
                />
              </View>
            </TouchableOpacity>

            {/* Quick jump buttons */}
            <View style={styles.quickJumps}>
              {[0, 25, 50, 75, 100].map((percent) => (
                <TouchableOpacity
                  key={percent}
                  onPress={() => jumpToPosition(Math.floor((percent / 100) * (words.length - 1)))}
                  style={[styles.quickJumpButton, { borderColor: colors.border }]}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.quickJumpText, { color: colors.muted }]}>
                    {percent}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chapters button */}
            <TouchableOpacity
              onPress={() => {
                setShowNavigator(false);
                setShowChapters(true);
              }}
              style={[styles.chaptersOpenButton, { borderColor: colors.border }]}
              activeOpacity={0.6}
            >
              <Text style={[styles.chaptersOpenText, { color: colors.foreground }]}>
                View Chapters
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {/* Progress bar */}
          <TouchableOpacity 
            onPress={toggleNavigator}
            activeOpacity={0.8}
          >
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { backgroundColor: colors.foreground, width: `${progress}%` }
                ]} 
              />
            </View>
          </TouchableOpacity>
          
          <View style={styles.footerInfo}>
            <Text style={[styles.progressText, { color: colors.muted }]}>
              {Math.round(progress)}%
            </Text>
            <Text style={[styles.bookTitle, { color: colors.muted }]} numberOfLines={1}>
              {book.title}
            </Text>
          </View>
        </View>

        {/* Chapters Modal */}
        <Modal
          visible={showChapters}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowChapters(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Navigate
                </Text>
                <TouchableOpacity
                  onPress={() => setShowChapters(false)}
                  style={styles.modalClose}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.modalCloseText, { color: colors.muted }]}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={chapters}
                keyExtractor={(item, index) => `${item.title}-${index}`}
                renderItem={({ item, index }) => {
                  const isActive = currentIndex >= item.startIndex && 
                    (index === chapters.length - 1 || currentIndex < chapters[index + 1].startIndex);
                  
                  return (
                    <TouchableOpacity
                      onPress={() => jumpToChapter(item)}
                      style={[
                        styles.chapterItem,
                        { borderBottomColor: colors.border }
                      ]}
                      activeOpacity={0.6}
                    >
                      <Text 
                        style={[
                          styles.chapterTitle, 
                          { color: isActive ? colors.foreground : colors.muted }
                        ]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <Text style={[styles.chapterPosition, { color: colors.muted }]}>
                        {Math.round((item.startIndex / words.length) * 100)}%
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.chaptersList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>
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
  chaptersButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  wpmDisplay: {
    fontSize: 13,
    fontWeight: '300',
  },
  readerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orpLine: {
    position: 'absolute',
    width: 1,
    height: 120,
    left: SCREEN_WIDTH / 2,
  },
  wordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  word: {
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 1,
  },
  orpChar: {
    fontWeight: '500',
  },
  statusText: {
    position: 'absolute',
    bottom: 100,
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 1,
  },
  positionButton: {
    position: 'absolute',
    bottom: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  positionText: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  navigatorPanel: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
  },
  pageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonText: {
    fontSize: 18,
    fontWeight: '300',
  },
  pageInfo: {
    alignItems: 'center',
    marginHorizontal: 24,
  },
  pageNumber: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  pageTotal: {
    fontSize: 12,
    fontWeight: '300',
    marginTop: 2,
  },
  sliderContainer: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
  },
  quickJumps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  quickJumpButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickJumpText: {
    fontSize: 12,
    fontWeight: '300',
  },
  chaptersOpenButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  chaptersOpenText: {
    fontSize: 14,
    fontWeight: '400',
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
  bookTitle: {
    fontSize: 12,
    fontWeight: '300',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '400',
    letterSpacing: -0.3,
  },
  modalClose: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '400',
  },
  chaptersList: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: '300',
    flex: 1,
    marginRight: 16,
  },
  chapterPosition: {
    fontSize: 12,
    fontWeight: '300',
  },
});
