import React from 'react';
import { ThemeId, APP_THEMES, ThemeConfig } from '../types/theme';
import { Language } from '../utils/translations';
import { Palette, Check, X, Sparkles, Sun, Moon, Laptop } from 'lucide-react';

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  lang: Language;
}

export const ThemeModal: React.FC<ThemeModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  lang,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#1c1c1e] text-white border border-white/15 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#161618]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0 border border-white/20">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {lang === 'te' ? 'అప్పియరెన్స్ & థీమ్స్' : 'Appearance & Themes'}
                </h3>
                <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                  {APP_THEMES.length} Presets
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {lang === 'te' 
                  ? 'మీ వర్క్‌స్పేస్ రంగులు, కాంట్రాస్ట్ మరియు లుక్‌ను అనుకూలీకరించండి' 
                  : 'Personalize your workspace palette, contrast, and ambient lighting'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Dark / Light Mode Segmented Toggle Bar */}
        <div className="px-4 sm:px-6 pt-4 pb-0">
          <div className="bg-[#242426] p-1 rounded-2xl border border-white/10 flex items-center gap-1">
            <button
              onClick={() => onSelectTheme('midnight')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                currentTheme !== 'light'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{lang === 'te' ? 'డార్క్ మోడ్ (Dark)' : 'Dark Mode'}</span>
            </button>
            <button
              onClick={() => onSelectTheme('light')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                currentTheme === 'light'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              <span>{lang === 'te' ? 'లైట్ మోడ్ (Light)' : 'Light Mode'}</span>
            </button>
          </div>
        </div>

        {/* Themes Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {APP_THEMES.map((theme) => {
              const isActive = currentTheme === theme.id;

              return (
                <div
                  key={theme.id}
                  onClick={() => onSelectTheme(theme.id)}
                  className={`group relative p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                    isActive
                      ? 'border-blue-500 ring-2 ring-blue-500/40 bg-white/10 shadow-lg'
                      : 'border-white/10 hover:border-white/25 hover:bg-white/5 bg-[#242426]'
                  }`}
                >
                  {/* Visual Preview Window */}
                  <div 
                    className="w-full h-24 rounded-xl border p-2 flex flex-col justify-between mb-3 shadow-inner overflow-hidden transition-transform group-hover:scale-[1.01]"
                    style={{
                      backgroundColor: theme.preview.bg,
                      borderColor: theme.preview.border,
                    }}
                  >
                    {/* Mini Window Bar */}
                    <div 
                      className="w-full h-4 rounded-md flex items-center justify-between px-2 border"
                      style={{
                        backgroundColor: theme.preview.surface,
                        borderColor: theme.preview.border,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                        <div className="w-8 h-1 rounded-full opacity-40" style={{ backgroundColor: theme.preview.text }} />
                      </div>
                      <div className="w-3 h-1 rounded-full opacity-30" style={{ backgroundColor: theme.preview.text }} />
                    </div>

                    {/* Mini Body Cards */}
                    <div className="flex gap-1.5 flex-1 pt-1.5">
                      {/* Mini Sidebar */}
                      <div 
                        className="w-8 rounded border flex flex-col gap-1 p-1"
                        style={{
                          backgroundColor: theme.preview.surface,
                          borderColor: theme.preview.border,
                        }}
                      >
                        <div className="w-full h-1 rounded opacity-50" style={{ backgroundColor: theme.preview.text }} />
                        <div className="w-full h-1 rounded opacity-30" style={{ backgroundColor: theme.preview.text }} />
                        <div className="w-3/4 h-1 rounded opacity-30" style={{ backgroundColor: theme.preview.text }} />
                      </div>

                      {/* Mini Data Table Sheet */}
                      <div 
                        className="flex-1 rounded border p-1.5 flex flex-col justify-between"
                        style={{
                          backgroundColor: theme.preview.card,
                          borderColor: theme.preview.border,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="w-12 h-1.5 rounded" style={{ backgroundColor: theme.accentColor }} />
                          <div className="w-4 h-1.5 rounded opacity-40" style={{ backgroundColor: theme.preview.text }} />
                        </div>
                        <div className="space-y-1">
                          <div className="w-full h-1 rounded opacity-25" style={{ backgroundColor: theme.preview.text }} />
                          <div className="w-5/6 h-1 rounded opacity-20" style={{ backgroundColor: theme.preview.text }} />
                          <div className="w-4/6 h-1 rounded opacity-15" style={{ backgroundColor: theme.preview.text }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-3 h-3 rounded-full border border-white/20 shrink-0" 
                          style={{ backgroundColor: theme.accentColor }}
                        />
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {lang === 'te' ? theme.nameTe : theme.name}
                        </h4>
                      </div>

                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 rounded-full shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {lang === 'te' ? theme.descriptionTe : theme.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/10 bg-[#161618] flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Theme auto-saves across your sessions</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
