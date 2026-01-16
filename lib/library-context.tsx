import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [libraryData, settingsData, statsData] = await Promise.all([
          AsyncStorage.getItem(LIBRARY_KEY),
          AsyncStorage.getItem(SETTINGS_KEY),
          AsyncStorage.getItem(STATS_KEY),
        ]);

        if (libraryData) setBooks(JSON.parse(libraryData));
        if (settingsData) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(settingsData) });
        if (statsData) setStats({ ...DEFAULT_STATS, ...JSON.parse(statsData) });
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
    const newBook = { ...book, addedAt: Date.now() };
    const newBooks = [...books, newBook];
    setBooks(newBooks);
    await saveBooks(newBooks);
  }, [books, saveBooks]);

  const removeBook = useCallback(async (bookId: string) => {
    const newBooks = books.filter(b => b.id !== bookId);
    setBooks(newBooks);
    await saveBooks(newBooks);
  }, [books, saveBooks]);

  const updateBookProgress = useCallback(async (bookId: string, position: number) => {
    const newBooks = books.map(b => 
      b.id === bookId ? { ...b, currentPosition: position } : b
    );
    setBooks(newBooks);
    await saveBooks(newBooks);
  }, [books, saveBooks]);

  const updateBookContent = useCallback(async (bookId: string, content: string) => {
    const words = content.split(/\s+/).filter(w => w.length > 0);
    const newBooks = books.map(b => 
      b.id === bookId ? { ...b, content, totalWords: words.length } : b
    );
    setBooks(newBooks);
    await saveBooks(newBooks);
  }, [books, saveBooks]);

  const getBook = useCallback((bookId: string) => {
    return books.find(b => b.id === bookId);
  }, [books]);

  const updateSettings = useCallback(async (newSettings: Partial<ReadingSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  const updateStats = useCallback(async (newStats: Partial<ReadingStats>) => {
    const updated = { ...stats, ...newStats };
    setStats(updated);
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }, [stats]);

  const incrementWordsRead = useCallback(async (count: number) => {
    const updated = { ...stats, totalWordsRead: stats.totalWordsRead + count };
    setStats(updated);
    try {
      await AsyncStorage.setItem(STATS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }, [stats]);

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
