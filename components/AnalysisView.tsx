
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Play, Loader2, ArrowRight, CheckCircle, RotateCcw, ChevronRight, ChevronLeft, XCircle, Sparkles, Book, Key } from 'lucide-react';
import { PageAnalysisResult, WordAnalysis, AppView } from '../types';
import { analyzeImage, generateSpeech } from '../services/geminiService';
import { addVocabBatch, isVocabSaved, saveCurrentAnalysis, getLastAnalysis, clearLastAnalysis, getApiKey } from '../services/storageService';

interface AnalysisViewProps {
    onChangeView?: (view: AppView) => void;
}

// Phasen des Lern-Flows pro Satz
type FlowPhase = 'sentence' | 'words' | 'translation';

const AnalysisView: React.FC<AnalysisViewProps> = ({ onChangeView }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PageAnalysisResult | null>(null);
  
  // Navigation State
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [phase, setPhase] = useState<FlowPhase>('sentence');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [newlySavedCount, setNewlySavedCount] = useState(0);
  const [needsKey, setNeedsKey] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const last = getLastAnalysis();
      if (last && !result) {
          setResult(last.data);
          setImage(last.image);
      }

      const checkKey = () => {
          const key = getApiKey() || (process.env.API_KEY);
          if (!key) {
              setNeedsKey(true);
          } else {
              setNeedsKey(false);
          }
      };
      checkKey();
  }, []);

  const handleAnalyze = async (base64Data: string) => {
    setLoading(true);
    setResult(null);
    setFinished(false);
    setCurrentSentenceIndex(0);
    setPhase('sentence');
    setCurrentWordIndex(0);

    try {
      const data = await analyzeImage(base64Data);
      setResult(data);
      saveCurrentAnalysis(data, base64Data);
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

  const handleNextPhase = useCallback(() => {
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
        // Wortschatz speichern
        const wordsToSave = lexicalWords.map(w => ({
            word: w.word,
            translation: w.translation || '',
            explanation: w.explanation || '',
            category: w.category,
            baseForm: w.baseForm,
            contextSentence: currentSentence.original
        }));
        const savedCount = addVocabBatch(wordsToSave);
        setNewlySavedCount(prev => prev + savedCount);

        if (currentSentenceIndex < result.sentences.length - 1) {
            setCurrentSentenceIndex(prev => prev + 1);
            setPhase('sentence');
            setCurrentWordIndex(0);
        } else {
            setFinished(true);
            clearLastAnalysis();
        }
    }
  }, [result, phase, currentWordIndex, currentSentenceIndex, lexicalWords, currentSentence]);

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
        setCurrentSentenceIndex(prev => prev - 1);
        setPhase('translation');
    }
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
    setFinished(false);
    clearLastAnalysis();
  };

  // Keyboard Shortcuts
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

  // Loading Screen
  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#FDFBF7] dark:bg-[#12100E] flex flex-col items-center justify-center text-center p-6 z-50">
        <Loader2 className="w-12 h-12 animate-spin text-[#6B705C] dark:text-[#D4A373] mb-4" />
        <h2 className="text-xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">Analysiere Seite...</h2>
      </div>
    );
  }

  // Key missing Screen
  if (needsKey) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-fade-in">
              <Key className="w-12 h-12 text-[#B26B4A] dark:text-[#D4A373] mb-4" />
              <h2 className="text-xl font-serif font-bold mb-2 dark:text-[#FDFBF7]">API Key benötigt</h2>
              <button onClick={() => onChangeView?.(AppView.SETTINGS)} className="mt-4 bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] px-8 py-3 rounded-xl uppercase text-[10px] tracking-widest font-bold">Einstellungen</button>
          </div>
      );
  }

  // Initial Upload Screen
  if (!result && !image) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-fade-in text-center px-6">
        <Book className="w-16 h-16 text-[#6B705C] dark:text-[#A5A58D] opacity-20" />
        <div>
            <h2 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2">Bereit zum Lesen?</h2>
            <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic">Scanne eine Seite deines spanischen Buches.</p>
        </div>
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <button onClick={() => fileInputRef.current?.click()} className="bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] py-4 px-10 rounded-2xl shadow-xl font-bold uppercase text-[10px] tracking-widest active:scale-95 transition-transform">
            Kamera starten
        </button>
      </div>
    );
  }

  // Finished Screen
  if (finished) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-fade-in">
              <div className="w-16 h-16 bg-[#E9EDC9] dark:bg-[#2C2420] rounded-2xl flex items-center justify-center text-[#6B705C] dark:text-[#D4A373] mb-6">
                  <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2">Seite beendet!</h2>
              <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic mb-8">Du hast {newlySavedCount} neue Wörter gelernt.</p>
              <button onClick={handleReset} className="bg-[#6B705C] dark:bg-[#2C2420] text-white px-10 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-widest border dark:border-[#2C2420]">
                  Nächste Seite
              </button>
          </div>
      )
  }

  const currentLexicalWord = lexicalWords[currentWordIndex];

  return (
    <div className="fixed inset-0 bg-[#FDFBF7] dark:bg-[#12100E] flex flex-col overflow-hidden animate-fade-in transition-colors">
        {/* Header / Progress */}
        <div className="px-6 pt-4 pb-2 flex justify-between items-center bg-[#FDFBF7] dark:bg-[#12100E] z-10 transition-colors">
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

        {/* Content Area */}
        <div className="flex-grow flex flex-col px-6 py-4 overflow-hidden relative">
            
            {/* Phase 1: Sentence Intro */}
            {phase === 'sentence' && (
                <div className="flex-grow flex items-center justify-center animate-fade-in">
                    <p className="text-2xl sm:text-3xl font-serif text-[#2C2420] dark:text-[#FDFBF7] leading-relaxed text-center italic">
                        {currentSentence?.original}
                    </p>
                </div>
            )}

            {/* Phase 2: Word Analysis */}
            {phase === 'words' && currentSentence && (
                <div className="flex-grow flex flex-col gap-6 animate-fade-in h-full">
                    {/* Sentence Widget (Top) */}
                    <div className="bg-white dark:bg-[#1C1917] p-4 rounded-2xl border border-[#EAE2D6] dark:border-[#2C2420] shadow-sm shrink-0">
                        <p className="text-lg font-serif text-[#2C2420] dark:text-[#FDFBF7] leading-relaxed">
                            {currentSentence.words.map((w, idx) => {
                                const isCurrent = currentLexicalWord && w.word === currentLexicalWord.word;
                                return (
                                    <span key={idx} className={`transition-colors duration-300 ${isCurrent ? 'bg-[#FEFAE0] dark:bg-[#2C2420] text-[#B26B4A] dark:text-[#D4A373] font-bold px-1 rounded' : 'opacity-40'}`}>
                                        {w.word}
                                    </span>
                                );
                            })}
                        </p>
                    </div>

                    {/* Explanation Widget (Center) */}
                    <div className="flex-grow flex items-center justify-center overflow-hidden">
                        {currentLexicalWord && (
                            <div className="w-full bg-[#2C2420] dark:bg-[#1C1917] text-[#FDFBF7] p-6 rounded-[2rem] shadow-xl border border-transparent dark:border-[#2C2420] flex flex-col animate-fade-in overflow-hidden max-h-full">
                                <div className="overflow-y-auto">
                                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#B26B4A] dark:text-[#D4A373] mb-2 block">
                                        {currentLexicalWord.category || 'Vokabel'}
                                    </span>
                                    <h3 className="text-3xl font-serif font-bold text-[#FEFAE0] dark:text-[#D4A373] mb-2">{currentLexicalWord.word}</h3>
                                    <p className="text-xl font-serif italic text-[#FDFBF7]/90 mb-4">{currentLexicalWord.translation}</p>
                                    
                                    {currentLexicalWord.explanation && (
                                        <div className="bg-white/5 dark:bg-black/20 p-4 rounded-xl border border-white/10 dark:border-white/5 mb-4">
                                            <p className="text-sm font-serif italic text-[#FDFBF7]/70 leading-relaxed">
                                                {currentLexicalWord.explanation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-auto pt-4 flex justify-between items-center border-t border-white/10">
                                    <button 
                                        onClick={() => handlePlayAudio(currentLexicalWord.word, `w-${currentSentenceIndex}-${currentWordIndex}`)}
                                        className="w-10 h-10 bg-[#B26B4A] dark:bg-[#D4A373] rounded-xl flex items-center justify-center"
                                    >
                                        {playingAudio === `w-${currentSentenceIndex}-${currentWordIndex}` ? <Loader2 className="w-4 h-4 animate-spin text-white"/> : <Play className="w-4 h-4 fill-white text-white dark:text-[#12100E] dark:fill-[#12100E]" />}
                                    </button>
                                    {isVocabSaved(currentLexicalWord.word) && (
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-[#E9EDC9]">Gemerkt</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Phase 3: Translation */}
            {phase === 'translation' && currentSentence && (
                <div className="flex-grow flex flex-col justify-center gap-8 animate-fade-in">
                    <div className="text-center">
                        <span className="text-[8px] font-bold text-[#6B705C] dark:text-[#A5A58D] uppercase tracking-widest mb-2 block">Original</span>
                        <p className="text-2xl font-serif text-[#2C2420] dark:text-[#FDFBF7] leading-relaxed italic">
                            {currentSentence.original}
                        </p>
                    </div>
                    <div className="w-12 h-[1px] bg-[#EAE2D6] dark:bg-[#2C2420] mx-auto opacity-50" />
                    <div className="text-center">
                        <span className="text-[8px] font-bold text-[#B26B4A] dark:text-[#D4A373] uppercase tracking-widest mb-2 block">Übersetzung</span>
                        <p className="text-xl font-serif text-[#6B705C] dark:text-[#A5A58D] leading-relaxed">
                            {currentSentence.translation}
                        </p>
                    </div>
                    <button 
                        onClick={() => handlePlayAudio(currentSentence.original, `s-${currentSentenceIndex}`)}
                        className="mx-auto w-12 h-12 bg-[#FDFBF7] dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-full flex items-center justify-center text-[#6B705C] dark:text-[#D4A373] hover:bg-[#FEFAE0] dark:hover:bg-[#2C2420] transition-colors"
                    >
                         {playingAudio === `s-${currentSentenceIndex}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                </div>
            )}
        </div>

        {/* Fixed Navigation Buttons */}
        <div className="px-6 py-6 bg-[#FDFBF7] dark:bg-[#12100E] border-t border-[#EAE2D6] dark:border-[#2C2420] shrink-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] transition-colors">
            <div className="flex gap-3 max-w-lg mx-auto">
                <button 
                    onClick={handlePrevPhase}
                    disabled={phase === 'sentence' && currentSentenceIndex === 0}
                    className="w-14 h-14 flex items-center justify-center bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl text-[#6B705C] dark:text-[#A5A58D] disabled:opacity-20 active:scale-95 transition-all shadow-sm"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                    onClick={handleNextPhase}
                    className={`flex-grow h-14 rounded-2xl flex items-center justify-center gap-3 font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all ${
                        phase === 'translation' ? 'bg-[#B26B4A] dark:bg-[#D4A373] text-white dark:text-[#12100E]' : 'bg-[#2C2420] dark:bg-white text-white dark:text-[#12100E]'
                    }`}
                >
                    {phase === 'sentence' ? 'Wörter analysieren' : phase === 'words' && currentWordIndex < lexicalWords.length - 1 ? 'Nächstes Wort' : phase === 'words' ? 'Übersetzung' : 'Nächster Satz'}
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    </div>
  );
};

export default AnalysisView;