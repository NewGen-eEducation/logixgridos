import React, { useState } from 'react';
import { Language, translations } from '../utils/translations';
import { FolderPlus, X, GraduationCap, ReceiptIndianRupee, Package, BookOpen } from 'lucide-react';

interface CreateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRegister: (title: string, desc: string, category: 'education' | 'finance' | 'inventory' | 'custom') => void;
  lang: Language;
}

export const CreateTableModal: React.FC<CreateTableModalProps> = ({
  isOpen,
  onClose,
  onCreateRegister,
  lang,
}) => {
  const t = translations[lang];
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'education' | 'finance' | 'inventory' | 'custom'>('custom');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateRegister(newTitle.trim(), newDesc.trim(), newCategory);
    setNewTitle('');
    setNewDesc('');
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'education':
        return <GraduationCap className="w-4 h-4 text-sky-400" />;
      case 'finance':
        return <ReceiptIndianRupee className="w-4 h-4 text-emerald-400" />;
      case 'inventory':
        return <Package className="w-4 h-4 text-amber-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#1c1c1e] text-white rounded-t-[28px] sm:rounded-2xl max-w-md w-full border border-white/15 shadow-2xl overflow-hidden">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />
        
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#161618]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {t.newRegister}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Create a new dynamic data table & response form
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Table Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Sales Ledger, Attendance, Asset Tracker"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Description / Notes
            </label>
            <input
              type="text"
              placeholder="Short note or purpose..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Template Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'custom', label: 'Custom Blank' },
                { id: 'education', label: 'Education / Students' },
                { id: 'finance', label: 'Finance / Accounts' },
                { id: 'inventory', label: 'Inventory / Assets' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setNewCategory(cat.id as any)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    newCategory === cat.id
                      ? 'bg-blue-500/20 border-blue-500/50 text-white font-bold ring-1 ring-blue-500/30'
                      : 'bg-[#2c2c2e] border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {getCategoryIcon(cat.id)}
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#0a84ff] hover:bg-[#0071e3] rounded-xl shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer"
            >
              Create Table
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
