
import React, { useState } from 'react';
import { Key, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { setSessionApiKey } from '../services/storageService';

interface ApiKeyModalProps {
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose }) => {
  const [key, setKey] = useState('');

  const handleSave = () => {
    if (key.trim()) {
      setSessionApiKey(key.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#12100E]/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#FDFBF7] dark:bg-[#1C1917] rounded-[2.5rem] shadow-2xl border border-[#EAE2D6] dark:border-[#2C2420] p-8 relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-[#A5A58D] hover:text-[#2C2420] dark:hover:text-[#FDFBF7] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="w-14 h-14 bg-[#FEFAE0] dark:bg-[#2C2420] rounded-2xl flex items-center justify-center text-[#B26B4A] dark:text-[#D4A373] mb-4">
            <Key className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2">API Key benötigt</h2>
          <p className="text-[#6B705C] dark:text-[#A5A58D] text-sm font-serif italic">
            Um die KI-Funktionen nutzen zu können, geben Sie bitte Ihren Gemini API Key ein. Dieser wird nur für diese Sitzung gespeichert.
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A5A58D]" />
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Geben Sie Ihren Key ein..."
              className="w-full bg-white dark:bg-[#12100E] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#B26B4A]/20 transition-all text-sm font-mono"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-[#E9EDC9]/30 dark:bg-[#2C2420]/30 rounded-xl border border-[#CCD5AE]/30 dark:border-[#2C2420]/50">
            <ShieldCheck className="w-4 h-4 text-[#6B705C] dark:text-[#A5A58D]" />
            <p className="text-[10px] text-[#6B705C] dark:text-[#A5A58D] font-serif">
              Sicher: Der Key wird beim Schließen des Tabs gelöscht.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={!key.trim()}
            className="w-full bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] py-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30"
          >
            Sitzung starten
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <button 
            onClick={onClose}
            className="w-full text-[#A5A58D] text-[10px] font-bold uppercase tracking-widest mt-2 hover:text-[#6B705C] transition-colors"
          >
            Später eingeben
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
