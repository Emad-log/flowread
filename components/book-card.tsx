import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Book } from '@/types';
import { useColors } from '@/hooks/use-colors';

interface BookCardProps {
  book: Book;
  showProgress?: boolean;
}

export function BookCard({ book, showProgress = false }: BookCardProps) {
  const colors = useColors();
  
  const progress = book.currentPosition && book.totalWords 
    ? (book.currentPosition / book.totalWords) * 100 
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.coverContainer}>
        {book.coverUrl ? (
          <Image
            source={{ uri: book.coverUrl }}
            style={styles.cover}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.placeholderCover, { backgroundColor: colors.border }]}>
            <Text style={[styles.placeholderText, { color: colors.muted }]}>
              {book.title.charAt(0)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text 
          style={[styles.title, { color: colors.foreground }]} 
          numberOfLines={2}
        >
          {book.title}
        </Text>
        <Text 
          style={[styles.author, { color: colors.muted }]} 
          numberOfLines={1}
        >
          {book.author}
        </Text>
        {showProgress && progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { backgroundColor: colors.primary, width: `${progress}%` }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.muted }]}>
              {Math.round(progress)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  coverContainer: {
    aspectRatio: 2 / 3,
    width: '100%',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '300',
  },
  info: {
    padding: 12,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  author: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
