
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

export enum AppView {
  HOME = 'HOME',
  ANALYZE = 'ANALYZE',
  VOCAB = 'VOCAB',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
}

export interface PersistedAnalysis {
  data: PageAnalysisResult;
  image: string; // base64
  timestamp: number;
}
