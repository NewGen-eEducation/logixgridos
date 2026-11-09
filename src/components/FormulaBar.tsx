import React, { useState, useEffect, useRef } from 'react';
import { 
  Calculator, 
  HelpCircle, 
  X, 
  ChevronRight, 
  Search, 
  Check, 
  CornerDownLeft, 
  Table, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { 
  GOOGLE_SHEETS_FUNCTIONS_LIST, 
  SheetFunctionDoc, 
  colIndexToLetter 
} from '../utils/googleSheetFormulaEngine';

interface FormulaBarProps {
  selectedCell: { rowIndex: number; colIndex: number; colId: string; colName: string } | null;
  currentValue: any;
  onChange: (val: any) => void;
  onCommit: () => void;
  onCancel: () => void;
  totalRows: number;
  totalCols: number;
}

export const FormulaBar: React.FC<FormulaBarProps> = ({
  selectedCell,
  currentValue,
  onChange,
  onCommit,
  onCancel,
  totalRows,
  totalCols,
}) => {
  const [showHelper, setShowHelper] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeFunction, setActiveFunction] = useState<SheetFunctionDoc | null>(null);
  const [suggestions, setSuggestions] = useState<SheetFunctionDoc[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const valStr = currentValue === null || currentValue === undefined ? '' : String(currentValue);

  // Compute cell address: e.g., A1, B5
  const cellAddress = selectedCell !== null 
    ? `${colIndexToLetter(selectedCell.colIndex)}${selectedCell.rowIndex + 1}`
    : 'A1';

  // Autocomplete suggestions as user types "=FUN..."
  useEffect(() => {
    if (valStr.startsWith('=')) {
      const match = valStr.match(/=([A-Za-z0-9._]*)$/);
      if (match && match[1]) {
        const prefix = match[1].toUpperCase();
        const matched = GOOGLE_SHEETS_FUNCTIONS_LIST.filter(f => f.name.startsWith(prefix)).slice(0, 8);
        setSuggestions(matched);
        setSuggestionIndex(0);
        return;
      }
    }
    setSuggestions([]);
  }, [valStr]);

  const insertFunction = (fn: SheetFunctionDoc) => {
    let newVal = `=${fn.name}(`;
    onChange(newVal);
    setSuggestions([]);
    setShowHelper(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        insertFunction(suggestions[suggestionIndex]);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onCommit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const categories = ['All', 'Math', 'Statistical', 'Logical', 'Text', 'Date & Time', 'Lookup', 'Financial'];

  const filteredFunctions = GOOGLE_SHEETS_FUNCTIONS_LIST.filter(fn => {
    const matchesCat = selectedCategory === 'All' || fn.category === selectedCategory;
    const matchesSearch = fn.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          fn.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="relative z-20 bg-[#161618] border border-white/10 rounded-xl shadow-md p-2 flex flex-col gap-1.5 transition-all">
      <div className="flex items-center gap-2">
        {/* Cell Name Box (e.g. A1, B3) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#242426] border border-white/10 text-white font-mono text-xs font-bold tracking-wider shrink-0 min-w-[70px] justify-center">
          <Table className="w-3.5 h-3.5 text-blue-400" />
          <span>{cellAddress}</span>
        </div>

        {/* Function symbol (fx) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowHelper(!showHelper)}
            title="Google Sheet Functions Library (fx)"
            className={`flex items-center justify-center px-2 py-1 rounded-lg border font-mono font-bold text-xs transition-colors ${
              showHelper 
                ? 'bg-blue-600 border-blue-500 text-white shadow-sm' 
                : 'bg-[#242426] border-white/10 text-zinc-300 hover:text-white hover:bg-[#2c2c2e]'
            }`}
          >
            <span className="italic font-serif text-sm mr-1 font-bold text-blue-400">fx</span>
            <span className="hidden sm:inline text-[11px] font-sans font-medium">Formulas</span>
          </button>
        </div>

        {/* Formula Input Bar */}
        <div className="relative flex-1 flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={valStr}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Type a value or formula starting with "=" (e.g. =SUM(A1:A5), =AVERAGE(B1:B10), =IF(C1>50, "Pass", "Fail"))'
            className="w-full pl-3 pr-20 py-1.5 text-xs bg-[#1f1f22] border border-white/10 rounded-lg text-white font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-zinc-600 placeholder:font-sans"
          />

          {/* Quick Actions (Commit Check & Cancel X) */}
          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={onCommit}
              title="Apply formula (Enter)"
              className="p-1 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onCancel}
              title="Cancel (Esc)"
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Autocomplete Dropdown while typing */}
          {suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full max-w-md bg-[#1f1f23] border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-1.5 bg-[#26262b] border-b border-white/10 flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" /> Google Sheets Suggestions
                </span>
                <span className="text-[10px] text-zinc-500">Press Tab or Enter to select</span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-white/5">
                {suggestions.map((s, idx) => (
                  <div
                    key={s.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertFunction(s);
                    }}
                    className={`p-2 cursor-pointer flex items-start justify-between gap-2 text-xs transition-colors ${
                      idx === suggestionIndex ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-bold">{s.name}</div>
                      <div className={`text-[11px] font-mono ${idx === suggestionIndex ? 'text-blue-100' : 'text-zinc-400'}`}>
                        {s.syntax}
                      </div>
                      <div className={`text-[10px] line-clamp-1 mt-0.5 ${idx === suggestionIndex ? 'text-white/80' : 'text-zinc-500'}`}>
                        {s.description}
                      </div>
                    </div>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      idx === suggestionIndex ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400'
                    }`}>
                      {s.category}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Function Library Modal / Drawer */}
      {showHelper && (
        <div className="mt-2 p-3 bg-[#1c1c1f] border border-white/10 rounded-xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Google Sheets Functions Library ({GOOGLE_SHEETS_FUNCTIONS_LIST.length}+ available)
              </h4>
            </div>
            <button
              onClick={() => setShowHelper(false)}
              className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Category Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-[#26262a] text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search formula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1 text-xs bg-[#242428] border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Grid of Function Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {filteredFunctions.map((fn) => (
              <div
                key={fn.name}
                onClick={() => insertFunction(fn)}
                className="p-2.5 rounded-xl bg-[#232327] hover:bg-[#2b2b30] border border-white/5 hover:border-blue-500/40 cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-blue-400 group-hover:text-blue-300">
                      {fn.name}
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                      {fn.category}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-300 mt-1 line-clamp-1">
                    {fn.syntax}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
                    {fn.description}
                  </div>
                </div>
                <div className="mt-2 pt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="font-mono text-emerald-400/80">{fn.example}</span>
                  <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform">Insert →</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 flex items-center justify-between">
            <span>💡 <strong>Tip:</strong> You can reference cells like <code className="bg-black/30 px-1 py-0.5 rounded text-white font-mono">A1</code>, ranges like <code className="bg-black/30 px-1 py-0.5 rounded text-white font-mono">A1:B10</code>, or column names like <code className="bg-black/30 px-1 py-0.5 rounded text-white font-mono">[internal_marks]</code> in any cell!</span>
          </div>
        </div>
      )}
    </div>
  );
};
