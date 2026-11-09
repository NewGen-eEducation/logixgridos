import React, { useState } from 'react';
import { ColumnDef, ColumnType } from '../types/register';
import { Language, translations } from '../utils/translations';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Calculator, 
  HelpCircle,
  Check
} from 'lucide-react';

interface ColumnModalProps {
  columns: ColumnDef[];
  onSaveColumns: (updatedColumns: ColumnDef[]) => void;
  onClose: () => void;
  lang: Language;
}

export const ColumnModal: React.FC<ColumnModalProps> = ({
  columns,
  onSaveColumns,
  onClose,
  lang,
}) => {
  const t = translations[lang];
  const [cols, setCols] = useState<ColumnDef[]>([...columns]);

  // New column draft state
  const [newColName, setNewColName] = useState('');
  const [newColType, setNewColType] = useState<ColumnType>('text');
  const [newColUnit, setNewColUnit] = useState('');
  const [newColFormula, setNewColFormula] = useState('');
  const [newColOptions, setNewColOptions] = useState('');

  // Add column
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    const id = newColName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString().slice(-4);
    const newCol: ColumnDef = {
      id,
      name: newColName.trim(),
      type: newColType,
      unit: newColUnit.trim() || undefined,
      formula: newColType === 'formula' ? newColFormula.trim() : undefined,
      options: newColType === 'select' ? newColOptions.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      width: 140,
    };

    setCols([...cols, newCol]);
    setNewColName('');
    setNewColType('text');
    setNewColUnit('');
    setNewColFormula('');
    setNewColOptions('');
  };

  // Reorder up/down
  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= cols.length) return;
    const updated = [...cols];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCols(updated);
  };

  // Delete column
  const handleDeleteColumn = (index: number) => {
    if (cols.length <= 1) {
      return;
    }
    setCols(cols.filter((_, idx) => idx !== index));
  };

  // Update column in place
  const updateColField = (index: number, field: keyof ColumnDef, val: any) => {
    const updated = [...cols];
    updated[index] = { ...updated[index], [field]: val };
    setCols(updated);
  };

  const handleSave = () => {
    onSaveColumns(cols);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#1c1c1e] text-white rounded-t-[28px] sm:rounded-2xl shadow-2xl max-w-2xl w-full border border-white/15 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#161618]">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              {t.manageColumnsTitle}
            </h3>
            <p className="text-xs text-zinc-400">
              Customize field types, formulas, and column order
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs font-semibold p-1 rounded-full hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Column List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Active Columns ({cols.length})
            </h4>

            {cols.map((col, index) => (
              <div
                key={col.id}
                className="p-3 bg-[#242426] rounded-xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveColumn(index, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-zinc-400 hover:text-white disabled:opacity-20"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveColumn(index, 'down')}
                      disabled={index === cols.length - 1}
                      className="p-0.5 text-zinc-400 hover:text-white disabled:opacity-20"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColField(index, 'name', e.target.value)}
                        className="text-xs font-semibold px-2 py-1 bg-[#1c1c1e] text-white border border-white/10 rounded-lg focus:border-blue-500 focus:outline-none flex-1"
                      />
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-white/10 rounded text-zinc-300">
                        {col.type}
                      </span>
                    </div>

                    {col.type === 'formula' && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-300 bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20">
                        <Calculator className="w-3 h-3 shrink-0 text-blue-400" />
                        <input
                          type="text"
                          value={col.formula || ''}
                          onChange={(e) => updateColField(index, 'formula', e.target.value)}
                          placeholder="e.g. [colA] * [colB]"
                          className="w-full text-[11px] font-mono bg-[#1c1c1e] text-white px-2 py-0.5 rounded border border-white/10 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}

                    {col.type === 'select' && (
                      <div className="text-[11px] text-zinc-400">
                        Options: {col.options?.join(', ') || 'None set'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {col.unit !== undefined && (
                    <input
                      type="text"
                      placeholder="Unit"
                      value={col.unit || ''}
                      onChange={(e) => updateColField(index, 'unit', e.target.value)}
                      className="w-14 text-xs px-1.5 py-1 bg-[#1c1c1e] text-white border border-white/10 rounded-lg text-center focus:outline-none focus:border-blue-500"
                    />
                  )}
                  <button
                    onClick={() => handleDeleteColumn(index)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Column Form */}
          <div className="pt-4 border-t border-white/10">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              {t.addColumnBtn}
            </h4>

            <form onSubmit={handleAddColumn} className="p-4 bg-[#242426] rounded-xl border border-dashed border-white/15 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    {t.columnName} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Score, Total"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#1c1c1e] text-white border border-white/10 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    {t.columnType}
                  </label>
                  <select
                    value={newColType}
                    onChange={(e) => setNewColType(e.target.value as ColumnType)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#1c1c1e] text-white border border-white/10 rounded-xl focus:outline-none focus:border-blue-500"
                  >
                    <option value="text">{t.typeText}</option>
                    <option value="number">{t.typeNumber}</option>
                    <option value="currency">{t.typeCurrency}</option>
                    <option value="date">{t.typeDate}</option>
                    <option value="select">{t.typeSelect}</option>
                    <option value="checkbox">{t.typeCheckbox}</option>
                    <option value="rating">{t.typeRating}</option>
                    <option value="formula">{t.typeFormula}</option>
                  </select>
                </div>
              </div>

              {/* Conditional type inputs */}
              {newColType === 'select' && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Options (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    value={newColOptions}
                    onChange={(e) => setNewColOptions(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#1c1c1e] text-white border border-white/10 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {newColType === 'formula' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-blue-300 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5" />
                      Formula Expression (Google Sheets & Formulas)
                    </label>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      e.g. =SUM(A1:B1) or [marks] * 0.4
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. [internal_marks] + [external_marks] or =IF([attendance_pct]>75, 'Eligible', 'Low')"
                    value={newColFormula}
                    onChange={(e) => setNewColFormula(e.target.value)}
                    className="w-full font-mono text-xs px-2.5 py-1.5 bg-[#1c1c1e] text-white border border-blue-500/40 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                  <div className="mt-1 flex flex-wrap gap-1">
                    {cols.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setNewColFormula((prev) => `${prev} [${c.id}]`)}
                        className="text-[10px] px-1.5 py-0.5 bg-white/10 hover:bg-white/20 rounded text-zinc-300 font-mono"
                      >
                        + [{c.name}]
                      </button>
                    ))}
                    {['SUM', 'AVERAGE', 'IF', 'ROUND', 'MAX', 'MIN'].map((fn) => (
                      <button
                        type="button"
                        key={fn}
                        onClick={() => setNewColFormula((prev) => `${prev} ${fn}(`)}
                        className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 hover:bg-blue-500/30 rounded text-blue-300 font-mono font-bold"
                      >
                        + {fn}()
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(newColType === 'number' || newColType === 'currency' || newColType === 'formula') && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                    Unit / Symbol
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ₹, %, kg"
                    value={newColUnit}
                    onChange={(e) => setNewColUnit(e.target.value)}
                    className="w-28 px-2.5 py-1.5 text-xs bg-[#1c1c1e] text-white border border-white/10 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-blue-400 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#161618] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
