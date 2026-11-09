import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { transliterateWord } from '../utils/teluguPhonetic';
import { idbGetItemSync, idbSetItem, onIDBHydrated } from '../utils/indexedDBStorage';

interface TeluguIMEContextType {
  isTeluguEnabled: boolean;
  toggleTelugu: () => void;
  setTeluguEnabled: (enabled: boolean) => void;
  activePhoneticPreview: { english: string; telugu: string } | null;
}

const STORAGE_KEY_TELUGU_IME = 'dyn_telugu_ime_enabled_v2';

const TeluguIMEContext = createContext<TeluguIMEContextType>({
  isTeluguEnabled: false,
  toggleTelugu: () => {},
  setTeluguEnabled: () => {},
  activePhoneticPreview: null,
});

export const useTeluguIME = () => useContext(TeluguIMEContext);

export const TeluguIMEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTeluguEnabled, setIsTeluguEnabled] = useState<boolean>(() => {
    try {
      const saved = idbGetItemSync<string | boolean>(STORAGE_KEY_TELUGU_IME);
      return String(saved) === 'true';
    } catch {
      return false;
    }
  });

  // Re-sync if IndexedDB hydrates after initial render
  useEffect(() => {
    return onIDBHydrated((cache) => {
      const saved = cache.get(STORAGE_KEY_TELUGU_IME);
      if (saved !== undefined) {
        setIsTeluguEnabled(String(saved) === 'true');
      }
    });
  }, []);

  const [activePhoneticPreview, setActivePhoneticPreview] = useState<{ english: string; telugu: string } | null>(null);

  const setTeluguEnabled = useCallback((enabled: boolean) => {
    setIsTeluguEnabled(enabled);
    try {
      idbSetItem(STORAGE_KEY_TELUGU_IME, String(enabled));
    } catch {
      // ignore
    }
  }, []);

  const toggleTelugu = useCallback(() => {
    setIsTeluguEnabled((prev) => {
      const next = !prev;
      try {
        idbSetItem(STORAGE_KEY_TELUGU_IME, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Global Keyboard Listener for direct in-place phonetic transliteration
  useEffect(() => {
    // 1. Hotkey toggle: Ctrl+G or Alt+T
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key.toLowerCase() === 'g') || (e.altKey && e.key.toLowerCase() === 't')) {
        e.preventDefault();
        toggleTelugu();
        return;
      }

      if (!isTeluguEnabled) return;

      // Check if typing inside a text input or textarea
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      // Skip non-text inputs (checkbox, radio, button, file, color, number, etc.)
      if (target.tagName === 'INPUT') {
        const type = (target.type || 'text').toLowerCase();
        if (['checkbox', 'radio', 'button', 'submit', 'file', 'color', 'range', 'date'].includes(type)) {
          return;
        }
      }

      // Word boundary trigger: Space or Enter or punctuation
      if (e.key === ' ' || e.key === 'Enter' || e.key === ',' || e.key === '.') {
        const selStart = target.selectionStart ?? target.value.length;
        const textBefore = target.value.slice(0, selStart);

        // Find the trailing English word directly before the cursor
        const match = textBefore.match(/([a-zA-Z]+)$/);
        if (match) {
          const englishWord = match[1];
          const teluguWord = transliterateWord(englishWord);

          if (teluguWord && teluguWord !== englishWord) {
            e.preventDefault();

            const replaceStart = selStart - englishWord.length;
            const replaceEnd = selStart;
            const charToAppend = e.key === 'Enter' ? '\n' : e.key;
            const newText = target.value.slice(0, replaceStart) + teluguWord + charToAppend + target.value.slice(replaceEnd);
            const newCursorPos = replaceStart + teluguWord.length + charToAppend.length;

            // Use prototype setter to trigger React's synthetic input/change events
            const prototype = target.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const nativeSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
            if (nativeSetter) {
              nativeSetter.call(target, newText);
            } else {
              target.value = newText;
            }

            target.setSelectionRange(newCursorPos, newCursorPos);
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));

            setActivePhoneticPreview(null);
          }
        }
      }
    };

    // 2. Track current phonetic token to show live transliteration preview
    const handleInput = (e: Event) => {
      if (!isTeluguEnabled) {
        if (activePhoneticPreview) setActivePhoneticPreview(null);
        return;
      }

      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      if (!target || !(target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setActivePhoneticPreview(null);
        return;
      }

      const selStart = target.selectionStart ?? target.value.length;
      const textBefore = target.value.slice(0, selStart);
      const match = textBefore.match(/([a-zA-Z]+)$/);

      if (match) {
        const english = match[1];
        const telugu = transliterateWord(english);
        setActivePhoneticPreview({ english, telugu });
      } else {
        setActivePhoneticPreview(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('input', handleInput, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('input', handleInput, true);
    };
  }, [isTeluguEnabled, toggleTelugu, activePhoneticPreview]);

  return (
    <TeluguIMEContext.Provider
      value={{
        isTeluguEnabled,
        toggleTelugu,
        setTeluguEnabled,
        activePhoneticPreview,
      }}
    >
      {children}

      {/* Floating Telugu IME Active Indicator / Live Transliteration Preview Pill */}
      {isTeluguEnabled && (
        <div 
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-[#1c1c1e]/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-2xl text-xs text-white animate-in fade-in slide-in-from-bottom-2 select-none"
          title="Telugu Phonetic Keyboard Active (Press Ctrl+G to toggle)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-emerald-400 font-['Noto_Sans_Telugu']">తెలుగు ON</span>
          
          {activePhoneticPreview ? (
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-white/10 font-mono text-[11px]">
              <span className="text-zinc-400">{activePhoneticPreview.english}</span>
              <span className="text-zinc-500">→</span>
              <span className="text-white font-bold font-['Noto_Sans_Telugu']">{activePhoneticPreview.telugu}</span>
              <span className="text-[10px] text-emerald-400 font-sans">[Space]</span>
            </div>
          ) : (
            <span className="text-[10px] text-zinc-400 hidden sm:inline">
              (type in English + Space)
            </span>
          )}

          <button
            type="button"
            onClick={toggleTelugu}
            className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-zinc-300 ml-1 cursor-pointer"
            title="Turn Off Telugu (or press Ctrl+G)"
          >
            Turn Off
          </button>
        </div>
      )}
    </TeluguIMEContext.Provider>
  );
};
