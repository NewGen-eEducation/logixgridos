import React, { useState } from 'react';
import { ColumnDef } from '../types/register';
import { Search, Replace, X, Check } from 'lucide-react';

interface FindReplaceModalProps {
  columns: ColumnDef[];
  onApply: (columnId: string, findText: string, replaceText: string, matchCase: boolean) => number;
  onClose: () => void;
}

export const FindReplaceModal: React.FC<FindReplaceModalProps> = ({
  columns,
  onApply,
  onClose,
}) => {
  const [targetColId, setTargetColId] = useState<string>('all');
  const [findText, setFindText] = useState<string>('');
  const [replaceText, setReplaceText] = useState<string>('');
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!findText) return;
    const count = onApply(targetColId, findText, replaceText, matchCase);
    setResultMessage(`Successfully replaced in ${count} cell(s)!`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/15 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/10 bg-[#161618] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Replace className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Find & Replace</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {resultMessage && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{resultMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Search In Column
            </label>
            <select
              value={targetColId}
              onChange={(e) => setTargetColId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none"
            >
              <option value="all">All Text Columns</option>
              {columns
                .filter((c) => c.type !== 'formula')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Find Text
            </label>
            <input
              type="text"
              required
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="e.g. Sec-A, 2025, Pending"
              className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white placeholder-zinc-500 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Replace With
            </label>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="e.g. Sec-B, 2026, Completed"
              className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white placeholder-zinc-500 border border-white/10 rounded-xl focus:border-purple-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-purple-500"
            />
            <span>Match case exactly</span>
          </label>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white bg-white/5 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 active:scale-95 rounded-xl transition-all shadow-md shadow-purple-500/20 cursor-pointer"
            >
              <Replace className="w-3.5 h-3.5" />
              <span>Replace All</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
