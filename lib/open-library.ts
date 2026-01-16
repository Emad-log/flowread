import { Book, OpenLibrarySearchResult, OpenLibraryWork } from '@/types';

const BASE_URL = 'https://openlibrary.org';
const GUTENBERG_BASE = 'https://www.gutenberg.org';

export function getCoverUrl(coverId: number | undefined, size: 'S' | 'M' | 'L' = 'M'): string | null {
  if (!coverId) return null;
  return `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
}

export async function searchBooks(query: string, limit: number = 20): Promise<Book[]> {
  try {
    const response = await fetch(
      `${BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=${limit}&fields=key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject`
    );
    
    if (!response.ok) throw new Error('Search failed');
    
    const data = await response.json();
    const results: OpenLibrarySearchResult[] = data.docs || [];
    
    return results.map((result) => ({
      id: result.key.replace('/works/', ''),
      title: result.title,
      author: result.author_name?.[0] || 'Unknown Author',
      coverUrl: getCoverUrl(result.cover_i, 'M'),
      description: '',
      pageCount: result.number_of_pages_median || null,
      publishYear: result.first_publish_year || null,
      subjects: result.subject?.slice(0, 5) || [],
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

export async function getBookDetails(workId: string): Promise<Book | null> {
  try {
    const response = await fetch(`${BASE_URL}/works/${workId}.json`);
    if (!response.ok) throw new Error('Failed to fetch book details');
    
    const work: OpenLibraryWork = await response.json();
    
    let description = '';
    if (typeof work.description === 'string') {
      description = work.description;
    } else if (work.description?.value) {
      description = work.description.value;
    }
    
    return {
      id: workId,
      title: work.title,
      author: 'Unknown Author', // Will be fetched separately if needed
      coverUrl: work.covers?.[0] ? getCoverUrl(work.covers[0], 'L') : null,
      description,
      pageCount: null,
      publishYear: null,
      subjects: work.subjects?.slice(0, 5) || [],
    };
  } catch (error) {
    console.error('Get book details error:', error);
    return null;
  }
}

// Fetch book content from Project Gutenberg or Open Library
export async function fetchBookContent(bookId: string, title: string): Promise<string | null> {
  try {
    // First, try to find the book on Project Gutenberg by searching
    const gutenbergSearchUrl = `https://gutendex.com/books/?search=${encodeURIComponent(title)}`;
    const searchResponse = await fetch(gutenbergSearchUrl);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      
      if (searchData.results && searchData.results.length > 0) {
        const gutenbergBook = searchData.results[0];
        
        // Try to get plain text format
        const textUrl = gutenbergBook.formats?.['text/plain; charset=utf-8'] 
          || gutenbergBook.formats?.['text/plain']
          || gutenbergBook.formats?.['text/plain; charset=us-ascii'];
        
        if (textUrl) {
          const textResponse = await fetch(textUrl);
          if (textResponse.ok) {
            const text = await textResponse.text();
            // Clean up the text - remove Gutenberg header/footer
            return cleanGutenbergText(text);
          }
        }
      }
    }
    
    // Fallback: return sample text for demo purposes
    return generateSampleContent(title);
  } catch (error) {
    console.error('Fetch content error:', error);
    return generateSampleContent(title);
  }
}

function cleanGutenbergText(text: string): string {
  // Remove Project Gutenberg header
  const startMarkers = [
    '*** START OF THE PROJECT GUTENBERG',
    '*** START OF THIS PROJECT GUTENBERG',
    '*END*THE SMALL PRINT',
  ];
  
  const endMarkers = [
    '*** END OF THE PROJECT GUTENBERG',
    '*** END OF THIS PROJECT GUTENBERG',
    'End of the Project Gutenberg',
    'End of Project Gutenberg',
  ];
  
  let cleanText = text;
  
  for (const marker of startMarkers) {
    const idx = cleanText.indexOf(marker);
    if (idx !== -1) {
      const endOfLine = cleanText.indexOf('\n', idx);
      cleanText = cleanText.substring(endOfLine + 1);
      break;
    }
  }
  
  for (const marker of endMarkers) {
    const idx = cleanText.indexOf(marker);
    if (idx !== -1) {
      cleanText = cleanText.substring(0, idx);
      break;
    }
  }
  
  // Clean up excessive whitespace
  cleanText = cleanText
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return cleanText;
}

function generateSampleContent(title: string): string {
  return `Welcome to FlowRead!

This is a sample text for "${title}". The full content could not be loaded from Project Gutenberg.

RSVP (Rapid Serial Visual Presentation) is a speed reading technique that displays words one at a time in quick succession. This method helps readers focus on each word without the need for eye movement across a page.

Benefits of RSVP reading include:

Increased reading speed by eliminating saccadic eye movements. Better focus and concentration on the text. Reduced subvocalization which can slow down reading. Improved comprehension through focused attention.

To get the most out of RSVP reading, start with a comfortable speed and gradually increase it as you become more comfortable. Most people can read at 300 to 500 words per minute with practice.

The key to effective speed reading is finding the right balance between speed and comprehension. If you find yourself not understanding the material, slow down. Speed should never come at the expense of understanding.

Practice regularly and you will see improvement over time. Happy reading!`;
}

// Get trending/popular books
export async function getTrendingBooks(): Promise<Book[]> {
  const popularQueries = ['classic literature', 'bestseller', 'fiction'];
  const randomQuery = popularQueries[Math.floor(Math.random() * popularQueries.length)];
  return searchBooks(randomQuery, 10);
}
