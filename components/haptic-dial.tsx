import { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const MIN_WPM = 100;
const MAX_WPM = 800;
const WPM_STEP = 25;
const SENSITIVITY = 0.8; // Lower = more sensitive

interface HapticDialProps {
  value: number;
  onChange: (value: number) => void;
  foregroundColor: string;
  mutedColor: string;
  borderColor: string;
}

export function HapticDial({
  value,
  onChange,
  foregroundColor,
  mutedColor,
  borderColor,
}: HapticDialProps) {
  const translateY = useSharedValue(0);
  const lastValue = useRef(value);
  const accumulatedDelta = useRef(0);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const updateValue = useCallback((delta: number) => {
    accumulatedDelta.current += delta;
    
    // Calculate how many steps based on accumulated delta
    const stepsToMove = Math.floor(Math.abs(accumulatedDelta.current) / (WPM_STEP * SENSITIVITY));
    
    if (stepsToMove > 0) {
      const direction = accumulatedDelta.current > 0 ? -1 : 1; // Inverted: scroll up = increase
      const wpmChange = stepsToMove * WPM_STEP * direction;
      const newValue = Math.max(MIN_WPM, Math.min(MAX_WPM, lastValue.current + wpmChange));
      
      if (newValue !== lastValue.current) {
        lastValue.current = newValue;
        accumulatedDelta.current = 0;
        triggerHaptic();
        onChange(newValue);
      } else {
        // Reset if we hit bounds
        accumulatedDelta.current = 0;
      }
    }
  }, [onChange, triggerHaptic]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      accumulatedDelta.current = 0;
    })
    .onUpdate((event) => {
      translateY.value = event.translationY * 0.3; // Damped visual feedback
      runOnJS(updateValue)(event.translationY);
    })
    .onEnd(() => {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      accumulatedDelta.current = 0;
    });

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value * 0.1 }],
  }));

  // Generate tick marks for visual feedback
  const ticks = [];
  const tickCount = 12;
  for (let i = 0; i < tickCount; i++) {
    const angle = (i / tickCount) * 360;
    ticks.push(angle);
  }

  return (
    <View style={styles.container}>
      {/* Value display */}
      <Text style={[styles.value, { color: foregroundColor }]}>
        {value}
      </Text>
      <Text style={[styles.unit, { color: mutedColor }]}>
        wpm
      </Text>

      {/* Dial */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.dialContainer, dialStyle]}>
          <View style={[styles.dial, { borderColor }]}>
            {/* Tick marks */}
            {ticks.map((angle, index) => (
              <View
                key={index}
                style={[
                  styles.tickWrapper,
                  { transform: [{ rotate: `${angle}deg` }] }
                ]}
              >
                <View 
                  style={[
                    styles.tick,
                    { 
                      backgroundColor: index === 0 ? foregroundColor : borderColor,
                      height: index % 3 === 0 ? 8 : 4,
                    }
                  ]} 
                />
              </View>
            ))}
            
            {/* Center indicator */}
            <View style={[styles.centerDot, { backgroundColor: foregroundColor }]} />
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Hint */}
      <Text style={[styles.hint, { color: mutedColor }]}>
        scroll up or down
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  value: {
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: -2,
  },
  unit: {
    fontSize: 13,
    fontWeight: '300',
    marginTop: 2,
    marginBottom: 24,
  },
  dialContainer: {
    width: 120,
    height: 120,
  },
  dial: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickWrapper: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
  },
  tick: {
    width: 1,
    marginTop: 6,
  },
  centerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  hint: {
    fontSize: 11,
    fontWeight: '300',
    marginTop: 16,
  },
});
