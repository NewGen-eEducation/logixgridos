import React, { useState } from 'react';
import { ColumnDef } from '../types/register';
import { Language, translations } from '../utils/translations';
import { Layers, X, Check, Edit3 } from 'lucide-react';

interface BulkUpdateModalProps {
  columns: ColumnDef[];
  selectedCount: number;
  onApply: (columnId: string, value: any) => void;
  onClose: () => void;
  lang: Language;
}

export const BulkUpdateModal: React.FC<BulkUpdateModalProps> = ({
  columns,
  selectedCount,
  onApply,
  onClose,
  lang,
}) => {
  const t = translations[lang];

  // Exclude formula columns since they are auto-calculated
  const editableCols = columns.filter((c) => c.type !== 'formula');

  const [selectedColId, setSelectedColId] = useState<string>(
    editableCols[0]?.id || ''
  );
  const [newValue, setNewValue] = useState<any>('');

  const targetCol = editableCols.find((c) => c.id === selectedColId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColId) return;
    onApply(selectedColId, newValue);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200">
      <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/15 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-white/10 bg-[#161618] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white">Bulk Update Field</h3>
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
          <p className="text-xs text-zinc-400">
            Set a new value for <strong className="text-white font-mono">{selectedCount}</strong> selected rows at once.
          </p>

          {/* Select Column */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Target Column
            </label>
            <select
              value={selectedColId}
              onChange={(e) => {
                setSelectedColId(e.target.value);
                setNewValue('');
              }}
              className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              {editableCols.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Enter Value Based on Column Type */}
          {targetCol && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                New Value for {targetCol.name}
              </label>

              {targetCol.type === 'select' || targetCol.type === 'multiple_choice' ? (
                <select
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- Choose Option --</option>
                  {targetCol.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : targetCol.type === 'checkbox' ? (
                <label className="flex items-center gap-2 p-2 bg-[#2c2c2e] rounded-xl border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!newValue}
                    onChange={(e) => setNewValue(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  <span className="text-xs text-zinc-300">Set checked / completed</span>
                </label>
              ) : targetCol.type === 'number' || targetCol.type === 'currency' ? (
                <input
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter number"
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              ) : targetCol.type === 'date' ? (
                <input
                  type="date"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={`Enter value for ${targetCol.name}`}
                  className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              )}
            </div>
          )}

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
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply to {selectedCount} Rows</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
