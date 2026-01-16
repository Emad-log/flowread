import { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  clamp,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SLIDER_HEIGHT = 200;
const THUMB_SIZE = 32;
const MIN_WPM = 100;
const MAX_WPM = 800;
const WPM_STEP = 50;

interface SpeedSliderProps {
  value: number;
  onChange: (value: number) => void;
  foregroundColor: string;
  mutedColor: string;
  borderColor: string;
  backgroundColor: string;
}

export function SpeedSlider({ 
  value, 
  onChange, 
  foregroundColor, 
  mutedColor,
  borderColor,
  backgroundColor,
}: SpeedSliderProps) {
  const lastHapticValue = useRef(value);
  
  // Calculate initial position from value
  const valueToPosition = (wpm: number) => {
    const percentage = (wpm - MIN_WPM) / (MAX_WPM - MIN_WPM);
    return (1 - percentage) * (SLIDER_HEIGHT - THUMB_SIZE);
  };
  
  const positionToValue = (pos: number) => {
    const percentage = 1 - (pos / (SLIDER_HEIGHT - THUMB_SIZE));
    return MIN_WPM + percentage * (MAX_WPM - MIN_WPM);
  };

  const translateY = useSharedValue(valueToPosition(value));
  const startY = useSharedValue(0);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const updateValue = useCallback((newValue: number) => {
    const clampedValue = Math.max(MIN_WPM, Math.min(MAX_WPM, newValue));
    const snappedValue = Math.round(clampedValue / WPM_STEP) * WPM_STEP;
    
    if (snappedValue !== lastHapticValue.current) {
      lastHapticValue.current = snappedValue;
      triggerHaptic();
      onChange(snappedValue);
    }
  }, [onChange, triggerHaptic]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const newY = clamp(
        startY.value + event.translationY,
        0,
        SLIDER_HEIGHT - THUMB_SIZE
      );
      translateY.value = newY;
      
      const newWpm = positionToValue(newY);
      runOnJS(updateValue)(newWpm);
    })
    .onEnd(() => {
      // Snap to nearest step
      const currentWpm = positionToValue(translateY.value);
      const snappedWpm = Math.round(currentWpm / WPM_STEP) * WPM_STEP;
      const snappedPosition = valueToPosition(snappedWpm);
      
      translateY.value = withSpring(snappedPosition, {
        damping: 20,
        stiffness: 200,
      });
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Generate tick marks
  const ticks = [];
  for (let wpm = MIN_WPM; wpm <= MAX_WPM; wpm += WPM_STEP) {
    const percentage = (wpm - MIN_WPM) / (MAX_WPM - MIN_WPM);
    const position = (1 - percentage) * 100;
    ticks.push({ wpm, position });
  }

  return (
    <View style={[styles.container, { backgroundColor, borderColor }]}>
      {/* Current value */}
      <View style={styles.valueContainer}>
        <Text style={[styles.valueText, { color: foregroundColor }]}>
          {value}
        </Text>
        <Text style={[styles.unitText, { color: mutedColor }]}>
          wpm
        </Text>
      </View>

      {/* Slider track */}
      <View style={styles.sliderContainer}>
        <View style={[styles.track, { backgroundColor: borderColor }]}>
          {/* Tick marks */}
          {ticks.map(({ wpm, position }) => (
            <View
              key={wpm}
              style={[
                styles.tick,
                { 
                  top: `${position}%`,
                  backgroundColor: wpm === value ? foregroundColor : mutedColor,
                  width: wpm % 100 === 0 ? 12 : 6,
                }
              ]}
            />
          ))}
        </View>
        
        {/* Thumb */}
        <GestureDetector gesture={panGesture}>
          <Animated.View 
            style={[
              styles.thumb, 
              { backgroundColor: foregroundColor },
              thumbStyle
            ]} 
          />
        </GestureDetector>
      </View>

      {/* Min/Max labels */}
      <View style={styles.labels}>
        <Text style={[styles.labelText, { color: mutedColor }]}>{MAX_WPM}</Text>
        <Text style={[styles.labelText, { color: mutedColor }]}>{MIN_WPM}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -140,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    width: 72,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  valueText: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: -1,
  },
  unitText: {
    fontSize: 9,
    fontWeight: '300',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  sliderContainer: {
    height: SLIDER_HEIGHT,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    width: 2,
    height: SLIDER_HEIGHT,
    borderRadius: 1,
  },
  tick: {
    position: 'absolute',
    height: 1,
    right: 0,
    transform: [{ translateY: -0.5 }],
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  labels: {
    marginTop: 12,
    height: 40,
    justifyContent: 'space-between',
  },
  labelText: {
    fontSize: 9,
    fontWeight: '300',
    textAlign: 'center',
  },
});
