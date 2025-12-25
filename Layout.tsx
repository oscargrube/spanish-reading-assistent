
import React from 'react';
import { Book, Camera, Bookmark, Sparkles, Settings, Moon, Sun, LogOut, User, Library } from 'lucide-react';
import { AppView } from '../types';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  children: React.ReactNode;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  isGuest?: boolean;
  onLogoutGuest?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  currentView, 
  onChangeView, 
  children, 
  theme, 
  onToggleTheme, 
  isGuest,
  onLogoutGuest 
}) => {
  const handleLogout = async () => {
    if (window.confirm("Möchten Sie sich wirklich abmelden?")) {
      if (isGuest) {
        onLogoutGuest?.();
      } else {
        try {
          await signOut(auth);
        } catch (err) {
          console.error("Logout failed:", err);
        }
      }
    }
  };

  const userName = isGuest ? "Gast" : (auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]);

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] dark:bg-[#12100E]">
      <header className="bg-[#FDFBF7]/90 dark:bg-[#12100E]/90 backdrop-blur-xl border-b border-[#EAE2D6] dark:border-[#2C2420] sticky top-0 z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onChangeView(AppView.HOME)}>
            <div className="bg-[#2C2420] dark:bg-[#D4A373] p-2 rounded-xl text-[#FDFBF7] dark:text-[#12100E] shadow-md group-hover:bg-[#B26B4A] dark:group-hover:bg-[#B26B4A] transition-colors duration-500">
                <Book className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
                <h1 className="text-lg font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] tracking-tight">Leseassistent</h1>
                <p className="text-[8px] font-bold text-[#6B705C] dark:text-[#A5A58D] uppercase tracking-[0.2em] -mt-1 opacity-60">Tu compañero</p>
            </div>
          </div>
          
          <nav className="flex items-center bg-[#2C2420]/5 dark:bg-white/5 p-1.5 rounded-2xl border border-[#2C2420]/5 dark:border-white/5 mx-2 overflow-x-auto scrollbar-hide">
            <button 
                onClick={() => onChangeView(AppView.HOME)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl transition-all duration-300 ${currentView === AppView.HOME ? 'bg-white dark:bg-[#2C2420] text-[#2C2420] dark:text-[#FDFBF7] shadow-sm' : 'text-[#6B705C] dark:text-[#A5A58D] hover:text-[#2C2420] dark:hover:text-[#FDFBF7]'}`}
            >
                <Book className="w-4 h-4" />
                <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Start</span>
            </button>
            <button 
                onClick={() => onChangeView(AppView.LIBRARY)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl transition-all duration-300 ${currentView === AppView.LIBRARY ? 'bg-white dark:bg-[#2C2420] text-[#2C2420] dark:text-[#FDFBF7] shadow-sm' : 'text-[#6B705C] dark:text-[#A5A58D] hover:text-[#2C2420] dark:hover:text-[#FDFBF7]'}`}
            >
                <Library className="w-4 h-4" />
                <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Bibliothek</span>
            </button>
            <button 
                onClick={() => onChangeView(AppView.ANALYZE)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl transition-all duration-300 ${currentView === AppView.ANALYZE ? 'bg-white dark:bg-[#2C2420] text-[#2C2420] dark:text-[#FDFBF7] shadow-sm' : 'text-[#6B705C] dark:text-[#A5A58D] hover:text-[#2C2420] dark:hover:text-[#FDFBF7]'}`}
            >
                <Camera className="w-4 h-4" />
                <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Scan</span>
            </button>
            <button 
                onClick={() => onChangeView(AppView.VOCAB)}
                className={`flex items-center gap-2 py-2 px-4 rounded-xl transition-all duration-300 ${currentView === AppView.VOCAB ? 'bg-white dark:bg-[#2C2420] text-[#2C2420] dark:text-[#FDFBF7] shadow-sm' : 'text-[#6B705C] dark:text-[#A5A58D] hover:text-[#2C2420] dark:hover:text-[#FDFBF7]'}`}
            >
                <Bookmark className="w-4 h-4" />
                <span className="hidden md:inline text-[10px] font-bold uppercase tracking-wider">Lernen</span>
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#FDFBF7] dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] rounded-xl mr-2">
              <User className="w-3.5 h-3.5 text-[#B26B4A] dark:text-[#D4A373]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B705C] dark:text-[#A5A58D]">
                {userName}
              </span>
            </div>

            <button 
                onClick={onToggleTheme}
                className="p-2.5 rounded-xl bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] text-[#6B705C] dark:text-[#A5A58D] hover:text-[#B26B4A] dark:hover:text-[#D4A373] transition-all"
                title="Design ändern"
            >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
                onClick={() => onChangeView(AppView.SETTINGS)}
                className={`p-2.5 rounded-xl transition-colors shadow-sm ${currentView === AppView.SETTINGS ? 'bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E]' : 'bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] text-[#6B705C] dark:text-[#A5A58D] hover:text-[#B26B4A] dark:hover:text-[#D4A373]'}`}
                title="Einstellungen"
            >
                <Settings className="w-4 h-4" />
            </button>
            <button 
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] text-[#6B705C] dark:text-[#A5A58D] hover:text-red-500 transition-all"
                title="Abmelden"
            >
                <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className={`flex-grow p-6 w-full mx-auto ${currentView === AppView.ANALYZE ? 'max-w-6xl' : 'max-w-4xl'} transition-colors`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
