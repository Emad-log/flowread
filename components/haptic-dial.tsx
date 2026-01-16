import { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const DIAL_SIZE = 180;
const NOTCH_COUNT = 15;
const MIN_WPM = 100;
const MAX_WPM = 800;
const WPM_STEP = 50;

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
  borderColor 
}: HapticDialProps) {
  const rotation = useSharedValue(0);
  const startRotation = useSharedValue(0);
  const lastHapticValue = useRef(value);

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
      startRotation.value = rotation.value;
    })
    .onUpdate((event) => {
      // Calculate rotation based on drag distance
      const dragDistance = -event.translationY; // Negative so dragging up increases
      const rotationDelta = dragDistance * 0.5; // Sensitivity
      rotation.value = startRotation.value + rotationDelta;
      
      // Calculate WPM from rotation
      const wpmRange = MAX_WPM - MIN_WPM;
      const rotationRange = 270; // Total rotation range in degrees
      const normalizedRotation = ((rotation.value % 360) + 360) % 360;
      const wpmDelta = (rotationDelta / rotationRange) * wpmRange;
      const newWpm = value + wpmDelta;
      
      runOnJS(updateValue)(newWpm);
    })
    .onEnd(() => {
      // Snap rotation to nearest notch
      const notchAngle = 360 / NOTCH_COUNT;
      const snappedRotation = Math.round(rotation.value / notchAngle) * notchAngle;
      rotation.value = withSpring(snappedRotation, {
        damping: 15,
        stiffness: 150,
      });
    });

  const dialStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Generate notch positions
  const notches = Array.from({ length: NOTCH_COUNT }, (_, i) => {
    const angle = (i * 360) / NOTCH_COUNT;
    return angle;
  });

  return (
    <View style={styles.container}>
      {/* Value display */}
      <View style={styles.valueContainer}>
        <Text style={[styles.valueText, { color: foregroundColor }]}>
          {value}
        </Text>
        <Text style={[styles.unitText, { color: mutedColor }]}>
          wpm
        </Text>
      </View>

      {/* Dial */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.dial, dialStyle, { borderColor }]}>
          {/* Center dot */}
          <View style={[styles.centerDot, { backgroundColor: foregroundColor }]} />
          
          {/* Notches */}
          {notches.map((angle, index) => (
            <View
              key={index}
              style={[
                styles.notchContainer,
                { transform: [{ rotate: `${angle}deg` }] }
              ]}
            >
              <View 
                style={[
                  styles.notch, 
                  { backgroundColor: index === 0 ? foregroundColor : mutedColor }
                ]} 
              />
            </View>
          ))}
        </Animated.View>
      </GestureDetector>

      {/* Instructions */}
      <Text style={[styles.instructions, { color: mutedColor }]}>
        drag up/down to adjust
      </Text>

      {/* Min/Max labels */}
      <View style={styles.labels}>
        <Text style={[styles.labelText, { color: mutedColor }]}>{MIN_WPM}</Text>
        <Text style={[styles.labelText, { color: mutedColor }]}>{MAX_WPM}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  valueContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  valueText: {
    fontSize: 56,
    fontWeight: '200',
    letterSpacing: -2,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '300',
    marginTop: 4,
  },
  dial: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notchContainer: {
    position: 'absolute',
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
  },
  notch: {
    width: 2,
    height: 12,
    borderRadius: 1,
    marginTop: 8,
  },
  instructions: {
    fontSize: 12,
    fontWeight: '300',
    marginTop: 20,
    letterSpacing: 0.5,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: DIAL_SIZE,
    marginTop: 12,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '300',
  },
});
