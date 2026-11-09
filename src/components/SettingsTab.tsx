import React, { useState } from 'react';
import { ThemeId, APP_THEMES } from '../types/theme';
import { PinSecurityConfig } from '../types/security';
import { Language } from '../utils/translations';
import { useTeluguIME } from '../context/TeluguIMEContext';
import { transliterateToTelugu } from '../utils/teluguPhonetic';
import {
  Palette,
  Lock,
  Unlock,
  KeyRound,
  Keyboard,
  Check,
  ShieldCheck,
  ShieldAlert,
  Moon,
  Sun,
  Copy,
  CheckCheck,
  Sparkles,
  Eye,
  EyeOff,
  Globe,
  Sliders,
  Maximize2,
  Info
} from 'lucide-react';

interface SettingsTabProps {
  currentTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  securityConfig: PinSecurityConfig;
  onSaveSecurityConfig: (newConfig: PinSecurityConfig) => void;
  onLockNow: () => void;
  onOpenTeluguKeypadModal: () => void;
  lang: Language;
  onLangToggle: () => void;
  isFitToScreen?: boolean;
  onToggleFitScreen?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentTheme,
  onSelectTheme,
  securityConfig,
  onSaveSecurityConfig,
  onLockNow,
  onOpenTeluguKeypadModal,
  lang,
  onLangToggle,
  isFitToScreen,
  onToggleFitScreen,
}) => {
  const { isTeluguEnabled, toggleTelugu } = useTeluguIME();

  // Settings sub-navigation / sections
  const [activeSection, setActiveSection] = useState<'all' | 'theme' | 'pin' | 'telugu'>('all');

  // Security local states
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [hintInput, setHintInput] = useState(securityConfig.hint || '');
  const [showPinText, setShowPinText] = useState(false);
  const [pinMessage, setPinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Telugu test scratchpad state
  const [teluguScratchpad, setTeluguScratchpad] = useState('namaste');
  const [copiedTelugu, setCopiedTelugu] = useState(false);

  // Handle PIN Update
  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);

    if (pinInput.length < 4) {
      setPinMessage({
        type: 'error',
        text: lang === 'te' ? 'పిన్ కనీసం 4 అంకెలు ఉండాలి' : 'PIN must be at least 4 digits.',
      });
      return;
    }
    if (pinInput !== confirmPinInput) {
      setPinMessage({
        type: 'error',
        text: lang === 'te' ? 'పిన్‌లు సరిపోలడం లేదు' : 'PIN confirmation does not match.',
      });
      return;
    }

    onSaveSecurityConfig({
      ...securityConfig,
      pin: pinInput,
      hint: hintInput.trim(),
      isEnabled: true,
    });

    setPinMessage({
      type: 'success',
      text: lang === 'te' ? 'పిన్ విజయవంతంగా సేవ్ చేయబడింది!' : 'PIN successfully updated and enabled!',
    });
    setPinInput('');
    setConfirmPinInput('');
  };

  const handleTogglePinProtection = () => {
    setPinMessage(null);
    const newEnabled = !securityConfig.isEnabled;
    onSaveSecurityConfig({
      ...securityConfig,
      isEnabled: newEnabled,
    });
    setPinMessage({
      type: 'success',
      text: newEnabled
        ? (lang === 'te' ? 'పిన్ లాక్ యాక్టివేట్ చేయబడింది' : 'PIN Lock protection enabled.')
        : (lang === 'te' ? 'పిన్ లాక్ నిలిపివేయబడింది' : 'PIN Lock protection disabled.'),
    });
  };

  const handleCopyTelugu = () => {
    const text = transliterateToTelugu(teluguScratchpad);
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedTelugu(true);
    setTimeout(() => setCopiedTelugu(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. Header Hero Card */}
      <div className="bg-[#1c1c1e] p-4 sm:p-6 rounded-3xl border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0 border border-white/20">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {lang === 'te' ? 'సిస్టమ్ సెట్టింగ్‌లు' : 'Control Center & Settings'}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                LogiXGridOS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
              {lang === 'te'
                ? 'థీమ్స్, పిన్ లాక్ సెక్యూరిటీ, తెలుగు కీబోర్డ్ & యాప్ ప్రాధాన్యతలు'
                : 'Manage Themes, PIN Lock Protection, Telugu Keypad & System Preferences'}
            </p>
          </div>
        </div>

        {/* Section Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#141416] border border-white/10 rounded-2xl shrink-0 self-start sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'all'
                ? 'bg-[#0a84ff] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {lang === 'te' ? 'అన్నీ' : 'All Settings'}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('theme')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'theme'
                ? 'bg-[#0a84ff] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>{lang === 'te' ? 'థీమ్' : 'Theme'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('pin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'pin'
                ? 'bg-[#0a84ff] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'te' ? 'పిన్ లాక్' : 'PIN Lock'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('telugu')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'telugu'
                ? 'bg-[#0a84ff] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'te' ? 'తెలుగు' : 'Telugu Keypad'}</span>
          </button>
        </div>
      </div>

      {/* 2. THEME SETTING SECTION */}
      {(activeSection === 'all' || activeSection === 'theme') && (
        <section className="bg-[#1c1c1e] p-4 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{lang === 'te' ? 'అప్పియరెన్స్ & థీమ్ సెట్టింగ్స్' : 'Appearance & Theme Presets'}</span>
                  <span className="text-xs font-mono font-medium text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                    {APP_THEMES.length} Presets
                  </span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {lang === 'te'
                    ? '5 డార్క్ థీమ్‌లు (Midnight OLED, Amber Sunset, Royal Amethyst, Emerald Ledger, Navy Slate) & ఎగ్జిక్యూటివ్ లైట్ థీమ్'
                    : '5 Curated Dark Themes (Midnight OLED, Amber Sunset, Royal Amethyst, Emerald Ledger, Navy Slate) & Executive Light'}
                </p>
              </div>
            </div>

            {/* Quick Dark / Light switch */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectTheme('midnight')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  currentTheme !== 'light'
                    ? 'bg-zinc-800 text-white border-white/20 ring-1 ring-blue-500/30'
                    : 'bg-[#141416] text-zinc-400 hover:text-white border-white/10'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span>Dark Mode</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  currentTheme === 'light'
                    ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/40'
                    : 'bg-[#141416] text-zinc-400 hover:text-white border-white/10'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Mode</span>
              </button>
            </div>
          </div>

          {/* Theme Presets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {APP_THEMES.map((th) => {
              const isSelected = currentTheme === th.id;
              return (
                <div
                  key={th.id}
                  onClick={() => onSelectTheme(th.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative group ${
                    isSelected
                      ? 'border-[#0a84ff] bg-[#242426] ring-2 ring-[#0a84ff]/30 shadow-lg'
                      : 'border-white/10 bg-[#161618] hover:border-white/20 hover:bg-[#202024]'
                  }`}
                >
                  {/* Swatch Bar */}
                  <div className="h-8 rounded-xl overflow-hidden flex border border-white/15 mb-3 shadow-inner">
                    <div className="flex-1" style={{ backgroundColor: th.preview.bg }} title="Background" />
                    <div className="flex-1" style={{ backgroundColor: th.preview.surface }} title="Surface" />
                    <div className="flex-1" style={{ backgroundColor: th.preview.card }} title="Card" />
                    <div className="w-8 flex items-center justify-center font-bold text-xs" style={{ backgroundColor: th.preview.accent, color: '#ffffff' }}>
                      Aa
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: th.accentColor }} />
                        <h3 className="text-sm font-bold text-white tracking-tight">{th.name}</h3>
                        {th.isDark ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-white/5">Dark</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Light</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 font-['Noto_Sans_Telugu'] mt-0.5">{th.nameTe}</p>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1">{th.description}</p>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#0a84ff] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/40">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. PIN LOCK & SECURITY SECTION */}
      {(activeSection === 'all' || activeSection === 'pin') && (
        <section className="bg-[#1c1c1e] p-4 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">
                    {lang === 'te' ? 'పిన్ లాక్ & సెక్యూరిటీ ప్రొటెక్షన్' : 'PIN Lock & App Protection'}
                  </h2>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      securityConfig.isEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-white/10'
                    }`}
                  >
                    {securityConfig.isEnabled ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>{lang === 'te' ? 'లాక్ యాక్టివ్' : 'Active'}</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3 h-3 text-zinc-400" />
                        <span>{lang === 'te' ? 'లాక్ ఆఫ్' : 'Disabled'}</span>
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {lang === 'te'
                    ? 'మీ రిజిస్టర్లు, ఫైల్స్ మరియు డేటాను సురక్షితంగా ఉంచడానికి 4-అంకెల సెక్యూరిటీ పిన్ అమర్చండి'
                    : 'Protect your registers, sensitive sheets, and confidential local files with 4-digit PIN'}
                </p>
              </div>
            </div>

            {/* Quick Actions: Toggle & Instant Lock */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTogglePinProtection}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  securityConfig.isEnabled
                    ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {securityConfig.isEnabled ? (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>{lang === 'te' ? 'పిన్ లాక్ ఆఫ్ చేయి' : 'Disable Lock'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>{lang === 'te' ? 'పిన్ లాక్ ఆన్ చేయి' : 'Enable Lock'}</span>
                  </>
                )}
              </button>

              {securityConfig.isEnabled && (
                <button
                  type="button"
                  onClick={onLockNow}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                  title="Test lock screen immediately"
                >
                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{lang === 'te' ? 'ఇప్పుడే లాక్ చేయి' : 'Lock Now'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback message */}
          {pinMessage && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 border animate-in fade-in ${
                pinMessage.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {pinMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
              <span>{pinMessage.text}</span>
            </div>
          )}

          {/* PIN Setup / Change Form */}
          <form onSubmit={handleUpdatePin} className="bg-[#161618] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>{lang === 'te' ? 'కొత్త పిన్ అమర్చండి లేదా మార్చండి' : 'Set or Change 4-Digit Security PIN'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPinText(!showPinText)}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {showPinText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPinText ? 'Hide PIN' : 'Show PIN'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  {lang === 'te' ? 'కొత్త పిన్ (4 అంకెలు)' : 'New PIN (4 Digits)'}
                </label>
                <input
                  type={showPinText ? 'text' : 'password'}
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full px-3 py-2 bg-[#242426] border border-white/10 rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  {lang === 'te' ? 'పిన్ ధృవీకరించండి' : 'Confirm PIN'}
                </label>
                <input
                  type={showPinText ? 'text' : 'password'}
                  maxLength={6}
                  value={confirmPinInput}
                  onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Repeat PIN"
                  className="w-full px-3 py-2 bg-[#242426] border border-white/10 rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  {lang === 'te' ? 'గుర్తుంచుకునే హింట్ (ఐచ్ఛికం)' : 'Security Hint (Optional)'}
                </label>
                <input
                  type="text"
                  value={hintInput}
                  onChange={(e) => setHintInput(e.target.value)}
                  placeholder="e.g. My birth year"
                  className="w-full px-3 py-2 bg-[#242426] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Auto Lock Timeout Selector */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-semibold">
                  {lang === 'te' ? 'ఆటో-లాక్ వ్యవధి:' : 'Auto-Lock Inactivity Timeout:'}
                </span>
                <select
                  value={securityConfig.autoLockMinutes}
                  onChange={(e) =>
                    onSaveSecurityConfig({
                      ...securityConfig,
                      autoLockMinutes: Number(e.target.value),
                    })
                  }
                  className="px-2.5 py-1 bg-[#242426] border border-white/10 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value={0}>{lang === 'te' ? 'ఆఫ్ (Off)' : 'Off'}</option>
                  <option value={1}>{lang === 'te' ? '1 నిమిషం' : '1 Minute'}</option>
                  <option value={5}>{lang === 'te' ? '5 నిమిషాలు' : '5 Minutes'}</option>
                  <option value={15}>{lang === 'te' ? '15 నిమిషాలు' : '15 Minutes'}</option>
                  <option value={30}>{lang === 'te' ? '30 నిమిషాలు' : '30 Minutes'}</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!pinInput || !confirmPinInput}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                  pinInput && confirmPinInput
                    ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20 active:scale-95'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                }`}
              >
                {lang === 'te' ? 'పిన్ భద్రపరచు' : 'Save Security PIN'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* 4. TELUGU KEYBOARD (KEYLOAD & IME) SECTION */}
      {(activeSection === 'all' || activeSection === 'telugu') && (
        <section className="bg-[#1c1c1e] p-4 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-['Noto_Sans_Telugu'] font-black text-lg">
                క
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white font-['Noto_Sans_Telugu']">
                    {lang === 'te' ? 'తెలుగు కీబోర్డ్ & ఫోనెటిక్ టైపింగ్' : 'Telugu Keyboard & Phonetic IME'}
                  </h2>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border font-['Noto_Sans_Telugu'] ${
                      isTeluguEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400 border-white/10'
                    }`}
                  >
                    {isTeluguEnabled ? 'తెలుగు ON' : 'తెలుగు OFF'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {lang === 'te'
                    ? 'ఇంగ్లీష్ అక్షరాలతో టైప్ చేయగానే తెలుగులోకి ఆటోమేటిక్‌గా మారుతుంది (Shortcut: Ctrl+G)'
                    : 'Transliterate English phonetics to authentic Telugu everywhere in forms and tables (Shortcut: Ctrl+G)'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTelugu}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isTeluguEnabled
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-md shadow-emerald-500/25 active:scale-95'
                    : 'bg-[#141416] hover:bg-white/10 text-zinc-200 border-white/15'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>{isTeluguEnabled ? 'Turn OFF Telugu' : 'Turn ON Telugu (తెలుగు)'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenTeluguKeypadModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#242426] hover:bg-[#2c2c2e] text-emerald-400 border border-emerald-500/30 active:scale-95 transition-all cursor-pointer"
                title="Open Visual On-Screen Keypad with Vowels, Consonants & Matras"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'te' ? 'విజువల్ కీప్యాడ్ ఓపెన్ చేయి' : 'Open Visual Keypad'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Live Transliteration Test Scratchpad */}
          <div className="bg-[#161618] p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'te' ? 'ఫోనెటిక్ టెస్ట్ బాక్స్ (English లో టైప్ చేయండి):' : 'Live Transliteration Test Box (Type in English):'}</span>
              </label>
              <button
                type="button"
                onClick={handleCopyTelugu}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20"
              >
                {copiedTelugu ? <CheckCheck className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTelugu ? 'Copied!' : 'Copy Telugu Text'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={teluguScratchpad}
                  onChange={(e) => setTeluguScratchpad(e.target.value)}
                  placeholder="Type e.g., namaste, bharath, vidyarthi..."
                  className="w-full px-3 py-2.5 bg-[#242426] border border-white/10 rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">Input English phonetic characters</span>
              </div>

              <div>
                <div className="w-full px-3 py-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-base font-bold text-emerald-200 font-['Noto_Sans_Telugu'] min-h-[42px] flex items-center">
                  {transliterateToTelugu(teluguScratchpad) || <span className="text-zinc-500 text-xs font-normal">Output Telugu text appears here...</span>}
                </div>
                <span className="text-[10px] text-emerald-400/70 mt-1 block font-['Noto_Sans_Telugu']">తెలుగు అక్షరాల ప్రత్యక్ష ఫలితం</span>
              </div>
            </div>

            {/* Quick Phonetic Samples Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
              <span className="text-[11px] text-zinc-400 font-medium">Quick Examples:</span>
              {[
                { en: 'namaste', te: 'నమస్తే' },
                { en: 'bharath', te: 'భారత్' },
                { en: 'telugu', te: 'తెలుగు' },
                { en: 'vidyarthi', te: 'విద్యార్థి' },
                { en: 'adhyapakudu', te: 'అధ్యాపకుడు' },
                { en: 'pustakam', te: 'పుస్తకం' },
              ].map((sample) => (
                <button
                  key={sample.en}
                  type="button"
                  onClick={() => setTeluguScratchpad(sample.en)}
                  className="px-2 py-0.5 rounded-lg bg-[#242426] hover:bg-emerald-500/20 text-[11px] text-zinc-300 hover:text-emerald-300 border border-white/5 hover:border-emerald-500/30 cursor-pointer font-['Noto_Sans_Telugu'] transition-all"
                >
                  {sample.en} → <span className="font-bold">{sample.te}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. APP SYSTEM & DISPLAY PREFERENCES */}
      <section className="bg-[#1c1c1e] p-4 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {lang === 'te' ? 'భాష & డిస్‌ప్లే ప్రాధాన్యతలు' : 'Language & Display Preferences'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {lang === 'te'
                ? 'యాప్ ప్రదర్శన భాష మరియు స్క్రీన్ ఆటో-ఫిట్ ఎంపికలు'
                : 'App interface language & screen auto-fit responsiveness'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Language Switch */}
          <div className="bg-[#161618] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">{lang === 'te' ? 'ఇంటర్‌ఫేస్ భాష' : 'Interface Language'}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'te' ? 'తెలుగు లేదా ఇంగ్లీష్‌లోకి మార్చండి' : 'Switch between English and Telugu'}
              </p>
            </div>
            <button
              type="button"
              onClick={onLangToggle}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0a84ff] hover:bg-[#0071e3] text-white active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-500/20"
            >
              {lang === 'te' ? 'English కి మార్చు' : 'తెలుగులోకి మార్చు'}
            </button>
          </div>

          {/* Fit to Screen Toggle */}
          {onToggleFitScreen && (
            <div className="bg-[#161618] p-4 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{lang === 'te' ? 'స్క్రీన్ ఫిట్ మోడ్' : 'Auto-Fit Work Area'}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {lang === 'te' ? 'వర్క్‌స్పేస్ ఆటోమేటిక్ ఫిట్ టోగుల్' : 'Fit workspace cleanly to viewport'}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleFitScreen}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isFitToScreen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-[#242426] text-zinc-400 border-white/10'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{isFitToScreen ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
