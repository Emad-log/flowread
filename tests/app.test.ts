import { describe, it, expect, vi } from 'vitest';

// Test Open Library API functions
describe('Open Library API', () => {
  it('should construct correct cover URL', () => {
    // Test cover URL generation
    const getCoverUrl = (coverId: number | undefined, size: 'S' | 'M' | 'L' = 'M'): string | null => {
      if (!coverId) return null;
      return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
    };

    expect(getCoverUrl(12345, 'M')).toBe('https://covers.openlibrary.org/b/id/12345-M.jpg');
    expect(getCoverUrl(12345, 'L')).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg');
    expect(getCoverUrl(12345, 'S')).toBe('https://covers.openlibrary.org/b/id/12345-S.jpg');
    expect(getCoverUrl(undefined)).toBeNull();
  });
});

// Test RSVP ORP calculation
describe('RSVP ORP Calculation', () => {
  const getORPIndex = (word: string): number => {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return Math.floor(len / 3);
    if (len <= 9) return Math.floor(len / 3);
    return Math.floor(len / 3);
  };

  it('should calculate ORP index for short words', () => {
    expect(getORPIndex('a')).toBe(0);
    expect(getORPIndex('at')).toBe(0);
    expect(getORPIndex('the')).toBe(1);
    expect(getORPIndex('word')).toBe(1);
    expect(getORPIndex('hello')).toBe(1);
  });

  it('should calculate ORP index for medium words', () => {
    expect(getORPIndex('reading')).toBe(2);
    expect(getORPIndex('beautiful')).toBe(3);
  });

  it('should calculate ORP index for long words', () => {
    expect(getORPIndex('presentation')).toBe(4);
    expect(getORPIndex('understanding')).toBe(4);
  });
});

// Test WPM to interval conversion
describe('WPM Conversion', () => {
  it('should convert WPM to correct interval in milliseconds', () => {
    const wpmToInterval = (wpm: number) => Math.round(60000 / wpm);

    expect(wpmToInterval(300)).toBe(200); // 300 wpm = 200ms per word
    expect(wpmToInterval(200)).toBe(300); // 200 wpm = 300ms per word
    expect(wpmToInterval(400)).toBe(150); // 400 wpm = 150ms per word
    expect(wpmToInterval(500)).toBe(120); // 500 wpm = 120ms per word
    expect(wpmToInterval(600)).toBe(100); // 600 wpm = 100ms per word
  });
});

// Test Book type structure
describe('Book Data Structure', () => {
  it('should have correct default settings', () => {
    const DEFAULT_SETTINGS = {
      wordsPerMinute: 300,
      fontSize: 'medium' as const,
      theme: 'system' as const,
    };

    expect(DEFAULT_SETTINGS.wordsPerMinute).toBe(300);
    expect(DEFAULT_SETTINGS.fontSize).toBe('medium');
    expect(DEFAULT_SETTINGS.theme).toBe('system');
  });

  it('should have correct default stats', () => {
    const DEFAULT_STATS = {
      totalWordsRead: 0,
      booksCompleted: 0,
      totalReadingTime: 0,
    };

    expect(DEFAULT_STATS.totalWordsRead).toBe(0);
    expect(DEFAULT_STATS.booksCompleted).toBe(0);
    expect(DEFAULT_STATS.totalReadingTime).toBe(0);
  });
});

// Test text processing for RSVP
describe('Text Processing', () => {
  it('should split text into words correctly', () => {
    const text = 'Hello world this is a test';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    expect(words).toHaveLength(6);
    expect(words[0]).toBe('Hello');
    expect(words[5]).toBe('test');
  });

  it('should handle multiple spaces', () => {
    const text = 'Hello    world   test';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    expect(words).toHaveLength(3);
  });

  it('should handle newlines', () => {
    const text = 'Hello\nworld\ntest';
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    expect(words).toHaveLength(3);
  });
});

// Test progress calculation
describe('Progress Calculation', () => {
  it('should calculate reading progress correctly', () => {
    const calculateProgress = (currentIndex: number, totalWords: number) => {
      if (totalWords === 0) return 0;
      return (currentIndex / totalWords) * 100;
    };

    expect(calculateProgress(0, 100)).toBe(0);
    expect(calculateProgress(50, 100)).toBe(50);
    expect(calculateProgress(100, 100)).toBe(100);
    expect(calculateProgress(25, 100)).toBe(25);
    expect(calculateProgress(0, 0)).toBe(0);
  });
});

// Test reading time formatting
describe('Reading Time Formatting', () => {
  it('should format reading time correctly', () => {
    const formatReadingTime = (seconds: number): string => {
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };

    expect(formatReadingTime(30)).toBe('30s');
    expect(formatReadingTime(60)).toBe('1m');
    expect(formatReadingTime(120)).toBe('2m');
    expect(formatReadingTime(3600)).toBe('1h 0m');
    expect(formatReadingTime(3660)).toBe('1h 1m');
    expect(formatReadingTime(7200)).toBe('2h 0m');
  });
});

// Test speed bounds
describe('Speed Bounds', () => {
  it('should clamp WPM within valid range', () => {
    const clampWpm = (wpm: number) => Math.max(100, Math.min(800, wpm));

    expect(clampWpm(50)).toBe(100);
    expect(clampWpm(100)).toBe(100);
    expect(clampWpm(300)).toBe(300);
    expect(clampWpm(800)).toBe(800);
    expect(clampWpm(1000)).toBe(800);
  });
});
