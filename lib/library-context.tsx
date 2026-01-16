import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Book, ReadingSettings, ReadingStats, DEFAULT_SETTINGS, DEFAULT_STATS } from '@/types';

const LIBRARY_KEY = '@flowread_library';
const SETTINGS_KEY = '@flowread_settings';
const STATS_KEY = '@flowread_stats';

interface LibraryContextType {
  books: Book[];
  settings: ReadingSettings;
  stats: ReadingStats;
  isLoading: boolean;
  addBook: (book: Book) => Promise<void>;
  removeBook: (bookId: string) => Promise<void>;
  updateBookProgress: (bookId: string, position: number) => Promise<void>;
  updateBookContent: (bookId: string, content: string) => Promise<void>;
  getBook: (bookId: string) => Book | undefined;
  updateSettings: (settings: Partial<ReadingSettings>) => Promise<void>;
  updateStats: (stats: Partial<ReadingStats>) => Promise<void>;
  incrementWordsRead: (count: number) => Promise<void>;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [settings, setSettings] = useState<ReadingSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<ReadingStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);

  // Use refs to always have access to latest state in callbacks
  const booksRef = useRef(books);
  const settingsRef = useRef(settings);
  const statsRef = useRef(stats);

  // Keep refs in sync with state
  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [libraryData, settingsData, statsData] = await Promise.all([
          AsyncStorage.getItem(LIBRARY_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(STATS_KEY),
        ]);

        if (libraryData) {
          const parsed = JSON.parse(libraryData);
          setBooks(parsed);
          booksRef.current = parsed;
        }
        if (settingsData) {
          const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) };
          setSettings(parsed);
          settingsRef.current = parsed;
        }
        if (statsData) {
          const parsed = { ...DEFAULT_STATS, ...JSON.parse(statsData) };
          setStats(parsed);
          statsRef.current = parsed;
        }
      } catch (error) {
        console.error('Failed to load library data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const saveBooks = useCallback(async (newBooks: Book[]) => {
    try {
      await AsyncStorage.setItem(LIBRARY_KEY, JSON.stringify(newBooks));
    } catch (error) {
      console.error('Failed to save books:', error);
    }
  }, []);

  const addBook = useCallback(async (book: Book) => {
    // Check if book already exists
    if (booksRef.current.some(b => b.id === book.id)) {
      console.log('Book already in library:', book.id);
      return;
    }
    
    const newBook = { ...book, addedAt: Date.now() };
    const newBooks = [...booksRef.current, newBook];
    
    // Update ref immediately
    booksRef.current = newBooks;
    setBooks(newBooks);
    await saveBooks(newBooks);
    console.log('Book added to library:', book.title);
  }, [saveBooks]);

  const removeBook = useCallback(async (bookId: string) => {
    const newBooks = booksRef.current.filter(b => b.id !== bookId);
    booksRef.current = newBooks;
    setBooks(newBooks);
    await saveBooks(newBooks);
  }, [saveBooks]);

  const updateBookProgress = useCallback(async (bookId: string, position: number) => {
    const newBooks = booksRef.current.map(b => 
      b.id === bookId ? { ...b, currentPosition: position } : b
    );
    booksRef.current = newBooks;
    setBooks(newBooks);
    await saveBooks(newBooks);
  }, [saveBooks]);

  const updateBookContent = useCallback(async (bookId: string, content: string) => {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const newBooks = booksRef.current.map(b => 
      b.id === bookId ? { ...b, content, totalWords: words.length } : b
    );
    booksRef.current = newBooks;
    setBooks(newBooks);
    await saveBooks(newBooks);
    console.log('Book content updated:', bookId, 'words:', words.length);
  }, [saveBooks]);

  const getBook = useCallback((bookId: string) => {
    return booksRef.current.find(b => b.id === bookId);
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<ReadingSettings>) => {
    const updated = { ...settingsRef.current, ...newSettings };
    settingsRef.current = updated;
    setSettings(updated);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, []);

  const updateStats = useCallback(async (newStats: Partial<ReadingStats>) => {
    const updated = { ...statsRef.current, ...newStats };
    statsRef.current = updated;
    setStats(updated);
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }, []);

  const incrementWordsRead = useCallback(async (count: number) => {
    const updated = { ...statsRef.current, totalWordsRead: statsRef.current.totalWordsRead + count };
    statsRef.current = updated;
    setStats(updated);
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }, []);

  return (
    <LibraryContext.Provider
      value={{
        books,
        settings,
        stats,
        isLoading,
        addBook,
        removeBook,
        updateBookProgress,
        updateBookContent,
        getBook,
        updateSettings,
        updateStats,
        incrementWordsRead,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const context = useContext(LibraryContext);
  if (context === undefined) {
    throw new Error('useLibrary must be used within a LibraryProvider');
  }
  return context;
}
