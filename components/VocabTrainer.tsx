
import React, { useState, useEffect } from 'react';
import { VocabItem, WordCategory } from '../types';
import { getVocab, removeVocab, toggleMastered } from '../services/storageService';
import { Trash2, CheckCircle, GraduationCap, RefreshCw, Layers, Play, Download } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

const VocabTrainer: React.FC = () => {
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [mode, setMode] = useState<'list' | 'train'>('list');
  const [selectedCategory, setSelectedCategory] = useState<WordCategory | 'all'>('all');
  
  // Trainer State
  const [sessionQueue, setSessionQueue] = useState<VocabItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    loadVocab();
  }, []);

  const loadVocab = () => {
    const all = getVocab();
    setVocabList(all.sort((a, b) => b.addedAt - a.addedAt));
  };

  const getFilteredList = () => {
    if (selectedCategory === 'all') return vocabList;
    return vocabList.filter(item => {
        const cat = item.category || 'function';
        return cat === selectedCategory;
    });
  }

  const handleDelete = (id: string) => {
    removeVocab(id);
    loadVocab();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(vocabList, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `spanish-vocab-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const startSession = () => {
      const filtered = getFilteredList().filter(i => !i.mastered);
      if (filtered.length === 0) {
          alert("Keine offenen Vokabeln in dieser Kategorie!");
          return;
      }
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      setSessionQueue(shuffled);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setShowAnswer(false);
      setMode('train');
  }

  const handleCardResult = (result: 'again' | 'good') => {
      const currentItem = sessionQueue[currentCardIndex];
      
      if (result === 'good') {
          toggleMastered(currentItem.id);
      } else {
          setSessionQueue(prev => [...prev, currentItem]);
      }

      setIsFlipped(false);
      setShowAnswer(false);
      
      if (currentCardIndex < sessionQueue.length - 1) {
          setCurrentCardIndex(prev => prev + 1);
      } else {
          if (currentCardIndex + 1 < sessionQueue.length) {
              setCurrentCardIndex(prev => prev + 1);
          } else {
             alert("Sitzung abgeschlossen!");
             setMode('list');
             loadVocab();
          }
      }
  };

  const playWord = async () => {
      if (mode === 'train' && sessionQueue[currentCardIndex]) {
        try {
            await generateSpeech(sessionQueue[currentCardIndex].word);
        } catch(e) { console.error(e) }
      }
  }

  const renderCategoryTabs = () => (
      <div className="flex overflow-x-auto gap-3 pb-3 mb-6 scrollbar-hide px-1">
          {['all', 'noun', 'verb', 'adjective', 'function'].map((cat) => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat as any)}
                className={`px-5 py-2.5 rounded-2xl whitespace-nowrap text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                    selectedCategory === cat 
                    ? 'bg-[#B26B4A] dark:bg-[#D4A373] text-[#FDFBF7] dark:text-[#12100E] shadow-lg' 
                    : 'bg-white dark:bg-[#1C1917] text-[#6B705C] dark:text-[#A5A58D] border border-[#EAE2D6] dark:border-[#2C2420]'
                }`}
              >
                  {cat === 'all' ? 'Alle' : cat === 'noun' ? 'Nomen' : cat === 'verb' ? 'Verben' : cat === 'adjective' ? 'Adjektive' : 'Andere'}
              </button>
          ))}
      </div>
  );

  if (vocabList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8 animate-fade-in">
        <div className="w-20 h-20 bg-white dark:bg-[#1C1917] rounded-full flex items-center justify-center mb-6 text-[#A5A58D] border border-[#EAE2D6] dark:border-[#2C2420]">
            <GraduationCap className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">Deine Sammlung ist leer</h3>
        <p className="text-[#6B705C] dark:text-[#A5A58D] mt-3 font-serif italic">Schlage ein Buch auf und fange an zu sammeln.</p>
      </div>
    );
  }

  if (mode === 'list') {
    const filteredList = getFilteredList();
    const unmasteredCount = filteredList.filter(i => !i.mastered).length;

    return (
      <div className="space-y-6 pb-24 animate-fade-in">
        <div className="bg-[#2C2420] dark:bg-[#1C1917] rounded-[2.5rem] p-8 text-[#FDFBF7] shadow-2xl mb-8 relative overflow-hidden border border-transparent dark:border-[#2C2420]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B26B4A]/10 dark:bg-[#D4A373]/5 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-4xl font-serif font-bold">{unmasteredCount}</h2>
                        <p className="text-[#FDFBF7]/60 text-sm font-serif italic tracking-wide">Wörter warten auf dich.</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleExport}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-[#FDFBF7] transition-all border border-white/10"
                            title="Vokabeln exportieren"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <Layers className="w-8 h-8 text-[#B26B4A] dark:text-[#D4A373]" />
                    </div>
                </div>
                
                <button 
                    onClick={startSession}
                    disabled={unmasteredCount === 0}
                    className="w-full bg-[#B26B4A] dark:bg-[#D4A373] text-white dark:text-[#12100E] font-bold py-4 rounded-2xl shadow-xl hover:bg-[#9E5A3B] transition-all disabled:opacity-30 mt-4 uppercase text-xs tracking-[0.2em]"
                >
                    Lern-Sitzung starten
                </button>
            </div>
        </div>

        {renderCategoryTabs()}

        <div className="grid gap-4">
            {filteredList.length === 0 ? (
                <p className="text-center text-[#A5A58D] py-12 font-serif italic">Hier gibt es noch nichts zu entdecken.</p>
            ) : (
                filteredList.map(item => (
                    <div key={item.id} className="bg-white dark:bg-[#1C1917] p-5 rounded-3xl border border-[#EAE2D6] dark:border-[#2C2420] shadow-sm flex justify-between items-center group transition-all hover:border-[#B26B4A]/30 dark:hover:border-[#D4A373]/30">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <p className="font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] text-xl">{item.word}</p>
                                {item.mastered && <CheckCircle className="w-4 h-4 text-[#6B705C] dark:text-[#D4A373]" />}
                            </div>
                            <p className="text-[#6B705C] dark:text-[#A5A58D] text-sm italic font-serif">{item.translation}</p>
                        </div>
                        <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-3 text-[#A5A58D] hover:text-[#B26B4A] dark:hover:text-[#D4A373] hover:bg-[#FEFAE0] dark:hover:bg-[#2C2420] rounded-2xl transition-all"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    );
  }

  const currentCard = sessionQueue[currentCardIndex];

  return (
    <div className="h-full flex flex-col items-center max-w-md mx-auto animate-fade-in">
        <div className="w-full flex justify-between items-center mb-8">
            <button onClick={() => setMode('list')} className="text-[#6B705C] dark:text-[#A5A58D] hover:text-[#2C2420] dark:hover:text-[#FDFBF7] text-xs font-bold uppercase tracking-widest bg-white dark:bg-[#1C1917] px-4 py-2 rounded-xl border border-[#EAE2D6] dark:border-[#2C2420]">
                Abbrechen
            </button>
            <span className="text-[#A5A58D] text-xs font-bold tracking-[0.3em]">
                {currentCardIndex + 1} / {sessionQueue.length}
            </span>
        </div>

        {/* Card */}
        <div 
            className="w-full aspect-[4/5] perspective-1000 cursor-pointer mb-10"
            onClick={() => !showAnswer && setShowAnswer(true)}
        >
             <div className="relative w-full h-full bg-white dark:bg-[#1C1917] rounded-[3rem] shadow-2xl border border-[#EAE2D6] dark:border-[#2C2420] overflow-hidden flex flex-col transition-all duration-500">
                <div className={`flex-1 flex flex-col items-center justify-center p-10 text-center ${showAnswer ? 'border-b border-[#FDFBF7] dark:border-[#12100E]' : ''}`}>
                    <span className="text-[10px] font-bold text-[#B26B4A] dark:text-[#D4A373] uppercase tracking-[0.3em] mb-6">
                        {currentCard.category || 'Wort'}
                    </span>
                    <h2 className="text-5xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-8">{currentCard.word}</h2>
                    {!showAnswer && (
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-[#A5A58D] text-sm font-serif italic animate-pulse">Karte aufdecken</p>
                            <button 
                                onClick={(e) => { e.stopPropagation(); playWord(); }}
                                className="p-4 bg-[#FEFAE0] dark:bg-[#2C2420] text-[#B26B4A] dark:text-[#D4A373] rounded-2xl hover:bg-[#FAEDCD] dark:hover:bg-black/20"
                            >
                                <Play className="w-6 h-6 fill-current" />
                            </button>
                        </div>
                    )}
                </div>

                {showAnswer && (
                    <div className="flex-1 bg-[#FDFBF7] dark:bg-[#12100E] flex flex-col items-center justify-center p-10 text-center animate-in fade-in slide-in-from-bottom-6 duration-500">
                         <h2 className="text-3xl font-serif font-bold text-[#B26B4A] dark:text-[#D4A373] mb-3">{currentCard.translation}</h2>
                         
                         {currentCard.baseForm && currentCard.baseForm !== currentCard.word && (
                             <p className="text-xs text-[#6B705C] dark:text-[#A5A58D] mb-4 font-bold uppercase tracking-widest opacity-60">
                                 {currentCard.baseForm}
                             </p>
                         )}

                         <p className="text-[#6B705C] dark:text-[#A5A58D] italic font-serif text-lg leading-relaxed mb-6">"{currentCard.explanation}"</p>
                         
                         <button 
                            onClick={(e) => { e.stopPropagation(); playWord(); }}
                            className="p-3 bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] text-[#6B705C] dark:text-[#A5A58D] rounded-xl hover:bg-[#E9EDC9] dark:hover:bg-[#2C2420]"
                        >
                            <Play className="w-5 h-5 fill-current" />
                        </button>
                    </div>
                )}
             </div>
        </div>

        {showAnswer ? (
             <div className="grid grid-cols-2 gap-6 w-full px-4">
                <button 
                    onClick={() => handleCardResult('again')}
                    className="flex flex-col items-center justify-center p-5 bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] text-[#B26B4A] dark:text-[#D4A373] rounded-3xl hover:bg-[#FEFAE0] dark:hover:bg-[#2C2420] active:scale-95 transition-all shadow-sm"
                >
                    <RefreshCw className="w-6 h-6 mb-2" />
                    <span className="font-bold text-xs uppercase tracking-widest">Nochmal</span>
                </button>
                <button 
                    onClick={() => handleCardResult('good')}
                    className="flex flex-col items-center justify-center p-5 bg-[#6B705C] dark:bg-[#D4A373] text-white dark:text-[#12100E] rounded-3xl hover:bg-[#585E4A] dark:hover:bg-[#B26B4A] active:scale-95 transition-all shadow-xl"
                >
                    <CheckCircle className="w-6 h-6 mb-2" />
                    <span className="font-bold text-xs uppercase tracking-widest">Gelernt</span>
                </button>
            </div>
        ) : (
            <div className="w-full px-4">
                <button 
                    onClick={() => setShowAnswer(true)}
                    className="w-full bg-[#2C2420] dark:bg-[#D4A373] text-[#FDFBF7] dark:text-[#12100E] font-bold py-5 rounded-3xl shadow-2xl hover:bg-[#3D332D] dark:hover:bg-[#B26B4A] active:scale-95 transition-all uppercase text-xs tracking-[0.3em]"
                >
                    Antwort zeigen
                </button>
            </div>
        )}
    </div>
  );
};

export default VocabTrainer;