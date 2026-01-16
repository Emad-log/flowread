import { Text, View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useLibrary } from '@/lib/library-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, stats, updateSettings } = useLibrary();

  const handleWpmChange = (delta: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newWpm = Math.max(100, Math.min(800, settings.wordsPerMinute + delta));
    updateSettings({ wordsPerMinute: newWpm });
  };

  const handleFontSizeChange = (size: 'small' | 'medium' | 'large') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    updateSettings({ fontSize: size });
  };

  const formatReadingTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <ScreenContainer className="flex-1">
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Reading Speed */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Reading Speed</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.speedRow}>
              <TouchableOpacity
                onPress={() => handleWpmChange(-25)}
                style={[styles.speedButton, { backgroundColor: colors.background }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.speedButtonText, { color: colors.foreground }]}>−</Text>
              </TouchableOpacity>
              <View style={styles.speedDisplay}>
                <Text style={[styles.speedValue, { color: colors.foreground }]}>
                  {settings.wordsPerMinute}
                </Text>
                <Text style={[styles.speedLabel, { color: colors.muted }]}>words/min</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleWpmChange(25)}
                style={[styles.speedButton, { backgroundColor: colors.background }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.speedButtonText, { color: colors.foreground }]}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.speedPresets}>
              {[200, 300, 400, 500].map((wpm) => (
                <TouchableOpacity
                  key={wpm}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    updateSettings({ wordsPerMinute: wpm });
                  }}
                  style={[
                    styles.presetButton,
                    { 
                      backgroundColor: settings.wordsPerMinute === wpm ? colors.primary : colors.background,
                      borderColor: colors.border,
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.presetText,
                    { color: settings.wordsPerMinute === wpm ? colors.background : colors.foreground }
                  ]}>
                    {wpm}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Font Size */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Display Size</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.fontSizeRow}>
              {(['small', 'medium', 'large'] as const).map((size) => (
                <TouchableOpacity
                  key={size}
                  onPress={() => handleFontSizeChange(size)}
                  style={[
                    styles.fontSizeButton,
                    { 
                      backgroundColor: settings.fontSize === size ? colors.primary : colors.background,
                      borderColor: colors.border,
                    }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.fontSizeLabel,
                    { 
                      color: settings.fontSize === size ? colors.background : colors.foreground,
                      fontSize: size === 'small' ? 14 : size === 'medium' ? 18 : 22,
                    }
                  ]}>
                    Aa
                  </Text>
                  <Text style={[
                    styles.fontSizeName,
                    { color: settings.fontSize === size ? colors.background : colors.muted }
                  ]}>
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Reading Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Your Progress</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {stats.totalWordsRead.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Words Read</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {stats.booksCompleted}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Books Done</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {formatReadingTime(stats.totalReadingTime)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Time Read</Text>
              </View>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>About</Text>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.aboutText, { color: colors.foreground }]}>
              FlowRead uses RSVP (Rapid Serial Visual Presentation) to help you read faster by displaying one word at a time.
            </Text>
            <Text style={[styles.aboutText, { color: colors.muted, marginTop: 8 }]}>
              Books are sourced from Open Library and Project Gutenberg.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
  },
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  speedButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonText: {
    fontSize: 24,
    fontWeight: '300',
  },
  speedDisplay: {
    alignItems: 'center',
  },
  speedValue: {
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: -2,
  },
  speedLabel: {
    fontSize: 13,
    marginTop: -4,
  },
  speedPresets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fontSizeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fontSizeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  fontSizeLabel: {
    fontWeight: '600',
  },
  fontSizeName: {
    fontSize: 11,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
