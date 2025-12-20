
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import AnalysisView from './components/AnalysisView';
import VocabTrainer from './components/VocabTrainer';
import { AppView, PersistedAnalysis } from './types';
import { BookOpen, Camera, Bookmark, Sparkles, History, ArrowRight } from 'lucide-react';
import { getLastAnalysis, getVocab } from './services/storageService';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [lastScan, setLastScan] = useState<PersistedAnalysis | null>(null);
  const [vocabCount, setVocabCount] = useState(0);

  useEffect(() => {
    setLastScan(getLastAnalysis());
    setVocabCount(getVocab().length);
  }, [currentView]);

  const renderContent = () => {
    switch (currentView) {
      case AppView.ANALYZE:
        return <AnalysisView />;
      case AppView.VOCAB:
        return <VocabTrainer />;
      case AppView.HOME:
      default:
        return (
          <div className="flex flex-col gap-6 py-4 animate-fade-in">
            {/* Hero Section */}
            <div className="bg-[#2C2420] rounded-[2.5rem] p-8 text-[#FDFBF7] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#B26B4A]/20 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="text-[#FEFAE0] w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#FEFAE0]/80">Bienvenido</span>
                    </div>
                    <h2 className="text-4xl font-serif font-bold mb-4 tracking-tight">Hola amigo.</h2>
                    <p className="text-[#FDFBF7]/70 text-md font-serif italic leading-relaxed mb-6 max-w-sm">
                        Dein Fortschritt wird automatisch lokal gespeichert.
                    </p>
                    
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={() => setCurrentView(AppView.ANALYZE)}
                            className="bg-[#B26B4A] text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:bg-[#9E5A3B] transition-all inline-flex items-center gap-3 uppercase text-[10px] tracking-widest"
                        >
                            <Camera className="w-4 h-4" />
                            Seite scannen
                        </button>
                        
                        {lastScan && (
                            <button 
                                onClick={() => setCurrentView(AppView.ANALYZE)}
                                className="bg-white/10 text-white border border-white/20 font-bold py-3.5 px-6 rounded-xl shadow-lg hover:bg-white/20 transition-all inline-flex items-center gap-3 uppercase text-[10px] tracking-widest"
                            >
                                <History className="w-4 h-4" />
                                Letzte Seite fortsetzen
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Stats & Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                    onClick={() => setCurrentView(AppView.ANALYZE)}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#EAE2D6] cursor-pointer hover:border-[#B26B4A]/30 hover:shadow-md transition-all group"
                >
                    <div className="w-12 h-12 bg-[#FEFAE0] rounded-xl flex items-center justify-center text-[#B26B4A] mb-4 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-serif font-bold text-[#2C2420] mb-1">Lesereise</h3>
                            <p className="text-xs text-[#6B705C] font-serif italic">Analysiere Texte und lerne Schätze kennen.</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#EAE2D6] group-hover:text-[#B26B4A] transition-colors" />
                    </div>
                </div>

                <div 
                    onClick={() => setCurrentView(AppView.VOCAB)}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-[#EAE2D6] cursor-pointer hover:border-[#B26B4A]/30 hover:shadow-md transition-all group"
                >
                    <div className="w-12 h-12 bg-[#E9EDC9] rounded-xl flex items-center justify-center text-[#6B705C] mb-4 group-hover:scale-105 transition-transform">
                        <Bookmark className="w-6 h-6" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-serif font-bold text-[#2C2420] mb-1">Wortschatz</h3>
                            <p className="text-xs text-[#6B705C] font-serif italic">{vocabCount} Fundstücke in deiner Sammlung.</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#EAE2D6] group-hover:text-[#6B705C] transition-colors" />
                    </div>
                </div>
            </div>

            {/* Daily Thought / Status */}
            <div className="bg-[#FEFAE0]/40 rounded-[2rem] p-6 border border-[#FAEDCD]">
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-[#B26B4A] p-1 rounded-lg text-white">
                        <Sparkles className="w-3 h-3" />
                    </div>
                    <h3 className="font-serif font-bold text-[#2C2420] text-lg">
                        Lokal & Sicher
                    </h3>
                </div>
                <p className="text-[#6B705C] text-sm font-serif italic leading-relaxed">
                    Alle Analysen und Vokabeln werden ausschließlich in Ihrem Browser-Speicher (Local Storage) abgelegt. Es werden keine Daten auf externe Server übertragen, außer zur KI-Analyse an Google.
                </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
}
