import { useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, FlatList, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const MIN_WPM = 100;
const MAX_WPM = 800;
const WPM_STEP = 25;
const ITEM_WIDTH = 50;

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
  const flatListRef = useRef<FlatList>(null);
  const lastHapticValue = useRef(value);
  const isScrolling = useRef(false);
  
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

  // Scroll to initial value
  useEffect(() => {
    const index = values.indexOf(value);
    if (index >= 0 && flatListRef.current && !isScrolling.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: false,
          viewPosition: 0.5,
        });
      }, 100);
    }
  }, []);

  const handleScroll = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const centerOffset = offsetX + (screenWidth / 2) - (ITEM_WIDTH / 2);
    const index = Math.round(centerOffset / ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
    const newValue = values[clampedIndex];
    
    if (newValue && newValue !== lastHapticValue.current) {
      lastHapticValue.current = newValue;
      triggerHaptic();
      onChange(newValue);
    }
  }, [values, onChange, triggerHaptic]);

  const handleScrollBegin = () => {
    isScrolling.current = true;
  };

  const handleScrollEnd = useCallback((event: any) => {
    isScrolling.current = false;
    const offsetX = event.nativeEvent.contentOffset.x;
    const screenWidth = Dimensions.get('window').width;
    const centerOffset = offsetX + (screenWidth / 2) - (ITEM_WIDTH / 2);
    const index = Math.round(centerOffset / ITEM_WIDTH);
    const clampedIndex = Math.max(0, Math.min(values.length - 1, index));
    
    // Snap to nearest value
    flatListRef.current?.scrollToIndex({
      index: clampedIndex,
      animated: true,
      viewPosition: 0.5,
    });
  }, [values]);

  const getItemLayout = (_: any, index: number) => ({
    length: ITEM_WIDTH,
    offset: ITEM_WIDTH * index,
    index,
  });

  const renderItem = ({ item, index }: { item: number; index: number }) => {
    const isSelected = item === value;
    const isMajor = item % 100 === 0;
    
    return (
      <View style={styles.itemContainer}>
        <View style={styles.tickContainer}>
          <View 
            style={[
              styles.tick,
              { 
                backgroundColor: isSelected ? foregroundColor : borderColor,
                height: isMajor ? 24 : 12,
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
            {item}
          </Text>
        )}
      </View>
    );
  };

  const screenWidth = Dimensions.get('window').width;
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
        {/* Center indicator */}
        <View style={[styles.centerIndicator, { backgroundColor: foregroundColor }]} />
        
        <FlatList
          ref={flatListRef}
          data={values}
          renderItem={renderItem}
          keyExtractor={(item) => item.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBegin}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          contentContainerStyle={{ 
            paddingHorizontal: sidePadding,
          }}
          initialScrollIndex={Math.max(0, values.indexOf(value))}
          onScrollToIndexFailed={() => {}}
        />
      </View>
      
      {/* Hint */}
      <Text style={[styles.hint, { color: mutedColor }]}>scroll to adjust</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 4,
  },
  value: {
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: -2,
  },
  unit: {
    fontSize: 14,
    fontWeight: '300',
  },
  rulerContainer: {
    height: 60,
    position: 'relative',
  },
  centerIndicator: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -0.5,
    width: 1,
    height: 32,
    zIndex: 10,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    alignItems: 'center',
  },
  tickContainer: {
    height: 24,
    justifyContent: 'flex-end',
  },
  tick: {
    width: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '300',
    marginTop: 4,
  },
  hint: {
    fontSize: 11,
    fontWeight: '300',
    textAlign: 'center',
    marginTop: 8,
  },
});
