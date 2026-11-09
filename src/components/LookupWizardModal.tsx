import React, { useState, useMemo } from 'react';
import { Register } from '../types/register';
import { colIndexToLetter, letterToColIndex } from '../utils/googleSheetFormulaEngine';
import { 
  X, 
  Search, 
  Sparkles, 
  Database, 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  HelpCircle,
  FileSpreadsheet,
  TableProperties
} from 'lucide-react';

interface LookupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  registers: Register[];
  activeRegisterId: string;
  selectedCell: { row: number; col: number } | null;
  onInsertFormula: (formula: string, fillDownCount?: number) => void;
}

export const LookupWizardModal: React.FC<LookupWizardModalProps> = ({
  isOpen,
  onClose,
  registers,
  activeRegisterId,
  selectedCell,
  onInsertFormula,
}) => {
  const [selectedRegId, setSelectedRegId] = useState<string>(() => activeRegisterId || registers[0]?.id || '');
  const [functionType, setFunctionType] = useState<'XLOOKUP' | 'VLOOKUP' | 'HLOOKUP' | 'TABLE_LOOKUP'>('XLOOKUP');
  
  // Default search cell is the cell immediately to the left of the selected cell, or A2
  const defaultSearchCell = useMemo(() => {
    if (!selectedCell) return 'A2';
    const leftCol = Math.max(0, selectedCell.col - 1);
    return `${colIndexToLetter(leftCol)}${selectedCell.row + 1}`;
  }, [selectedCell]);

  const [searchKeyCell, setSearchKeyCell] = useState<string>(defaultSearchCell);
  const [lookupColId, setLookupColId] = useState<string>('');
  const [returnColId, setReturnColId] = useState<string>('');
  const [fallbackValue, setFallbackValue] = useState<string>('Not Found');
  const [fillDown, setFillDown] = useState<boolean>(true);
  const [fillDownRows, setFillDownRows] = useState<number>(10);

  const selectedRegister = useMemo(() => {
    return registers.find((r) => r.id === selectedRegId) || registers[0];
  }, [registers, selectedRegId]);

  // Set default lookup and return column when selectedRegister changes
  React.useEffect(() => {
    if (selectedRegister && selectedRegister.columns.length > 0) {
      if (!lookupColId || !selectedRegister.columns.some(c => c.id === lookupColId)) {
        setLookupColId(selectedRegister.columns[0].id);
      }
      if (!returnColId || !selectedRegister.columns.some(c => c.id === returnColId)) {
        setReturnColId(selectedRegister.columns[Math.min(1, selectedRegister.columns.length - 1)].id);
      }
    }
  }, [selectedRegister]);

  // Update default search key cell if modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSearchKeyCell(defaultSearchCell);
    }
  }, [isOpen, defaultSearchCell]);

  if (!isOpen) return null;

  const targetRegTitle = selectedRegister?.title || 'Data Table';
  const safeSheetRef = targetRegTitle.includes(' ') || /[^a-zA-Z0-9]/.test(targetRegTitle)
    ? `'${targetRegTitle}'`
    : targetRegTitle;

  const lookupColDef = selectedRegister?.columns.find(c => c.id === lookupColId) || selectedRegister?.columns[0];
  const returnColDef = selectedRegister?.columns.find(c => c.id === returnColId) || selectedRegister?.columns[1];

  const lookupColIdx = selectedRegister?.columns.findIndex(c => c.id === lookupColId) ?? 0;
  const returnColIdx = selectedRegister?.columns.findIndex(c => c.id === returnColId) ?? 1;

  const lookupColLetter = colIndexToLetter(Math.max(0, lookupColIdx));
  const returnColLetter = colIndexToLetter(Math.max(0, returnColIdx));

  // Compute generated formula
  let generatedFormula = '';
  if (functionType === 'XLOOKUP') {
    generatedFormula = `=XLOOKUP(${searchKeyCell}, ${safeSheetRef}!${lookupColLetter}:${lookupColLetter}, ${safeSheetRef}!${returnColLetter}:${returnColLetter}, "${fallbackValue}")`;
  } else if (functionType === 'VLOOKUP') {
    const minColIdx = Math.min(lookupColIdx, returnColIdx);
    const maxColIdx = Math.max(lookupColIdx, returnColIdx);
    const startL = colIndexToLetter(minColIdx);
    const endL = colIndexToLetter(maxColIdx);
    const colOffset = returnColIdx - lookupColIdx + 1;
    generatedFormula = `=VLOOKUP(${searchKeyCell}, ${safeSheetRef}!${startL}:${endL}, ${Math.max(1, colOffset)}, FALSE)`;
  } else if (functionType === 'HLOOKUP') {
    generatedFormula = `=HLOOKUP(${searchKeyCell}, ${safeSheetRef}!A1:Z50, 2, FALSE)`;
  } else {
    // TABLE_LOOKUP
    generatedFormula = `=TABLE_LOOKUP("${targetRegTitle}", "${lookupColDef?.name || lookupColLetter}", ${searchKeyCell}, "${returnColDef?.name || returnColDef?.id || returnColLetter}", "${fallbackValue}")`;
  }

  // Live test preview from first sample row
  const sampleRow = selectedRegister?.rows?.[0];
  const sampleSearchVal = sampleRow && lookupColDef ? sampleRow[lookupColDef.id] : 'Sample';
  const sampleResultVal = sampleRow && returnColDef ? sampleRow[returnColDef.id] : 'Result';

  const handleApply = () => {
    onInsertFormula(generatedFormula, fillDown ? fillDownRows : 1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="bg-[#1c1c1e] text-white rounded-2xl border border-white/15 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#161618] border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shadow-xs">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Lookup Data from Table / File
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Google Sheets Wizard
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Easily look up values from uploaded Excel files or active data tables into your spreadsheet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-sm">
          {/* Step 1: Select Source Data Table or Uploaded Excel */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              1. Select Source Data Table / File
            </label>
            <div className="relative">
              <select
                value={selectedRegId}
                onChange={(e) => setSelectedRegId(e.target.value)}
                className="w-full bg-[#242426] border border-white/15 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white appearance-none cursor-pointer focus:outline-none"
              >
                {registers.map((reg) => (
                  <option key={reg.id} value={reg.id} className="bg-[#1c1c1e] text-white">
                    {reg.title} ({reg.rows.length} rows, {reg.columns.length} columns)
                  </option>
                ))}
              </select>
              <Database className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">
              Select any table or uploaded Excel register. Formulas can reference data directly across files.
            </p>
          </div>

          {/* Step 2: Choose Lookup Function */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              2. Lookup Function
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'XLOOKUP', name: 'XLOOKUP', tag: 'Recommended', desc: 'Modern & exact match' },
                { id: 'VLOOKUP', name: 'VLOOKUP', tag: 'Classic', desc: 'Vertical column index' },
                { id: 'HLOOKUP', name: 'HLOOKUP', tag: 'Horizontal', desc: 'Row-wise lookup' },
                { id: 'TABLE_LOOKUP', name: 'TABLE_LOOKUP', tag: 'Direct Name', desc: 'By Column Header' },
              ].map((fn) => {
                const isActive = functionType === fn.id;
                return (
                  <button
                    key={fn.id}
                    type="button"
                    onClick={() => setFunctionType(fn.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-xs ring-1 ring-emerald-500/30'
                        : 'bg-[#242426] border-white/10 text-zinc-300 hover:bg-[#2c2c2e]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{fn.name}</span>
                      {isActive && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">{fn.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Configure Parameters */}
          <div className="bg-[#18181a] p-4 rounded-xl border border-white/10 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Search Key Cell */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Lookup Value Cell (in this sheet)
                </label>
                <input
                  type="text"
                  value={searchKeyCell}
                  onChange={(e) => setSearchKeyCell(e.target.value.toUpperCase().trim())}
                  placeholder="e.g. A2"
                  className="w-full bg-[#242426] border border-white/15 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Cell containing value to search for (e.g. Roll No, ID, Name)
                </span>
              </div>

              {/* Fallback Value */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Missing Value (If Not Found)
                </label>
                <input
                  type="text"
                  value={fallbackValue}
                  onChange={(e) => setFallbackValue(e.target.value)}
                  placeholder='e.g. Not Found or -'
                  className="w-full bg-[#242426] border border-white/15 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Returned if the key doesn't match any row
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Lookup Column in Source */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Lookup Column in Source Table
                </label>
                <select
                  value={lookupColId}
                  onChange={(e) => setLookupColId(e.target.value)}
                  className="w-full bg-[#242426] border border-white/15 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-medium text-white cursor-pointer focus:outline-none"
                >
                  {selectedRegister?.columns.map((col, idx) => (
                    <option key={col.id} value={col.id} className="bg-[#1c1c1e] text-white">
                      Column {colIndexToLetter(idx)}: {col.name} ({col.type})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Column compared against <span className="text-emerald-400 font-mono">{searchKeyCell}</span>
                </span>
              </div>

              {/* Return Column in Source */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Return Column to Fetch
                </label>
                <select
                  value={returnColId}
                  onChange={(e) => setReturnColId(e.target.value)}
                  className="w-full bg-[#242426] border border-white/15 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs font-medium text-white cursor-pointer focus:outline-none"
                >
                  {selectedRegister?.columns.map((col, idx) => (
                    <option key={col.id} value={col.id} className="bg-[#1c1c1e] text-white">
                      Column {colIndexToLetter(idx)}: {col.name} ({col.type})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Value pulled into your sheet when match is found
                </span>
              </div>
            </div>
          </div>

          {/* Step 4: Formula Preview & Instant Test */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center justify-between">
              <span>Generated Formula</span>
              <span className="text-[11px] font-normal text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready to Insert
              </span>
            </label>
            <div className="bg-[#111113] p-3 rounded-xl border border-emerald-500/30 text-xs font-mono text-emerald-300 break-all select-all">
              {generatedFormula}
            </div>

            {/* Test Match Sample */}
            {sampleRow && (
              <div className="mt-2 text-xs bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Sample match test: When <span className="font-mono text-white">{searchKeyCell}</span> = <strong>"{String(sampleSearchVal)}"</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-zinc-400" />
                  <span className="font-bold text-emerald-400">"{String(sampleResultVal)}"</span>
                </div>
              </div>
            )}
          </div>

          {/* Options: Auto-fill down */}
          <div className="pt-1 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={fillDown}
                onChange={(e) => setFillDown(e.target.checked)}
                className="rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-0 cursor-pointer w-4 h-4"
              />
              <span>Auto-fill formula down column</span>
            </label>

            {fillDown && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Rows to populate:</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={fillDownRows}
                  onChange={(e) => setFillDownRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-16 bg-[#242426] border border-white/15 rounded-lg px-2 py-1 text-xs text-center font-bold text-white focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#161618] border-t border-white/10 px-5 py-3.5 flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Selected Cell: <span className="font-mono font-bold text-white">
              {selectedCell ? `${colIndexToLetter(selectedCell.col)}${selectedCell.row + 1}` : 'A1'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 rounded-xl text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              Insert Formula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
