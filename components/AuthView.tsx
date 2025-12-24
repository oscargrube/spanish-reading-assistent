
import React, { useState } from 'react';
import { auth } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Mail, Lock, User, LogIn, UserPlus, Loader2, Sparkles, BookOpen, UserCircle } from 'lucide-react';

interface AuthViewProps {
  onGuestLogin?: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onGuestLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Authentifizierung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#FDFBF7] dark:bg-[#12100E]">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2C2420] dark:bg-[#D4A373] rounded-2xl text-[#FDFBF7] dark:text-[#12100E] shadow-xl mb-6">
            <BookOpen className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2 tracking-tight">
            Spanish Reading Assistant
          </h1>
          <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic">
            Melde dich an, um deine Lesereise zu beginnen.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1C1917] p-8 rounded-[2.5rem] border border-[#EAE2D6] dark:border-[#2C2420] shadow-2xl">
          <div className="flex bg-[#FDFBF7] dark:bg-[#12100E] p-1 rounded-2xl border border-[#EAE2D6] dark:border-[#2C2420] mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                isLogin ? 'bg-white dark:bg-[#2C2420] text-[#2C2420] dark:text-[#FDFBF7] shadow-sm' : 'text-[#6B705C] dark:text-[#A5A58D]'
              }`}
            >
              Anmelden
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                !isLogin ? 'bg-white dark:bg-[#2C2420] text-[#2C2420] dark:text-[#FDFBF7] shadow-sm' : 'text-[#6B705C] dark:text-[#A5A58D]'
              }`}
            >
              Registrieren
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[#6B705C] dark:text-[#A5A58D] ml-1">Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A5A58D]" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#FDFBF7] dark:bg-[#12100E] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#B26B4A]/20 transition-all text-sm"
                    placeholder="Dein Name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6B705C] dark:text-[#A5A58D] ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A5A58D]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#FDFBF7] dark:bg-[#12100E] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#B26B4A]/20 transition-all text-sm"
                  placeholder="name@beispiel.de"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#6B705C] dark:text-[#A5A58D] ml-1">Passwort</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A5A58D]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#FDFBF7] dark:bg-[#12100E] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#B26B4A]/20 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-serif italic">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] py-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Anmelden
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Konto erstellen
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#EAE2D6] dark:border-[#2C2420]"></div></div>
            <div className="relative flex justify-center text-[8px] font-bold uppercase tracking-[0.3em]"><span className="bg-white dark:bg-[#1C1917] px-4 text-[#A5A58D]">Oder</span></div>
          </div>

          <button
            onClick={onGuestLogin}
            disabled={loading}
            className="w-full bg-white dark:bg-transparent border border-[#EAE2D6] dark:border-[#2C2420] text-[#2C2420] dark:text-[#FDFBF7] py-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-[#FDFBF7] dark:hover:bg-[#2C2420]/30"
          >
            <UserCircle className="w-4 h-4" />
            Als Gast fortfahren
          </button>

          <div className="mt-8 pt-8 border-t border-[#EAE2D6] dark:border-[#2C2420] flex items-center justify-center gap-2 text-[#6B705C] dark:text-[#A5A58D]">
            <Sparkles className="w-4 h-4 opacity-50" />
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">App by Spanish Learners</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
