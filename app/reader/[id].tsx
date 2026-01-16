import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Text, 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useLibrary } from '@/lib/library-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { getBook, settings, updateBookProgress, incrementWordsRead } = useLibrary();
  
  useKeepAwake();

  const book = getBook(id || '');
  const words = book?.content?.split(/\s+/).filter(w => w.length > 0) || [];
  
  const [currentIndex, setCurrentIndex] = useState(book?.currentPosition || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(settings.wordsPerMinute);
  const [showControls, setShowControls] = useState(true);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordsReadRef = useRef(0);
  const controlsOpacity = useSharedValue(1);

  // Calculate interval from WPM
  const intervalMs = Math.round(60000 / wpm);

  // Get font size based on settings
  const getFontSize = () => {
    switch (settings.fontSize) {
      case 'small': return 36;
      case 'large': return 56;
      default: return 46;
    }
  };

  // Find ORP (Optimal Recognition Point) - typically around 1/3 of word
  const getORPIndex = (word: string): number => {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return Math.floor(len / 3);
    if (len <= 9) return Math.floor(len / 3);
    return Math.floor(len / 3);
  };

  // Render word with ORP highlighting
  const renderWord = (word: string) => {
    const orpIndex = getORPIndex(word);
    const before = word.slice(0, orpIndex);
    const orp = word[orpIndex] || '';
    const after = word.slice(orpIndex + 1);

    return (
      <View style={styles.wordContainer}>
        <Text style={[styles.word, { color: colors.foreground, fontSize: getFontSize() }]}>
          {before}
        </Text>
        <Text style={[styles.word, styles.orpLetter, { color: colors.accent, fontSize: getFontSize() }]}>
          {orp}
        </Text>
        <Text style={[styles.word, { color: colors.foreground, fontSize: getFontSize() }]}>
          {after}
        </Text>
      </View>
    );
  };

  // Play/Pause logic
  const togglePlay = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsPlaying(prev => !prev);
  }, []);

  // Handle word advancement
  useEffect(() => {
    if (isPlaying && words.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= words.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          wordsReadRef.current += 1;
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, intervalMs, words.length]);

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
  }, [book, currentIndex, updateBookProgress, incrementWordsRead]);

  // Speed adjustment with swipe
  const adjustSpeed = useCallback((delta: number) => {
    setWpm(prev => {
      const newWpm = Math.max(100, Math.min(800, prev + delta));
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return newWpm;
    });
    // Show controls briefly
    controlsOpacity.value = withTiming(1, { duration: 150 });
    setShowControls(true);
  }, [controlsOpacity]);

  // Gesture handlers
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      togglePlay();
    });

  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      const { translationY } = event;
      if (Math.abs(translationY) > 30) {
        // Swipe up = faster, swipe down = slower
        const delta = translationY < 0 ? 50 : -50;
        adjustSpeed(delta);
      }
    });

  const composedGesture = Gesture.Race(tapGesture, panGesture);

  const handleBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Save progress before leaving
    if (book && currentIndex > 0) {
      updateBookProgress(book.id, currentIndex);
      if (wordsReadRef.current > 0) {
        incrementWordsRead(wordsReadRef.current);
      }
    }
    router.back();
  };

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const progress = words.length > 0 ? (currentIndex / words.length) * 100 : 0;
  const currentWord = words[currentIndex] || '';

  if (!book || !book.content) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ScreenContainer edges={['top', 'left', 'right', 'bottom']} className="flex-1">
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.foreground }]}>
              Book content not available
            </Text>
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.errorButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.errorButtonText, { color: colors.background }]}>
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenContainer 
        edges={['top', 'left', 'right', 'bottom']} 
        containerClassName="bg-background"
        className="flex-1"
      >
        {/* Header */}
        <Animated.View style={[styles.header, controlsStyle]}>
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text 
              style={[styles.bookTitle, { color: colors.foreground }]} 
              numberOfLines={1}
            >
              {book.title}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* RSVP Display */}
        <GestureDetector gesture={composedGesture}>
          <View style={styles.readerContainer}>
            {/* ORP Guide Line */}
            <View style={[styles.orpGuide, { backgroundColor: colors.accent }]} />
            
            {/* Word Display */}
            <View style={styles.wordDisplay}>
              {renderWord(currentWord)}
            </View>

            {/* Play/Pause Indicator */}
            {!isPlaying && (
              <View style={styles.pauseIndicator}>
                <IconSymbol name="play.fill" size={32} color={colors.muted} />
                <Text style={[styles.pauseText, { color: colors.muted }]}>
                  Tap to {currentIndex === 0 ? 'start' : 'resume'}
                </Text>
              </View>
            )}
          </View>
        </GestureDetector>

        {/* Footer Controls */}
        <Animated.View style={[styles.footer, controlsStyle]}>
          {/* Speed Display */}
          <View style={[styles.speedBadge, { backgroundColor: colors.surface }]}>
            <Text style={[styles.speedText, { color: colors.foreground }]}>
              {wpm} wpm
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
            <View 
              style={[
                styles.progressFill, 
                { backgroundColor: colors.primary, width: `${progress}%` }
              ]} 
            />
          </View>

          {/* Word Count */}
          <Text style={[styles.wordCount, { color: colors.muted }]}>
            {currentIndex + 1} / {words.length}
          </Text>

          {/* Hint */}
          <Text style={[styles.hint, { color: colors.muted }]}>
            Swipe up/down to adjust speed
          </Text>
        </Animated.View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerInfo: {
    flex: 1,
    paddingHorizontal: 12,
  },
  bookTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  readerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orpGuide: {
    position: 'absolute',
    width: 2,
    height: 80,
    opacity: 0.3,
  },
  wordDisplay: {
    paddingHorizontal: 24,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  word: {
    fontWeight: '400',
    letterSpacing: 1,
  },
  orpLetter: {
    fontWeight: '700',
  },
  pauseIndicator: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    gap: 8,
  },
  pauseText: {
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 12,
  },
  speedBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  speedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  wordCount: {
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    gap: 24,
  },
  errorText: {
    fontSize: 17,
    textAlign: 'center',
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
