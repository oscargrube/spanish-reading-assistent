
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Play, Loader2, ArrowRight, CheckCircle, RotateCcw, ChevronRight, ChevronLeft, XCircle, Sparkles, Book, Key } from 'lucide-react';
import { PageAnalysisResult, WordAnalysis, AppView } from '../types';
import { analyzeImage, generateSpeech } from '../services/geminiService';
import { addVocabBatch, isVocabSaved, saveCurrentAnalysis, getLastAnalysis, clearLastAnalysis, getApiKey } from '../services/storageService';

interface AnalysisViewProps {
    onChangeView?: (view: AppView) => void;
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ onChangeView }) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PageAnalysisResult | null>(null);
  
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [showTranslation, setShowTranslation] = useState(false);

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
          const key = getApiKey() || process.env.API_KEY;
          if (!key) {
              setNeedsKey(true);
          } else {
              setNeedsKey(false);
          }
      };
      checkKey();
  }, []);

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

  const handleAnalyze = async (base64Data: string) => {
    const key = getApiKey() || process.env.API_KEY;
    if (!key) {
        setNeedsKey(true);
        return;
    }

    setLoading(true);
    setResult(null);
    setFinished(false);
    setCurrentSentenceIndex(0);
    setCurrentWordIndex(-1);
    setShowTranslation(false);
    setNewlySavedCount(0);

    try {
      const data = await analyzeImage(base64Data);
      setResult(data);
      saveCurrentAnalysis(data, base64Data);
    } catch (err: any) {
      if (err.message?.includes("API key")) {
          setNeedsKey(true);
      }
      console.error(err);
      setImage(null);
    } finally {
      setLoading(false);
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

  const handleNextSentence = useCallback(() => {
    if (!result) return;

    const currentSentence = result.sentences[currentSentenceIndex];
    const lexicalWords = currentSentence.words.filter(w => w.type === 'word');
    const wordsToSave = lexicalWords.map(w => ({
        word: w.word,
        translation: w.translation || '',
        explanation: w.explanation || '',
        category: w.category,
        baseForm: w.baseForm,
        contextSentence: currentSentence.original
    }));

    const saved = addVocabBatch(wordsToSave);
    setNewlySavedCount(prev => prev + saved);

    if (currentSentenceIndex < result.sentences.length - 1) {
        const nextIdx = currentSentenceIndex + 1;
        setCurrentSentenceIndex(nextIdx);
        setCurrentWordIndex(-1);
        setShowTranslation(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        setFinished(true);
        clearLastAnalysis();
    }
  }, [result, currentSentenceIndex]);

  const handleNextStep = useCallback(() => {
    if (!result) return;
    const currentSentence = result.sentences[currentSentenceIndex];
    
    if (currentWordIndex === -1 && !showTranslation) {
        const firstWordIdx = currentSentence.words.findIndex(w => w.type === 'word');
        if (firstWordIdx !== -1) {
            setCurrentWordIndex(firstWordIdx);
        } else {
            setShowTranslation(true);
        }
        return;
    }

    if (currentWordIndex !== -1) {
        let nextIdx = -1;
        for (let i = currentWordIndex + 1; i < currentSentence.words.length; i++) {
            if (currentSentence.words[i].type === 'word') {
                nextIdx = i;
                break;
            }
        }

        if (nextIdx === -1) {
            setCurrentWordIndex(-1);
            setShowTranslation(true);
        } else {
            setCurrentWordIndex(nextIdx);
        }
        return;
    }

    if (showTranslation) {
        handleNextSentence();
    }
  }, [result, currentSentenceIndex, currentWordIndex, showTranslation, handleNextSentence]);

  const handlePrevStep = () => {
    if (!result) return;
    const currentSentence = result.sentences[currentSentenceIndex];
    
    if (showTranslation) {
        const lastWordIdx = [...currentSentence.words].reverse().findIndex(w => w.type === 'word');
        if (lastWordIdx !== -1) {
            setCurrentWordIndex(currentSentence.words.length - 1 - lastWordIdx);
            setShowTranslation(false);
            return;
        }
    }

    let prevIdx = -1;
    for (let i = currentWordIndex - 1; i >= 0; i--) {
        if (currentSentence.words[i].type === 'word') {
            prevIdx = i;
            break;
        }
    }

    if (prevIdx !== -1) {
        setCurrentWordIndex(prevIdx);
    } else {
        setCurrentWordIndex(-1);
    }
  };

  const handleWordClick = (index: number, word: WordAnalysis) => {
      if (word.type === 'word') {
          setCurrentWordIndex(index);
          setShowTranslation(false);
      }
  }

  const handleReset = () => {
      setImage(null);
      setResult(null);
      setFinished(false);
      setCurrentSentenceIndex(0);
      setCurrentWordIndex(-1);
      setShowTranslation(false);
      clearLastAnalysis();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && result && !finished) {
            e.preventDefault(); 
            handleNextStep();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, finished, handleNextStep]);

  if (needsKey) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center animate-fade-in px-6">
              <div className="w-20 h-20 bg-[#B26B4A]/10 rounded-3xl flex items-center justify-center text-[#B26B4A] border border-[#B26B4A]/20">
                  <Key className="w-10 h-10" />
              </div>
              <div className="max-w-sm">
                  <h2 className="text-2xl font-serif font-bold text-[#2C2420] mb-2">API Key fehlt</h2>
                  <p className="text-[#6B705C] font-serif italic text-sm mb-6">
                      Um die App zu nutzen, musst du in den Einstellungen deinen eigenen Gemini API Key hinterlegen.
                  </p>
                  <button 
                    onClick={() => onChangeView?.(AppView.SETTINGS)} 
                    className="w-full bg-[#2C2420] text-white font-bold py-4 px-10 rounded-2xl shadow-lg hover:bg-[#3D332D] transition-colors flex items-center justify-center gap-4 uppercase text-[10px] tracking-widest"
                  >
                      Zu den Einstellungen
                  </button>
              </div>
          </div>
      );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
        <div className="relative mb-8">
             <div className="absolute inset-0 bg-[#6B705C]/20 rounded-full animate-ping opacity-75"></div>
            <Loader2 className="w-16 h-16 animate-spin text-[#6B705C] relative z-10" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#2C2420]">Analysiere Text...</h2>
        <p className="text-[#6B705C] mt-3 max-w-xs text-sm italic font-serif">"Ein Buch ist ein Garten, den man in der Tasche trägt."</p>
      </div>
    );
  }

  if (!result && !image) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 animate-fade-in">
        <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-[#6B705C] border border-[#EAE2D6] shadow-md relative">
          <Book className="w-10 h-10" />
          <div className="absolute -top-1 -right-1 bg-[#B26B4A] p-2 rounded-xl text-white shadow-md">
            <Camera className="w-4 h-4" />
          </div>
        </div>
        <div className="text-center max-w-md px-6">
          <h2 className="text-2xl font-serif font-bold mb-3 text-[#2C2420]">Bereit für ein neues Kapitel?</h2>
          <p className="text-[#6B705C] text-md font-serif italic">Mache ein Foto deiner Buchseite.</p>
        </div>
        <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <button onClick={() => fileInputRef.current?.click()} className="bg-[#2C2420] hover:bg-[#3D332D] text-[#FDFBF7] font-bold py-4 px-10 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-4 uppercase text-[10px] tracking-widest">
            Seite scannen
        </button>
      </div>
    );
  }

  if (finished) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center animate-fade-in px-4">
              <div className="w-20 h-20 bg-[#E9EDC9] rounded-2xl flex items-center justify-center text-[#6B705C] border border-[#6B705C]/20 shadow-inner">
                  <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#2C2420] mb-2">Kapitel beendet</h2>
                <p className="text-[#6B705C] font-serif italic text-lg">
                    Du hast <span className="font-bold text-[#B26B4A]">{newlySavedCount} neue Worte</span> gesammelt.
                </p>
              </div>
              <button onClick={handleReset} className="bg-[#6B705C] text-white font-bold py-4 px-10 rounded-2xl shadow-lg hover:bg-[#585E4A] transition-colors flex items-center gap-4 uppercase text-[10px] tracking-widest">
                  <RotateCcw className="w-4 h-4" /> Neue Seite
              </button>
          </div>
      )
  }

  const currentSentence = result?.sentences[currentSentenceIndex];
  const currentWord = currentSentence?.words[currentWordIndex];
  
  const getNextButtonLabel = () => {
    if (currentWordIndex === -1 && !showTranslation) return "Satz lesen";
    if (showTranslation) return "Nächster Satz";
    const nextIdxExists = currentSentence?.words.slice(currentWordIndex + 1).some(w => w.type === 'word');
    if (nextIdxExists) return "Nächstes Wort";
    return "Übersetzung zeigen";
  };

  return (
    <div className="flex flex-col min-h-full animate-fade-in pb-12">
        <div className="w-full bg-[#EAE2D6] h-1 rounded-full mb-6 overflow-hidden shadow-inner">
            <div className="bg-[#B26B4A] h-full transition-all duration-1000 ease-in-out" style={{ width: `${((currentSentenceIndex + 1) / (result?.sentences.length || 1)) * 100}%` }}></div>
        </div>

        <div className="flex justify-between items-center mb-4 px-1">
             <span className="text-[9px] font-bold text-[#6B705C] uppercase tracking-widest bg-[#E9EDC9]/50 px-3 py-1 rounded-lg border border-[#6B705C]/10">
                Satz {currentSentenceIndex + 1} / {result?.sentences.length}
             </span>
             <button onClick={handleReset} className="text-[#A5A58D] hover:text-[#B26B4A] transition-colors p-1.5 bg-white rounded-lg border border-[#EAE2D6] shadow-sm">
                <XCircle className="w-4 h-4" />
             </button>
        </div>
       
        {currentSentence && (
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 items-stretch mb-8">
                <div className="bg-white p-6 rounded-[2rem] border border-[#EAE2D6] shadow-sm flex flex-col lg:min-h-[360px] transition-all duration-500 relative">
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-xl font-serif text-[#2C2420] leading-[1.6]">
                            {currentSentence.words.map((w, idx) => (
                                <span 
                                    key={idx}
                                    onClick={() => handleWordClick(idx, w)}
                                    className={`transition-all duration-300 rounded-lg px-[2px] py-0.5 inline-block select-none ${
                                        w.type === 'word' 
                                        ? idx === currentWordIndex 
                                            ? 'bg-[#FEFAE0] text-[#B26B4A] font-bold shadow-sm ring-1 ring-[#FAEDCD] z-10 relative' 
                                            : 'text-[#2C2420] hover:bg-[#FDFBF7] hover:text-[#B26B4A] cursor-pointer'
                                        : 'text-[#2C2420] font-normal cursor-default opacity-80'
                                    }`}
                                >
                                    {w.word}
                                </span>
                            ))}
                        </p>
                    </div>
                    
                    <div className={`mt-4 pt-4 border-t border-[#FAEDCD] transition-all duration-500 ${showTranslation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none h-0 p-0 m-0 border-0'}`}>
                        {showTranslation && (
                            <>
                                <p className="text-md text-[#6B705C] font-serif italic leading-relaxed">
                                    {currentSentence.translation}
                                </p>
                                <div className="flex items-center gap-3 mt-4">
                                    <button 
                                        onClick={() => handlePlayAudio(currentSentence.original, `s-${currentSentenceIndex}`)} 
                                        className={`flex items-center justify-center gap-2 p-2 rounded-xl transition-all ${playingAudio === `s-${currentSentenceIndex}` ? 'text-[#B26B4A] bg-[#FEFAE0]' : 'text-[#6B705C] bg-[#FDFBF7] border border-[#EAE2D6] hover:bg-[#E9EDC9]'}`}
                                    >
                                        {playingAudio === `s-${currentSentenceIndex}` ? <Loader2 className="w-4 h-4 animate-spin"/> : <Play className="w-4 h-4 fill-current" />}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="lg:min-h-[360px]">
                    {currentWord && currentWord.type === 'word' ? (
                        <div className="bg-[#2C2420] text-[#FDFBF7] p-8 rounded-[2rem] shadow-xl h-full flex flex-col relative animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="flex flex-col gap-1 mb-4">
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-[#FDFBF7]/40">
                                        {currentWord.category || 'Wort'}
                                    </span>
                                    <h4 className="text-3xl font-serif font-bold tracking-tight text-[#FEFAE0] leading-tight">{currentWord.word}</h4>
                                </div>
                                
                                <div className="mb-4">
                                    <h5 className="text-xl text-[#FDFBF7] font-serif italic mb-1">{currentWord.translation}</h5>
                                    {currentWord.baseForm && currentWord.baseForm !== currentWord.word && (
                                         <p className="text-[10px] text-[#FDFBF7]/40 font-medium tracking-wide">Lemma: <span className="text-[#FDFBF7]/80 italic">{currentWord.baseForm}</span></p>
                                    )}
                                </div>

                                {currentWord.explanation && (
                                    <div className="bg-[#FDFBF7]/5 p-4 rounded-2xl border border-[#FDFBF7]/10 mb-4">
                                        <p className="text-[#FDFBF7]/70 text-md font-serif italic leading-relaxed">"{currentWord.explanation}"</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#FDFBF7]/10">
                                <button 
                                    onClick={() => handlePlayAudio(currentWord.word, `w-${currentSentenceIndex}-${currentWordIndex}`)} 
                                    className="w-12 h-12 flex items-center justify-center bg-[#B26B4A] text-white rounded-xl hover:bg-[#9E5A3B] shadow-md transition-all active:scale-90"
                                >
                                    {playingAudio === `w-${currentSentenceIndex}-${currentWordIndex}` ? <Loader2 className="w-5 h-5 animate-spin"/> : <Play className="w-5 h-5 fill-current" />}
                                </button>
                                {isVocabSaved(currentWord.word) && (
                                    <div className="flex items-center gap-1.5 bg-[#E9EDC9]/10 px-3 py-1.5 rounded-lg border border-[#E9EDC9]/20">
                                        <CheckCircle className="w-3 h-3 text-[#E9EDC9]" />
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-[#E9EDC9]">Gemerkt</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[#EAE2D6] rounded-[2rem] p-6 bg-white/50 min-h-[200px]">
                            <Sparkles className="w-8 h-8 text-[#EAE2D6] mb-3" />
                            <p className="text-[#A5A58D] text-md font-serif italic text-center leading-relaxed">
                                {showTranslation ? "Satz verstanden?" : "Gehe die Worte durch."}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className="w-full max-w-lg mx-auto pb-8">
            <div className="flex items-stretch gap-3">
                <button 
                    onClick={handlePrevStep} 
                    disabled={currentWordIndex === -1 && !showTranslation} 
                    className="w-12 h-12 bg-white border border-[#EAE2D6] text-[#A5A58D] rounded-xl disabled:opacity-20 hover:bg-[#FDFBF7] hover:text-[#B26B4A] transition-all flex items-center justify-center shadow-md shrink-0"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button 
                    onClick={handleNextStep} 
                    className={`flex-grow h-12 rounded-xl shadow-lg active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 font-serif font-bold text-base ${
                        showTranslation 
                        ? 'bg-[#B26B4A] text-white hover:bg-[#9E5A3B]' 
                        : 'bg-[#2C2420] text-[#FDFBF7] hover:bg-[#3D332D]'
                    }`}
                >
                    <span>{getNextButtonLabel()}</span>
                    {showTranslation ? <ArrowRight className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>
            <p className="text-[8px] text-center text-[#A5A58D] mt-3 font-bold uppercase tracking-widest opacity-40 hidden lg:block">Leertaste = Weiter</p>
        </div>
    </div>
  );
};

export default AnalysisView;
