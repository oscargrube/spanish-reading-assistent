
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Loader2, CheckCircle, ChevronRight, ChevronLeft, XCircle, Volume2, SkipForward, Save, BookOpen, Plus, Undo2, ArrowLeft } from 'lucide-react';
import { PageAnalysisResult, AppView, BookPage, Book, WordAnalysis } from '../types';
import { analyzeImage, generateSpeech } from '../services/geminiService';
import { addVocabBatch, isVocabSaved, saveCurrentAnalysis, clearLastAnalysis, addPageToBook, updatePageProgress, getBooks, createBook } from '../services/storageService';

interface AnalysisViewProps {
    onChangeView?: (view: AppView) => void;
    // When reading an existing page
    initialData?: BookPage | null;
    // When scanning into a specific book (Pre-selected)
    targetBookId?: string | null;
    onSaveComplete?: () => void;
}

type FlowPhase = 'sentence' | 'words' | 'translation';

const AnalysisView: React.FC<AnalysisViewProps> = ({ onChangeView, initialData, targetBookId, onSaveComplete }) => {
  // State for Scanning & Image
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PageAnalysisResult | null>(null);
  
  // State for Reading Flow
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [phase, setPhase] = useState<FlowPhase>('sentence');
  // currentWordIndex now refers to the flattened list of words (including subwords)
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  // State for Audio & Progress
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [newlySavedCount, setNewlySavedCount] = useState(0);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  
  // State for Book Association & Persistence
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [creatingBook, setCreatingBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialization
  useEffect(() => {
      if (initialData) {
          // READING MODE: Resume existing page
          setImage(initialData.image);
          setResult(initialData.analysis);
          setActivePageId(initialData.id);
          setActiveBookId(initialData.bookId);
          // Resume progress if available
          if (initialData.lastSentenceIndex !== undefined && initialData.lastSentenceIndex > 0) {
              setCurrentSentenceIndex(initialData.lastSentenceIndex);
          }
      } else if (targetBookId) {
          // SCAN MODE (Targeted): Will save to this book automatically
          setActiveBookId(targetBookId);
      }
  }, [initialData, targetBookId]);

  // Sync saved words visually
  const syncSavedState = useCallback(async () => {
    if (!result) return;
    const currentWords = new Set<string>();
    
    const checkWord = async (w: WordAnalysis) => {
        if (w.type === 'word' && await isVocabSaved(w.word)) {
            currentWords.add(w.word.toLowerCase());
        }
        if (w.subWords) {
            for (const sub of w.subWords) {
                await checkWord(sub);
            }
        }
    };

    for (const s of result.sentences) {
        for (const w of s.words) {
            await checkWord(w);
        }
    }
    setSavedWords(currentWords);
  }, [result]);

  useEffect(() => {
      syncSavedState();
  }, [result, syncSavedState]);

  // Save Progress on Sentence Change
  useEffect(() => {
      if (activeBookId && activePageId && result) {
          // Save progress silently
          updatePageProgress(activeBookId, activePageId, currentSentenceIndex);
      }
  }, [currentSentenceIndex, activeBookId, activePageId, result]);

  // --- ACTIONS ---

  const handleAnalyze = async (base64Data: string) => {
    setLoading(true);
    setResult(null);
    setFinished(false);
    setCurrentSentenceIndex(0);
    setPhase('sentence');
    setNewlySavedCount(0);
    
    // Reset page ID as this is a new scan
    setActivePageId(null);

    try {
      const data = await analyzeImage(base64Data);
      setResult(data);
      
      // IMMEDIATE SAVE LOGIC
      if (activeBookId) {
          // Case 1: Book is already known (Targeted Scan)
          await handleSaveToBookAndVocab(activeBookId, base64Data, data);
      } else {
          // Case 2: No book selected (Global Scan) -> Prompt User
          const books = await getBooks();
          setAvailableBooks(books);
          setShowBookSelector(true);
      }

    } catch (err: any) {
      console.error(err);
      setImage(null);
      alert("Analyse fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToBookAndVocab = async (bookId: string, imgData: string, analysisData: PageAnalysisResult) => {
      try {
          // 1. Save Page
          const pageId = await addPageToBook(bookId, imgData, analysisData);
          setActivePageId(pageId);
          setActiveBookId(bookId);

          // 2. Save All Vocab Immediately (Flattened)
          const flattenWords = (words: WordAnalysis[], context: string): any[] => {
              return words.flatMap(w => {
                  if (w.type !== 'word') return [];
                  
                  const mainWord = {
                      word: w.word,
                      translation: w.translation || '',
                      explanation: w.explanation || '',
                      literalTranslation: w.literalTranslation,
                      category: w.category,
                      baseForm: w.baseForm,
                      tense: w.tense,
                      person: w.person,
                      contextSentence: context
                  };
                  
                  let subList: any[] = [];
                  if (w.subWords && w.subWords.length > 0) {
                      subList = flattenWords(w.subWords, context);
                  }
                  
                  return [mainWord, ...subList];
              });
          };

          const allWords = analysisData.sentences.flatMap(s => flattenWords(s.words, s.original));
          
          if (allWords.length > 0) {
              const savedCount = await addVocabBatch(allWords);
              setNewlySavedCount(savedCount);
              await syncSavedState(); // Refresh visual checks
          }

      } catch (e) {
          console.error("Save failed", e);
          alert("Fehler beim Speichern in die Datenbank.");
      }
  };

  const handleBookSelect = async (bookId: string) => {
      if (!result || !image) return;
      setShowBookSelector(false);
      await handleSaveToBookAndVocab(bookId, image, result);
  };

  const handleCreateAndSelectBook = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newBookTitle.trim() || !result || !image) return;
      
      try {
          const newId = await createBook(newBookTitle, "Unbekannt");
          await handleBookSelect(newId);
          setNewBookTitle('');
      } catch (e) {
          alert("Fehler beim Erstellen des Buches.");
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = dataUrl.split(',')[1];
            setImage(base64Data);
            handleAnalyze(base64Data);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlayAudio = async (text: string, id: string) => {
    if (playingAudio) return;
    setPlayingAudio(id);
    try {
        await generateSpeech(text);
    } catch (e) {
        console.error(e);
    } finally {
        setPlayingAudio(null);
    }
  };

  // --- READING LOGIC ---

  const currentSentence = result?.sentences[currentSentenceIndex];
  
  // Flatten words for the current sentence: Phrase -> SubWords -> Next Phrase
  const lexicalWordsQueue = useMemo(() => {
      if (!currentSentence) return [];
      
      const queue: { word: WordAnalysis, parentWord?: string }[] = [];
      
      currentSentence.words.forEach(w => {
          if (w.type === 'word') {
              // Add the main word/phrase
              queue.push({ word: w });
              
              // If it has subwords, add them immediately after
              if (w.subWords && w.subWords.length > 0) {
                  w.subWords.forEach(sw => {
                      if (sw.type === 'word') {
                        queue.push({ word: sw, parentWord: w.word });
                      }
                  });
              }
          }
      });
      return queue;
  }, [currentSentence]);

  const handleNextPhase = useCallback(() => {
    if (!result || !currentSentence) return;

    if (phase === 'sentence') {
        if (lexicalWordsQueue.length > 0) {
            setPhase('words');
            setCurrentWordIndex(0);
        } else {
            setPhase('translation');
        }
    } else if (phase === 'words') {
        if (currentWordIndex < lexicalWordsQueue.length - 1) {
            setCurrentWordIndex(prev => prev + 1);
        } else {
            setPhase('translation');
        }
    } else if (phase === 'translation') {
        if (currentSentenceIndex < result.sentences.length - 1) {
            setCurrentSentenceIndex(prev => prev + 1);
            setPhase('sentence');
            setCurrentWordIndex(0);
        } else {
            setFinished(true);
            clearLastAnalysis(); 
        }
    }
  }, [result, phase, currentWordIndex, currentSentenceIndex, lexicalWordsQueue, currentSentence]);

  const handleSkipToNextSentence = useCallback(() => {
    if (!result || !currentSentence) return;
    
    if (currentSentenceIndex < result.sentences.length - 1) {
        setCurrentSentenceIndex(prev => prev + 1);
        setPhase('sentence');
        setCurrentWordIndex(0);
    } else {
        setFinished(true);
        clearLastAnalysis();
    }
  }, [result, currentSentence, currentSentenceIndex]);

  const handlePrevSentence = useCallback(() => {
    if (currentSentenceIndex > 0) {
        setCurrentSentenceIndex(prev => prev - 1);
        setPhase('sentence');
        setCurrentWordIndex(0);
    }
  }, [currentSentenceIndex]);

  const handlePrevPhase = () => {
    if (phase === 'translation') {
        if (lexicalWordsQueue.length > 0) {
            setPhase('words');
            setCurrentWordIndex(lexicalWordsQueue.length - 1);
        } else {
            setPhase('sentence');
        }
    } else if (phase === 'words') {
        if (currentWordIndex > 0) {
            setCurrentWordIndex(prev => prev - 1);
        } else {
            setPhase('sentence');
        }
    } else if (phase === 'sentence' && currentSentenceIndex > 0) {
        setCurrentSentenceIndex(prev => prev - 1);
        setPhase('translation');
    }
  };

  const handleClose = () => {
     if (onSaveComplete) {
         onSaveComplete();
     } else {
         onChangeView?.(AppView.HOME);
     }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && result && !finished && !showBookSelector) {
            e.preventDefault(); 
            handleNextPhase();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, finished, handleNextPhase, showBookSelector]);

  // --- RENDER ---

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#FDFBF7] dark:bg-[#12100E] flex flex-col items-center justify-center text-center p-6 z-50">
        <Loader2 className="w-12 h-12 animate-spin text-[#6B705C] dark:text-[#D4A373] mb-4" />
        <h2 className="text-xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">Analysiere Seite...</h2>
        <p className="text-sm text-[#6B705C] dark:text-[#A5A58D] font-serif italic mt-2">Texte, Grammatik und Vokabeln werden erkannt.</p>
      </div>
    );
  }

  // Book Selection Modal (After Scan)
  if (showBookSelector) {
      return (
          <div className="fixed inset-0 bg-[#FDFBF7] dark:bg-[#12100E] z-50 flex flex-col items-center justify-center p-6 animate-fade-in">
              <div className="w-full max-w-md">
                  <h2 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2 text-center">In welches Buch?</h2>
                  <p className="text-[#6B705C] dark:text-[#A5A58D] text-center mb-8 font-serif italic">
                      Jede Seite muss zu einem Buch gehören. Wähle eines aus oder erstelle ein neues.
                  </p>

                  <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-6 pr-2">
                      {availableBooks.map(book => (
                          <button
                            key={book.id}
                            onClick={() => handleBookSelect(book.id)}
                            className="w-full text-left p-4 bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl flex items-center gap-4 hover:border-[#B26B4A] dark:hover:border-[#D4A373] transition-colors group"
                          >
                              <div className={`w-10 h-10 rounded-lg ${book.coverStyle || 'bg-[#2C2420]'} flex items-center justify-center text-white`}>
                                  <BookOpen className="w-5 h-5" />
                              </div>
                              <div>
                                  <h3 className="font-bold text-[#2C2420] dark:text-[#FDFBF7]">{book.title}</h3>
                                  <p className="text-xs text-[#6B705C] dark:text-[#A5A58D]">{book.pageCount} Seiten</p>
                              </div>
                              <ChevronRight className="w-4 h-4 ml-auto text-[#EAE2D6] group-hover:text-[#B26B4A]" />
                          </button>
                      ))}
                  </div>

                  <div className="relative flex items-center gap-4 mb-6">
                      <div className="h-px bg-[#EAE2D6] dark:bg-[#2C2420] flex-grow"></div>
                      <span className="text-[10px] font-bold uppercase text-[#A5A58D]">Oder neu</span>
                      <div className="h-px bg-[#EAE2D6] dark:bg-[#2C2420] flex-grow"></div>
                  </div>

                  <form onSubmit={handleCreateAndSelectBook} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Neuer Buchtitel..." 
                        value={newBookTitle}
                        onChange={e => setNewBookTitle(e.target.value)}
                        className="flex-grow bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#B26B4A]/20"
                      />
                      <button 
                        type="submit"
                        disabled={!newBookTitle.trim()}
                        className="bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] p-3 rounded-xl disabled:opacity-50"
                      >
                          <Plus className="w-6 h-6" />
                      </button>
                  </form>
              </div>
          </div>
      )
  }

  // Initial Scan UI
  if (!result && !image) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in text-center px-6">
        <div className="bg-[#2C2420] dark:bg-[#1C1917] p-4 rounded-full mb-2">
            <Volume2 className="w-8 h-8 text-[#FDFBF7] dark:text-[#D4A373]" />
        </div>
        <div>
            <h2 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2">
                {targetBookId ? "Nächste Seite hinzufügen" : "Bereit zum Lesen?"}
            </h2>
            <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic max-w-xs mx-auto">
                Scanne eine Buchseite. Wir speichern sie automatisch in deiner Bibliothek.
            </p>
        </div>
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <div className="flex flex-col gap-3 w-full max-w-xs">
            <button onClick={() => fileInputRef.current?.click()} className="bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] py-4 px-10 rounded-2xl shadow-xl font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-transform">
                Seite scannen
            </button>
            <button onClick={handleClose} className="text-[#6B705C] dark:text-[#A5A58D] font-bold uppercase text-[10px] tracking-widest p-2 hover:text-[#2C2420] dark:hover:text-[#FDFBF7]">
                Zurück
            </button>
        </div>
      </div>
    );
  }

  // Finished State
  if (finished) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 animate-fade-in bg-[#FDFBF7] dark:bg-[#12100E]">
              <div className="w-16 h-16 bg-[#E9EDC9] dark:bg-[#2C2420] rounded-2xl flex items-center justify-center text-[#6B705C] dark:text-[#D4A373] mb-6">
                  <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2">Seite beendet!</h2>
              <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic mb-8">
                  {newlySavedCount > 0 
                    ? `${newlySavedCount} neue Vokabeln wurden deiner Sammlung hinzugefügt.` 
                    : "Alle Vokabeln dieser Seite wurden gespeichert."}
              </p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                  <button onClick={handleClose} className="bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-md">
                      Zurück zum Buch
                  </button>
                  <button onClick={() => onChangeView?.(AppView.VOCAB)} className="text-[#6B705C] dark:text-[#A5A58D] px-8 py-2 font-bold uppercase text-[10px] tracking-widest hover:text-[#2C2420] dark:hover:text-[#FDFBF7]">
                      Vokabeln lernen
                  </button>
              </div>
          </div>
      )
  }

  const currentLexicalItem = lexicalWordsQueue[currentWordIndex];

  return (
    <div className="fixed inset-0 bg-[#FDFBF7] dark:bg-[#12100E] flex flex-col z-50 transition-colors">
        {/* Header - Fixed */}
        <div className="px-6 pt-4 pb-2 flex justify-between items-center bg-[#FDFBF7] dark:bg-[#12100E] shrink-0 border-b border-[#EAE2D6] dark:border-[#2C2420] z-20">
            <div className="flex flex-col gap-1 w-full max-w-[150px]">
                <span className="text-[9px] font-bold text-[#6B705C] dark:text-[#A5A58D] uppercase tracking-widest">
                    Satz {currentSentenceIndex + 1} / {result?.sentences.length}
                </span>
                <div className="h-1 bg-[#EAE2D6] dark:bg-[#2C2420] rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-[#B26B4A] dark:bg-[#D4A373] transition-all duration-500" 
                        style={{ width: `${((currentSentenceIndex + 1) / (result?.sentences.length || 1)) * 100}%` }}
                    />
                </div>
            </div>
            <button onClick={handleClose} className="p-2 text-[#A5A58D] dark:text-[#2C2420] hover:text-[#B26B4A] dark:hover:text-[#D4A373]" title="Schließen & Speichern">
                <XCircle className="w-5 h-5" />
            </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto px-6 py-6 pb-32">
            <div className="max-w-2xl mx-auto flex flex-col justify-center min-h-[50vh]">
                
                {/* PHASE 1: SENTENCE */}
                {phase === 'sentence' && (
                    <div className="animate-fade-in flex flex-col items-center gap-6">
                        <p className="text-2xl sm:text-3xl font-serif text-[#2C2420] dark:text-[#FDFBF7] leading-relaxed text-center italic">
                            {currentSentence?.original}
                        </p>
                        <button 
                            onClick={() => handlePlayAudio(currentSentence?.original || '', `s-${currentSentenceIndex}`)}
                            className="w-12 h-12 bg-[#FDFBF7] dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-full flex items-center justify-center text-[#B26B4A] dark:text-[#D4A373] shadow-sm hover:scale-105 transition-transform"
                        >
                            {playingAudio === `s-${currentSentenceIndex}` ? <Loader2 className="w-5 h-5 animate-spin"/> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>
                )}

                {/* PHASE 2: WORDS */}
                {phase === 'words' && currentSentence && (
                    <div className="animate-fade-in flex flex-col gap-8">
                        {/* Context Sentence */}
                        <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#EAE2D6] dark:border-[#2C2420] shadow-sm">
                            <p className="text-xl font-serif text-[#2C2420] dark:text-[#FDFBF7] leading-relaxed">
                                {currentSentence.words.map((w, idx) => {
                                    // Highlight if it matches the current word OR if the current word is a child of this phrase
                                    const isCurrent = currentLexicalItem && (
                                        w.word === currentLexicalItem.word.word || 
                                        w.word === currentLexicalItem.parentWord
                                    );
                                    
                                    return (
                                        <span key={idx} className={`transition-colors duration-300 ${isCurrent ? 'bg-[#FEFAE0] dark:bg-[#B26B4A]/20 text-[#B26B4A] dark:text-[#D4A373] font-bold px-1 rounded mx-0.5' : 'opacity-40'}`}>
                                            {w.word}
                                        </span>
                                    );
                                })}
                            </p>
                        </div>

                        {/* Word Analysis Card */}
                        {currentLexicalItem && (
                            <div className="relative w-full bg-[#2C2420] dark:bg-[#1C1917] text-[#FDFBF7] p-8 rounded-[2.5rem] shadow-xl border border-transparent dark:border-[#2C2420] flex flex-col animate-fade-in">
                                
                                <button 
                                    onClick={() => handlePlayAudio(currentLexicalItem.word.word, `w-${currentSentenceIndex}-${currentWordIndex}`)}
                                    className="absolute top-6 right-6 w-10 h-10 bg-[#B26B4A] dark:bg-[#D4A373] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-10"
                                >
                                    {playingAudio === `w-${currentSentenceIndex}-${currentWordIndex}` ? <Loader2 className="w-4 h-4 animate-spin text-white dark:text-[#12100E]"/> : <Volume2 className="w-4 h-4 text-white dark:text-[#12100E]" />}
                                </button>

                                <div className="mb-6">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        {currentLexicalItem.parentWord && (
                                            <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#FDFBF7]/50 border border-[#FDFBF7]/20 px-2 py-0.5 rounded-full">
                                                Teil von: {currentLexicalItem.parentWord}
                                            </span>
                                        )}
                                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#B26B4A] dark:text-[#D4A373]">
                                            {currentLexicalItem.word.category || 'Vokabel'}
                                        </span>
                                        {savedWords.has(currentLexicalItem.word.word.toLowerCase()) && (
                                            <div className="flex items-center gap-1.5 bg-[#E9EDC9]/20 px-2 py-1 rounded-full">
                                                <CheckCircle className="w-3 h-3 text-[#E9EDC9]" />
                                                <span className="text-[7px] font-bold uppercase tracking-widest text-[#E9EDC9]">In Sammlung</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="text-4xl font-serif font-bold text-[#FEFAE0] dark:text-[#D4A373] mb-2">{currentLexicalItem.word.word}</h3>
                                    
                                    <p className="text-2xl font-serif italic text-[#FDFBF7]/90">{currentLexicalItem.word.translation}</p>
                                    
                                    {/* Literal Translation */}
                                    {currentLexicalItem.word.literalTranslation && (
                                        <p className="text-sm text-[#FDFBF7]/60 mt-1">
                                            <span className="font-bold uppercase text-[9px] tracking-wider opacity-70 mr-1">Wörtlich:</span>
                                            <span className="italic">"{currentLexicalItem.word.literalTranslation}"</span>
                                        </p>
                                    )}
                                </div>
                                
                                {/* Grammar Details (Tense/Person) */}
                                {(currentLexicalItem.word.tense || currentLexicalItem.word.person) && (
                                    <div className="flex gap-2 mb-4">
                                        {currentLexicalItem.word.tense && (
                                            <div className="bg-[#B26B4A]/20 dark:bg-[#D4A373]/20 px-3 py-1.5 rounded-lg border border-[#B26B4A]/30 dark:border-[#D4A373]/30">
                                                <span className="text-[9px] uppercase tracking-widest text-[#B26B4A] dark:text-[#D4A373] font-bold block opacity-70">Zeit</span>
                                                <span className="text-sm font-serif text-[#FDFBF7]">{currentLexicalItem.word.tense}</span>
                                            </div>
                                        )}
                                        {currentLexicalItem.word.person && (
                                            <div className="bg-[#B26B4A]/20 dark:bg-[#D4A373]/20 px-3 py-1.5 rounded-lg border border-[#B26B4A]/30 dark:border-[#D4A373]/30">
                                                <span className="text-[9px] uppercase tracking-widest text-[#B26B4A] dark:text-[#D4A373] font-bold block opacity-70">Person</span>
                                                <span className="text-sm font-serif text-[#FDFBF7]">{currentLexicalItem.word.person}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {currentLexicalItem.word.explanation && (
                                    <div className="bg-white/5 dark:bg-black/20 p-5 rounded-2xl border border-white/10 dark:border-white/5">
                                        <p className="text-base font-serif leading-relaxed text-[#FDFBF7]/80">
                                            {currentLexicalItem.word.explanation}
                                        </p>
                                    </div>
                                )}
                                
                                {currentLexicalItem.word.baseForm && currentLexicalItem.word.baseForm !== currentLexicalItem.word.word && (
                                    <div className="mt-6 pt-4 border-t border-white/10">
                                        <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Grundform</p>
                                        <p className="font-serif italic text-lg">{currentLexicalItem.word.baseForm}</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* PHASE 3: TRANSLATION */}
                {phase === 'translation' && currentSentence && (
                    <div className="animate-fade-in flex flex-col gap-10 text-center pb-8">
                         <div className="space-y-4">
                            <span className="text-[9px] font-bold text-[#6B705C] dark:text-[#A5A58D] uppercase tracking-widest block">Original</span>
                            <p className="text-2xl font-serif text-[#2C2420] dark:text-[#FDFBF7] leading-relaxed italic">
                                {currentSentence.original}
                            </p>
                            <button 
                                onClick={() => handlePlayAudio(currentSentence.original, `s-${currentSentenceIndex}-trans`)}
                                className="mx-auto w-10 h-10 mt-2 bg-[#FDFBF7] dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-full flex items-center justify-center text-[#B26B4A] dark:text-[#D4A373] hover:bg-[#FEFAE0] dark:hover:bg-[#2C2420] transition-colors"
                            >
                                {playingAudio === `s-${currentSentenceIndex}-trans` ? <Loader2 className="w-4 h-4 animate-spin"/> : <Volume2 className="w-4 h-4 fill-current" />}
                            </button>
                        </div>
                        
                        <div className="w-16 h-[1px] bg-[#EAE2D6] dark:bg-[#2C2420] mx-auto" />
                        
                        <div className="space-y-4">
                            <span className="text-[9px] font-bold text-[#B26B4A] dark:text-[#D4A373] uppercase tracking-widest block">Übersetzung</span>
                            <p className="text-xl font-serif text-[#6B705C] dark:text-[#A5A58D] leading-relaxed">
                                {currentSentence.translation}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Sticky Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-6 bg-[#FDFBF7] dark:bg-[#12100E] border-t border-[#EAE2D6] dark:border-[#2C2420] z-30 transition-colors">
            <div className="flex flex-col gap-2 max-w-lg mx-auto">
                <div className="flex gap-3">
                    {/* Left Button Logic: Only show "Back" in sentence phase, or "Prev Phase" in others */}
                    <button 
                        onClick={phase === 'sentence' ? handlePrevSentence : handlePrevPhase}
                        disabled={phase === 'sentence' && currentSentenceIndex === 0}
                        className="w-14 h-14 flex items-center justify-center bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl text-[#6B705C] dark:text-[#A5A58D] disabled:opacity-20 active:scale-95 transition-all shadow-sm"
                        title={phase === 'sentence' ? "Letzter Satz" : "Zurück"}
                    >
                        {phase === 'sentence' ? <ArrowLeft className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                    </button>
                    
                    {/* Dynamic Main Button */}
                    <button 
                        onClick={handleNextPhase}
                        className={`flex-grow h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all ${
                            phase === 'translation' ? 'bg-[#B26B4A] dark:bg-[#D4A373] text-white dark:text-[#12100E]' : 'bg-[#2C2420] dark:bg-white text-white dark:text-[#12100E]'
                        }`}
                    >
                        {phase === 'sentence' ? 'Wörter analysieren' : phase === 'words' && currentWordIndex < lexicalWordsQueue.length - 1 ? 'Nächstes Wort' : phase === 'words' ? 'Zur Übersetzung' : 'Nächster Satz'}
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Skip Forward Button (Only visible in sentence phase) */}
                    {phase === 'sentence' && (
                         <button 
                            onClick={handleSkipToNextSentence}
                            className="w-14 h-14 flex items-center justify-center bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl text-[#6B705C] dark:text-[#A5A58D] active:scale-95 transition-all shadow-sm"
                            title="Satz überspringen"
                        >
                            <SkipForward className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default AnalysisView;
