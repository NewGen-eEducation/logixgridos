import React, { useState, useEffect } from 'react';
import { ColumnDef, RowData } from '../types/register';
import { Language, translations } from '../utils/translations';
import { evaluateFormula } from '../utils/calculations';
import { SignaturePadModal } from './SignaturePadModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { Check, Calculator, Sparkles, QrCode, PenTool, X } from 'lucide-react';

interface RowModalProps {
  columns: ColumnDef[];
  initialData?: RowData | null;
  rowIndex?: number | null;
  onSave: (data: RowData, rowIndex?: number | null) => void;
  onClose: () => void;
  lang: Language;
}

export const RowModal: React.FC<RowModalProps> = ({
  columns,
  initialData,
  rowIndex,
  onSave,
  onClose,
  lang,
}) => {
  const t = translations[lang];
  const [formData, setFormData] = useState<RowData>({});

  // Sub-modal states
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [activeSigColId, setActiveSigColId] = useState<string | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [activeBarcodeColId, setActiveBarcodeColId] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      const defaults: RowData = {};
      columns.forEach((col) => {
        if (col.type === 'checkbox') defaults[col.id] = false;
        else if (col.type === 'rating') defaults[col.id] = 5;
        else if (col.type === 'select' && col.options && col.options.length > 0) defaults[col.id] = col.options[0];
        else if (col.type === 'number' || col.type === 'currency') defaults[col.id] = 0;
        else defaults[col.id] = '';
      });
      setFormData(defaults);
    }
  }, [initialData, columns]);

  const handleChange = (columnId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [columnId]: value,
    }));
  };

  // Auto-ID Generator
  const handleAutoId = (columnId: string) => {
    const col = columns.find((c) => c.id === columnId);
    let prefix = 'REG-';
    if (col?.name.toLowerCase().includes('roll')) prefix = '2026-CS-';
    else if (col?.name.toLowerCase().includes('inv')) prefix = 'INV-';
    else if (col?.name.toLowerCase().includes('stu')) prefix = 'STU-';
    const randomSeq = Math.floor(100 + Math.random() * 900);
    handleChange(columnId, `${prefix}${randomSeq}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, rowIndex);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-[#1c1c1e] text-white rounded-t-[28px] sm:rounded-2xl shadow-2xl max-w-xl w-full border border-white/15 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#161618]">
          <h3 className="text-sm sm:text-base font-bold text-white">
            {initialData ? t.editEntryTitle : t.addEntryTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs font-semibold p-1 rounded-full hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {columns.map((col) => {
              const colLabel = (lang === 'te' && col.nameTe) ? col.nameTe : col.name;
              const isIdField =
                col.type === 'text' &&
                (col.name.toLowerCase().includes('id') ||
                  col.name.toLowerCase().includes('roll') ||
                  col.name.toLowerCase().includes('code'));

              // Formula columns are calculated in real time
              if (col.type === 'formula') {
                const computedVal = evaluateFormula(col.formula || '', formData, columns);
                return (
                  <div key={col.id} className="sm:col-span-2 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-blue-400" />
                      <div>
                        <span className="text-xs font-semibold text-zinc-200">{colLabel}</span>
                        <div className="text-[10px] text-zinc-400 font-mono">Formula: {col.formula}</div>
                      </div>
                    </div>
                    <div className="text-base font-bold font-mono text-blue-400 tabular-nums">
                      {col.unit ? `${col.unit} ` : ''}{computedVal.toLocaleString()}
                    </div>
                  </div>
                );
              }

              return (
                <div key={col.id} className={col.type === 'text' && col.width && col.width > 200 ? 'sm:col-span-2' : ''}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-zinc-300">
                      {colLabel} {col.required && <span className="text-rose-400">*</span>}
                      {col.unit && <span className="text-zinc-500 font-normal ml-1">({col.unit})</span>}
                    </label>

                    {/* Quick Smart Actions: Auto ID & Scan */}
                    <div className="flex items-center gap-1">
                      {isIdField && (
                        <button
                          type="button"
                          onClick={() => handleAutoId(col.id)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 hover:bg-purple-600 hover:text-white flex items-center gap-0.5 cursor-pointer"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Auto ID</span>
                        </button>
                      )}
                      {(col.type === 'text' || col.type === 'number') && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveBarcodeColId(col.id);
                            setShowBarcodeModal(true);
                          }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-600 hover:text-white flex items-center gap-0.5 cursor-pointer"
                        >
                          <QrCode className="w-2.5 h-2.5" />
                          <span>Scan</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {col.type === 'select' ? (
                    <select
                      value={formData[col.id] || ''}
                      onChange={(e) => handleChange(col.id, e.target.value)}
                      required={col.required}
                      className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/10 rounded-xl focus:outline-none focus:border-blue-500"
                    >
                      <option value="" className="bg-[#2c2c2e] text-zinc-400">Select option</option>
                      {col.options?.map((opt) => (
                        <option key={opt} value={opt} className="bg-[#2c2c2e] text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : col.type === 'checkbox' ? (
                    <div className="flex items-center h-9">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!formData[col.id]}
                          onChange={(e) => handleChange(col.id, e.target.checked)}
                          className="w-4 h-4 rounded accent-[#0a84ff]"
                        />
                        <span className="text-xs text-zinc-300">Yes / Completed</span>
                      </label>
                    </div>
                  ) : col.type === 'rating' ? (
                    <div className="flex items-center gap-2 h-9">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => handleChange(col.id, star)}
                          className={`text-lg transition-transform hover:scale-110 ${
                            (formData[col.id] || 0) >= star ? 'text-amber-400' : 'text-zinc-600'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="text-xs text-zinc-400 font-mono">({formData[col.id] || 0}/5)</span>
                    </div>
                  ) : col.type === 'date' ? (
                    <input
                      type="date"
                      value={formData[col.id] || ''}
                      onChange={(e) => handleChange(col.id, e.target.value)}
                      required={col.required}
                      className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white border border-white/10 rounded-xl focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <div className="space-y-1">
                      <input
                        type={col.type === 'number' || col.type === 'currency' ? 'number' : 'text'}
                        value={formData[col.id] ?? ''}
                        onChange={(e) => handleChange(col.id, e.target.value)}
                        required={col.required}
                        placeholder={`Enter ${colLabel.toLowerCase()}`}
                        className="w-full px-3 py-2 text-xs bg-[#2c2c2e] text-white placeholder-zinc-500 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500"
                      />
                      {(col.name.toLowerCase().includes('sign') || col.name.toLowerCase().includes('photo')) && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSigColId(col.id);
                              setShowSignatureModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 rounded text-zinc-300 cursor-pointer"
                          >
                            <PenTool className="w-2.5 h-2.5 text-blue-400" />
                            <span>Draw Signature</span>
                          </button>
                          {formData[col.id] && String(formData[col.id]).startsWith('data:image') && (
                            <span className="text-[10px] text-emerald-400">Attached ✓</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>

      {/* Signature Pad Modal */}
      {showSignatureModal && (
        <SignaturePadModal
          onSave={(dataUrl) => {
            if (activeSigColId) handleChange(activeSigColId, dataUrl);
          }}
          onClose={() => setShowSignatureModal(false)}
        />
      )}

      {/* Barcode Scanner Modal */}
      {showBarcodeModal && (
        <BarcodeScannerModal
          onScanResult={(code) => {
            if (activeBarcodeColId) handleChange(activeBarcodeColId, code);
          }}
          onClose={() => setShowBarcodeModal(false)}
        />
      )}
    </div>
  );
};
