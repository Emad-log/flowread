import { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Platform, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

const MIN_WPM = 100;
const MAX_WPM = 800;
const WPM_STEP = 25;
const ITEM_WIDTH = 40;

interface RulerPickerProps {
  value: number;
  onChange: (value: number) => void;
  foregroundColor: string;
  mutedColor: string;
  borderColor: string;
}

export function RulerPicker({
  value,
  onChange,
  foregroundColor,
  mutedColor,
  borderColor,
}: RulerPickerProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const lastHapticValue = useRef(value);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  // Generate WPM values
  const values: number[] = [];
  for (let wpm = MIN_WPM; wpm <= MAX_WPM; wpm += WPM_STEP) {
    values.push(wpm);
  }

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  // Calculate offset for a given value
  const getOffsetForValue = useCallback((wpm: number) => {
    const index = values.indexOf(wpm);
    if (index === -1) return 0;
    return index * ITEM_WIDTH;
  }, [values]);

  // Scroll to initial value on mount
  useEffect(() => {
    const offset = getOffsetForValue(value);
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x: offset, animated: false });
    }, 50);
  }, []);

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
    const newValue = values[clampedIndex];
    
    if (newValue && newValue !== lastHapticValue.current) {
      lastHapticValue.current = newValue;
      triggerHaptic();
      onChange(newValue);
    }
  }, [values, onChange, triggerHaptic]);

  const handleScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
    const snapOffset = clampedIndex * ITEM_WIDTH;
    
    // Snap to nearest value
    scrollViewRef.current?.scrollTo({ x: snapOffset, animated: true });
  }, [values]);

  const handleItemPress = useCallback((wpm: number) => {
    const offset = getOffsetForValue(wpm);
    scrollViewRef.current?.scrollTo({ x: offset, animated: true });
    triggerHaptic();
    onChange(wpm);
  }, [getOffsetForValue, onChange, triggerHaptic]);

  const sidePadding = (screenWidth - ITEM_WIDTH) / 2;

  return (
    <View style={styles.container}>
      {/* Current value display */}
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: foregroundColor }]}>{value}</Text>
        <Text style={[styles.unit, { color: mutedColor }]}>wpm</Text>
      </View>
      
      {/* Ruler */}
      <View style={styles.rulerContainer}>
        {/* Center indicator line */}
        <View 
          style={[
            styles.centerIndicator, 
            { backgroundColor: foregroundColor, left: screenWidth / 2 - 0.5 }
          ]} 
          pointerEvents="none"
        />
        
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          scrollEventThrottle={16}
          contentContainerStyle={{ 
            paddingHorizontal: sidePadding,
          }}
        >
          {values.map((wpm) => {
            const isSelected = wpm === value;
            const isMajor = wpm % 100 === 0;
            
            return (
              <TouchableOpacity
                key={wpm}
                onPress={() => handleItemPress(wpm)}
                style={styles.itemContainer}
                activeOpacity={0.7}
              >
                <View style={styles.tickContainer}>
                  <View 
                    style={[
                      styles.tick,
                      { 
                        backgroundColor: isSelected ? foregroundColor : borderColor,
                        height: isMajor ? 20 : 10,
                      }
                    ]} 
                  />
                </View>
                {isMajor && (
                  <Text 
                    style={[
                      styles.label,
                      { color: isSelected ? foregroundColor : mutedColor }
                    ]}
                  >
                    {wpm}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      
      {/* Hint */}
      <Text style={[styles.hint, { color: mutedColor }]}>scroll to adjust</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
  },
  value: {
    fontSize: 40,
    fontWeight: '200',
    letterSpacing: -2,
  },
  unit: {
    fontSize: 13,
    fontWeight: '300',
  },
  rulerContainer: {
    height: 50,
    position: 'relative',
  },
  centerIndicator: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: 28,
    zIndex: 10,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    alignItems: 'center',
  },
  tickContainer: {
    height: 20,
    justifyContent: 'flex-end',
  },
  tick: {
    width: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '300',
    marginTop: 4,
  },
  hint: {
    fontSize: 10,
    fontWeight: '300',
    textAlign: 'center',
    marginTop: 6,
  },
});
