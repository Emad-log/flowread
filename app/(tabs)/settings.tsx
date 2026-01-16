import { Text, View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useLibrary } from '@/lib/library-context';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function SettingsScreen() {
  const colors = useColors();
  const { settings, stats, updateSettings } = useLibrary();

  const handleSpeedChange = (delta: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newSpeed = Math.max(100, Math.min(800, settings.wordsPerMinute + delta));
    updateSettings({ wordsPerMinute: newSpeed });
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <ScreenContainer className="flex-1">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Reading Speed */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>
            Reading Speed
          </Text>
          <View style={styles.speedControl}>
            <TouchableOpacity
              onPress={() => handleSpeedChange(-50)}
              style={[styles.speedButton, { borderColor: colors.border }]}
              activeOpacity={0.6}
            >
              <Text style={[styles.speedButtonText, { color: colors.foreground }]}>−</Text>
            </TouchableOpacity>
            <View style={styles.speedDisplay}>
              <Text style={[styles.speedValue, { color: colors.foreground }]}>
                {settings.wordsPerMinute}
              </Text>
              <Text style={[styles.speedUnit, { color: colors.muted }]}>
                words/min
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleSpeedChange(50)}
              style={[styles.speedButton, { borderColor: colors.border }]}
              activeOpacity={0.6}
            >
              <Text style={[styles.speedButtonText, { color: colors.foreground }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>
            Statistics
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {stats.totalWordsRead.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>
                Words Read
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {stats.booksCompleted}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>
                Books Completed
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {formatTime(stats.totalReadingTime)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>
                Time Reading
              </Text>
            </View>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>
            About
          </Text>
          <Text style={[styles.aboutText, { color: colors.foreground }]}>
            FlowRead uses RSVP technology to help you read faster by displaying words one at a time at your chosen speed.
          </Text>
          <Text style={[styles.version, { color: colors.muted }]}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: -1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  speedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedButtonText: {
    fontSize: 24,
    fontWeight: '300',
  },
  speedDisplay: {
    alignItems: 'center',
    marginHorizontal: 32,
  },
  speedValue: {
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: -2,
  },
  speedUnit: {
    fontSize: 12,
    fontWeight: '300',
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
  statDivider: {
    width: 1,
    height: 40,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '300',
    marginTop: 4,
    textAlign: 'center',
  },
  aboutText: {
    fontSize: 14,
    fontWeight: '300',
    lineHeight: 22,
  },
  version: {
    fontSize: 12,
    fontWeight: '300',
    marginTop: 16,
  },
});
