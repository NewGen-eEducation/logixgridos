import React, { useState, useEffect } from 'react';
import { Register } from '../types/register';
import { Language } from '../utils/translations';
import { ThemeId } from '../types/theme';
import { Edit3, X, Check, FileSpreadsheet, Sparkles } from 'lucide-react';

interface RenameRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  register: Register | null;
  onSave: (id: string, newTitle: string, newTitleTe?: string, newDesc?: string) => void;
  lang?: Language;
  currentTheme?: ThemeId;
}

export const RenameRegisterModal: React.FC<RenameRegisterModalProps> = ({
  isOpen,
  onClose,
  register,
  onSave,
  lang = 'en',
  currentTheme,
}) => {
  const [title, setTitle] = useState('');
  const [titleTe, setTitleTe] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const isLight =
    currentTheme === 'light' ||
    (typeof document !== 'undefined' &&
      document.documentElement.getAttribute('data-theme') === 'light');

  useEffect(() => {
    if (register) {
      setTitle(register.title || '');
      setTitleTe(register.titleTe || '');
      setDescription(register.description || '');
      setError('');
    }
  }, [register]);

  if (!isOpen || !register) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError(
        lang === 'te'
          ? 'దయచేసి రిజిస్టర్ పేరును నమోదు చేయండి'
          : 'Please enter a valid table/register name'
      );
      return;
    }

    onSave(register.id, cleanTitle, titleTe.trim() || undefined, description.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className={`w-full max-w-md border rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#1c1c1f] border-white/15 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-[#242428] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-500 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {lang === 'te' ? 'టేబుల్ / రిజిస్టర్ పేరు మార్చండి' : 'Rename Table / Register'}
              </h3>
              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                {lang === 'te'
                  ? 'దిగుమతి చేసిన లేదా సృష్టించిన రిజిస్టర్ పేరును సవరించండి'
                  : 'Update title for imported spreadsheets or created registers'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isLight
                ? 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
                : 'hover:bg-white/10 text-zinc-400 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Current Source Badge */}
          {register.sourceFileName && (
            <div
              className={`px-3 py-2 rounded-xl border flex items-center gap-2 text-xs ${
                isLight
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="truncate min-w-0">
                <span className="font-semibold">{lang === 'te' ? 'సోర్స్ ఫైల్: ' : 'Source: '}</span>
                <span className="font-mono">{register.sourceFileName}</span>
                {register.sheetName && (
                  <span className="ml-1 opacity-80">(Sheet: {register.sheetName})</span>
                )}
              </div>
            </div>
          )}

          {/* Register Name */}
          <div>
            <label
              className={`block text-xs font-semibold mb-1.5 ${
                isLight ? 'text-slate-700' : 'text-zinc-300'
              }`}
            >
              {lang === 'te' ? 'రిజిస్టర్ పేరు (Title)' : 'Table / Register Name'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="e.g. Employee Directory, Q4 Exam Marks, Accounts Ledger"
              className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors font-medium ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  : 'bg-[#121214] border-white/15 text-white placeholder:text-zinc-600'
              }`}
            />
          </div>

          {/* Telugu Title (Optional) */}
          <div>
            <label
              className={`block text-xs font-semibold mb-1.5 ${
                isLight ? 'text-slate-700' : 'text-zinc-300'
              }`}
            >
              {lang === 'te' ? 'తెలుగు పేరు (ఐచ్ఛికం - Optional)' : 'Telugu Title (Optional)'}
            </label>
            <input
              type="text"
              value={titleTe}
              onChange={(e) => setTitleTe(e.target.value)}
              placeholder="ఉదాహరణ: ఉద్యోగుల సమాచారం, విద్యార్థుల మార్కులు"
              className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors font-['Noto_Sans_Telugu'] ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  : 'bg-[#121214] border-white/15 text-white placeholder:text-zinc-600'
              }`}
            />
          </div>

          {/* Description */}
          <div>
            <label
              className={`block text-xs font-semibold mb-1.5 ${
                isLight ? 'text-slate-700' : 'text-zinc-300'
              }`}
            >
              {lang === 'te' ? 'వివరణ (Description)' : 'Description (Optional)'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context or notes about this register..."
              className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:border-blue-500 transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  : 'bg-[#121214] border-white/15 text-white placeholder:text-zinc-600'
              }`}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-white/10 hover:bg-white/15 text-zinc-300'
              }`}
            >
              {lang === 'te' ? 'రద్దు' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{lang === 'te' ? 'మార్పులను సేవ్ చేయండి' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
