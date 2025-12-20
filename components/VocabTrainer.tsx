
import React, { useState, useEffect } from 'react';
import { VocabItem, WordCategory } from '../types';
import { getVocab, removeVocab, toggleMastered } from '../services/storageService';
import { Trash2, CheckCircle, GraduationCap, RefreshCw, Layers, Play } from 'lucide-react';
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
                    ? 'bg-[#B26B4A] text-[#FDFBF7] shadow-lg' 
                    : 'bg-white text-[#6B705C] border border-[#EAE2D6]'
                }`}
              >
                  {cat === 'all' ? 'Alle' : cat === 'noun' ? 'Nomen' : cat === 'verb' ? 'Verben' : cat === 'adjective' ? 'Adjektive' : 'Andere'}
              </button>
          ))}
      </div>
  );

  if (vocabList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-[#A5A58D] border border-[#EAE2D6]">
            <GraduationCap className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-serif font-bold text-[#2C2420]">Deine Sammlung ist leer</h3>
        <p className="text-[#6B705C] mt-3 font-serif italic">Schlage ein Buch auf und fange an zu sammeln.</p>
      </div>
    );
  }

  if (mode === 'list') {
    const filteredList = getFilteredList();
    const unmasteredCount = filteredList.filter(i => !i.mastered).length;

    return (
      <div className="space-y-6 pb-24">
        <div className="bg-[#2C2420] rounded-[2.5rem] p-8 text-[#FDFBF7] shadow-2xl mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#B26B4A]/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-4xl font-serif font-bold">{unmasteredCount}</h2>
                        <p className="text-[#FDFBF7]/60 text-sm font-serif italic tracking-wide">Wörter warten auf dich.</p>
                    </div>
                    <Layers className="w-8 h-8 text-[#B26B4A]" />
                </div>
                
                <button 
                    onClick={startSession}
                    disabled={unmasteredCount === 0}
                    className="w-full bg-[#B26B4A] text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-[#9E5A3B] transition-all disabled:opacity-30 mt-4 uppercase text-xs tracking-[0.2em]"
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
                    <div key={item.id} className="bg-white p-5 rounded-3xl border border-[#EAE2D6] shadow-sm flex justify-between items-center group transition-all hover:border-[#B26B4A]/30">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <p className="font-serif font-bold text-[#2C2420] text-xl">{item.word}</p>
                                {item.mastered && <CheckCircle className="w-4 h-4 text-[#6B705C]" />}
                            </div>
                            <p className="text-[#6B705C] text-sm italic font-serif">{item.translation}</p>
                        </div>
                        <button 
                            onClick={() => handleDelete(item.id)}
                            className="p-3 text-[#A5A58D] hover:text-[#B26B4A] hover:bg-[#FEFAE0] rounded-2xl transition-all"
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
    <div className="h-full flex flex-col items-center max-w-md mx-auto">
        <div className="w-full flex justify-between items-center mb-8">
            <button onClick={() => setMode('list')} className="text-[#6B705C] hover:text-[#2C2420] text-xs font-bold uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-[#EAE2D6]">
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
             <div className="relative w-full h-full bg-white rounded-[3rem] shadow-2xl border border-[#EAE2D6] overflow-hidden flex flex-col transition-all duration-500">
                <div className={`flex-1 flex flex-col items-center justify-center p-10 text-center ${showAnswer ? 'border-b border-[#FDFBF7]' : ''}`}>
                    <span className="text-[10px] font-bold text-[#B26B4A] uppercase tracking-[0.3em] mb-6">
                        {currentCard.category || 'Wort'}
                    </span>
                    <h2 className="text-5xl font-serif font-bold text-[#2C2420] mb-8">{currentCard.word}</h2>
                    {!showAnswer && (
                        <div className="flex flex-col items-center gap-4">
                            <p className="text-[#A5A58D] text-sm font-serif italic animate-pulse">Karte aufdecken</p>
                            <button 
                                onClick={(e) => { e.stopPropagation(); playWord(); }}
                                className="p-4 bg-[#FEFAE0] text-[#B26B4A] rounded-2xl hover:bg-[#FAEDCD]"
                            >
                                <Play className="w-6 h-6 fill-current" />
                            </button>
                        </div>
                    )}
                </div>

                {showAnswer && (
                    <div className="flex-1 bg-[#FDFBF7] flex flex-col items-center justify-center p-10 text-center animate-in fade-in slide-in-from-bottom-6 duration-500">
                         <h2 className="text-3xl font-serif font-bold text-[#B26B4A] mb-3">{currentCard.translation}</h2>
                         
                         {currentCard.baseForm && currentCard.baseForm !== currentCard.word && (
                             <p className="text-xs text-[#6B705C] mb-4 font-bold uppercase tracking-widest opacity-60">
                                 {currentCard.baseForm}
                             </p>
                         )}

                         <p className="text-[#6B705C] italic font-serif text-lg leading-relaxed mb-6">"{currentCard.explanation}"</p>
                         
                         <button 
                            onClick={(e) => { e.stopPropagation(); playWord(); }}
                            className="p-3 bg-white border border-[#EAE2D6] text-[#6B705C] rounded-xl hover:bg-[#E9EDC9]"
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
                    className="flex flex-col items-center justify-center p-5 bg-white border border-[#EAE2D6] text-[#B26B4A] rounded-3xl hover:bg-[#FEFAE0] active:scale-95 transition-all shadow-sm"
                >
                    <RefreshCw className="w-6 h-6 mb-2" />
                    <span className="font-bold text-xs uppercase tracking-widest">Nochmal</span>
                </button>
                <button 
                    onClick={() => handleCardResult('good')}
                    className="flex flex-col items-center justify-center p-5 bg-[#6B705C] text-white rounded-3xl hover:bg-[#585E4A] active:scale-95 transition-all shadow-xl"
                >
                    <CheckCircle className="w-6 h-6 mb-2" />
                    <span className="font-bold text-xs uppercase tracking-widest">Gelernt</span>
                </button>
            </div>
        ) : (
            <div className="w-full px-4">
                <button 
                    onClick={() => setShowAnswer(true)}
                    className="w-full bg-[#2C2420] text-[#FDFBF7] font-bold py-5 rounded-3xl shadow-2xl hover:bg-[#3D332D] active:scale-95 transition-all uppercase text-xs tracking-[0.3em]"
                >
                    Antwort zeigen
                </button>
            </div>
        )}
    </div>
  );
};

export default VocabTrainer;
