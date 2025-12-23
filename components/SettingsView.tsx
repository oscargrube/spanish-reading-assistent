
import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, ExternalLink, AlertCircle, CheckCircle2, Save, Trash2 } from 'lucide-react';
import { saveApiKey, getApiKey, removeApiKey } from '../services/storageService';

const SettingsView: React.FC = () => {
  const [inputKey, setInputKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const saved = getApiKey();
    if (saved) {
      setInputKey(saved);
      setIsSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (inputKey.trim()) {
      saveApiKey(inputKey.trim());
      setIsSaved(true);
      alert("API Key erfolgreich gespeichert!");
    }
  };

  const handleDelete = () => {
    if (window.confirm("Möchten Sie den gespeicherten API Key wirklich löschen?")) {
      removeApiKey();
      setInputKey('');
      setIsSaved(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fade-in">
      <div className="mb-10">
        <h2 className="text-3xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7] mb-2">Einstellungen</h2>
        <p className="text-[#6B705C] dark:text-[#A5A58D] font-serif italic">Verwalte deinen Zugang zur KI und deine lokalen Daten.</p>
      </div>

      <div className="space-y-6">
        {/* API Key Section */}
        <section className="bg-white dark:bg-[#1C1917] rounded-[2.5rem] border border-[#EAE2D6] dark:border-[#2C2420] p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-[#FEFAE0] dark:bg-[#2C2420] rounded-2xl flex items-center justify-center text-[#B26B4A] dark:text-[#D4A373]">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-serif font-bold text-[#2C2420] dark:text-[#FDFBF7]">Gemini API Key</h3>
              <p className="text-xs text-[#6B705C] dark:text-[#A5A58D] font-serif italic">Wird für Analyse und Audio benötigt.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={inputKey}
                onChange={(e) => {
                    setInputKey(e.target.value);
                    setIsSaved(false);
                }}
                placeholder="Dein API Key hier..."
                className="w-full bg-[#FDFBF7] dark:bg-[#12100E] border border-[#EAE2D6] dark:border-[#2C2420] rounded-2xl p-4 pr-12 text-sm focus:ring-2 focus:ring-[#B26B4A]/20 dark:focus:ring-[#D4A373]/20 focus:border-[#B26B4A] dark:focus:border-[#D4A373] outline-none transition-all font-mono text-[#2C2420] dark:text-[#FDFBF7]"
              />
              <button 
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A5A58D] dark:text-[#6B705C] hover:text-[#B26B4A] dark:hover:text-[#D4A373]"
              >
                <span className="text-[10px] font-bold uppercase">{showKey ? "Verbergen" : "Anzeigen"}</span>
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleSave}
                disabled={!inputKey.trim() || isSaved}
                className="flex-1 bg-[#2C2420] dark:bg-[#D4A373] text-white dark:text-[#12100E] font-bold py-4 rounded-2xl shadow-lg hover:bg-[#3D332D] dark:hover:bg-[#B26B4A] transition-all flex items-center justify-center gap-3 uppercase text-[10px] tracking-widest disabled:opacity-30"
              >
                <Save className="w-4 h-4" />
                Key speichern
              </button>
              
              {isSaved && (
                <button 
                  onClick={handleDelete}
                  className="bg-white dark:bg-[#1C1917] border border-[#EAE2D6] dark:border-[#2C2420] text-red-500 font-bold py-4 px-6 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex items-center justify-center gap-3"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-6">
            {isSaved ? (
                <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-2xl p-4 flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-green-800 dark:text-green-400">Key ist aktiv</p>
                        <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Die App ist bereit für die Analyse.</p>
                    </div>
                </div>
            ) : (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-red-800 dark:text-red-400">Aktion erforderlich</p>
                        <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">Bitte gib einen Key ein, um die App zu nutzen.</p>
                    </div>
                </div>
            )}
          </div>

          <p className="text-xs text-[#6B705C] dark:text-[#A5A58D] mt-6 leading-relaxed italic font-serif">
            Keinen Key? Du kannst dir kostenlos einen Key bei <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[#B26B4A] dark:text-[#D4A373] underline font-bold">Google AI Studio</a> erstellen.
          </p>
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
            Dein API Key wird ausschließlich in deinem Browser (Local Storage) gespeichert. Er wird niemals an andere Server als die offizielle Google Gemini API übertragen.
          </p>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;