import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Keyboard as KeyboardIcon, 
  Sparkles, 
  Eraser, 
  HelpCircle, 
  ArrowRight,
  CornerDownLeft,
  Delete,
  Space
} from 'lucide-react';
import { 
  transliterateToTelugu, 
  VOWELS_LIST, 
  CONSONANTS_LIST, 
  MATRAS_LIST, 
  DIGITS_LIST, 
  QUICK_PHRASES 
} from '../utils/teluguPhonetic';

interface TeluguKeyboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertText?: (text: string) => void;
}

type KeypadTab = 'vowels' | 'consonants' | 'matras' | 'digits' | 'phrases';

export const TeluguKeyboardModal: React.FC<TeluguKeyboardModalProps> = ({
  isOpen,
  onClose,
  onInsertText,
}) => {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<KeypadTab>('vowels');
  const [showGuide, setShowGuide] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-transliterate on input change
  const teluguOutput = transliterateToTelugu(inputText);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy = teluguOutput || inputText;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const handleInsert = () => {
    const textToInsert = teluguOutput || inputText;
    if (onInsertText && textToInsert) {
      onInsertText(textToInsert);
    }
    handleCopy();
  };

  const handleClear = () => {
    setInputText('');
    inputRef.current?.focus();
  };

  const handleKeyClick = (char: string) => {
    setInputText((prev) => prev + char);
    inputRef.current?.focus();
  };

  const handleBackspace = () => {
    setInputText((prev) => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleSpace = () => {
    setInputText((prev) => prev + ' ');
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-[#1c1c1e] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#161618]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <KeyboardIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 font-['Noto_Sans_Telugu']">
                  <span>తెలుగు ఫొనెటిక్ కీబోర్డ్</span>
                  <span className="text-xs font-normal text-zinc-400 font-sans">(Telugu Phonetic)</span>
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400">
                Type in English phonetics (e.g. <span className="text-emerald-400 font-mono">namaskaram</span>) or tap keys below
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className={`p-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                showGuide 
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300' 
                  : 'bg-[#2c2c2e] hover:bg-white/10 border-white/10 text-zinc-300'
              }`}
              title="Phonetic Typing Rules Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Keyboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
          
          {/* 1. Interactive Dual Typing & Translation Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* English Input Area */}
            <div className="bg-[#161618] border border-white/10 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/5 text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-300">English Phonetics</span>
                <span className="text-[10px] text-zinc-500 font-mono">type here...</span>
              </div>
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type 'namaste', 'sathish', 'bharat'..."
                rows={3}
                className="w-full bg-transparent text-sm text-white resize-none focus:outline-none placeholder:text-zinc-600 mt-2 font-mono"
              />
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                <span className="text-[10px] text-zinc-500">
                  {inputText.length} chars
                </span>
                {inputText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[11px] text-zinc-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Telugu Converted Output Area */}
            <div className="bg-[#131316] border border-emerald-500/30 rounded-2xl p-3 flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/5 text-[11px]">
                <span className="font-semibold text-emerald-400 flex items-center gap-1 font-['Noto_Sans_Telugu']">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>తెలుగు లిపి (Telugu Script)</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer active:scale-95"
                >
                  {copiedToast ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedToast ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <div className="py-2 min-h-[64px] font-['Noto_Sans_Telugu'] text-base sm:text-lg font-bold text-white break-words select-all">
                {teluguOutput || (
                  <span className="text-zinc-600 font-normal text-sm font-sans">
                    తెలుగు అక్షరాలు ఇక్కడ కనిపిస్తాయి...
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                <span className="text-[10px] text-zinc-400 font-mono">
                  Unicode 15.0
                </span>
                <button
                  type="button"
                  onClick={handleInsert}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-lg transition-all shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <span>Insert / Copy</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. Phonetic Guide Cheat Sheet (Collapsible) */}
          {showGuide && (
            <div className="bg-[#242426] border border-blue-500/30 rounded-2xl p-3.5 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                  <span>Phonetic Typing Shortcut Cheat Sheet</span>
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowGuide(false)}
                  className="text-zinc-400 hover:text-white text-[11px] cursor-pointer"
                >
                  Hide
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-zinc-300">
                <div className="bg-[#1c1c1e] p-2 rounded-xl">a → అ, aa/A → ఆ</div>
                <div className="bg-[#1c1c1e] p-2 rounded-xl">i → ఇ, ee/I → ఈ</div>
                <div className="bg-[#1c1c1e] p-2 rounded-xl">u → ఉ, oo/U → ఊ</div>
                <div className="bg-[#1c1c1e] p-2 rounded-xl">e → ఎ, E/ae → ఏ</div>
                <div className="bg-[#1c1c1e] p-2 rounded-xl">ka → క, kaa → కా</div>
                <div className="bg-[#1c1c1e] p-2 rounded-xl">ki → కి, kee → కీ</div>
                <div className="bg-[#1c1c1e] p-2 rounded-xl">ku → కు, koo → కూ</div>
                <div className="bg-[#1c1c1e] p-2 rounded-xl">namaste → నమస్తే</div>
              </div>
            </div>
          )}

          {/* 3. Quick Phrases Carousel */}
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
              Quick Words & Phrases (త్వరిత పదాలు)
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => handleKeyClick(phrase + ' ')}
                  className="px-2.5 py-1 rounded-xl bg-[#28282c] hover:bg-[#34343a] text-zinc-200 hover:text-white border border-white/10 text-xs font-['Noto_Sans_Telugu'] font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-xs"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Interactive Telugu On-Screen Virtual Keypad */}
          <div className="bg-[#161618] border border-white/10 rounded-2xl p-3 space-y-2.5">
            {/* Keypad Category Selector Tabs */}
            <div className="flex items-center justify-between gap-1 p-0.5 bg-[#242426] rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('vowels')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer font-['Noto_Sans_Telugu'] ${
                  activeTab === 'vowels' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                అచ్చులు (Vowels)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('consonants')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer font-['Noto_Sans_Telugu'] ${
                  activeTab === 'consonants' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                హల్లులు (Consonants)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('matras')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer font-['Noto_Sans_Telugu'] ${
                  activeTab === 'matras' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                గుణింతాలు & వత్తులు
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('digits')}
                className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer font-['Noto_Sans_Telugu'] ${
                  activeTab === 'digits' ? 'bg-emerald-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
              >
                అంకెలు (Digits)
              </button>
            </div>

            {/* Keys Grid */}
            <div className="min-h-[140px] flex items-center justify-center">
              {activeTab === 'vowels' && (
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 w-full">
                  {VOWELS_LIST.map((item) => (
                    <button
                      key={item.telugu}
                      type="button"
                      onClick={() => handleKeyClick(item.telugu)}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#242426] hover:bg-[#323236] border border-white/10 hover:border-emerald-500/40 text-white transition-all cursor-pointer active:scale-95 group shadow-xs"
                    >
                      <span className="text-base sm:text-lg font-bold font-['Noto_Sans_Telugu'] group-hover:text-emerald-400">
                        {item.telugu}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                        {item.phonetic}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'consonants' && (
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5 w-full max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {CONSONANTS_LIST.map((item) => (
                    <button
                      key={item.telugu}
                      type="button"
                      onClick={() => handleKeyClick(item.telugu)}
                      className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-[#242426] hover:bg-[#323236] border border-white/10 hover:border-emerald-500/40 text-white transition-all cursor-pointer active:scale-95 group shadow-xs"
                    >
                      <span className="text-base sm:text-lg font-bold font-['Noto_Sans_Telugu'] group-hover:text-emerald-400">
                        {item.telugu}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                        {item.phonetic}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'matras' && (
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 w-full">
                  {MATRAS_LIST.map((item) => (
                    <button
                      key={item.telugu}
                      type="button"
                      onClick={() => handleKeyClick(item.telugu)}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#242426] hover:bg-[#323236] border border-white/10 hover:border-emerald-500/40 text-white transition-all cursor-pointer active:scale-95 group shadow-xs"
                    >
                      <span className="text-lg sm:text-xl font-bold font-['Noto_Sans_Telugu'] text-emerald-400">
                        {item.telugu}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                        {item.phonetic}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'digits' && (
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 w-full">
                  {DIGITS_LIST.map((item) => (
                    <button
                      key={item.telugu}
                      type="button"
                      onClick={() => handleKeyClick(item.telugu)}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#242426] hover:bg-[#323236] border border-white/10 hover:border-emerald-500/40 text-white transition-all cursor-pointer active:scale-95 group shadow-xs"
                    >
                      <span className="text-lg font-bold font-['Noto_Sans_Telugu'] group-hover:text-emerald-400">
                        {item.telugu}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono mt-0.5">
                        {item.phonetic}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Keypad Utility Action Bar */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={handleSpace}
                className="flex-1 py-1.5 rounded-xl bg-[#28282c] hover:bg-[#343438] text-zinc-200 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Space className="w-3.5 h-3.5 text-zinc-400" />
                <span>స్పేస్ (Space)</span>
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                className="px-4 py-1.5 rounded-xl bg-[#28282c] hover:bg-rose-500/20 text-rose-300 border border-white/10 hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Backspace"
              >
                <Delete className="w-3.5 h-3.5" />
                <span>Backspace</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-white/10 bg-[#161618] flex items-center justify-between text-[11px] text-zinc-400">
          <span className="font-['Noto_Sans_Telugu']">
            తెలుగు ఫొనెటిక్ కీబోర్డ్ ద్వారా సులభంగా టైప్ చేయండి
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
