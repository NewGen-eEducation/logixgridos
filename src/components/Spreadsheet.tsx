import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Register, DepartmentProfile } from '../types/register';
import { Language, translations } from '../utils/translations';
import { idbGetItemSync, idbSetItem } from '../utils/indexedDBStorage';
import { 
  SpreadsheetWorkbook, 
  SpreadsheetTab, 
  SheetCell, 
  CellFormat, 
  CellAlign,
  CellVAlign,
  CellWrap,
  CellBorderConfig,
  FloatingChart
} from '../types/spreadsheet';
import { 
  evaluateCellFormula, 
  colIndexToLetter, 
  letterToColIndex, 
  parseCellReference,
  parseRangeReference,
  GOOGLE_SHEETS_FUNCTIONS_LIST,
  SheetDataSource
} from '../utils/googleSheetFormulaEngine';
import { FormulaBar } from './FormulaBar';
import { LookupWizardModal } from './LookupWizardModal';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Trash2, 
  Download, 
  Printer, 
  RotateCcw, 
  RotateCw, 
  Bold, 
  Italic, 
  Strikethrough, 
  Underline,
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Percent, 
  IndianRupee, 
  Sparkles, 
  Grid, 
  Check, 
  ChevronDown, 
  ChevronRight,
  Maximize2, 
  Minimize2, 
  Copy, 
  FileDown, 
  Database,
  HelpCircle,
  X,
  ExternalLink,
  TableProperties,
  PaintBucket,
  Palette,
  Filter,
  BarChart3,
  LineChart,
  PieChart,
  CheckSquare,
  ListFilter,
  ZoomIn,
  Move,
  Sigma,
  Undo2,
  Redo2,
  Scissors,
  Clipboard,
  FileText,
  Star,
  Cloud
} from 'lucide-react';

interface SpreadsheetProps {
  registers: Register[];
  activeRegisterId: string;
  onSelectRegister: (id: string) => void;
  deptProfile?: DepartmentProfile;
  lang: Language;
}

const STORAGE_KEY_WORKBOOK = 'dyn_google_spreadsheet_v3';
const DEFAULT_ROWS = 60;
const DEFAULT_COLS = 26; // A to Z

// Standard Google Sheets Color Palette
const GOOGLE_SHEETS_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#134e4a', '#064e3b', '#1e3a8a', '#312e81', '#4c1d95', '#701a75', '#881337', '#18181b', '#27272a', '#3f3f46'
];

// Helper to create an initial demo workbook with working lookups, formulas and design
function createInitialWorkbook(registers: Register[]): SpreadsheetWorkbook {
  const activeReg = registers[0];
  const regTitle = activeReg?.title || 'Data Table';
  const safeSheetRef = regTitle.includes(' ') ? `'${regTitle}'` : regTitle;

  const demoCells: Record<string, SheetCell> = {};

  // Row 0: Banner / Title
  demoCells['R0C0'] = { 
    raw: 'Google Sheets & Real-Time Data Studio', 
    bold: true, 
    fontSize: 16,
    bgColor: '#134e4a', 
    textColor: '#2dd4bf', 
    align: 'left' 
  };
  demoCells['R1C0'] = { 
    raw: '100% Google Sheets Features: Formulas (=SUM, =AVERAGE, =IF, =XLOOKUP, =VLOOKUP), Formatting, Checkboxes, Dropdowns & Charts!', 
    italic: true, 
    fontSize: 11,
    textColor: '#a1a1aa' 
  };

  // Headers (Row 3)
  const headers = ['Roll No / Key', 'Student Name', 'Status', 'Marks (Lookup)', 'Performance Grade', 'Active'];
  headers.forEach((h, col) => {
    demoCells[`R3C${col}`] = { 
      raw: h, 
      bold: true, 
      bgColor: '#1f2937', 
      textColor: '#f9fafb', 
      align: 'center',
      border: { bottom: true, color: '#38bdf8' }
    };
  });

  // Sample data keys
  const sampleKeys = activeReg?.rows?.slice(0, 5).map(r => {
    const col0Id = activeReg.columns[0]?.id;
    return col0Id ? String(r[col0Id]) : '101';
  }) || ['101', '102', '103', '104', '105'];

  sampleKeys.forEach((key, idx) => {
    const row = 4 + idx;
    // Col A: Key
    demoCells[`R${row}C0`] = { raw: key, align: 'center' };
    // Col B: XLOOKUP formula
    demoCells[`R${row}C1`] = { 
      raw: `=XLOOKUP(A${row + 1}, ${safeSheetRef}!A:A, ${safeSheetRef}!B:B, "Student ${idx + 1}")`,
      align: 'left' 
    };
    // Col C: Status dropdown
    demoCells[`R${row}C2`] = { 
      raw: idx % 2 === 0 ? 'Regular' : 'Self-Financed', 
      align: 'center',
      validationType: 'dropdown',
      validationOptions: ['Regular', 'Self-Financed', 'Scholarship', 'Management']
    };
    // Col D: Numeric marks
    const markVal = 70 + (idx * 5);
    demoCells[`R${row}C3`] = { 
      raw: markVal, 
      align: 'right',
      format: 'number'
    };
    // Col E: IF Formula
    demoCells[`R${row}C4`] = { 
      raw: `=IF(D${row + 1}>=80, "Distinction", IF(D${row + 1}>=60, "First Class", "Pass"))`,
      align: 'center',
      bold: true,
      textColor: '#6ee7b7'
    };
    // Col F: Checkbox / Tick box
    demoCells[`R${row}C5`] = { 
      raw: true, 
      align: 'center',
      validationType: 'checkbox'
    };
  });

  // Summary row
  demoCells['R10C2'] = { raw: 'Average Marks:', bold: true, align: 'right' };
  demoCells['R10C3'] = { raw: '=AVERAGE(D5:D9)', bold: true, bgColor: '#064e3b', textColor: '#6ee7b7', align: 'right', format: 'number' };
  demoCells['R11C2'] = { raw: 'Total Sum:', bold: true, align: 'right' };
  demoCells['R11C3'] = { raw: '=SUM(D5:D9)', bold: true, bgColor: '#1e3a8a', textColor: '#93c5fd', align: 'right', format: 'number' };

  // Floating chart demo
  const initialCharts: FloatingChart[] = [
    {
      id: 'chart-1',
      type: 'bar',
      title: 'Marks Performance Chart',
      dataRange: 'A4:D9',
      x: 640,
      y: 80,
      width: 380,
      height: 240
    }
  ];

  return {
    id: 'wb_default',
    title: `${regTitle} - Google Sheets`,
    activeSheetId: 'sheet_1',
    sheets: [
      {
        id: 'sheet_1',
        name: 'Overview Sheet',
        cells: demoCells,
        rowCount: DEFAULT_ROWS,
        colCount: DEFAULT_COLS,
        charts: initialCharts
      },
      {
        id: 'sheet_2',
        name: 'Calculations',
        cells: {},
        rowCount: DEFAULT_ROWS,
        colCount: DEFAULT_COLS,
      }
    ],
    updatedAt: new Date().toISOString(),
  };
}

export const Spreadsheet: React.FC<SpreadsheetProps> = ({
  registers,
  activeRegisterId,
  onSelectRegister,
  deptProfile,
  lang,
}) => {
  // Load workbook from IndexedDB or initialize
  const [workbook, setWorkbook] = useState<SpreadsheetWorkbook>(() => {
    try {
      const saved = idbGetItemSync<SpreadsheetWorkbook | string>(STORAGE_KEY_WORKBOOK);
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (parsed && Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return createInitialWorkbook(registers);
  });

  // Active sheet
  const activeSheet = useMemo(() => {
    return workbook.sheets.find((s) => s.id === workbook.activeSheetId) || workbook.sheets[0];
  }, [workbook]);

  // Selected cell & range
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>({ row: 4, col: 1 });
  const [selectionRange, setSelectionRange] = useState<{ startRow: number; startCol: number; endRow: number; endCol: number } | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  
  // Inline editing
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  
  // Fill handle dragging
  const [isDraggingFill, setIsDraggingFill] = useState(false);
  const [dragFillEndRow, setDragFillEndRow] = useState<number | null>(null);

  // Zoom level (100% default)
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Active menu dropdowns
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'bg' | null>(null);
  const [showBordersMenu, setShowBordersMenu] = useState(false);
  const [showFunctionsMenu, setShowFunctionsMenu] = useState(false);
  const [showFormatsMenu, setShowFormatsMenu] = useState(false);
  const [showDropdownOptionsModal, setShowDropdownOptionsModal] = useState(false);
  const [dropdownOptionsDraft, setDropdownOptionsDraft] = useState<string>('Option 1, Option 2, Option 3');

  // Modals & Panels
  const [isLookupWizardOpen, setIsLookupWizardOpen] = useState(false);
  const [showFunctionGuide, setShowFunctionGuide] = useState(false);
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameSheetName, setRenameSheetName] = useState('');
  const [showImportTableMenu, setShowImportTableMenu] = useState(false);

  // Moving floating charts
  const [movingChartId, setMovingChartId] = useState<string | null>(null);
  const [chartDragOffset, setChartDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Grid column widths state
  const [colWidths, setColWidths] = useState<Record<number, number>>(() => activeSheet.colWidths || {});
  const [resizingCol, setResizingCol] = useState<{ col: number; startX: number; startW: number } | null>(null);

  // Undo / Redo history
  const historyRef = useRef<SpreadsheetWorkbook[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const saveHistory = useCallback((newWb: SpreadsheetWorkbook) => {
    const curIdx = historyIndexRef.current;
    const nextHistory = historyRef.current.slice(0, curIdx + 1);
    nextHistory.push(JSON.parse(JSON.stringify(newWb)));
    if (nextHistory.length > 30) nextHistory.shift();
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
  }, []);

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const prev = historyRef.current[historyIndexRef.current];
      setWorkbook(JSON.parse(JSON.stringify(prev)));
    }
  };

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const next = historyRef.current[historyIndexRef.current];
      setWorkbook(JSON.parse(JSON.stringify(next)));
    }
  };

  // Sync workbook to IndexedDB
  useEffect(() => {
    try {
      idbSetItem(STORAGE_KEY_WORKBOOK, workbook);
    } catch {
      // ignore
    }
  }, [workbook]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenu(null);
      setShowColorPicker(null);
      setShowBordersMenu(false);
      setShowFunctionsMenu(false);
      setShowFormatsMenu(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Construct dictionary for formula engine
  const formulaSheetsDict = useMemo(() => {
    const dict: Record<string, SheetDataSource> = {};

    workbook.sheets.forEach((sh) => {
      const maxR = sh.rowCount;
      const maxC = sh.colCount;
      const cols = Array.from({ length: maxC }, (_, c) => ({
        id: `c_${c}`,
        name: colIndexToLetter(c),
      }));

      const rows: Record<string, any>[] = [];
      for (let r = 0; r < maxR; r++) {
        const rowObj: Record<string, any> = {};
        for (let c = 0; c < maxC; c++) {
          const cell = sh.cells[`R${r}C${c}`];
          rowObj[`c_${c}`] = cell ? cell.raw : '';
        }
        rows.push(rowObj);
      }

      dict[sh.name] = {
        id: sh.id,
        name: sh.name,
        rows,
        columns: cols,
      };
    });

    registers.forEach((reg) => {
      dict[reg.title] = {
        id: reg.id,
        name: reg.title,
        title: reg.title,
        rows: reg.rows,
        columns: reg.columns,
      };
    });

    const activeReg = registers.find(r => r.id === activeRegisterId) || registers[0];
    if (activeReg) {
      dict['Active Register'] = {
        id: activeReg.id,
        name: 'Active Register',
        title: activeReg.title,
        rows: activeReg.rows,
        columns: activeReg.columns,
      };
    }

    return dict;
  }, [workbook.sheets, registers, activeRegisterId]);

  // Evaluate cell formula
  const getComputedCellValue = useCallback((raw: any, row: number, col: number) => {
    if (raw === null || raw === undefined) return '';
    if (typeof raw !== 'string' || !raw.trim().startsWith('=')) return raw;

    const currentSheetCols = Array.from({ length: activeSheet.colCount }, (_, c) => ({
      id: `c_${c}`,
      name: colIndexToLetter(c),
    }));

    const currentSheetRows = Array.from({ length: activeSheet.rowCount }, (_, r) => {
      const obj: Record<string, any> = {};
      for (let c = 0; c < activeSheet.colCount; c++) {
        const cell = activeSheet.cells[`R${r}C${c}`];
        obj[`c_${c}`] = cell ? cell.raw : '';
      }
      return obj;
    });

    return evaluateCellFormula(
      raw,
      row,
      col,
      currentSheetRows,
      currentSheetCols,
      formulaSheetsDict
    );
  }, [activeSheet, formulaSheetsDict]);

  // Selected cell current raw value
  const activeCellKey = selectedCell ? `R${selectedCell.row}C${selectedCell.col}` : null;
  const activeCellRaw = activeCellKey ? activeSheet.cells[activeCellKey]?.raw ?? '' : '';

  // Commit editing to active cell
  const commitEdit = (newVal: any) => {
    if (!selectedCell) return;
    const cellKey = `R${selectedCell.row}C${selectedCell.col}`;
    const prevCell = activeSheet.cells[cellKey] || { raw: '' };

    const updatedCells = {
      ...activeSheet.cells,
      [cellKey]: {
        ...prevCell,
        raw: newVal,
      },
    };

    const nextSheets = workbook.sheets.map((s) => (s.id === activeSheet.id ? { ...s, cells: updatedCells } : s));
    const nextWb = { ...workbook, sheets: nextSheets, updatedAt: new Date().toISOString() };
    saveHistory(nextWb);
    setWorkbook(nextWb);
    setIsEditing(false);
  };

  // Format toggles
  const updateActiveCellStyle = (styleUpdate: Partial<SheetCell>) => {
    if (!selectedCell) return;

    const targetCells: string[] = [];
    if (selectionRange) {
      for (let r = selectionRange.startRow; r <= selectionRange.endRow; r++) {
        for (let c = selectionRange.startCol; c <= selectionRange.endCol; c++) {
          targetCells.push(`R${r}C${c}`);
        }
      }
    } else {
      targetCells.push(`R${selectedCell.row}C${selectedCell.col}`);
    }

    const updatedCells = { ...activeSheet.cells };
    targetCells.forEach(key => {
      const prev = updatedCells[key] || { raw: '' };
      updatedCells[key] = { ...prev, ...styleUpdate };
    });

    const nextSheets = workbook.sheets.map((s) => (s.id === activeSheet.id ? { ...s, cells: updatedCells } : s));
    const nextWb = { ...workbook, sheets: nextSheets, updatedAt: new Date().toISOString() };
    saveHistory(nextWb);
    setWorkbook(nextWb);
  };

  // Keyboard navigation on grid
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;

    if (isEditing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit(editValue);
        if (selectedCell.row < activeSheet.rowCount - 1) {
          setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
          setSelectionRange(null);
        }
      } else if (e.key === 'Escape') {
        setIsEditing(false);
      }
      return;
    }

    // Ctrl shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z') { e.preventDefault(); handleUndo(); return; }
      if (e.key === 'y') { e.preventDefault(); handleRedo(); return; }
      if (e.key === 'b') {
        e.preventDefault();
        const curCell = activeCellKey ? activeSheet.cells[activeCellKey] : null;
        updateActiveCellStyle({ bold: !curCell?.bold });
        return;
      }
      if (e.key === 'i') {
        e.preventDefault();
        const curCell = activeCellKey ? activeSheet.cells[activeCellKey] : null;
        updateActiveCellStyle({ italic: !curCell?.italic });
        return;
      }
      if (e.key === 'u') {
        e.preventDefault();
        const curCell = activeCellKey ? activeSheet.cells[activeCellKey] : null;
        updateActiveCellStyle({ underline: !curCell?.underline });
        return;
      }
      if (e.key === 'p') {
        e.preventDefault();
        window.print();
        return;
      }
    }

    if (e.key === 'ArrowUp' && selectedCell.row > 0) {
      e.preventDefault();
      setSelectedCell({ row: selectedCell.row - 1, col: selectedCell.col });
      setSelectionRange(null);
    } else if (e.key === 'ArrowDown' && selectedCell.row < activeSheet.rowCount - 1) {
      e.preventDefault();
      setSelectedCell({ row: selectedCell.row + 1, col: selectedCell.col });
      setSelectionRange(null);
    } else if (e.key === 'ArrowLeft' && selectedCell.col > 0) {
      e.preventDefault();
      setSelectedCell({ row: selectedCell.row, col: selectedCell.col - 1 });
      setSelectionRange(null);
    } else if (e.key === 'ArrowRight' && selectedCell.col < activeSheet.colCount - 1) {
      e.preventDefault();
      setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 });
      setSelectionRange(null);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(true);
      setEditValue(String(activeCellRaw));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (selectedCell.col < activeSheet.colCount - 1) {
        setSelectedCell({ row: selectedCell.row, col: selectedCell.col + 1 });
        setSelectionRange(null);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      commitEdit('');
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setIsEditing(true);
      setEditValue(e.key);
    }
  };

  // Auto fill handle drag (increments relative cell formulas)
  const handleFillHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingFill(true);
  };

  // Range calculation summary (Bottom Right Explore badge)
  const selectionStats = useMemo(() => {
    let numbers: number[] = [];
    let count = 0;

    if (selectionRange) {
      for (let r = selectionRange.startRow; r <= selectionRange.endRow; r++) {
        for (let c = selectionRange.startCol; c <= selectionRange.endCol; c++) {
          count++;
          const cell = activeSheet.cells[`R${r}C${c}`];
          if (cell) {
            const comp = getComputedCellValue(cell.raw, r, c);
            const num = Number(comp);
            if (!isNaN(num) && String(comp).trim() !== '') {
              numbers.push(num);
            }
          }
        }
      }
    } else if (selectedCell) {
      count = 1;
      const cell = activeSheet.cells[`R${selectedCell.row}C${selectedCell.col}`];
      if (cell) {
        const comp = getComputedCellValue(cell.raw, selectedCell.row, selectedCell.col);
        const num = Number(comp);
        if (!isNaN(num) && String(comp).trim() !== '') {
          numbers.push(num);
        }
      }
    }

    if (numbers.length === 0) {
      return { count, sum: 0, avg: 0, min: 0, max: 0, hasNumbers: false };
    }

    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / numbers.length) * 100) / 100;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);

    return { count, sum, avg, min, max, hasNumbers: true };
  }, [selectionRange, selectedCell, activeSheet.cells, getComputedCellValue]);

  // Insert Floating Chart
  const handleInsertChart = (type: 'bar' | 'line' | 'pie') => {
    const newChart: FloatingChart = {
      id: `chart-${Date.now()}`,
      type,
      title: `${type.toUpperCase()} Chart`,
      dataRange: selectionRange 
        ? `${colIndexToLetter(selectionRange.startCol)}${selectionRange.startRow + 1}:${colIndexToLetter(selectionRange.endCol)}${selectionRange.endRow + 1}`
        : 'A4:D9',
      x: 350,
      y: 120,
      width: 360,
      height: 230
    };

    const nextSheets = workbook.sheets.map(s => {
      if (s.id !== activeSheet.id) return s;
      return { ...s, charts: [...(s.charts || []), newChart] };
    });

    const nextWb = { ...workbook, sheets: nextSheets, updatedAt: new Date().toISOString() };
    saveHistory(nextWb);
    setWorkbook(nextWb);
  };

  // Remove Floating Chart
  const handleRemoveChart = (chartId: string) => {
    const nextSheets = workbook.sheets.map(s => {
      if (s.id !== activeSheet.id) return s;
      return { ...s, charts: (s.charts || []).filter(c => c.id !== chartId) };
    });
    const nextWb = { ...workbook, sheets: nextSheets, updatedAt: new Date().toISOString() };
    saveHistory(nextWb);
    setWorkbook(nextWb);
  };

  // Insert Checkbox (Tick Box)
  const handleInsertCheckbox = () => {
    updateActiveCellStyle({ validationType: 'checkbox', raw: false, align: 'center' });
  };

  // Insert Dropdown
  const handleOpenDropdownConfig = () => {
    setShowDropdownOptionsModal(true);
  };

  const handleApplyDropdownOptions = () => {
    const options = dropdownOptionsDraft.split(',').map(s => s.trim()).filter(Boolean);
    updateActiveCellStyle({ 
      validationType: 'dropdown', 
      validationOptions: options, 
      raw: options[0] || '',
      align: 'center' 
    });
    setShowDropdownOptionsModal(false);
  };

  // Import Current Table Data into a new Sheet
  const handleImportRegisterAsSheet = (reg: Register) => {
    const newSheetId = `sheet_reg_${Date.now()}`;
    const newCells: Record<string, SheetCell> = {};

    reg.columns.forEach((col, cIdx) => {
      newCells[`R0C${cIdx}`] = {
        raw: col.name,
        bold: true,
        bgColor: '#1e293b',
        textColor: '#38bdf8',
        align: 'left',
        border: { bottom: true, color: '#38bdf8' }
      };
    });

    reg.rows.forEach((row, rIdx) => {
      reg.columns.forEach((col, cIdx) => {
        newCells[`R${rIdx + 1}C${cIdx}`] = {
          raw: row[col.id] ?? '',
          align: col.type === 'number' || col.type === 'currency' ? 'right' : 'left',
          format: col.type === 'currency' ? 'currency' : (col.type === 'number' ? 'number' : undefined)
        };
      });
    });

    const newTab: SpreadsheetTab = {
      id: newSheetId,
      name: reg.title.slice(0, 20),
      cells: newCells,
      rowCount: Math.max(DEFAULT_ROWS, reg.rows.length + 15),
      colCount: Math.max(DEFAULT_COLS, reg.columns.length + 5),
    };

    const nextWb = {
      ...workbook,
      sheets: [...workbook.sheets, newTab],
      activeSheetId: newSheetId,
      updatedAt: new Date().toISOString(),
    };
    saveHistory(nextWb);
    setWorkbook(nextWb);
    setShowImportTableMenu(false);
  };

  // Export to Excel XLSX
  const handleExportXLSX = () => {
    const wb = XLSX.utils.book_new();

    workbook.sheets.forEach(sh => {
      const data: any[][] = [];
      for (let r = 0; r < 40; r++) {
        const rowData: any[] = [];
        for (let c = 0; c < 20; c++) {
          const cell = sh.cells[`R${r}C${c}`];
          rowData.push(cell ? getComputedCellValue(cell.raw, r, c) : '');
        }
        data.push(rowData);
      }
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 30));
    });

    XLSX.writeFile(wb, `${workbook.title || 'Google_Spreadsheet'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const data: any[][] = [];
    for (let r = 0; r < 50; r++) {
      const rowData: any[] = [];
      for (let c = 0; c < 20; c++) {
        const cell = activeSheet.cells[`R${r}C${c}`];
        rowData.push(cell ? getComputedCellValue(cell.raw, r, c) : '');
      }
      data.push(rowData);
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSheet.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Add new sheet
  const handleAddNewSheet = () => {
    const count = workbook.sheets.length + 1;
    const newTab: SpreadsheetTab = {
      id: `sheet_${Date.now()}`,
      name: `Sheet${count}`,
      cells: {},
      rowCount: DEFAULT_ROWS,
      colCount: DEFAULT_COLS,
    };
    const nextWb = {
      ...workbook,
      sheets: [...workbook.sheets, newTab],
      activeSheetId: newTab.id,
      updatedAt: new Date().toISOString(),
    };
    saveHistory(nextWb);
    setWorkbook(nextWb);
  };

  // Rename sheet
  const handleRenameSheetSubmit = (sheetId: string) => {
    if (!renameSheetName.trim()) return;
    const nextSheets = workbook.sheets.map(s => s.id === sheetId ? { ...s, name: renameSheetName.trim() } : s);
    const nextWb = { ...workbook, sheets: nextSheets, updatedAt: new Date().toISOString() };
    saveHistory(nextWb);
    setWorkbook(nextWb);
    setRenamingSheetId(null);
  };

  // Delete sheet
  const handleDeleteSheet = (sheetId: string) => {
    if (workbook.sheets.length <= 1) return;
    const remaining = workbook.sheets.filter(s => s.id !== sheetId);
    const nextActive = workbook.activeSheetId === sheetId ? remaining[0].id : workbook.activeSheetId;
    const nextWb = { ...workbook, sheets: remaining, activeSheetId: nextActive, updatedAt: new Date().toISOString() };
    saveHistory(nextWb);
    setWorkbook(nextWb);
  };

  return (
    <div 
      className="bg-[#18181b] text-white rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden w-full focus:outline-none select-none max-w-full"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* 1. Official Google Sheets App Header Bar */}
      <div className="bg-[#121214] border-b border-white/10 px-3 sm:px-4 py-2 flex items-center justify-between gap-3">
        {/* Left: Google Sheets Document Icon, Title, and Menus */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0 shadow-xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            {/* Document Title Line with Star & Cloud Indicator */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workbook.title}
                onChange={(e) => setWorkbook(prev => ({ ...prev, title: e.target.value }))}
                className="bg-transparent hover:bg-white/5 focus:bg-[#202024] px-1 py-0.5 rounded font-bold text-sm text-white focus:outline-none border border-transparent focus:border-emerald-500 max-w-xs sm:max-w-md truncate"
              />
              <Star className="w-3.5 h-3.5 text-zinc-500 hover:text-amber-400 cursor-pointer transition-colors" />
              <span className="text-[10px] text-zinc-400 font-medium hidden md:flex items-center gap-1">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>{lang === 'te' ? 'భద్రపరచబడింది' : 'Saved to app'}</span>
              </span>
            </div>

            {/* Standard Google Sheets Menu Bar: File, Edit, View, Insert, Format, Data, Tools, Help */}
            <div className="flex items-center gap-1 text-[11px] text-zinc-300 pt-0.5 relative">
              {/* File Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}
                  className={`px-2 py-0.5 rounded hover:bg-white/10 ${activeMenu === 'file' ? 'bg-white/10 text-white' : ''}`}
                >
                  File
                </button>
                {activeMenu === 'file' && (
                  <div className="absolute left-0 top-full mt-1 w-52 bg-[#1c1c20] border border-white/15 rounded-lg shadow-2xl p-1 z-50 text-xs">
                    <button onClick={() => { handleAddNewSheet(); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      New Sheet
                    </button>
                    <button onClick={() => { setShowImportTableMenu(true); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Import Data Table
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { handleExportXLSX(); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Download (.xlsx)
                    </button>
                    <button onClick={() => { handleExportCSV(); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Download (.csv)
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { window.print(); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Print (Ctrl+P)
                    </button>
                  </div>
                )}
              </div>

              {/* Edit Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'edit' ? null : 'edit'); }}
                  className={`px-2 py-0.5 rounded hover:bg-white/10 ${activeMenu === 'edit' ? 'bg-white/10 text-white' : ''}`}
                >
                  Edit
                </button>
                {activeMenu === 'edit' && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-[#1c1c20] border border-white/15 rounded-lg shadow-2xl p-1 z-50 text-xs">
                    <button onClick={() => { handleUndo(); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Undo (Ctrl+Z)
                    </button>
                    <button onClick={() => { handleRedo(); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Redo (Ctrl+Y)
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { commitEdit(''); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded text-red-300">
                      Delete cell values
                    </button>
                  </div>
                )}
              </div>

              {/* View Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }}
                  className={`px-2 py-0.5 rounded hover:bg-white/10 ${activeMenu === 'view' ? 'bg-white/10 text-white' : ''}`}
                >
                  View
                </button>
                {activeMenu === 'view' && (
                  <div className="absolute left-0 top-full mt-1 w-44 bg-[#1c1c20] border border-white/15 rounded-lg shadow-2xl p-1 z-50 text-xs">
                    <button onClick={() => { setZoomLevel(100); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Zoom (100%)
                    </button>
                    <button onClick={() => { setZoomLevel(125); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Zoom (125%)
                    </button>
                    <button onClick={() => { setZoomLevel(75); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Zoom (75%)
                    </button>
                  </div>
                )}
              </div>

              {/* Insert Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'insert' ? null : 'insert'); }}
                  className={`px-2 py-0.5 rounded hover:bg-white/10 ${activeMenu === 'insert' ? 'bg-white/10 text-white' : ''}`}
                >
                  Insert
                </button>
                {activeMenu === 'insert' && (
                  <div className="absolute left-0 top-full mt-1 w-56 bg-[#1c1c20] border border-white/15 rounded-lg shadow-2xl p-1 z-50 text-xs">
                    <button onClick={() => { handleInsertChart('bar'); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Insert Chart</span>
                    </button>
                    <button onClick={() => { handleInsertCheckbox(); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded flex items-center gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Checkbox (Tick Box)</span>
                    </button>
                    <button onClick={() => { handleOpenDropdownConfig(); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded flex items-center gap-2">
                      <ListFilter className="w-3.5 h-3.5 text-purple-400" />
                      <span>Dropdown Menu</span>
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { setIsLookupWizardOpen(true); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Lookup Function Wizard</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Format Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'format' ? null : 'format'); }}
                  className={`px-2 py-0.5 rounded hover:bg-white/10 ${activeMenu === 'format' ? 'bg-white/10 text-white' : ''}`}
                >
                  Format
                </button>
                {activeMenu === 'format' && (
                  <div className="absolute left-0 top-full mt-1 w-52 bg-[#1c1c20] border border-white/15 rounded-lg shadow-2xl p-1 z-50 text-xs">
                    <button onClick={() => { updateActiveCellStyle({ format: 'currency' }); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Currency (₹)
                    </button>
                    <button onClick={() => { updateActiveCellStyle({ format: 'percent' }); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Percent (%)
                    </button>
                    <button onClick={() => { updateActiveCellStyle({ format: 'number' }); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Number (1,234.56)
                    </button>
                    <div className="h-px bg-white/10 my-1" />
                    <button onClick={() => { updateActiveCellStyle({ bold: false, italic: false, underline: false, strikethrough: false, bgColor: undefined, textColor: undefined, format: 'general' }); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded text-zinc-400">
                      Clear formatting
                    </button>
                  </div>
                )}
              </div>

              {/* Tools Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === 'tools' ? null : 'tools'); }}
                  className={`px-2 py-0.5 rounded hover:bg-white/10 ${activeMenu === 'tools' ? 'bg-white/10 text-white' : ''}`}
                >
                  Tools
                </button>
                {activeMenu === 'tools' && (
                  <div className="absolute left-0 top-full mt-1 w-52 bg-[#1c1c20] border border-white/15 rounded-lg shadow-2xl p-1 z-50 text-xs">
                    <button onClick={() => { setIsLookupWizardOpen(true); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Lookup from File Wizard
                    </button>
                    <button onClick={() => { setShowFunctionGuide(true); setActiveMenu(null); }} className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded">
                      Google Sheets Formulas
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2">
          {/* Lookup Wizard Quick CTA */}
          <button
            type="button"
            onClick={() => setIsLookupWizardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lookup from File</span>
          </button>

          {/* Import Data Table dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowImportTableMenu(!showImportTableMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-200 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span>Import Table</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {showImportTableMenu && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-[#1c1c20] border border-white/15 rounded-xl shadow-2xl p-1.5 w-64 text-xs">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/10">
                  Select Data Table to Load
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5 mt-1 custom-scrollbar">
                  {registers.map(reg => (
                    <button
                      key={reg.id}
                      onClick={() => handleImportRegisterAsSheet(reg)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-500/20 hover:text-emerald-300 text-zinc-200 flex items-center justify-between"
                    >
                      <span className="truncate font-medium">{reg.title}</span>
                      <span className="text-[10px] text-zinc-400">{reg.rows.length} rows</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Standard Google Sheets Full Action Toolbar */}
      <div className="bg-[#141416] border-b border-white/10 px-3 py-1.5 flex flex-wrap items-center gap-1 text-xs">
        {/* Undo / Redo */}
        <button onClick={handleUndo} className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white" title="Undo (Ctrl+Z)">
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={handleRedo} className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white" title="Redo (Ctrl+Y)">
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        {/* Print */}
        <button onClick={() => window.print()} className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white" title="Print (Ctrl+P)">
          <Printer className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* Number formatting: Currency, Percent, Decimals */}
        <button onClick={() => updateActiveCellStyle({ format: 'currency' })} className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-emerald-400 font-bold" title="Format as Currency (₹)">
          ₹
        </button>
        <button onClick={() => updateActiveCellStyle({ format: 'percent' })} className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-emerald-400" title="Format as Percent (%)">
          <Percent className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* Font styling: Bold, Italic, Strikethrough, Underline */}
        <button 
          onClick={() => {
            const curCell = activeCellKey ? activeSheet.cells[activeCellKey] : null;
            updateActiveCellStyle({ bold: !curCell?.bold });
          }} 
          className={`p-1.5 rounded font-black ${activeCellKey && activeSheet.cells[activeCellKey]?.bold ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-zinc-300'}`} 
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => {
            const curCell = activeCellKey ? activeSheet.cells[activeCellKey] : null;
            updateActiveCellStyle({ italic: !curCell?.italic });
          }} 
          className={`p-1.5 rounded ${activeCellKey && activeSheet.cells[activeCellKey]?.italic ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-zinc-300'}`} 
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => {
            const curCell = activeCellKey ? activeSheet.cells[activeCellKey] : null;
            updateActiveCellStyle({ underline: !curCell?.underline });
          }} 
          className={`p-1.5 rounded ${activeCellKey && activeSheet.cells[activeCellKey]?.underline ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-zinc-300'}`} 
          title="Underline (Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={() => {
            const curCell = activeCellKey ? activeSheet.cells[activeCellKey] : null;
            updateActiveCellStyle({ strikethrough: !curCell?.strikethrough });
          }} 
          className="p-1.5 rounded hover:bg-white/10 text-zinc-300" 
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* Text Color Picker */}
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(showColorPicker === 'text' ? null : 'text'); }}
            className="p-1.5 rounded hover:bg-white/10 flex items-center gap-1 text-zinc-300 hover:text-white" 
            title="Text Color"
          >
            <Palette className="w-3.5 h-3.5 text-blue-400" />
            <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
          </button>
          {showColorPicker === 'text' && (
            <div className="absolute left-0 top-full mt-1 bg-[#202024] border border-white/20 rounded-xl p-2 shadow-2xl z-50 grid grid-cols-10 gap-1 w-52">
              {GOOGLE_SHEETS_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { updateActiveCellStyle({ textColor: c }); setShowColorPicker(null); }}
                  className="w-4 h-4 rounded-sm border border-black/30 hover:scale-125 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Cell Fill Color Picker (Background) */}
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(showColorPicker === 'bg' ? null : 'bg'); }}
            className="p-1.5 rounded hover:bg-white/10 flex items-center gap-1 text-zinc-300 hover:text-white" 
            title="Fill Color"
          >
            <PaintBucket className="w-3.5 h-3.5 text-amber-400" />
            <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
          </button>
          {showColorPicker === 'bg' && (
            <div className="absolute left-0 top-full mt-1 bg-[#202024] border border-white/20 rounded-xl p-2 shadow-2xl z-50 grid grid-cols-10 gap-1 w-52">
              <button
                onClick={() => { updateActiveCellStyle({ bgColor: undefined }); setShowColorPicker(null); }}
                className="col-span-10 text-[10px] py-1 bg-white/5 rounded text-zinc-300 hover:bg-white/10 mb-1"
              >
                Reset Fill (Transparent)
              </button>
              {GOOGLE_SHEETS_COLORS.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { updateActiveCellStyle({ bgColor: c }); setShowColorPicker(null); }}
                  className="w-4 h-4 rounded-sm border border-black/30 hover:scale-125 transition-transform"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Borders */}
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowBordersMenu(!showBordersMenu); }}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-300 hover:text-white flex items-center gap-1"
            title="Borders"
          >
            <Grid className="w-3.5 h-3.5 text-zinc-400" />
            <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
          </button>
          {showBordersMenu && (
            <div className="absolute left-0 top-full mt-1 bg-[#202024] border border-white/20 rounded-xl p-2 shadow-2xl z-50 flex flex-col gap-1 w-44 text-xs">
              <button 
                onClick={() => { updateActiveCellStyle({ border: { top: true, bottom: true, left: true, right: true, color: '#38bdf8' } }); setShowBordersMenu(false); }}
                className="w-full text-left px-2 py-1 hover:bg-white/10 rounded flex items-center justify-between"
              >
                <span>All Borders</span>
                <span className="text-sky-400 font-bold">▦</span>
              </button>
              <button 
                onClick={() => { updateActiveCellStyle({ border: { bottom: true, color: '#ffffff' } }); setShowBordersMenu(false); }}
                className="w-full text-left px-2 py-1 hover:bg-white/10 rounded flex items-center justify-between"
              >
                <span>Bottom Border</span>
                <span className="text-zinc-300 font-bold">_</span>
              </button>
              <button 
                onClick={() => { updateActiveCellStyle({ border: undefined }); setShowBordersMenu(false); }}
                className="w-full text-left px-2 py-1 hover:bg-white/10 rounded text-red-400"
              >
                Clear Borders
              </button>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* Alignment: Left, Center, Right */}
        <button onClick={() => updateActiveCellStyle({ align: 'left' })} className="p-1.5 rounded hover:bg-white/10 text-zinc-300" title="Align Left">
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => updateActiveCellStyle({ align: 'center' })} className="p-1.5 rounded hover:bg-white/10 text-zinc-300" title="Align Center">
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => updateActiveCellStyle({ align: 'right' })} className="p-1.5 rounded hover:bg-white/10 text-zinc-300" title="Align Right">
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-white/15 mx-1" />

        {/* Insert Checkbox / Dropdown widgets into cells */}
        <button onClick={handleInsertCheckbox} className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-200" title="Insert Tick Box (Checkbox)">
          <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Tick Box</span>
        </button>
        <button onClick={handleOpenDropdownConfig} className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-200" title="Insert Dropdown Validation">
          <ListFilter className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">Dropdown</span>
        </button>

        {/* Insert Floating Chart */}
        <button onClick={() => handleInsertChart('bar')} className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-200" title="Insert Floating Chart">
          <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden md:inline">Chart</span>
        </button>

        {/* Quick Functions (Σ) */}
        <div className="relative ml-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowFunctionsMenu(!showFunctionsMenu); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold"
          >
            <Sigma className="w-3.5 h-3.5" />
            <span>Functions</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          {showFunctionsMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1c1c20] border border-white/15 rounded-xl shadow-2xl p-1.5 w-44 z-50 text-xs">
              {['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'IF', 'XLOOKUP'].map(fn => (
                <button
                  key={fn}
                  onClick={() => {
                    const sample = fn === 'SUM' ? '=SUM(A1:A10)' : fn === 'AVERAGE' ? '=AVERAGE(A1:A10)' : fn === 'IF' ? '=IF(A1>50, "Pass", "Fail")' : `=${fn}(A1:A10)`;
                    commitEdit(sample);
                    setShowFunctionsMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-white/10 rounded font-mono flex items-center justify-between"
                >
                  <span>{fn}</span>
                  <span className="text-[10px] text-zinc-500 font-sans">Formula</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Official Google Sheets Formula Bar */}
      <FormulaBar
        selectedCell={
          selectedCell
            ? {
                rowIndex: selectedCell.row,
                colIndex: selectedCell.col,
                colId: `c_${selectedCell.col}`,
                colName: colIndexToLetter(selectedCell.col),
              }
            : null
        }
        currentValue={isEditing ? editValue : activeCellRaw}
        onChange={(val) => {
          if (!isEditing) setIsEditing(true);
          setEditValue(String(val));
        }}
        onCommit={() => commitEdit(editValue)}
        onCancel={() => setIsEditing(false)}
        totalRows={activeSheet.rowCount}
        totalCols={activeSheet.colCount}
      />

      {/* 4. Main Google Sheets Grid Matrix */}
      <div 
        className="flex-1 overflow-auto bg-[#101012] select-none min-h-[500px] max-h-[640px] relative custom-scrollbar"
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
      >
        <table className="border-collapse table-fixed w-max text-xs">
          <thead>
            <tr className="bg-[#1a1a1d] text-zinc-400 sticky top-0 z-20 shadow-xs border-b border-white/15">
              {/* Corner Header: Select All */}
              <th className="w-12 min-w-12 p-1 border-r border-white/15 text-center font-mono text-[11px] bg-[#161618] sticky left-0 z-30">
                #
              </th>
              {/* Column Letter Headers (A, B, C...) */}
              {Array.from({ length: activeSheet.colCount }, (_, colIdx) => {
                const width = colWidths[colIdx] || 120;
                return (
                  <th
                    key={colIdx}
                    style={{ width, minWidth: width }}
                    className="px-2 py-1.5 border-r border-white/10 text-center font-mono font-bold text-xs uppercase tracking-wider text-zinc-300 bg-[#1a1a1d] relative group"
                  >
                    <span>{colIndexToLetter(colIdx)}</span>
                    {/* Resize Column Handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setResizingCol({ col: colIdx, startX: e.clientX, startW: width });
                      }}
                      className="absolute right-0 top-0 bottom-0 w-1.5 hover:bg-emerald-500 cursor-col-resize z-30"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: activeSheet.rowCount }, (_, rowIdx) => (
              <tr key={rowIdx} className="border-b border-white/5 hover:bg-white/[0.015]">
                {/* Row Number (1, 2, 3...) */}
                <td className="w-12 min-w-12 px-1 py-1 border-r border-white/15 text-center font-mono text-[11px] text-zinc-500 bg-[#161618] sticky left-0 z-10">
                  {rowIdx + 1}
                </td>

                {/* Cells in Row */}
                {Array.from({ length: activeSheet.colCount }, (_, colIdx) => {
                  const cellKey = `R${rowIdx}C${colIdx}`;
                  const cell = activeSheet.cells[cellKey];
                  const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                  
                  // In selection range check
                  const isInRange = selectionRange && 
                    rowIdx >= selectionRange.startRow && rowIdx <= selectionRange.endRow &&
                    colIdx >= selectionRange.startCol && colIdx <= selectionRange.endCol;

                  const computedVal = cell ? getComputedCellValue(cell.raw, rowIdx, colIdx) : '';
                  const alignClass = cell?.align === 'center' ? 'text-center' : cell?.align === 'right' ? 'text-right' : 'text-left';
                  const isFormula = typeof cell?.raw === 'string' && cell.raw.trim().startsWith('=');

                  const width = colWidths[colIdx] || 120;

                  return (
                    <td
                      key={colIdx}
                      style={{
                        width,
                        minWidth: width,
                        backgroundColor: cell?.bgColor,
                        color: cell?.textColor || (isFormula ? '#6ee7b7' : '#f4f4f5'),
                        fontWeight: cell?.bold ? 'bold' : 'normal',
                        fontStyle: cell?.italic ? 'italic' : 'normal',
                        textDecoration: cell?.underline ? 'underline' : (cell?.strikethrough ? 'line-through' : undefined),
                        fontSize: cell?.fontSize ? `${cell.fontSize}px` : undefined,
                        borderBottom: cell?.border?.bottom ? `2px solid ${cell.border.color || '#38bdf8'}` : undefined,
                        borderTop: cell?.border?.top ? `2px solid ${cell.border.color || '#38bdf8'}` : undefined,
                        borderLeft: cell?.border?.left ? `2px solid ${cell.border.color || '#38bdf8'}` : undefined,
                        borderRight: cell?.border?.right ? `2px solid ${cell.border.color || '#38bdf8'}` : undefined,
                      }}
                      onClick={() => {
                        setSelectedCell({ row: rowIdx, col: colIdx });
                        setSelectionRange(null);
                        if (isEditing) {
                          commitEdit(editValue);
                        }
                      }}
                      onDoubleClick={() => {
                        setSelectedCell({ row: rowIdx, col: colIdx });
                        setIsEditing(true);
                        setEditValue(cell ? String(cell.raw) : '');
                      }}
                      className={`relative px-2 py-1.5 border-r border-white/5 truncate font-sans text-xs cursor-cell transition-colors ${
                        isSelected 
                          ? 'ring-2 ring-emerald-500 bg-emerald-500/10 z-10' 
                          : isInRange 
                            ? 'bg-emerald-500/15 border-emerald-500/40' 
                            : 'hover:bg-white/5'
                      } ${alignClass}`}
                    >
                      {/* Interactive Checkbox Widget in Cell */}
                      {cell?.validationType === 'checkbox' ? (
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={Boolean(cell.raw)}
                            onChange={(e) => {
                              updateActiveCellStyle({ raw: e.target.checked });
                            }}
                            className="w-4 h-4 rounded text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                        </div>
                      ) : cell?.validationType === 'dropdown' ? (
                        /* Interactive Dropdown Selector in Cell */
                        <div className="relative">
                          <select
                            value={String(cell.raw)}
                            onChange={(e) => updateActiveCellStyle({ raw: e.target.value })}
                            className="bg-zinc-800 text-white rounded px-1.5 py-0.5 text-xs border border-white/20 focus:outline-none focus:border-purple-400 w-full"
                          >
                            {(cell.validationOptions || ['Option 1', 'Option 2']).map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      ) : isSelected && isEditing ? (
                        /* Cell Inline Edit Input */
                        <input
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(editValue)}
                          className="absolute inset-0 w-full h-full bg-[#18181b] text-white px-2 py-1 font-mono text-xs border-2 border-emerald-500 focus:outline-none z-30"
                        />
                      ) : (
                        /* Normal cell value display */
                        <span>
                          {cell?.format === 'currency' && typeof computedVal === 'number'
                            ? `₹${computedVal.toLocaleString('en-IN')}`
                            : cell?.format === 'percent' && typeof computedVal === 'number'
                            ? `${(computedVal * 100).toFixed(1)}%`
                            : cell?.format === 'number' && typeof computedVal === 'number'
                            ? computedVal.toLocaleString()
                            : String(computedVal ?? '')}
                        </span>
                      )}

                      {/* Fill Handle Square (Google Sheets Corner Square) */}
                      {isSelected && !isEditing && (
                        <div
                          onMouseDown={handleFillHandleMouseDown}
                          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border border-black rounded-xs cursor-crosshair z-20 shadow-xs"
                          title="Drag to auto-fill formula or series"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 5. Movable Floating Charts on the Sheet Canvas */}
        {(activeSheet.charts || []).map(chart => (
          <div
            key={chart.id}
            style={{ 
              position: 'absolute', 
              left: chart.x, 
              top: chart.y, 
              width: chart.width, 
              height: chart.height 
            }}
            className="bg-[#1c1c20] border-2 border-white/20 rounded-xl shadow-2xl p-3 z-30 flex flex-col justify-between"
          >
            {/* Chart Title & Move Drag Handle */}
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2 cursor-move">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold text-xs text-zinc-100">{chart.title}</span>
              </div>
              <button 
                onClick={() => handleRemoveChart(chart.id)}
                className="text-zinc-500 hover:text-red-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chart Graphic Preview */}
            <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-1">
              {[45, 80, 65, 90, 75].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t"
                    style={{ height: `${val}%` }}
                  />
                  <span className="text-[9px] text-zinc-400 font-mono">{val}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500 text-center border-t border-white/5 pt-1">
              Data: {chart.dataRange} • Live Sheet Chart
            </div>
          </div>
        ))}
      </div>

      {/* 6. Google Sheets Bottom Tab Bar */}
      <div className="bg-[#141416] border-t border-white/10 px-3 py-1.5 flex items-center justify-between gap-3 overflow-x-auto">
        {/* Left: Add Sheet & Tabs */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={handleAddNewSheet}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer shrink-0"
            title="Add a new blank sheet"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Sheet</span>
          </button>

          {/* Sheet Tab Items */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {workbook.sheets.map((sh) => {
              const isActive = sh.id === activeSheet.id;
              const isRenaming = renamingSheetId === sh.id;

              return (
                <div
                  key={sh.id}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#202024] border-emerald-500 text-white shadow-xs border-b-2 border-b-emerald-400'
                      : 'bg-[#18181a] border-white/10 text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setWorkbook(prev => ({ ...prev, activeSheetId: sh.id }))}
                >
                  {isRenaming ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameSheetName}
                      onChange={(e) => setRenameSheetName(e.target.value)}
                      onBlur={() => handleRenameSheetSubmit(sh.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSheetSubmit(sh.id);
                        if (e.key === 'Escape') setRenamingSheetId(null);
                      }}
                      className="bg-[#121214] border border-emerald-400 rounded px-1 text-xs text-white focus:outline-none w-24"
                    />
                  ) : (
                    <span 
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingSheetId(sh.id);
                        setRenameSheetName(sh.name);
                      }}
                      title="Double click to rename sheet"
                    >
                      {sh.name}
                    </span>
                  )}

                  {workbook.sheets.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSheet(sh.id);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-0.5"
                      title="Delete sheet"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Real-Time Explore Status Bar (Google Sheets Quick Sum / Average Badge) */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 shrink-0 font-mono">
          <div className="bg-[#1f1f23] border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-2">
            <span>Cell: <strong className="text-white">{selectedCell ? `${colIndexToLetter(selectedCell.col)}${selectedCell.row + 1}` : 'A1'}</strong></span>
            {selectionStats.hasNumbers && (
              <>
                <span className="text-zinc-600">|</span>
                <span>SUM: <strong className="text-emerald-400 tabular-nums">{selectionStats.sum.toLocaleString()}</strong></span>
                <span className="text-zinc-600">|</span>
                <span>AVG: <strong className="text-sky-400 tabular-nums">{selectionStats.avg}</strong></span>
                <span className="text-zinc-600">|</span>
                <span>COUNT: <strong className="text-zinc-200 tabular-nums">{selectionStats.count}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 7. Lookup Wizard Modal */}
      <LookupWizardModal
        isOpen={isLookupWizardOpen}
        onClose={() => setIsLookupWizardOpen(false)}
        registers={registers}
        activeRegisterId={activeRegisterId}
        selectedCell={selectedCell}
        onInsertFormula={(formula) => commitEdit(formula)}
      />

      {/* 8. Dropdown Options Customizer Modal */}
      {showDropdownOptionsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c20] border border-white/20 rounded-xl max-w-sm w-full p-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Configure Dropdown Options</h3>
            <p className="text-xs text-zinc-400 mb-3">Enter choices separated by comma:</p>
            <textarea
              rows={3}
              value={dropdownOptionsDraft}
              onChange={(e) => setDropdownOptionsDraft(e.target.value)}
              className="w-full bg-[#121214] border border-white/15 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-purple-400 mb-3"
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowDropdownOptionsModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleApplyDropdownOptions}
                className="px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-500 font-bold text-white"
              >
                Apply to Cell
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Google Sheets Function Reference Modal */}
      {showFunctionGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/15 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-[#161618] border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Google Sheets Functions Reference</h3>
              </div>
              <button onClick={() => setShowFunctionGuide(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 text-xs custom-scrollbar">
              {GOOGLE_SHEETS_FUNCTIONS_LIST.slice(0, 30).map(fn => (
                <div key={fn.name} className="p-2.5 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-emerald-400">{fn.name}</span>
                    <span className="text-[10px] text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded">{fn.category}</span>
                  </div>
                  <div className="font-mono text-zinc-300 text-[11px] mb-1">{fn.syntax}</div>
                  <div className="text-zinc-400">{fn.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
