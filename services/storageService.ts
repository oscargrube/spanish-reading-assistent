
import { VocabItem, PageAnalysisResult, PersistedAnalysis } from '../types';

const VOCAB_KEY = 'spanish_assistant_vocab';
const ANALYSIS_KEY = 'spanish_assistant_last_analysis';
const HISTORY_KEY = 'spanish_assistant_history';
const CUSTOM_API_KEY = 'spanish_assistant_custom_api_key';
const THEME_KEY = 'spanish_assistant_theme';

export const getVocab = (): VocabItem[] => {
  try {
    const stored = localStorage.getItem(VOCAB_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load vocab", e);
    return [];
  }
};

export const addVocab = (item: Omit<VocabItem, 'id' | 'addedAt' | 'mastered'>): VocabItem => {
  const current = getVocab();
  const newItem: VocabItem = {
    ...item,
    id: crypto.randomUUID(),
    addedAt: Date.now(),
    mastered: false,
  };
  
  if (!current.some(v => v.word.toLowerCase() === newItem.word.toLowerCase())) {
    const updated = [newItem, ...current];
    localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
  }
  
  return newItem;
};

export const addVocabBatch = (items: Array<Omit<VocabItem, 'id' | 'addedAt' | 'mastered'>>): number => {
    const current = getVocab();
    let addedCount = 0;
    const updated = [...current];

    items.forEach(item => {
        if (!updated.some(v => v.word.toLowerCase() === item.word.toLowerCase())) {
            updated.unshift({
                ...item,
                id: crypto.randomUUID(),
                addedAt: Date.now(),
                mastered: false,
            });
            addedCount++;
        }
    });

    if (addedCount > 0) {
        localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
    }
    return addedCount;
};

export const removeVocab = (id: string) => {
  const current = getVocab();
  const updated = current.filter(item => item.id !== id);
  localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
};

export const toggleMastered = (id: string) => {
    const current = getVocab();
    const updated = current.map(item => 
        item.id === id ? { ...item, mastered: !item.mastered } : item
    );
    localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
}

export const isVocabSaved = (word: string): boolean => {
    const current = getVocab();
    return current.some(v => v.word.toLowerCase() === word.toLowerCase());
}

// Analysis Persistence
export const saveCurrentAnalysis = (data: PageAnalysisResult, image: string) => {
    const entry: PersistedAnalysis = { data, image, timestamp: Date.now() };
    localStorage.setItem(ANALYSIS_KEY, JSON.stringify(entry));
    
    // Add to history too
    const history = getHistory();
    const updatedHistory = [entry, ...history].slice(0, 10); // Keep last 10
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
};

export const getLastAnalysis = (): PersistedAnalysis | null => {
    const stored = localStorage.getItem(ANALYSIS_KEY);
    return stored ? JSON.parse(stored) : null;
};

export const clearLastAnalysis = () => {
    localStorage.removeItem(ANALYSIS_KEY);
};

export const getHistory = (): PersistedAnalysis[] => {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
};

// API Key Management
export const saveApiKey = (key: string) => {
    localStorage.setItem(CUSTOM_API_KEY, key);
};

export const getApiKey = (): string | null => {
    return localStorage.getItem(CUSTOM_API_KEY);
};

export const removeApiKey = () => {
    localStorage.removeItem(CUSTOM_API_KEY);
};

// Theme Management
export const getTheme = (): 'light' | 'dark' => {
  return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light';
};

export const setTheme = (theme: 'light' | 'dark') => {
  localStorage.setItem(THEME_KEY, theme);
};
