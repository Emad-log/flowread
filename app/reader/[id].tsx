import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Text, 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useLibrary } from '@/lib/library-context';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { getBook, settings, updateBookProgress, incrementWordsRead } = useLibrary();
  
  useKeepAwake();

  const book = getBook(params.id || '');
  const words = book?.content?.split(/\s+/).filter(w => w.length > 0) || [];
  
  const [currentIndex, setCurrentIndex] = useState(book?.currentPosition || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(settings.wordsPerMinute);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordsReadRef = useRef(0);

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

  // Gesture handlers
  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      togglePlayPause();
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
          <Text style={[styles.wpmDisplay, { color: colors.muted }]}>
            {wpm} wpm
          </Text>
        </View>

        {/* Main reading area */}
        <GestureDetector gesture={composedGesture}>
          <View style={styles.readerArea}>
            {/* ORP guide line */}
            <View style={[styles.orpLine, { backgroundColor: colors.border }]} />
            
            {/* Word display */}
            {renderWord()}

            {/* Play/Pause indicator */}
            <Text style={[styles.statusText, { color: colors.muted }]}>
              {isPlaying ? '' : 'tap to start'}
            </Text>
          </View>
        </GestureDetector>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Progress bar */}
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { backgroundColor: colors.foreground, width: `${progress}%` }
              ]} 
            />
          </View>
          
          <View style={styles.footerInfo}>
            <Text style={[styles.progressText, { color: colors.muted }]}>
              {Math.round(progress)}%
            </Text>
            <Text style={[styles.bookTitle, { color: colors.muted }]} numberOfLines={1}>
              {book.title}
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
    bottom: 80,
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
    marginBottom: 12,
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
});
