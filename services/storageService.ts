
import { VocabItem, PageAnalysisResult, PersistedAnalysis } from '../types';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch
} from 'firebase/firestore';

const VOCAB_KEY = 'spanish_assistant_vocab';
const ANALYSIS_KEY = 'spanish_assistant_last_analysis';
const HISTORY_KEY = 'spanish_assistant_history';
const THEME_KEY = 'spanish_assistant_theme';
const SESSION_API_KEY = 'spanish_assistant_session_key';

// API Key Session Management
export const setSessionApiKey = (key: string) => {
  sessionStorage.setItem(SESSION_API_KEY, key);
};

export const getSessionApiKey = (): string | null => {
  return sessionStorage.getItem(SESSION_API_KEY);
};

export const clearSessionApiKey = () => {
  sessionStorage.removeItem(SESSION_API_KEY);
};

// HELPER: Get vocabulary collection for current user
const getVocabCollection = () => {
  const user = auth.currentUser;
  if (!user) return null;
  return collection(db, 'users', user.uid, 'vocabulary');
};

export const getVocab = async (): Promise<VocabItem[]> => {
  const user = auth.currentUser;
  
  if (user) {
    try {
      const colRef = getVocabCollection();
      if (!colRef) return [];
      const q = query(colRef, orderBy('addedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as VocabItem);
    } catch (e) {
      console.error("Failed to load vocab from Firestore", e);
      return [];
    }
  }

  try {
    const stored = localStorage.getItem(VOCAB_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load vocab from LocalStorage", e);
    return [];
  }
};

export const addVocabBatch = async (items: Array<Omit<VocabItem, 'id' | 'addedAt' | 'mastered'>>): Promise<number> => {
    const user = auth.currentUser;
    const addedAt = Date.now();
    let addedCount = 0;

    if (user) {
        try {
            const batch = writeBatch(db);
            const colRef = getVocabCollection();
            if (!colRef) return 0;

            for (const item of items) {
                const id = crypto.randomUUID();
                const newItem: VocabItem = {
                    ...item,
                    id,
                    addedAt,
                    mastered: false,
                };
                const docRef = doc(colRef, id);
                batch.set(docRef, newItem);
                addedCount++;
            }
            await batch.commit();
            return addedCount;
        } catch (e) {
            console.error("Batch add failed in Firestore", e);
            return 0;
        }
    }

    const current = await getVocab();
    const updated = [...current];
    items.forEach(item => {
        if (!updated.some(v => v.word.toLowerCase() === item.word.toLowerCase())) {
            updated.unshift({
                ...item,
                id: crypto.randomUUID(),
                addedAt,
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

export const importVocabFromJson = async (items: VocabItem[]): Promise<number> => {
  const user = auth.currentUser;
  let importedCount = 0;

  if (user) {
    try {
      const batch = writeBatch(db);
      const colRef = getVocabCollection();
      if (!colRef) return 0;
      
      const current = await getVocab();
      for (const item of items) {
        if (!current.some(v => v.word.toLowerCase() === item.word.toLowerCase())) {
          const id = item.id || crypto.randomUUID();
          const docRef = doc(colRef, id);
          batch.set(docRef, { ...item, id });
          importedCount++;
        }
      }
      await batch.commit();
      return importedCount;
    } catch (e) {
      console.error("Import failed in Firestore", e);
      return 0;
    }
  }

  const current = await getVocab();
  const updated = [...current];
  items.forEach(item => {
    if (!updated.some(v => v.word.toLowerCase() === item.word.toLowerCase())) {
      updated.unshift({ ...item, id: item.id || crypto.randomUUID() });
      importedCount++;
    }
  });

  if (importedCount > 0) {
    localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
  }
  return importedCount;
};

export const removeVocab = async (id: string) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const docRef = doc(db, 'users', user.uid, 'vocabulary', id);
      await deleteDoc(docRef);
      return;
    } catch (e) {
      console.error("Failed to delete from Firestore", e);
    }
  }

  const current = await getVocab();
  const updated = current.filter(item => item.id !== id);
  localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
};

export const toggleMastered = async (id: string) => {
    const user = auth.currentUser;
    const current = await getVocab();
    const item = current.find(i => i.id === id);
    if (!item) return;

    const updatedItem = { ...item, mastered: !item.mastered };

    if (user) {
        try {
            const docRef = doc(db, 'users', user.uid, 'vocabulary', id);
            await setDoc(docRef, updatedItem, { merge: true });
            return;
        } catch (e) {
            console.error("Failed to update Firestore", e);
        }
    }

    const updatedList = current.map(i => i.id === id ? updatedItem : i);
    localStorage.setItem(VOCAB_KEY, JSON.stringify(updatedList));
}

export const isVocabSaved = async (word: string): Promise<boolean> => {
    const current = await getVocab();
    return current.some(v => v.word.toLowerCase() === word.toLowerCase());
}

export const saveCurrentAnalysis = (data: PageAnalysisResult, image: string) => {
    const entry: PersistedAnalysis = { data, image, timestamp: Date.now() };
    localStorage.setItem(ANALYSIS_KEY, JSON.stringify(entry));
    
    const history = getHistory();
    const updatedHistory = [entry, ...history].slice(0, 10);
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

export const getTheme = (): 'light' | 'dark' => {
  return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light';
};

export const setTheme = (theme: 'light' | 'dark') => {
  localStorage.setItem(THEME_KEY, theme);
};
