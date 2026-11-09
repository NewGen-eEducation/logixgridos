import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Register } from '../types/register';
import { Language, translations } from '../utils/translations';
import { ConfirmModal } from './ConfirmModal';
import { parseAllExcelSheets } from '../utils/excelImport';
import { ExportDropdown } from './ExportDropdown';
import { 
  FolderPlus, 
  BookOpen, 
  GraduationCap, 
  ReceiptIndianRupee, 
  Package, 
  RotateCcw,
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  X,
  Search,
  ChevronDown,
  Check,
  Upload,
  Table2,
  Layers,
  Sparkles,
  FileCheck,
  Edit3
} from 'lucide-react';
import { RenameRegisterModal } from './RenameRegisterModal';

interface RegisterSelectorProps {
  registers: Register[];
  activeRegisterId: string;
  onSelectRegister: (id: string) => void;
  onCreateRegister: (title: string, desc: string, category: 'education' | 'finance' | 'inventory' | 'custom') => void;
  onDeleteRegister: (id: string) => void;
  onRenameRegister?: (id: string, newTitle: string, newTitleTe?: string, newDesc?: string) => void;
  onResetDefaults: () => void;
  onOpenExcelImportModal?: () => void;
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  onUploadExcelDirect?: (newRegisters: Register[]) => void;
  onOpenSheet?: () => void;
  lang: Language;
  isFitToScreen?: boolean;
}

export const RegisterSelector: React.FC<RegisterSelectorProps> = ({
  registers,
  activeRegisterId,
  onSelectRegister,
  onCreateRegister,
  onDeleteRegister,
  onRenameRegister,
  onResetDefaults,
  onOpenExcelImportModal,
  onExportExcel,
  onExportCSV,
  onUploadExcelDirect,
  onOpenSheet,
  lang,
  isFitToScreen = true,
}) => {
  const t = translations[lang];

  // Dropdown Open State
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'excel' | 'table'>('all');
  const [isDirectUploading, setIsDirectUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'education' | 'finance' | 'inventory' | 'custom'>('custom');
  const [renamingRegister, setRenamingRegister] = useState<Register | null>(null);

  // Deletion modal state
  const [deletingRegId, setDeletingRegId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const directFileInputRef = useRef<HTMLInputElement>(null);

  const activeRegister = registers.find((r) => r.id === activeRegisterId) || registers[0];
  const targetDeleteRegister = registers.find((r) => r.id === deletingRegId);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setUploadError('');
    }
  }, [isOpen]);

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Helper to determine if a register is an uploaded Excel file/sheet
  const isExcelRegister = (reg: Register) => {
    return (
      reg.isExcelUpload === true ||
      !!reg.sourceFileName ||
      !!reg.sheetName ||
      /\.(xlsx|xls|csv|tsv)$/i.test(reg.title)
    );
  };

  // Filtered registers based on search query and filterType
  const filteredRegisters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return registers.filter((reg) => {
      const isExcel = isExcelRegister(reg);

      // Category filter
      if (filterType === 'excel' && !isExcel) return false;
      if (filterType === 'table' && isExcel) return false;

      // Text search query
      if (!q) return true;

      const titleMatch = reg.title.toLowerCase().includes(q);
      const titleTeMatch = reg.titleTe ? reg.titleTe.toLowerCase().includes(q) : false;
      const descMatch = reg.description ? reg.description.toLowerCase().includes(q) : false;
      const fileMatch = reg.sourceFileName ? reg.sourceFileName.toLowerCase().includes(q) : false;
      const sheetMatch = reg.sheetName ? reg.sheetName.toLowerCase().includes(q) : false;
      const colMatch = reg.columns.some((c) => c.name.toLowerCase().includes(q));

      return titleMatch || titleTeMatch || descMatch || fileMatch || sheetMatch || colMatch;
    });
  }, [registers, searchQuery, filterType]);

  const excelCount = useMemo(() => registers.filter(isExcelRegister).length, [registers]);
  const tableCount = registers.length - excelCount;

  // Handle opening and activating selected register/sheet
  const handleSelect = (regId: string) => {
    onSelectRegister(regId);
    if (onOpenSheet) {
      onOpenSheet();
    }
    setIsOpen(false);
  };

  // Handle direct file upload from dropdown
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDirectUploading(true);
    setUploadError('');

    try {
      const parsedSheets = await parseAllExcelSheets(file);
      const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

      const newRegisters: Register[] = parsedSheets.map((sheet, idx) => ({
        id: `reg-excel-${Date.now()}-${idx}`,
        title: parsedSheets.length === 1 ? cleanFileName : `${cleanFileName} - ${sheet.activeSheetName}`,
        description: `Imported from ${file.name} (Sheet: ${sheet.activeSheetName}) with ${sheet.rows.length} records.`,
        category: 'custom',
        columns: sheet.columns,
        rows: sheet.rows,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        themeColor: '#0f9d58',
        sourceFileName: file.name,
        sheetName: sheet.activeSheetName,
        isExcelUpload: true,
      }));

      if (onUploadExcelDirect) {
        onUploadExcelDirect(newRegisters);
      } else {
        newRegisters.forEach((reg) => onCreateRegister(reg.title, reg.description, 'custom'));
      }

      // Automatically open and activate first sheet
      if (newRegisters.length > 0) {
        handleSelect(newRegisters[0].id);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to read spreadsheet file');
    } finally {
      setIsDirectUploading(false);
      if (directFileInputRef.current) {
        directFileInputRef.current.value = '';
      }
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateRegister(newTitle.trim(), newDesc.trim(), newCategory);
    setNewTitle('');
    setNewDesc('');
    setShowCreateModal(false);
    setIsOpen(false);
  };

  // Category Icon helper
  const getCategoryIcon = (reg: Register, size: 'sm' | 'md' = 'sm') => {
    const isExcel = isExcelRegister(reg);
    const boxSize = size === 'md' ? 'w-8 h-8' : 'w-6 h-6';
    const iconSize = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';

    if (isExcel) {
      return (
        <div className={`${boxSize} rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs`}>
          <FileSpreadsheet className={iconSize} />
        </div>
      );
    }

    switch (reg.category) {
      case 'education':
        return (
          <div className={`${boxSize} rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-xs`}>
            <GraduationCap className={iconSize} />
          </div>
        );
      case 'finance':
        return (
          <div className={`${boxSize} rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-xs`}>
            <ReceiptIndianRupee className={iconSize} />
          </div>
        );
      case 'inventory':
        return (
          <div className={`${boxSize} rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs`}>
            <Package className={iconSize} />
          </div>
        );
      default:
        return (
          <div className={`${boxSize} rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-xs`}>
            <BookOpen className={iconSize} />
          </div>
        );
    }
  };

  const activeTitle = (lang === 'te' && activeRegister?.titleTe) ? activeRegister.titleTe : (activeRegister?.title || 'Select Sheet');
  const isActiveExcel = activeRegister ? isExcelRegister(activeRegister) : false;

  return (
    <div className="bg-[#161618] border-b border-white/10 px-2.5 sm:px-5 lg:px-6 py-2 transition-all w-full relative z-30">
      <div className="w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
        
        {/* Dropdown Container */}
        <div className="relative flex-1 min-w-[240px] max-w-2xl" ref={dropdownRef}>
          
          {/* Main Dropdown Trigger Button */}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all cursor-pointer text-left ${
              isOpen
                ? 'bg-[#222226] border-blue-500/60 ring-2 ring-blue-500/20 shadow-lg'
                : 'bg-[#1c1c1e] hover:bg-[#242428] border-white/15 hover:border-white/25 shadow-sm'
            }`}
          >
            {/* Left: Active Icon & Title Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {activeRegister && getCategoryIcon(activeRegister, 'md')}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-white truncate">
                    {activeTitle}
                  </span>
                  {isActiveExcel && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 rounded-md shrink-0">
                      Excel
                    </span>
                  )}
                </div>
                <div className="text-[10px] sm:text-[11px] text-zinc-400 truncate flex items-center gap-1.5">
                  <span className="text-blue-400 font-medium">Active Sheet</span>
                  <span>•</span>
                  <span>{activeRegister?.rows.length || 0} rows</span>
                  <span>•</span>
                  <span>{activeRegister?.columns.length || 0} cols</span>
                  {activeRegister?.sheetName && (
                    <>
                      <span>•</span>
                      <span className="text-zinc-300 font-mono">Sheet: {activeRegister.sheetName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Search Hint & Chevron Icon */}
            <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg text-zinc-400">
                <Search className="w-3 h-3 text-zinc-400" />
                <span>Search / Switch ({registers.length})</span>
              </span>
              <div className={`p-1 rounded-lg bg-white/5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-400' : ''}`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </button>

          {/* Floating Searchable Dropdown Menu */}
          {isOpen && (
            <div 
              role="listbox"
              className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#1c1c1e] text-white rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 flex flex-col max-h-[82vh] sm:max-h-[520px]"
            >
              {/* Dropdown Search Header */}
              <div className="p-3 border-b border-white/10 bg-[#161618] space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tables and uploaded excel sheets..."
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs & Quick Counts */}
                <div className="flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        filterType === 'all'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-[#2c2c2e] text-zinc-400 hover:text-white'
                      }`}
                    >
                      All ({registers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('excel')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                        filterType === 'excel'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[#2c2c2e] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                      <span>Excel Sheets ({excelCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('table')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                        filterType === 'table'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-[#2c2c2e] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Table2 className="w-3 h-3 text-purple-400" />
                      <span>Tables ({tableCount})</span>
                    </button>
                  </div>

                  <span className="text-[10px] text-zinc-500 font-mono shrink-0 hidden sm:inline">
                    {filteredRegisters.length} found
                  </span>
                </div>
              </div>

              {/* Upload Error Banner if any */}
              {uploadError && (
                <div className="mx-3 mt-2 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
                  <span>{uploadError}</span>
                  <button onClick={() => setUploadError('')} className="text-rose-300 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Direct Upload Actions inside dropdown */}
              <div className="p-2 border-b border-white/10 bg-[#19191c] flex items-center gap-2">
                {/* Hidden input for direct Excel file selection */}
                <input
                  ref={directFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  onChange={handleDirectFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isDirectUploading}
                  onClick={() => directFileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  title="Upload .xlsx or .csv workbook - automatically adds all sheets to dropdown"
                >
                  {isDirectUploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span>Reading workbook sheets...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+ Upload Excel / CSV</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-200 bg-[#2c2c2e] hover:bg-[#3a3a3c] border border-white/10 rounded-xl transition-all cursor-pointer active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>+ New Table</span>
                </button>
              </div>

              {/* Scrollable Results List */}
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1 max-h-[340px] scrollbar-thin">
                {filteredRegisters.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 space-y-2">
                    <Search className="w-6 h-6 mx-auto text-zinc-600" />
                    <p className="text-xs">
                      No tables or sheets match "{searchQuery}"
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                      }}
                      className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-blue-400 font-medium"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  filteredRegisters.map((reg) => {
                    const isActive = reg.id === activeRegisterId;
                    const isExcel = isExcelRegister(reg);
                    const title = (lang === 'te' && reg.titleTe) ? reg.titleTe : reg.title;

                    return (
                      <div
                        key={reg.id}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => handleSelect(reg.id)}
                        className={`group w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl text-left transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-blue-600/15 border-blue-500/40 text-white shadow-xs'
                            : 'bg-[#222226]/50 hover:bg-[#2c2c30] border-transparent hover:border-white/10 text-zinc-300 hover:text-white'
                        }`}
                      >
                        {/* Icon & Details */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {getCategoryIcon(reg, 'md')}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs sm:text-sm truncate ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                                {title}
                              </span>
                              {isExcel && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded-md font-mono shrink-0">
                                  EXCEL
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1.5 mt-0.5">
                              {reg.sourceFileName ? (
                                <span className="text-zinc-300 truncate max-w-[150px]">
                                  {reg.sourceFileName}
                                </span>
                              ) : (
                                <span className="capitalize text-zinc-400">{reg.category}</span>
                              )}
                              {reg.sheetName && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-400 font-mono font-medium truncate">
                                    Sheet: {reg.sheetName}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-mono">{reg.rows.length} rows</span>
                              <span>•</span>
                              <span className="font-mono">{reg.columns.length} cols</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Active Indicator, Rename, and Delete Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isActive && (
                            <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-blue-400 bg-blue-500/20 border border-blue-500/40 px-2 py-0.5 rounded-lg shrink-0">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                              <span>Active</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingRegister(reg);
                            }}
                            title={`Rename "${title}"`}
                            aria-label={`Rename ${title}`}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:text-white bg-blue-500/15 hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-medium">{lang === 'te' ? 'రీనేమ్' : 'Rename'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingRegId(reg.id);
                            }}
                            title={`Delete "${title}"`}
                            aria-label={`Delete ${title}`}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-600 border border-rose-500/30 hover:border-rose-500 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400 hover:text-white" />
                            <span className="text-[11px] font-medium">Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Footer hint */}
              <div className="p-2.5 border-t border-white/10 bg-[#161618] flex items-center justify-between text-[11px] text-zinc-400">
                <span className="truncate">
                  Click any table or Excel sheet to open & activate
                </span>
                <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                  ESC to close
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Side Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Import & Export Excel / CSV Pair */}
          <div className="flex items-center gap-1">
            {onOpenExcelImportModal && (
              <button
                type="button"
                onClick={onOpenExcelImportModal}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
                title="Import Excel or CSV spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import</span>
              </button>
            )}

            {onExportExcel && onExportCSV && (
              <ExportDropdown
                label="Export"
                variant="emerald"
                title="Export current table to Excel (.xlsx) or CSV"
                onExportXLSX={onExportExcel}
                onExportCSV={onExportCSV}
              />
            )}
          </div>

          {/* Quick Rename Active Register Button */}
          {activeRegister && (
            <button
              type="button"
              onClick={() => setRenamingRegister(activeRegister)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-500/15 hover:bg-blue-600 border border-blue-500/30 rounded-xl transition-all whitespace-nowrap cursor-pointer shadow-xs active:scale-95"
              title={lang === 'te' ? 'యాక్టివ్ టేబుల్ పేరు మార్చండి' : 'Rename Active Table / Register'}
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400 hover:text-white" />
              <span>{lang === 'te' ? 'రీనేమ్' : 'Rename'}</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 bg-[#1c1c1e] hover:bg-[#2c2c2e] hover:text-white border border-white/10 rounded-xl transition-all whitespace-nowrap cursor-pointer active:scale-95"
            title="Create New Blank Table"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>+ New Table</span>
          </button>

          
        </div>
      </div>

      {/* Modal for Creating New Register */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#1c1c1e] text-white rounded-t-[28px] sm:rounded-2xl max-w-md w-full border border-white/15 shadow-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden" />
            
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-white">
                  {t.newRegister}
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Ledger, Attendance, Assets"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Short note or purpose"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Category Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['custom', 'education', 'finance', 'inventory'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                        newCategory === cat
                          ? 'bg-blue-500/20 border-blue-500/50 text-white font-semibold'
                          : 'bg-[#2c2c2e] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span className="capitalize">{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0a84ff] hover:bg-[#0071e3] rounded-lg shadow-sm transition-all cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Register Modal */}
      <ConfirmModal
        isOpen={deletingRegId !== null}
        title={t.deleteRegister || 'Delete Register'}
        message={`Delete "${targetDeleteRegister?.title || 'Register'}" and all of its ${targetDeleteRegister?.rows.length || 0} response records? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          if (deletingRegId) {
            onDeleteRegister(deletingRegId);
            setDeletingRegId(null);
          }
        }}
        onClose={() => setDeletingRegId(null)}
      />

      {/* Confirm Reset Defaults Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset Default Registers"
        message="This will reset all registers and forms back to the default initial sample data. Any custom modifications will be lost."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        isDestructive={false}
        onConfirm={() => {
          onResetDefaults();
          setShowResetConfirm(false);
        }}
        onClose={() => setShowResetConfirm(false)}
      />

      {/* Rename Register Modal */}
      {renamingRegister && (
        <RenameRegisterModal
          isOpen={Boolean(renamingRegister)}
          onClose={() => setRenamingRegister(null)}
          register={renamingRegister}
          lang={lang}
          onSave={(id, newTitle, newTitleTe, newDesc) => {
            if (onRenameRegister) {
              onRenameRegister(id, newTitle, newTitleTe, newDesc);
            }
            setRenamingRegister(null);
          }}
        />
      )}
    </div>
  );
};
