

import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import AnalysisView from './components/AnalysisView';
import VocabTrainer from './components/VocabTrainer';
import SettingsView from './components/SettingsView';
import AuthView from './components/AuthView';
import BookLibrary from './components/BookLibrary';
import ApiKeyModal from './components/ApiKeyModal';
import { AppView, PersistedAnalysis, BookPage } from './types';
import { BookOpen, Camera, Bookmark, Sparkles, History, ArrowRight, Settings, Loader2, Library } from 'lucide-react';
import { getLastAnalysis, getVocab, getTheme, setTheme as saveTheme, getSessionApiKey } from './services/storageService';
import { auth } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [lastScan, setLastScan] = useState<PersistedAnalysis | null>(null);
  const [vocabCount, setVocabCount] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme());
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(localStorage.getItem('spanish_assistant_is_guest') === 'true');
  const [authLoading, setAuthLoading] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // State for Book Library Integration
  const [activeBookId, setActiveBookId] = useState<string | null>(null);
  const [pageToRead, setPageToRead] = useState<BookPage | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false);
        localStorage.removeItem('spanish_assistant_is_guest');
        checkApiKey();
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLastScan(getLastAnalysis());
    getVocab().then(vocab => setVocabCount(vocab.length));
  }, [currentView, user, isGuest]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveTheme(theme);
  }, [theme]);

  const checkApiKey = () => {
    const key = getSessionApiKey();
    if (!key) {
      setShowApiKeyModal(true);
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleGuestLogin = () => {
    setIsGuest(true);
    localStorage.setItem('spanish_assistant_is_guest', 'true');
    checkApiKey();
  };

  const handleLogoutGuest = () => {
    setIsGuest(false);
    localStorage.removeItem('spanish_assistant_is_guest');
  };

  // --- Navigation Handlers ---

  const handleOpenPage = (page: BookPage) => {
      setPageToRead(page);
      setActiveBookId(page.bookId); // Keep book context
      setCurrentView(AppView.ANALYZE);
  };

  const handleAddPageToBook = (bookId: string) => {
      setActiveBookId(bookId);
      setPageToRead(null); // Clear any read data to start fresh scan
      setCurrentView(AppView.ANALYZE);
  };

  const handleAnalysisClose = () => {
      if (activeBookId) {
          // If we were adding to a book or reading a book, go back to library
          setCurrentView(AppView.LIBRARY);
      } else {
          setCurrentView(AppView.HOME);
      }
      setPageToRead(null);
  };

  const handleViewChange = (view: AppView) => {
      // Clear context when manually navigating via menu
      if (view !== AppView.ANALYZE) {
          setActiveBookId(null);
          setPageToRead(null);
      }
      setCurrentView(view);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] dark:bg-[#12100E]">
        <Loader2 className="w-12 h-12 animate-spin text-[#B26B4A] dark:text-[#D4A373] mb-4" />
        <p className="font-serif italic text-[#6B705C] dark:text-[#A5A58D]">Wird geladen...</p>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <AuthView onGuestLogin={handleGuestLogin} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case AppView.ANALYZE:
        return (
            <AnalysisView 
                onChangeView={handleViewChange} 
                initialData={pageToRead} // Pass full BookPage object
                targetBookId={activeBookId} // If set, save result to this book
                onSaveComplete={handleAnalysisClose}
            />
        );
      case AppView.VOCAB:
        return <VocabTrainer />;
      case AppView.LIBRARY:
        return (
            <BookLibrary 
                onChangeView={handleViewChange} 
                onOpenPage={handleOpenPage}
                onAddPage={handleAddPageToBook}
            />
        );
      case AppView.SETTINGS:
        return <SettingsView />;
      case AppView.HOME:
      default:
        return (
          <div className="flex flex-col gap-6 py-4 animate-fade-in">
            {/* Hero Section */}
            <div className="bg-[#2C2420] dark:bg-[#1C1917] rounded-[2.5rem] p-8 text-[#FDFBF7] shadow-xl relative overflow-hidden border border-transparent dark:border-[#2C2420]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#B26B4A]/20 dark:bg-[#D4A373]/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="text-[#FEFAE0] dark:text-[#D4A373] w-5 h-5" />
                        <span className="text-[9px] font-bold uppercase tracking-widest text-[#FEFAE0]/80 dark:text-[#D4A373]/80">
                          {isGuest ? 'Bienvenido, Invitado' : `Bienvenido, ${user?.displayName || 'Amigo'}`}
                        </span>
                    </div>
                    <h2 className="text-4xl font-serif font-bold mb-4 tracking-tight">Hola amigo.</h2>
                    <p className="text-[#FDFBF7]/70 text-md font-serif italic leading-relaxed mb-6 max-w-sm">
                        {isGuest 
                          ? 'Deine Bücher werden lokal gespeichert. Melde dich an, um sie überall zu nutzen.' 
                          : 'Organisiere deine Lektüre in der neuen Bibliothek.'}
                    </p>
                    
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={() => {
                                setActiveBookId(null);
                                setPageToRead(null);
                                setCurrentView(AppView.ANALYZE);
                            }}
                            className="bg-[#B26B4A] dark:bg-[#D4A373] text-white dark:text-[#12100E] font-bold py-3.5 px-6 rounded-xl shadow-lg hover:bg-[#9E5A3B] transition-all inline-flex items-center gap-3 uppercase text-[10px] tracking-widest"
                        >
                            <Camera className="w-4 h-4" />
                            Schnellscan
                        </button>
                        
                        <button 
                            onClick={() => setCurrentView(AppView.LIBRARY)}
                            className="bg-white/10 text-white border border-white/20 font-bold py-3.5 px-6 rounded-xl shadow-lg hover:bg-white/20 transition-all inline-flex items-center gap-3 uppercase text-[10px] tracking-widest"
                        >
                            <Library className="w-4 h-4" />
                            Bibliothek öffnen
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats & Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                    onClick={() => setCurrentView(AppView.LIBRARY)}
                    className="bg-white dark:bg-[#1C1917] p-6 rounded-[2rem] shadow-sm border border-[#EAE2D6] dark:border-[#2C2420] cursor-pointer hover:border-[#B26B4A]/30 dark:hover:border-[#D4A373]/30 hover:shadow-md transition-all group"
                >
                    <div className="w-12 h-12 bg-[#FEFAE0] dark:bg-[#2C2420] rounded-xl flex items-center justify-center text-[#B26B4A] dark:text-[#D4A373] mb-4 group-hover:scale-105 transition-transform">
                        <Library className="w-6 h-6" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-1">Bibliothek</h3>
                            <p className="text-xs text-[#6B705C] dark:text-[#A5A58D] font-serif italic">Erstelle Bücher und speichere Seiten dauerhaft.</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#EAE2D6] dark:text-[#2C2420] group-hover:text-[#B26B4A] dark:group-hover:text-[#D4A373] transition-colors" />
                    </div>
                </div>

                <div 
                    onClick={() => setCurrentView(AppView.VOCAB)}
                    className="bg-white dark:bg-[#1C1917] p-6 rounded-[2rem] shadow-sm border border-[#EAE2D6] dark:border-[#2C2420] cursor-pointer hover:border-[#B26B4A]/30 dark:hover:border-[#D4A373]/30 hover:shadow-md transition-all group"
                >
                    <div className="w-12 h-12 bg-[#E9EDC9] dark:bg-[#2C2420] rounded-xl flex items-center justify-center text-[#6B705C] dark:text-[#A5A58D] mb-4 group-hover:scale-105 transition-transform">
                        <Bookmark className="w-6 h-6" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-1">Wortschatz</h3>
                            <p className="text-xs text-[#6B705C] dark:text-[#A5A58D] font-serif italic">{vocabCount} Fundstücke in deiner Sammlung.</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#EAE2D6] dark:text-[#2C2420] group-hover:text-[#6B705C] dark:group-hover:text-[#D4A373] transition-colors" />
                    </div>
                </div>
            </div>

            {/* Quick Access to Settings */}
            <div 
                onClick={() => setCurrentView(AppView.SETTINGS)}
                className="bg-white dark:bg-[#1C1917] p-6 rounded-[2rem] border border-[#EAE2D6] dark:border-[#2C2420] cursor-pointer flex items-center justify-between hover:bg-[#FDFBF7] dark:hover:bg-[#12100E] transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="bg-[#2C2420]/5 dark:bg-white/5 p-3 rounded-xl">
                        <Settings className="w-5 h-5 text-[#6B705C] dark:text-[#A5A58D]" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-[#2C2420] dark:text-[#FDFBF7]">Einstellungen</p>
                        <p className="text-xs text-[#6B705C] dark:text-[#A5A58D] italic">Verwalte deinen Zugang und lerne mehr.</p>
                    </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[#EAE2D6] dark:text-[#2C2420]" />
            </div>
          </div>
        );
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      onChangeView={handleViewChange} 
      theme={theme} 
      onToggleTheme={toggleTheme}
      isGuest={isGuest}
      onLogoutGuest={handleLogoutGuest}
    >
      {renderContent()}
      {showApiKeyModal && <ApiKeyModal onClose={() => setShowApiKeyModal(false)} />}
    </Layout>
  );
}
