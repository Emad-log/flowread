import { useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Platform, PanResponder } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const MIN_WPM = 100;
const MAX_WPM = 800;
const WPM_STEP = 25;

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
  const rotation = useSharedValue(0);
  const [localValue, setLocalValue] = useState(value);
  const startY = useRef(0);
  const startValue = useRef(value);
  const lastStepValue = useRef(value);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, gestureState) => {
        startY.current = gestureState.y0;
        startValue.current = localValue;
        lastStepValue.current = localValue;
      },
      onPanResponderMove: (_, gestureState) => {
        const deltaY = gestureState.moveY - startY.current;
        // Invert: drag up = increase, drag down = decrease
        // Each 20px of movement = 1 step (25 WPM)
        const steps = Math.round(-deltaY / 20);
        const newValue = Math.max(MIN_WPM, Math.min(MAX_WPM, startValue.current + (steps * WPM_STEP)));
        
        // Update rotation for visual feedback
        rotation.value = -deltaY * 0.5;
        
        if (newValue !== localValue) {
          setLocalValue(newValue);
          onChange(newValue);
          
          // Trigger haptic on each step change
          if (Math.abs(newValue - lastStepValue.current) >= WPM_STEP) {
            triggerHaptic();
            lastStepValue.current = newValue;
          }
        }
      },
      onPanResponderRelease: () => {
        rotation.value = withSpring(0, { damping: 15, stiffness: 150 });
      },
    })
  ).current;

  // Keep local value in sync with prop
  if (value !== localValue && !panResponder) {
    setLocalValue(value);
  }

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Generate tick marks
  const ticks = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * 360;
    ticks.push(angle);
  }

  return (
    <View style={styles.container}>
      {/* Value display */}
      <Text style={[styles.value, { color: foregroundColor }]}>
        {localValue}
      </Text>
      <Text style={[styles.unit, { color: mutedColor }]}>
        wpm
      </Text>

      {/* Dial */}
      <View {...panResponder.panHandlers}>
        <Animated.View style={[styles.dialWrapper, dialStyle]}>
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
                      height: index % 3 === 0 ? 10 : 5,
                    }
                  ]} 
                />
              </View>
            ))}
            
            {/* Center dot */}
            <View style={[styles.centerDot, { backgroundColor: foregroundColor }]} />
          </View>
        </Animated.View>
      </View>

      {/* Hint */}
      <Text style={[styles.hint, { color: mutedColor }]}>
        drag up or down
      </Text>
      
      {/* Range indicator */}
      <View style={styles.rangeRow}>
        <Text style={[styles.rangeText, { color: mutedColor }]}>{MIN_WPM}</Text>
        <View style={[styles.rangeLine, { backgroundColor: borderColor }]} />
        <Text style={[styles.rangeText, { color: mutedColor }]}>{MAX_WPM}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  value: {
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: -3,
  },
  unit: {
    fontSize: 13,
    fontWeight: '300',
    marginTop: 0,
    marginBottom: 20,
  },
  dialWrapper: {
    width: 140,
    height: 140,
  },
  dial: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickWrapper: {
    position: 'absolute',
    width: 140,
    height: 140,
    alignItems: 'center',
  },
  tick: {
    width: 1,
    marginTop: 8,
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  hint: {
    fontSize: 12,
    fontWeight: '300',
    marginTop: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '300',
  },
  rangeLine: {
    width: 60,
    height: 1,
  },
});
