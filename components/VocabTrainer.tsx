import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VocabItem, WordCategory, MasteryLevel } from '../types';
import { getVocab, removeVocabBatch, updateVocabStatus, importVocabFromJson } from '../services/storageService';
import { Trash2, CheckCircle, GraduationCap, RefreshCw, Layers, Play, Download, Upload, Loader2, Quote, ArrowLeft, ChevronRight, Volume2, X, Plus, Sparkles, Filter, Check, Square, CheckSquare, Info, MessageSquare } from 'lucide-react';
import { generateSpeech, generateExampleSentence } from '../services/geminiService';

const VocabTrainer: React.FC = () => {
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'setup' | 'train' | 'detail'>('list');
  
  // Selection logic
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Detail View logic
  const [detailItem, setDetailItem] = useState<VocabItem | null>(null);
  const [aiSentence, setAiSentence] = useState<{ sentence: string, translation: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Session Setup State
  const [selectedCategories, setSelectedCategories] = useState<Set<WordCategory | 'other'>>(new Set(['noun', 'verb', 'adjective']));
  const [selectedStatus, setSelectedStatus] = useState<Set<MasteryLevel>>(new Set(['new', 'again', 'medium']));
  const [verbsOnlyBase, setVerbsOnlyBase] = useState(false);

  // Training State
  const [sessionQueue, setSessionQueue] = useState<VocabItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVocab();
  }, []);

  const loadVocab = async () => {
    setLoading(true);
    const all = await getVocab();
    setVocabList(all);
    setLoading(false);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteBatch = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`${selectedIds.size} Vokabeln löschen?`)) {
      await removeVocabBatch(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      loadVocab();
    }
  };

  const handleOpenDetail = (item: VocabItem) => {
    setDetailItem(item);
    setAiSentence(null);
    setMode('detail');
  };

  const handleGenerateAiSentence = async () => {
    if (!detailItem) return;
    setLoadingAi(true);
    const res = await generateExampleSentence(detailItem.word, detailItem.category || 'Vokabel');
    setAiSentence(res);
    setLoadingAi(false);
  };

  const startSession = () => {
    let filtered = vocabList.filter(item => {
        const cat = (item.category as any) || 'other';
        const matchesCat = selectedCategories.has(cat);
        const matchesStatus = selectedStatus.has(item.masteryLevel || 'new');
        
        if (!matchesCat || !matchesStatus) return false;
        if (cat === 'verb' && verbsOnlyBase && item.baseForm && item.baseForm !== item.word) return false;
        
        return true;
    });

    if (filtered.length === 0) {
      alert("Keine Vokabeln für diese Auswahl gefunden!");
      return;
    }
    setSessionQueue([...filtered].sort(() => Math.random() - 0.5));
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setMode('train');
  };

  const handleRating = async (level: MasteryLevel) => {
    const currentItem = sessionQueue[currentCardIndex];
    await updateVocabStatus(currentItem.id, level);

    if (currentCardIndex < sessionQueue.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setShowAnswer(false);
    } else {
      alert("Sitzung beendet!");
      setMode('list');
      loadVocab();
    }
  };

  const playAudio = async (text: string, id: string) => {
    if (playingAudio) return;
    setPlayingAudio(id);
    try {
      await generateSpeech(text);
    } finally {
      setPlayingAudio(null);
    }
  };

  // --- RENDERING SUB-VIEWS ---

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#B26B4A]" /></div>;

  if (mode === 'detail' && detailItem) {
    return (
      <div className="animate-fade-in pb-32">
        <button onClick={() => setMode('list')} className="flex items-center gap-2 text-[#6B705C] mb-6 font-bold uppercase text-[10px] tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Zurück
        </button>

        <div className="bg-[#2C2420] text-[#FDFBF7] p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden mb-6">
            <button 
                onClick={() => playAudio(detailItem.word, 'detail')}
                className="absolute top-6 right-6 w-12 h-12 bg-[#B26B4A] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
            >
                {playingAudio === 'detail' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#B26B4A] mb-2 block">{detailItem.category || 'Vokabel'}</span>
            <h2 className="text-4xl font-serif font-bold mb-2">{detailItem.word}</h2>
            <p className="text-2xl font-serif italic text-[#FDFBF7]/80">{detailItem.translation}</p>
        </div>

        <div className="space-y-4">
            {detailItem.explanation && (
                <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#EAE2D6] dark:border-[#2C2420]">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-[#6B705C] mb-3">Erklärung</h4>
                    <p className="font-serif leading-relaxed text-[#2C2420] dark:text-[#FDFBF7]">{detailItem.explanation}</p>
                </div>
            )}

            {(detailItem.tense || detailItem.person || detailItem.baseForm) && (
                <div className="flex flex-wrap gap-2">
                    {detailItem.baseForm && (
                        <div className="bg-[#B26B4A]/10 px-4 py-2 rounded-xl border border-[#B26B4A]/20">
                            <span className="text-[8px] uppercase font-bold text-[#B26B4A] block">Grundform</span>
                            <span className="font-serif italic text-[#2C2420] dark:text-[#FDFBF7]">{detailItem.baseForm}</span>
                        </div>
                    )}
                    {detailItem.tense && <div className="bg-white dark:bg-[#1C1917] px-4 py-2 rounded-xl border border-[#EAE2D6] dark:border-[#2C2420] text-xs font-serif">{detailItem.tense}</div>}
                    {detailItem.person && <div className="bg-white dark:bg-[#1C1917] px-4 py-2 rounded-xl border border-[#EAE2D6] dark:border-[#2C2420] text-xs font-serif">{detailItem.person}</div>}
                </div>
            )}

            {detailItem.contextSentence && (
                <div className="bg-white dark:bg-[#1C1917] p-6 rounded-3xl border border-[#EAE2D6] dark:border-[#2C2420]">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-[#6B705C] mb-3 flex items-center gap-2"><Quote className="w-3 h-3" /> Fundstelle</h4>
                    <p className="font-serif italic text-[#6B705C] dark:text-[#A5A58D]">{detailItem.contextSentence}</p>
                </div>
            )}

            <div className="bg-[#FEFAE0] dark:bg-[#2C2420]/50 p-6 rounded-3xl border border-[#FAEDCD] dark:border-[#2C2420] mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-[#B26B4A]">KI Beispielsatz</h4>
                    <button 
                        onClick={handleGenerateAiSentence}
                        disabled={loadingAi}
                        className="bg-[#B26B4A] text-white p-2 rounded-lg hover:scale-105 transition-transform disabled:opacity-50"
                    >
                        {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </button>
                </div>
                {aiSentence ? (
                    <div className="animate-fade-in space-y-2">
                        <p className="font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">{aiSentence.sentence}</p>
                        <p className="font-serif text-sm italic text-[#6B705C] dark:text-[#A5A58D]">{aiSentence.translation}</p>
                    </div>
                ) : (
                    <p className="text-xs text-[#6B705C] italic font-serif">Klicke auf den Funken, um einen neuen Beispielsatz zu generieren.</p>
                )}
            </div>
        </div>
      </div>
    );
  }

  if (mode === 'setup') {
      const toggleCat = (c: WordCategory | 'other') => {
          const next = new Set(selectedCategories);
          if (next.has(c)) next.delete(c); else next.add(c);
          setSelectedCategories(next);
      };
      const toggleStat = (s: MasteryLevel) => {
          const next = new Set(selectedStatus);
          if (next.has(s)) next.delete(s); else next.add(s);
          setSelectedStatus(next);
      };

      return (
          <div className="animate-fade-in max-w-lg mx-auto pb-32">
              <h2 className="text-2xl font-serif font-bold mb-6 text-[#2C2420] dark:text-[#FDFBF7]">Session konfigurieren</h2>
              
              <div className="space-y-8">
                  <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B705C] mb-4">Kategorien</h3>
                      <div className="flex flex-wrap gap-2">
                          {['noun', 'verb', 'adjective', 'other'].map(c => (
                              <button key={c} onClick={() => toggleCat(c as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedCategories.has(c as any) ? 'bg-[#2C2420] text-white' : 'bg-white border-[#EAE2D6] text-[#6B705C]'}`}>
                                  {c === 'noun' ? 'Nomen' : c === 'verb' ? 'Verben' : c === 'adjective' ? 'Adjektive' : 'Andere'}
                              </button>
                          ))}
                      </div>
                      {selectedCategories.has('verb') && (
                          <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                              <div onClick={() => setVerbsOnlyBase(!verbsOnlyBase)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${verbsOnlyBase ? 'bg-[#B26B4A] border-transparent' : 'border-[#EAE2D6]'}`}>
                                  {verbsOnlyBase && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-xs font-serif text-[#6B705C] group-hover:text-[#2C2420]">Nur Grundformen bei Verben</span>
                          </label>
                      )}
                  </section>

                  <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B705C] mb-4">Lernstatus</h3>
                      <div className="flex flex-wrap gap-2">
                          {['new', 'again', 'medium', 'good', 'mastered'].map(s => (
                              <button key={s} onClick={() => toggleStat(s as any)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedStatus.has(s as any) ? 'bg-[#B26B4A] text-white' : 'bg-white border-[#EAE2D6] text-[#6B705C]'}`}>
                                  {s === 'new' ? 'Neu' : s === 'again' ? 'Nochmal' : s === 'medium' ? 'Mittel' : s === 'good' ? 'Gut' : 'Gelernt'}
                              </button>
                          ))}
                      </div>
                  </section>
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-6 bg-[#FDFBF7] dark:bg-[#12100E] border-t border-[#EAE2D6] dark:border-[#2C2420] flex gap-3">
                  <button onClick={() => setMode('list')} className="flex-1 py-4 bg-white border border-[#EAE2D6] rounded-2xl font-bold uppercase text-[10px] tracking-widest">Abbrechen</button>
                  <button onClick={startSession} className="flex-[2] py-4 bg-[#2C2420] text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-lg">Session Starten</button>
              </div>
          </div>
      );
  }

  if (mode === 'train') {
      const card = sessionQueue[currentCardIndex];
      return (
          <div className="fixed inset-0 bg-[#FDFBF7] dark:bg-[#12100E] flex flex-col z-[60] animate-fade-in">
              <header className="px-6 py-4 flex justify-between items-center border-b border-[#EAE2D6] dark:border-[#2C2420]">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B705C]">{currentCardIndex + 1} / {sessionQueue.length}</span>
                   <button onClick={() => setMode('list')} className="p-2 text-[#6B705C] hover:text-[#2C2420]"><X className="w-5 h-5" /></button>
              </header>

              <main className="flex-grow flex flex-col items-center justify-center p-8 overflow-y-auto">
                  <div className="w-full max-w-sm aspect-[4/5] bg-white dark:bg-[#1C1917] rounded-[3rem] shadow-2xl border border-[#EAE2D6] dark:border-[#2C2420] flex flex-col items-center justify-center p-10 text-center relative overflow-hidden group">
                      <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#B26B4A] mb-8">{card.category || 'Wort'}</span>
                      <h2 className={`font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] transition-all duration-500 ${showAnswer ? 'text-2xl mb-4' : 'text-5xl mb-12'}`}>{card.word}</h2>
                      
                      {showAnswer ? (
                          <div className="animate-fade-in flex flex-col items-center w-full">
                              <h3 className="text-3xl font-serif font-bold text-[#B26B4A] mb-4">{card.translation}</h3>
                              <div className="max-h-32 overflow-y-auto w-full px-2">
                                <p className="text-sm font-serif italic text-[#6B705C] dark:text-[#A5A58D] leading-relaxed">{card.explanation}</p>
                              </div>
                              <button onClick={() => playAudio(card.word, 'train')} className="mt-8 p-3 bg-[#FEFAE0] rounded-full text-[#B26B4A]">
                                  {playingAudio === 'train' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Volume2 className="w-5 h-5" />}
                              </button>
                          </div>
                      ) : (
                          <button onClick={() => setShowAnswer(true)} className="px-8 py-4 bg-[#FDFBF7] border border-[#EAE2D6] rounded-2xl text-[10px] font-bold uppercase tracking-widest text-[#6B705C] hover:bg-white transition-colors">Antwort zeigen</button>
                      )}
                  </div>
              </main>

              <footer className="p-6 bg-[#FDFBF7] dark:bg-[#12100E] border-t border-[#EAE2D6] dark:border-[#2C2420]">
                   {showAnswer ? (
                       <div className="grid grid-cols-4 gap-2">
                           {[
                               { l: 'again', label: 'Nochmal', c: 'bg-red-50 text-red-600 border-red-100' },
                               { l: 'medium', label: 'Mittel', c: 'bg-orange-50 text-orange-600 border-orange-100' },
                               { l: 'good', label: 'Gut', c: 'bg-blue-50 text-blue-600 border-blue-100' },
                               { l: 'mastered', label: 'Gelernt', c: 'bg-[#6B705C] text-white border-transparent' }
                           ].map(b => (
                               <button key={b.l} onClick={() => handleRating(b.l as any)} className={`py-4 rounded-xl text-[8px] font-bold uppercase tracking-widest border ${b.c}`}>
                                   {b.label}
                               </button>
                           ))}
                       </div>
                   ) : (
                       <button onClick={() => setShowAnswer(true)} className="w-full py-5 bg-[#2C2420] text-white rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl">Karte umdrehen</button>
                   )}
              </footer>
          </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="animate-fade-in pb-32">
        <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="text-3xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">Wortschatz</h2>
                <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic mt-1">{vocabList.length} Fundstücke gesammelt.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setMode('setup')} className="bg-[#B26B4A] text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition-transform"><Layers className="w-6 h-6" /></button>
            </div>
        </div>

        <div className="flex items-center justify-between mb-4 px-2">
            <button 
                onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedIds(new Set());
                }}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors ${isSelectionMode ? 'bg-[#2C2420] text-white' : 'bg-white text-[#6B705C] border border-[#EAE2D6]'}`}
            >
                {isSelectionMode ? 'Abbrechen' : 'Auswählen'}
            </button>
            {isSelectionMode && selectedIds.size > 0 && (
                <button onClick={handleDeleteBatch} className="text-red-500 flex items-center gap-1 font-bold text-[10px] uppercase tracking-widest">
                    <Trash2 className="w-3 h-3" /> {selectedIds.size} Löschen
                </button>
            )}
        </div>

        <div className="grid gap-3">
            {vocabList.map(item => (
                <div 
                    key={item.id} 
                    onClick={() => isSelectionMode ? handleToggleSelect(item.id) : handleOpenDetail(item)}
                    className={`bg-white dark:bg-[#1C1917] p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer ${isSelectionMode && selectedIds.has(item.id) ? 'border-[#B26B4A] bg-[#FEFAE0]/20' : 'border-[#EAE2D6] dark:border-[#2C2420] hover:border-[#B26B4A]/30'}`}
                >
                    {isSelectionMode && (
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedIds.has(item.id) ? 'bg-[#B26B4A] border-transparent' : 'border-[#EAE2D6]'}`}>
                            {selectedIds.has(item.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                    )}
                    <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">{item.word}</h4>
                            <span className={`text-[7px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                item.masteryLevel === 'mastered' ? 'bg-emerald-100 text-emerald-700' : 'bg-[#B26B4A]/10 text-[#B26B4A]'
                            }`}>
                                {item.masteryLevel || 'Neu'}
                            </span>
                        </div>
                        <p className="text-xs text-[#6B705C] dark:text-[#A5A58D] font-serif italic truncate max-w-[200px]">{item.translation}</p>
                    </div>
                    {!isSelectionMode && <ChevronRight className="w-4 h-4 text-[#EAE2D6]" />}
                </div>
            ))}
        </div>

        {/* Global sticky footer for setup access */}
        {!isSelectionMode && vocabList.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <button 
                    onClick={() => setMode('setup')}
                    className="bg-[#2C2420] text-white px-8 py-4 rounded-full shadow-2xl font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-3 active:scale-95 transition-all"
                >
                    <Play className="w-4 h-4 fill-current" />
                    Session Starten
                </button>
            </div>
        )}
    </div>
  );
};

export default VocabTrainer;