import { VocabItem, PageAnalysisResult, PersistedAnalysis, Book, BookPage, MasteryLevel } from '../types';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  writeBatch,
  addDoc,
  updateDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';

const VOCAB_KEY = 'spanish_assistant_vocab';
const ANALYSIS_KEY = 'spanish_assistant_last_analysis';
const HISTORY_KEY = 'spanish_assistant_history';
const THEME_KEY = 'spanish_assistant_theme';
const SESSION_API_KEY = 'spanish_assistant_session_key';
const BOOKS_KEY = 'spanish_assistant_books';

let currentUser: User | null = null;
onAuthStateChanged(auth, user => {
  currentUser = user;
});

const sanitizeData = (data: any) => {
  const sanitized: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      sanitized[key] = data[key];
    }
  });
  return sanitized;
};

export const setSessionApiKey = (key: string) => {
  sessionStorage.setItem(SESSION_API_KEY, key);
};

export const getSessionApiKey = (): string | null => {
  return sessionStorage.getItem(SESSION_API_KEY);
};

export const clearSessionApiKey = () => {
  sessionStorage.removeItem(SESSION_API_KEY);
};

const getVocabCollection = () => {
  const user = currentUser;
  if (!user) return null;
  return collection(db, 'users', user.uid, 'vocabulary');
};

export const getVocab = async (): Promise<VocabItem[]> => {
  const user = currentUser;
  if (user) {
    try {
      const colRef = getVocabCollection();
      if (!colRef) return [];
      const q = query(colRef, orderBy('addedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
          const data = doc.data() as VocabItem;
          // Normalize legacy data
          if (!data.masteryLevel) {
              data.masteryLevel = data.mastered ? 'mastered' : 'new';
          }
          return { ...data, id: doc.id };
      });
    } catch (e) {
      console.error("Failed to load vocab from Firestore", e);
      return [];
    }
  }

  try {
    const stored = localStorage.getItem(VOCAB_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return parsed.map((item: any) => ({
        ...item,
        masteryLevel: item.masteryLevel || (item.mastered ? 'mastered' : 'new')
    }));
  } catch (e) {
    console.error("Failed to load vocab from LocalStorage", e);
    return [];
  }
};

export const addVocabBatch = async (items: Array<Omit<VocabItem, 'id' | 'addedAt' | 'mastered' | 'masteryLevel'>>): Promise<number> => {
    const user = currentUser;
    const addedAt = Date.now();
    let addedCount = 0;

    const current = await getVocab();
    const existingWords = new Set(current.map(v => v.word.trim().toLowerCase()));

    if (user) {
        try {
            const batch = writeBatch(db);
            const colRef = getVocabCollection();
            if (!colRef) return 0;

            let ops = 0;
            for (const item of items) {
                const normalizedWord = item.word.trim().toLowerCase();
                if (!existingWords.has(normalizedWord) && normalizedWord.length > 0) {
                    const id = crypto.randomUUID();
                    const newItem: VocabItem = {
                        ...item,
                        word: item.word.trim(),
                        id,
                        addedAt,
                        mastered: false,
                        masteryLevel: 'new'
                    };
                    const docRef = doc(colRef, id);
                    batch.set(docRef, sanitizeData(newItem));
                    addedCount++;
                    existingWords.add(normalizedWord);
                    ops++;
                }
            }
            if (ops > 0) await batch.commit();
            return addedCount;
        } catch (e) {
            console.error("Batch add failed in Firestore", e);
            return 0;
        }
    }

    const updated = [...current];
    items.forEach(item => {
        const normalizedWord = item.word.trim().toLowerCase();
        if (!existingWords.has(normalizedWord) && normalizedWord.length > 0) {
            updated.unshift({
                ...item,
                word: item.word.trim(),
                id: crypto.randomUUID(),
                addedAt,
                mastered: false,
                masteryLevel: 'new'
            });
            addedCount++;
            existingWords.add(normalizedWord);
        }
    });

    if (addedCount > 0) {
        localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
    }
    return addedCount;
};

export const updateVocabStatus = async (id: string, level: MasteryLevel) => {
    const user = currentUser;
    const mastered = level === 'mastered';
    
    if (user) {
        try {
            const docRef = doc(db, 'users', user.uid, 'vocabulary', id);
            await updateDoc(docRef, { masteryLevel: level, mastered });
            return;
        } catch (e) { console.error(e); }
    }

    const current = await getVocab();
    const updated = current.map(item => item.id === id ? { ...item, masteryLevel: level, mastered } : item);
    localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
};

export const removeVocabBatch = async (ids: string[]) => {
    const user = currentUser;
    if (user) {
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                const docRef = doc(db, 'users', user.uid, 'vocabulary', id);
                batch.delete(docRef);
            });
            await batch.commit();
            return;
        } catch (e) { console.error(e); }
    }

    const current = await getVocab();
    const updated = current.filter(item => !ids.includes(item.id));
    localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
};

export const importVocabFromJson = async (items: VocabItem[]): Promise<number> => {
  const user = currentUser;
  let importedCount = 0;

  if (user) {
    try {
      const batch = writeBatch(db);
      const colRef = getVocabCollection();
      if (!colRef) return 0;
      
      const current = await getVocab();
      const existingWords = new Set(current.map(v => v.word.trim().toLowerCase()));

      for (const item of items) {
        if (!existingWords.has(item.word.trim().toLowerCase())) {
          const id = item.id || crypto.randomUUID();
          const docRef = doc(colRef, id);
          const itemToSave = { ...item, id, masteryLevel: item.masteryLevel || 'new' };
          batch.set(docRef, sanitizeData(itemToSave));
          importedCount++;
          existingWords.add(item.word.trim().toLowerCase());
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
  const existingWords = new Set(current.map(v => v.word.trim().toLowerCase()));

  items.forEach(item => {
    if (!existingWords.has(item.word.trim().toLowerCase())) {
      updated.unshift({ ...item, id: item.id || crypto.randomUUID(), masteryLevel: item.masteryLevel || 'new' });
      importedCount++;
      existingWords.add(item.word.trim().toLowerCase());
    }
  });

  if (importedCount > 0) {
    localStorage.setItem(VOCAB_KEY, JSON.stringify(updated));
  }
  return importedCount;
};

export const removeVocab = async (id: string) => {
  await removeVocabBatch([id]);
};

export const toggleMastered = async (id: string) => {
    const current = await getVocab();
    const item = current.find(i => i.id === id);
    if (!item) return;
    await updateVocabStatus(id, item.masteryLevel === 'mastered' ? 'good' : 'mastered');
}

export const isVocabSaved = async (word: string): Promise<boolean> => {
    const current = await getVocab();
    return current.some(v => v.word.trim().toLowerCase() === word.trim().toLowerCase());
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

export const getBooks = async (): Promise<Book[]> => {
    const user = currentUser;
    if (user) {
        try {
            const colRef = collection(db, 'users', user.uid, 'books');
            const q = query(colRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Book));
        } catch (e) {
            console.error("Failed to load books", e);
            return [];
        }
    }
    const stored = localStorage.getItem(BOOKS_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const createBook = async (title: string, author: string): Promise<string> => {
    const user = currentUser;
    const newBook: Omit<Book, 'id'> = {
        title,
        author,
        createdAt: Date.now(),
        pageCount: 0,
        coverStyle: ['bg-emerald-800', 'bg-amber-900', 'bg-slate-800', 'bg-indigo-900'][Math.floor(Math.random() * 4)]
    };

    if (user) {
        try {
            const colRef = collection(db, 'users', user.uid, 'books');
            const docRef = await addDoc(colRef, newBook);
            return docRef.id;
        } catch (e) {
            console.error("Failed to create book", e);
            throw e;
        }
    }

    const books = await getBooks();
    const id = crypto.randomUUID();
    const bookWithId = { ...newBook, id };
    localStorage.setItem(BOOKS_KEY, JSON.stringify([bookWithId, ...books]));
    return id;
};

export const deleteBook = async (bookId: string) => {
     const user = currentUser;
     if (user) {
         try {
             await deleteDoc(doc(db, 'users', user.uid, 'books', bookId));
             return;
         } catch(e) { console.error(e) }
     }
     const books = await getBooks();
     const updated = books.filter(b => b.id !== bookId);
     localStorage.setItem(BOOKS_KEY, JSON.stringify(updated));
     localStorage.removeItem(`${BOOKS_KEY}_pages_${bookId}`);
}

export const getBookPages = async (bookId: string): Promise<BookPage[]> => {
    const user = currentUser;
    if (user) {
        try {
            const colRef = collection(db, 'users', user.uid, 'books', bookId, 'pages');
            const q = query(colRef, orderBy('pageNumber', 'asc'));
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookPage));
        } catch (e) {
            console.error("Failed to load pages", e);
            return [];
        }
    }
    const stored = localStorage.getItem(`${BOOKS_KEY}_pages_${bookId}`);
    return stored ? JSON.parse(stored) : [];
};

export const addPageToBook = async (bookId: string, image: string, analysis: PageAnalysisResult): Promise<string> => {
    const user = currentUser;
    const currentPages = await getBookPages(bookId);
    const pageNumber = currentPages.length + 1;

    const newPage: Omit<BookPage, 'id'> = {
        bookId,
        pageNumber,
        image,
        analysis,
        createdAt: Date.now(),
        lastSentenceIndex: 0
    };

    if (user) {
        try {
            const bookRef = doc(db, 'users', user.uid, 'books', bookId);
            const pagesColRef = collection(bookRef, 'pages');
            const docRef = await addDoc(pagesColRef, newPage);
            await updateDoc(bookRef, { pageCount: increment(1) });
            return docRef.id;
        } catch (e) {
            console.error("Failed to add page", e);
            throw e;
        }
    }

    const id = crypto.randomUUID();
    const pageWithId = { ...newPage, id };
    const pages = await getBookPages(bookId);
    pages.push(pageWithId);
    localStorage.setItem(`${BOOKS_KEY}_pages_${bookId}`, JSON.stringify(pages));

    const books = await getBooks();
    const bookIndex = books.findIndex(b => b.id === bookId);
    if (bookIndex >= 0) {
        books[bookIndex].pageCount = (books[bookIndex].pageCount || 0) + 1;
        localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
    }
    return id;
};

export const updatePageProgress = async (bookId: string, pageId: string, sentenceIndex: number) => {
    const user = currentUser;
    if (user) {
         try {
            const pageRef = doc(db, 'users', user.uid, 'books', bookId, 'pages', pageId);
            await updateDoc(pageRef, { lastSentenceIndex: sentenceIndex });
        } catch (e) { console.error("Failed to save progress", e); }
    } else {
        const stored = localStorage.getItem(`${BOOKS_KEY}_pages_${bookId}`);
        if(stored) {
             const pages = JSON.parse(stored) as BookPage[];
             const idx = pages.findIndex(p => p.id === pageId);
             if(idx !== -1) {
                 pages[idx].lastSentenceIndex = sentenceIndex;
                 localStorage.setItem(`${BOOKS_KEY}_pages_${bookId}`, JSON.stringify(pages));
             }
        }
    }
}