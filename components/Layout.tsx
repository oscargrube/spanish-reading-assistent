
import React from 'react';
import { Book, Camera, Bookmark, Sparkles, Settings } from 'lucide-react';
import { AppView } from '../types';

interface LayoutProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, onChangeView, children }) => {
  const isAnalyzeMode = currentView === AppView.ANALYZE;

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7]">
      <header className={`bg-[#FDFBF7]/90 backdrop-blur-xl border-b border-[#EAE2D6] sticky top-0 z-50 transition-all duration-300 ${isAnalyzeMode ? 'lg:h-20' : 'h-20'}`}>
        <div className={`max-w-6xl mx-auto px-6 flex justify-between items-center transition-all duration-300 ${isAnalyzeMode ? 'h-16 lg:h-20' : 'h-20'}`}>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onChangeView(AppView.HOME)}>
            <div className="bg-[#2C2420] p-2 rounded-xl text-[#FDFBF7] shadow-md group-hover:bg-[#B26B4A] transition-colors duration-500">
                <Book className="w-4 h-4" />
            </div>
            <div className={`hidden sm:block transition-all duration-300 ${isAnalyzeMode ? 'lg:block' : ''}`}>
                <h1 className="text-lg font-serif font-bold text-[#2C2420] tracking-tight">Leseassistent</h1>
                <p className="text-[8px] font-bold text-[#6B705C] uppercase tracking-[0.2em] -mt-1 opacity-60">Tu compañero</p>
            </div>
          </div>
          
          <nav className={`flex items-center bg-[#2C2420]/5 p-1.5 rounded-2xl border border-[#2C2420]/5 transition-all duration-300 ${isAnalyzeMode ? 'hidden lg:flex' : 'flex'}`}>
            <button 
                onClick={() => onChangeView(AppView.HOME)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl transition-all duration-300 ${currentView === AppView.HOME ? 'bg-white text-[#2C2420] shadow-sm' : 'text-[#6B705C] hover:text-[#2C2420]'}`}
            >
                <Book className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Lesen</span>
            </button>
            <button 
                onClick={() => onChangeView(AppView.ANALYZE)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl transition-all duration-300 ${currentView === AppView.ANALYZE ? 'bg-white text-[#2C2420] shadow-sm' : 'text-[#6B705C] hover:text-[#2C2420]'}`}
            >
                <Camera className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Scan</span>
            </button>
            <button 
                onClick={() => onChangeView(AppView.VOCAB)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl transition-all duration-300 ${currentView === AppView.VOCAB ? 'bg-white text-[#2C2420] shadow-sm' : 'text-[#6B705C] hover:text-[#2C2420]'}`}
            >
                <Bookmark className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Lernen</span>
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button 
                onClick={() => onChangeView(AppView.SETTINGS)}
                className={`p-2.5 rounded-xl transition-colors shadow-sm ${currentView === AppView.SETTINGS ? 'bg-[#2C2420] text-white' : 'bg-white border border-[#EAE2D6] text-[#6B705C] hover:text-[#B26B4A]'}`}
                title="Einstellungen"
            >
                <Settings className="w-4 h-4" />
            </button>
            <div className={`hidden lg:flex items-center gap-2 bg-[#E9EDC9] p-1.5 px-3 rounded-full border border-[#6B705C]/10 transition-all duration-300 ${isAnalyzeMode ? 'hidden' : 'lg:flex'}`}>
                <Sparkles className="w-3 h-3 text-[#6B705C]" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B705C]">Cozy Modus</span>
            </div>
          </div>
        </div>
      </header>

      <main className={`flex-grow w-full mx-auto ${isAnalyzeMode ? 'max-w-6xl p-0 lg:p-6' : 'max-w-4xl p-6'}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
