import React, { useState, useEffect, useRef } from 'react';
import { GoogleSheetsPivotConfig, ColumnDef } from '../types/register';
import { 
  SplitSquareVertical, 
  X, 
  Check, 
  Trash2, 
  Edit3, 
  Plus, 
  LayoutGrid, 
  ListOrdered, 
  FileSpreadsheet, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';

export type PivotTemplateType = 'smart' | 'rows_only' | 'crosstab' | 'blank';

interface NewPivotModalProps {
  isOpen: boolean;
  defaultName: string;
  columns: ColumnDef[];
  onClose: () => void;
  onCreate: (name: string, template: PivotTemplateType) => void;
}

export const NewPivotModal: React.FC<NewPivotModalProps> = ({
  isOpen,
  defaultName,
  columns,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState(defaultName);
  const [template, setTemplate] = useState<PivotTemplateType>('smart');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setTemplate('smart');
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || defaultName;
    onCreate(finalName, template);
  };

  const templates: {
    id: PivotTemplateType;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string;
  }[] = [
    {
      id: 'smart',
      title: 'Smart Default (Recommended)',
      description: 'Automatically sets up primary categorical dimensions crossed with numeric sums.',
      icon: Sparkles,
      badge: 'Auto',
    },
    {
      id: 'crosstab',
      title: 'Cross-Tabulation Matrix',
      description: '2D grid with Row categories on the left and Column categories across the top.',
      icon: LayoutGrid,
      badge: '2D Grid',
    },
    {
      id: 'rows_only',
      title: 'Row Breakdown Summary',
      description: 'Simple 1D category ledger grouped by row values with grand total aggregations.',
      icon: ListOrdered,
      badge: 'Ledger',
    },
    {
      id: 'blank',
      title: 'Blank Canvas',
      description: 'Start with empty rows, columns, and values to build custom pivot from scratch.',
      icon: FileSpreadsheet,
      badge: 'Custom',
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#1c1c1e] text-white rounded-2xl border border-white/15 shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#161618] border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Create New Pivot Table</h3>
              <p className="text-[11px] text-zinc-400">Add an interactive cross-tabulation view</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Pivot Table Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Category Wise Summary"
              className="w-full bg-[#242426] border border-white/15 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-2">
              Select Initial Template
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {templates.map((tpl) => {
                const Icon = tpl.icon;
                const isSelected = template === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setTemplate(tpl.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left select-none ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-xs ring-1 ring-emerald-500/30'
                        : 'bg-[#242426] border-white/10 hover:border-white/20 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-zinc-400'}`} />
                        <span className="text-xs font-bold truncate">{tpl.title}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-white/10 text-zinc-400 shrink-0">
                        {tpl.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-[#2c2c2e] hover:bg-[#38383c] rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 rounded-xl transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Pivot Table</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface RenamePivotModalProps {
  isOpen: boolean;
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export const RenamePivotModal: React.FC<RenamePivotModalProps> = ({
  isOpen,
  currentName,
  onClose,
  onSave,
}) => {
  const [draftName, setDraftName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftName(currentName);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 80);
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftName.trim()) {
      onSave(draftName.trim());
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-[#1c1c1e] text-white rounded-2xl border border-white/15 shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#161618] border-b border-white/10 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Edit3 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-white">Rename Pivot Table</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              New Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Enter pivot table name..."
              className="w-full bg-[#242426] border border-white/15 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-[#2c2c2e] hover:bg-[#38383c] rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!draftName.trim()}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              Save Name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
