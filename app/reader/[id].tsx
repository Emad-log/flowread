import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Text, 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useLibrary } from '@/lib/library-context';
import { useKeepAwake } from 'expo-keep-awake';
import { HapticDial } from '@/components/haptic-dial';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WORDS_PER_PAGE = 250;

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
  const [showSpeedDial, setShowSpeedDial] = useState(false);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordsReadRef = useRef(0);

  // Calculate total pages
  const totalPages = Math.ceil(words.length / WORDS_PER_PAGE);
  const currentPage = Math.floor(currentIndex / WORDS_PER_PAGE) + 1;

  // Detect chapters
  const chapters = useMemo(() => {
    const chapterList: Chapter[] = [{ title: 'Beginning', startIndex: 0 }];
    const content = book?.content || '';
    
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

  // Calculate ORP index
  const getORPIndex = (word: string): number => {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return Math.floor(len / 3);
    return Math.floor(len / 3);
  };

  const currentWord = words[currentIndex] || '';
  const orpIndex = getORPIndex(currentWord);
  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const play = useCallback(() => {
    if (currentIndex >= words.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(true);
    setShowNavigator(false);
    setShowSpeedDial(false);
    triggerHaptic();
  }, [currentIndex, words.length, triggerHaptic]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    triggerHaptic();
  }, [triggerHaptic]);

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
    triggerHaptic();
    if (book) {
      updateBookProgress(book.id, currentIndex);
    }
    router.back();
  };

  const handleSwitchToNormal = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (book) {
      updateBookProgress(book.id, currentIndex);
    }
    router.replace(`/normal-reader/${params.id}`);
  };

  const jumpToPosition = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(words.length - 1, index));
    setCurrentIndex(clampedIndex);
    triggerHaptic();
  }, [words.length, triggerHaptic]);

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
    setShowSpeedDial(false);
  }, [isPlaying, pause]);

  const toggleSpeedDial = useCallback(() => {
    if (isPlaying) {
      pause();
    }
    setShowSpeedDial(prev => !prev);
    setShowNavigator(false);
  }, [isPlaying, pause]);

  // Handle slider drag
  const handleSliderPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const sliderTrackWidth = SCREEN_WIDTH - 48;
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
            activeOpacity={0.5}
          >
            <Text style={[styles.backText, { color: colors.foreground }]}>←</Text>
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleSwitchToNormal}
              activeOpacity={0.5}
            >
              <Text style={[styles.headerLink, { color: colors.muted }]}>Normal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleSpeedDial}
              activeOpacity={0.5}
            >
              <Text style={[styles.headerLink, { color: showSpeedDial ? colors.foreground : colors.muted }]}>
                {wpm}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main reading area */}
        <TouchableOpacity 
          style={styles.readerArea} 
          onPress={togglePlayPause}
          activeOpacity={1}
        >
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
            activeOpacity={0.5}
          >
            <Text style={[styles.positionText, { color: colors.muted }]}>
              {currentIndex.toLocaleString()} / {words.length.toLocaleString()}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Speed Dial Modal */}
        <Modal
          visible={showSpeedDial}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowSpeedDial(false)}
        >
          <TouchableOpacity 
            style={styles.dialOverlay}
            activeOpacity={1}
            onPress={() => setShowSpeedDial(false)}
          >
            <View 
              style={[styles.dialModal, { backgroundColor: colors.background }]}
              onStartShouldSetResponder={() => true}
            >
              <HapticDial
                value={wpm}
                onChange={setWpm}
                foregroundColor={colors.foreground}
                mutedColor={colors.muted}
                borderColor={colors.border}
              />
              <TouchableOpacity
                onPress={() => setShowSpeedDial(false)}
                style={styles.dialDone}
                activeOpacity={0.5}
              >
                <Text style={[styles.dialDoneText, { color: colors.muted }]}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Navigation Panel */}
        {showNavigator && (
          <View style={[styles.navigatorPanel, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {/* Page navigation */}
            <View style={styles.pageNav}>
              <TouchableOpacity
                onPress={() => jumpToPage(Math.max(1, currentPage - 1))}
                activeOpacity={0.5}
              >
                <Text style={[styles.navArrow, { color: colors.foreground }]}>←</Text>
              </TouchableOpacity>
              <View style={styles.pageInfo}>
                <Text style={[styles.pageNumber, { color: colors.foreground }]}>
                  {currentPage} / {totalPages}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => jumpToPage(Math.min(totalPages, currentPage + 1))}
                activeOpacity={0.5}
              >
                <Text style={[styles.navArrow, { color: colors.foreground }]}>→</Text>
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
              </View>
            </TouchableOpacity>

            {/* Quick jump buttons */}
            <View style={styles.quickJumps}>
              {[0, 25, 50, 75, 100].map((percent) => (
                <TouchableOpacity
                  key={percent}
                  onPress={() => jumpToPosition(Math.floor((percent / 100) * (words.length - 1)))}
                  activeOpacity={0.5}
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
              style={styles.chaptersButton}
              activeOpacity={0.5}
            >
              <Text style={[styles.chaptersButtonText, { color: colors.muted }]}>
                Chapters
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
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
            <Text style={[styles.footerText, { color: colors.muted }]}>
              {Math.round(progress)}%
            </Text>
            <Text style={[styles.footerText, { color: colors.muted }]} numberOfLines={1}>
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
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              onPress={() => setShowChapters(false)}
              activeOpacity={1}
            />
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                  Chapters
                </Text>
                <TouchableOpacity
                  onPress={() => setShowChapters(false)}
                  activeOpacity={0.5}
                >
                  <Text style={[styles.modalClose, { color: colors.muted }]}>Done</Text>
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
                      style={[styles.chapterItem, { borderBottomColor: colors.border }]}
                      activeOpacity={0.5}
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 20,
    fontWeight: '300',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  headerLink: {
    fontSize: 15,
    fontWeight: '400',
  },
  readerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orpLine: {
    position: 'absolute',
    width: StyleSheet.hairlineWidth,
    height: 100,
    left: SCREEN_WIDTH / 2,
  },
  wordContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  word: {
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  orpChar: {
    fontWeight: '400',
  },
  statusText: {
    position: 'absolute',
    bottom: 80,
    fontSize: 12,
    fontWeight: '300',
  },
  positionButton: {
    position: 'absolute',
    bottom: 50,
    padding: 8,
  },
  positionText: {
    fontSize: 11,
    fontWeight: '300',
  },
  dialOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialModal: {
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 16,
    minWidth: 200,
  },
  dialDone: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dialDoneText: {
    fontSize: 15,
    fontWeight: '400',
  },
  navigatorPanel: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 32,
  },
  navArrow: {
    fontSize: 18,
    fontWeight: '300',
    padding: 8,
  },
  pageInfo: {
    alignItems: 'center',
  },
  pageNumber: {
    fontSize: 15,
    fontWeight: '300',
  },
  sliderContainer: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  sliderTrack: {
    height: 2,
    borderRadius: 1,
  },
  sliderFill: {
    height: '100%',
    borderRadius: 1,
  },
  quickJumps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickJumpText: {
    fontSize: 12,
    fontWeight: '300',
    padding: 4,
  },
  chaptersButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  chaptersButtonText: {
    fontSize: 14,
    fontWeight: '400',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '300',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '500',
  },
  modalClose: {
    fontSize: 15,
    fontWeight: '400',
  },
  chaptersList: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
