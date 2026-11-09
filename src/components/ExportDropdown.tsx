import React, { useState, useRef, useEffect } from 'react';
import { FileSpreadsheet, ChevronDown, Download, FileText, Check } from 'lucide-react';

export interface ExportDropdownProps {
  onExportXLSX: () => void;
  onExportCSV: () => void;
  label?: string;
  sublabel?: string;
  title?: string;
  variant?: 'emerald' | 'blue' | 'zinc' | 'compact' | 'header';
  className?: string;
  disabled?: boolean;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  onExportXLSX,
  onExportCSV,
  label = 'Excel / CSV',
  title = 'Export data to Excel or CSV file',
  variant = 'emerald',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'emerald':
        return 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30';
      case 'blue':
        return 'text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/30';
      case 'compact':
        return 'text-zinc-300 bg-[#2c2c2e] hover:bg-[#38383c] border-white/10 text-xs px-2 py-1';
      case 'header':
        return 'text-emerald-400 bg-[#1c1c1e] hover:bg-emerald-500/15 border-white/10 hover:border-emerald-500/30';
      case 'zinc':
      default:
        return 'text-zinc-200 bg-[#2c2c2e] hover:bg-[#38383c] border-white/10';
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        title={title}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-xs ${getVariantStyles()}`}
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 bg-[#222225] border border-white/15 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
          <div className="px-2.5 py-1.5 border-b border-white/10 mb-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Export Spreadsheet
            </span>
            <span className="text-[11px] text-zinc-500">Choose your preferred file format</span>
          </div>

          {/* Option 1: Microsoft Excel (.xlsx) */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onExportXLSX();
            }}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-emerald-500/15 group transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">
                <span>Excel Workbook</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400">.xlsx</span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">Microsoft Excel formatted sheets & formulas</p>
            </div>
          </button>

          {/* Option 2: CSV File (.csv) */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onExportCSV();
            }}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-blue-500/15 group transition-colors text-left cursor-pointer mt-0.5"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white group-hover:text-blue-300 flex items-center gap-1">
                <span>CSV Text File</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-500/20 text-blue-400">.csv</span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">Universal UTF-8 text for all spreadsheet apps</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
