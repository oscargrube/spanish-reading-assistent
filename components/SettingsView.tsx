
import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, Save, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSessionApiKey, setSessionApiKey, clearSessionApiKey } from '../services/storageService';

const SettingsView: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const key = getSessionApiKey();
    if (key) {
      setHasKey(true);
      setApiKey(key);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      setSessionApiKey(apiKey.trim());
      setHasKey(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleClear = () => {
    clearSessionApiKey();
    setApiKey('');
    setHasKey(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <div className="mb-10">
        <h2 className="text-3xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2">Einstellungen</h2>
        <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic">Verwalte deinen Zugang zur KI und deine lokalen Daten.</p>
      </div>

      <div className="space-y-6">
        {/* API Section */}
        <section className="bg-white dark:bg-[#1C1917] rounded-[2.5rem] border border-[#EAE2D6] dark:border-[#2C2420] p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-[#FEFAE0] dark:bg-[#2C2420] rounded-xl flex items-center justify-center text-[#B26B4A] dark:text-[#D4A373] shadow-sm">
              <Key className="w-6 h-6" />
            </div>
            <div>
                <h3 className="font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] text-xl">API Konfiguration</h3>
                <p className="text-xs text-[#6B705C] dark:text-[#A5A58D] font-serif italic">Dein persönlicher Schlüssel für Google Gemini.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Geben Sie Ihren API Key ein..."
                  className="w-full bg-[#FDFBF7] dark:bg-[#12100E] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl py-4 pl-4 pr-12 outline-none focus:ring-2 focus:ring-[#B26B4A]/20 transition-all text-sm font-mono"
                />
                <Key className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A5A58D] opacity-40" />
            </div>

            <div className="flex flex-wrap gap-3">
                <button
                    onClick={handleSave}
                    disabled={!apiKey.trim()}
                    className="flex-1 bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] py-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                >
                    {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {saved ? 'Gespeichert' : 'Key Speichern'}
                </button>
                {hasKey && (
                    <button
                        onClick={handleClear}
                        className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30 px-6 py-4 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Löschen
                    </button>
                )}
            </div>

            <div className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${hasKey ? 'bg-[#E9EDC9]/30 border-[#CCD5AE]/30' : 'bg-[#FEFAE0]/50 border-[#FAEDCD]'}`}>
                {hasKey ? (
                    <CheckCircle2 className="w-5 h-5 text-[#6B705C] shrink-0 mt-0.5" />
                ) : (
                    <AlertCircle className="w-5 h-5 text-[#B26B4A] shrink-0 mt-0.5" />
                )}
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-[#2C2420] dark:text-[#FDFBF7] mb-1">
                        Status: {hasKey ? 'Persönlicher Key aktiv' : 'Kein Key konfiguriert'}
                    </p>
                    <p className="text-xs text-[#6B705C] dark:text-[#A5A58D] font-serif italic">
                        {hasKey 
                            ? 'Dieser Key wird ausschließlich in deiner aktuellen Browser-Session verwendet und nicht permanent gespeichert.' 
                            : 'Bitte hinterlege einen Key, um die Übersetzungs- und Audio-Funktionen nutzen zu können.'}
                    </p>
                </div>
            </div>
          </div>
        </section>

        {/* Info Section */}
        <section className="bg-[#FEFAE0]/30 dark:bg-[#1C1917]/50 rounded-[2.5rem] border border-[#FAEDCD] dark:border-[#2C2420] p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-white dark:bg-[#2C2420] rounded-xl flex items-center justify-center text-[#6B705C] dark:text-[#A5A58D] shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">Sicherheit & Lokalität</h3>
          </div>
          <p className="text-sm text-[#6B705C] dark:text-[#A5A58D] font-serif italic leading-relaxed">
            Dein Lernfortschritt wird bei Gästen ausschließlich in deinem Browser (Local Storage) gespeichert. 
            API Keys werden aus Sicherheitsgründen nur im <strong>Session Storage</strong> gehalten – sie verschwinden, sobald du den Tab schließt.
          </p>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
