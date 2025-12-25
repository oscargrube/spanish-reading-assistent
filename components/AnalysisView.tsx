
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Loader2, CheckCircle, ChevronRight, ChevronLeft, XCircle, Volume2, SkipForward, Save } from 'lucide-react';
import { PageAnalysisResult, AppView, BookPage } from '../types';
import { analyzeImage, generateSpeech } from '../services/geminiService';
import { addVocabBatch, isVocabSaved, saveCurrentAnalysis, getLastAnalysis, clearLastAnalysis, addPageToBook } from '../services/storageService';

interface AnalysisViewProps {
    onChangeView?: (view: AppView) => void;
    initialData?: { image: string, analysis: PageAnalysisResult } | null;
    targetBookId?: string | null;
    onSaveComplete?: () => void;
}

type FlowPhase = 'sentence' | 'words' | 'translation';

const AnalysisView: React.FC<AnalysisViewProps> = ({ onChangeView, initialData, targetBookId, onSaveComplete }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PageAnalysisResult | null>(null);
  
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [phase, setPhase] = useState<FlowPhase>('sentence');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [newlySavedCount, setNewlySavedCount] = useState(0);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  
  const [savingToBook, setSavingToBook] = useState(false);
  const [savedToBook, setSavedToBook] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize from Props or LocalStorage
  useEffect(() => {
      if (initialData) {
          // View Mode (Reading existing page)
          setImage(initialData.image);
          setResult(initialData.analysis);
      } else {
          // Scan Mode - Check for cached result if not targeting a specific book (standard scan)
          const last = getLastAnalysis();
          if (last && !result && !targetBookId) {
              setResult(last.data);
              setImage(last.image);
          }
      }
  }, [initialData, targetBookId]);

  // Sync saved words from storage initially
  const syncSavedState = useCallback(async () => {
    if (!result) return;
    const currentWords = new Set<string>();
    for (const s of result.sentences) {
        for (const w of s.words) {
            if (w.type === 'word' && await isVocabSaved(w.word)) {
                currentWords.add(w.word.toLowerCase());
            }
        }
    }
    setSavedWords(currentWords);
  }, [result]);

  useEffect(() => {
      syncSavedState();
  }, [result, syncSavedState]);

  const handleAnalyze = async (base64Data: string) => {
    setLoading(true);
    setResult(null);
    setFinished(false);
    setCurrentSentenceIndex(0);
    setPhase('sentence');
    setCurrentWordIndex(0);
    setNewlySavedCount(0);

    try {
      const data = await analyzeImage(base64Data);
      setResult(data);
      if (!targetBookId) {
         saveCurrentAnalysis(data, base64Data);
      }
    } catch (err: any) {
      console.error(err);
      setImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(',')[1];
        setImage(base64Data);
        handleAnalyze(base64Data);
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

  const currentSentence = result?.sentences[currentSentenceIndex];
  const lexicalWords = currentSentence?.words.filter(w => w.type === 'word') || [];

  const handleNextPhase = useCallback(async () => {
    if (!result || !currentSentence) return;

    if (phase === 'sentence') {
        if (lexicalWords.length > 0) {
            setPhase('words');
            setCurrentWordIndex(0);
        } else {
            setPhase('translation');
        }
    } else if (phase === 'words') {
        if (currentWordIndex < lexicalWords.length - 1) {
            setCurrentWordIndex(prev => prev + 1);
        } else {
            setPhase('translation');
        }
    } else if (phase === 'translation') {
        // Intelligent save on moving forward from translation
        const wordsToSave = lexicalWords.map(w => ({
            word: w.word,
            translation: w.translation || '',
            explanation: w.explanation || '',
            category: w.category,
            baseForm: w.baseForm,
            contextSentence: currentSentence.original
        }));
        
        const savedCount = await addVocabBatch(wordsToSave);
        setNewlySavedCount(prev => prev + savedCount);
        
        // Update local set to immediately show checkmarks if we revisit or for current view
        setSavedWords(prev => {
            const next = new Set(prev);
            wordsToSave.forEach(w => next.add(w.word.toLowerCase()));
            return next;
        });

        if (currentSentenceIndex < result.sentences.length - 1) {
            setCurrentSentenceIndex(prev => prev + 1);
            setPhase('sentence');
            setCurrentWordIndex(0);
        } else {
            setFinished(true);
            if (!targetBookId) {
                clearLastAnalysis();
            }
            // If we have a target book (Scan -> Book flow), save automatically at end
            if (targetBookId && !savedToBook && result && image) {
                handleSaveToBook();
            }
        }
    }
  }, [result, phase, currentWordIndex, currentSentenceIndex, lexicalWords, currentSentence, targetBookId, savedToBook, image]);

  const handleSaveToBook = async () => {
      if (!targetBookId || !result || !image) return;
      setSavingToBook(true);
      try {
          await addPageToBook(targetBookId, image, result);
          setSavedToBook(true);
      } catch(e) {
          console.error(e);
          alert("Fehler beim Speichern der Seite.");
      } finally {
          setSavingToBook(false);
      }
  }

  // Logic to skip word analysis and go to next sentence (or finish)
  const handleSkipToNextSentence = useCallback(() => {
    if (!result || !currentSentence) return;
    
    if (currentSentenceIndex < result.sentences.length - 1) {
        setCurrentSentenceIndex(prev => prev + 1);
        setPhase('sentence');
        setCurrentWordIndex(0);
    } else {
        setFinished(true);
        if (!targetBookId) {
             clearLastAnalysis();
        }
        if (targetBookId && !savedToBook && result && image) {
            handleSaveToBook();
        }
    }
  }, [result, currentSentence, currentSentenceIndex, targetBookId, savedToBook, image]);

  const handlePrevPhase = () => {
    if (phase === 'translation') {
        if (lexicalWords.length > 0) {
            setPhase('words');
            setCurrentWordIndex(lexicalWords.length - 1);
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
        // Go back to translation of previous sentence
        setCurrentSentenceIndex(prev => prev - 1);
        setPhase('translation');
    }
  };

  const handleReset = () => {
    if (targetBookId || initialData) {
        // If inside a book context, "closing" usually means going back
        onSaveComplete?.();
    } else {
        setImage(null);
        setResult(null);
        setFinished(false);
        clearLastAnalysis();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && result && !finished) {
            e.preventDefault(); 
            handleNextPhase();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, finished, handleNextPhase]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#FDFBF7] dark:bg-[#12100E] flex flex-col items-center justify-center text-center p-6 z-50">
        <Loader2 className="w-12 h-12 animate-spin text-[#6B705C] dark:text-[#D4A373] mb-4" />
        <h2 className="text-xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">Verarbeite Seite...</h2>
        <p className="text-sm text-[#6B705C] dark:text-[#A5A58D] font-serif italic mt-2">Die KI analysiert Grammatik und Vokabeln.</p>
      </div>
    );
  }

  if (!result && !image) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in text-center px-6">
        <div className="bg-[#2C2420] dark:bg-[#1C1917] p-4 rounded-full mb-2">
            <Volume2 className="w-8 h-8 text-[#FDFBF7] dark:text-[#D4A373]" />
        </div>
        <div>
            <h2 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2">
                {targetBookId ? "Neue Seite hinzufügen" : "Bereit zum Lesen?"}
            </h2>
            <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic">
                {targetBookId ? "Scanne die nächste Seite deines Buches." : "Scanne eine Seite deines spanischen Buches."}
            </p>
        </div>
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <div className="flex flex-col gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] py-4 px-10 rounded-2xl shadow-xl font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-transform">
                Kamera starten
            </button>
            {targetBookId && (
                <button onClick={handleReset} className="text-[#6B705C] dark:text-[#A5A58D] font-bold uppercase text-[10px] tracking-widest p-2 hover:text-[#2C2420]">
                    Abbrechen
                </button>
            )}
        </div>
      </div>
    );
  }

  if (finished) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 animate-fade-in bg-[#FDFBF7] dark:bg-[#12100E]">
              <div className="w-16 h-16 bg-[#E9EDC9] dark:bg-[#2C2420] rounded-2xl flex items-center justify-center text-[#6B705C] dark:text-[#D4A373] mb-6">
                  <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2">Seite beendet!</h2>
              <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic mb-8">
                  {newlySavedCount > 0 
                    ? `Du hast ${newlySavedCount} neue Fundstücke in deine Sammlung aufgenommen.` 
                    : "Alle Wörter dieser Seite sind bereits in deiner Sammlung."}
              </p>
              
              {/* Context Action Buttons */}
              <div className="flex flex-col gap-3 w-full max-w-xs">
                  {targetBookId ? (
                        <button onClick={onSaveComplete} className="bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-md">
                            Zurück zum Buch
                        </button>
                  ) : (
                      <button onClick={handleReset} className="bg-[#6B705C] dark:bg-[#2C2420] text-white px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest border dark:border-[#2C2420] shadow-md">
                          Nächste Seite
                      </button>
                  )}
                  
                  {!targetBookId && !initialData && (
                      <button onClick={() => onChangeView?.(AppView.LIBRARY)} className="bg-[#B26B4A] dark:bg-[#D4A373] text-white dark:text-[#12100E] px-8 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-md">
                          In Buch speichern
                      </button>
                  )}

                  <button onClick={() => onChangeView?.(AppView.VOCAB)} className="text-[#6B705C] dark:text-[#A5A58D] px-8 py-2 font-bold uppercase text-[10px] tracking-widest hover:text-[#2C2420] dark:hover:text-[#FDFBF7]">
                      Zum Lernbereich
                  </button>
              </div>
          </div>
      )
  }

  const currentLexicalWord = lexicalWords[currentWordIndex];

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
            <button onClick={handleReset} className="p-2 text-[#A5A58D] dark:text-[#2C2420] hover:text-[#B26B4A] dark:hover:text-[#D4A373]">
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
                                    const isCurrent = currentLexicalWord && w.word === currentLexicalWord.word;
                                    return (
                                        <span key={idx} className={`transition-colors duration-300 ${isCurrent ? 'bg-[#FEFAE0] dark:bg-[#B26B4A]/20 text-[#B26B4A] dark:text-[#D4A373] font-bold px-1 rounded mx-0.5' : 'opacity-40'}`}>
                                            {w.word}
                                        </span>
                                    );
                                })}
                            </p>
                        </div>

                        {/* Word Analysis Card - No internal scroll, whole page scrolls */}
                        {currentLexicalWord && (
                            <div className="relative w-full bg-[#2C2420] dark:bg-[#1C1917] text-[#FDFBF7] p-8 rounded-[2.5rem] shadow-xl border border-transparent dark:border-[#2C2420] flex flex-col animate-fade-in">
                                
                                {/* Audio Button - Top Right */}
                                <button 
                                    onClick={() => handlePlayAudio(currentLexicalWord.word, `w-${currentSentenceIndex}-${currentWordIndex}`)}
                                    className="absolute top-6 right-6 w-10 h-10 bg-[#B26B4A] dark:bg-[#D4A373] rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-10"
                                >
                                    {playingAudio === `w-${currentSentenceIndex}-${currentWordIndex}` ? <Loader2 className="w-4 h-4 animate-spin text-white dark:text-[#12100E]"/> : <Volume2 className="w-4 h-4 text-white dark:text-[#12100E]" />}
                                </button>

                                <div className="mb-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#B26B4A] dark:text-[#D4A373]">
                                            {currentLexicalWord.category || 'Vokabel'}
                                        </span>
                                        {savedWords.has(currentLexicalWord.word.toLowerCase()) && (
                                            <div className="flex items-center gap-1.5 bg-[#E9EDC9]/20 px-2 py-1 rounded-full">
                                                <CheckCircle className="w-3 h-3 text-[#E9EDC9]" />
                                                <span className="text-[7px] font-bold uppercase tracking-widest text-[#E9EDC9]">Gespeichert</span>
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-4xl font-serif font-bold text-[#FEFAE0] dark:text-[#D4A373] mb-2">{currentLexicalWord.word}</h3>
                                    <p className="text-2xl font-serif italic text-[#FDFBF7]/90">{currentLexicalWord.translation}</p>
                                </div>
                                
                                {currentLexicalWord.explanation && (
                                    <div className="bg-white/5 dark:bg-black/20 p-5 rounded-2xl border border-white/10 dark:border-white/5">
                                        <p className="text-base font-serif leading-relaxed text-[#FDFBF7]/80">
                                            {currentLexicalWord.explanation}
                                        </p>
                                    </div>
                                )}
                                
                                {currentLexicalWord.baseForm && currentLexicalWord.baseForm !== currentLexicalWord.word && (
                                    <div className="mt-6 pt-4 border-t border-white/10">
                                        <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Grundform</p>
                                        <p className="font-serif italic text-lg">{currentLexicalWord.baseForm}</p>
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
            <div className="flex gap-3 max-w-lg mx-auto">
                <button 
                    onClick={handlePrevPhase}
                    disabled={phase === 'sentence' && currentSentenceIndex === 0}
                    className="w-14 h-14 flex items-center justify-center bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl text-[#6B705C] dark:text-[#A5A58D] disabled:opacity-20 active:scale-95 transition-all shadow-sm"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                
                {/* Dynamic Main Button */}
                <button 
                    onClick={handleNextPhase}
                    className={`flex-grow h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all ${
                        phase === 'translation' ? 'bg-[#B26B4A] dark:bg-[#D4A373] text-white dark:text-[#12100E]' : 'bg-[#2C2420] dark:bg-white text-white dark:text-[#12100E]'
                    }`}
                >
                    {phase === 'sentence' ? 'Wörter analysieren' : phase === 'words' && currentWordIndex < lexicalWords.length - 1 ? 'Nächstes Wort' : phase === 'words' ? 'Zur Übersetzung' : 'Nächster Satz'}
                    <ChevronRight className="w-4 h-4" />
                </button>

                {/* Skip Button (Only visible in sentence phase) */}
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
  );
};

export default AnalysisView;
