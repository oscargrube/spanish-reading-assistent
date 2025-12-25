
export type WordCategory = 'noun' | 'verb' | 'adjective' | 'function';

export interface WordAnalysis {
  word: string;
  translation?: string;
  explanation?: string;
  category?: WordCategory;
  baseForm?: string;
  type?: 'word' | 'punctuation';
}

export interface SentenceAnalysis {
  original: string;
  translation: string;
  words: WordAnalysis[];
}

export interface PageAnalysisResult {
  sentences: SentenceAnalysis[];
}

export interface VocabItem {
  id: string;
  word: string;
  translation: string;
  explanation: string;
  category?: WordCategory;
  baseForm?: string;
  contextSentence?: string;
  addedAt: number;
  mastered: boolean;
}

export interface Book {
  id: string;
  title: string;
  author?: string;
  coverStyle?: string; // CSS color class or similar
  createdAt: number;
  pageCount: number;
}

export interface BookPage {
  id: string;
  bookId: string;
  pageNumber: number;
  image: string; // base64
  analysis: PageAnalysisResult;
  createdAt: number;
}

export enum AppView {
  HOME = 'HOME',
  ANALYZE = 'ANALYZE',
  VOCAB = 'VOCAB',
  LIBRARY = 'LIBRARY',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
}

export interface PersistedAnalysis {
  data: PageAnalysisResult;
  image: string; // base64
  timestamp: number;
}
