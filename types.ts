

export type WordCategory = 'noun' | 'verb' | 'adjective' | 'function';

export interface WordAnalysis {
  word: string;
  translation?: string;
  explanation?: string;
  literalTranslation?: string; // New: Wörtliche Übersetzung
  category?: WordCategory;
  baseForm?: string;
  type?: 'word' | 'punctuation';
  tense?: string; // New: Zeitform (e.g. "Präteritum")
  person?: string; // New: Person (e.g. "3. Pers. Sing.")
  subWords?: WordAnalysis[]; // New: Individual words if this is a phrase
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
  literalTranslation?: string;
  category?: WordCategory;
  baseForm?: string;
  contextSentence?: string;
  tense?: string;
  person?: string;
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
  lastSentenceIndex?: number;
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