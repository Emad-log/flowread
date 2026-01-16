export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  description: string;
  pageCount: number | null;
  publishYear: number | null;
  subjects: string[];
  // Content and reading state
  content?: string;
  currentPosition?: number;
  totalWords?: number;
  addedAt?: number;
}

export interface OpenLibrarySearchResult {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  number_of_pages_median?: number;
  subject?: string[];
}

export interface OpenLibraryWork {
  key: string;
  title: string;
  description?: string | { value: string };
  covers?: number[];
  subjects?: string[];
  authors?: { author: { key: string } }[];
}

export interface ReadingSettings {
  wordsPerMinute: number;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'system' | 'light' | 'dark';
}

export interface ReadingStats {
  totalWordsRead: number;
  booksCompleted: number;
  totalReadingTime: number; // in seconds
}

export const DEFAULT_SETTINGS: ReadingSettings = {
  wordsPerMinute: 300,
  fontSize: 'medium',
  theme: 'system',
};

export const DEFAULT_STATS: ReadingStats = {
  totalWordsRead: 0,
  booksCompleted: 0,
  totalReadingTime: 0,
};
