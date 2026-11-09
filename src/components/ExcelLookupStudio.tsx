import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  Search, 
  Plus, 
  Trash2, 
  Printer, 
  Download, 
  Copy, 
  ArrowLeftRight, 
  FileSpreadsheet, 
  Layers, 
  SlidersHorizontal, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  GripVertical, 
  Settings2, 
  ClipboardPaste,
  Sparkles,
  Database,
  X,
  FileText,
  Table,
  LayoutGrid,
  Columns,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Register, DepartmentProfile } from '../types/register';
import { ThemeId, APP_THEMES } from '../types/theme';
import { Language } from '../utils/translations';

// File color palettes for visual source tags
const FILE_COLOR_THEMES = [
  { badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', headerBg: 'bg-emerald-950/40 text-emerald-200 border-emerald-500/30', cellBg: 'bg-emerald-950/20' },
  { badgeBg: 'bg-blue-500/20 text-blue-300 border-blue-500/30', headerBg: 'bg-blue-950/40 text-blue-200 border-blue-500/30', cellBg: 'bg-blue-950/20' },
  { badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/30', headerBg: 'bg-purple-950/40 text-purple-200 border-purple-500/30', cellBg: 'bg-purple-950/20' },
  { badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', headerBg: 'bg-amber-950/40 text-amber-200 border-amber-500/30', cellBg: 'bg-amber-950/20' },
  { badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', headerBg: 'bg-cyan-950/40 text-cyan-200 border-cyan-500/30', cellBg: 'bg-cyan-950/20' },
  { badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30', headerBg: 'bg-rose-950/40 text-rose-200 border-rose-500/30', cellBg: 'bg-rose-950/20' }
];

export interface DetectedHeader {
  name: string;
  index: number;
}

export interface LookupSource {
  id: string;
  fileName: string;
  shortLabel: string;
  theme: typeof FILE_COLOR_THEMES[0];
  workbook: XLSX.WorkBook;
  sheetName: string;
  mode: 'xlookup' | 'hlookup';
  headerRowIdx: number;
  rawRows: any[][];
  detectedHeaders: DetectedHeader[];
  selectedKeyIndex: number;
  selectedReturnColIndices: Set<number>;
  keyMap: Map<string, any[]>;
  uniqueKeyCount: number;
  isAppRegister?: boolean;
  registerId?: string;
}

export interface UserColumn {
  id: string;
  name: string;
}

export interface ResultColumnDesc {
  colKey: string;
  kind: 'user' | 'extracted';
  userColId?: string;
  isSearchKey?: boolean;
  origHeader: string;
  displayHeader: string;
  exportHeader: string;
  badgeText: string;
  width: number;
  align: 'left' | 'center' | 'right';
  hidden: boolean;
  theme?: typeof FILE_COLOR_THEMES[0];
  mode?: 'side_by_side' | 'consolidate';
  bindings?: { src: LookupSource; colIndex: number; fileIndex: number }[];
}

interface ExcelLookupStudioProps {
  currentTheme?: ThemeId;
  deptProfile?: DepartmentProfile;
  lang?: Language;
  activeRegister?: Register;
  registers?: Register[];
  onImportAsRegister?: (newRegister: Register) => void;
}

export const ExcelLookupStudio: React.FC<ExcelLookupStudioProps> = ({
  currentTheme = 'midnight',
  deptProfile,
  lang = 'en',
  activeRegister,
  registers = [],
  onImportAsRegister,
}) => {
  const isLight = currentTheme === 'light' || (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light');

  // 1. Interactive User Table State
  const [userColumns, setUserColumns] = useState<UserColumn[]>([
    { id: 'col_1', name: 'Lookup_ID' },
    { id: 'col_2', name: 'Notes' }
  ]);
  const [userRows, setUserRows] = useState<Record<string, string>[]>([{}, {}, {}]);
  const [selectedUserKeyColId, setSelectedUserKeyColId] = useState<string>('col_1');

  // 2. Uploaded Main File State
  const [mainWorkbook, setMainWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [mainRawSheetRows, setMainRawSheetRows] = useState<any[][]>([]);
  const [mainSheetName, setMainSheetName] = useState<string>('');
  const [mainHeaderRowIdx, setMainHeaderRowIdx] = useState<number>(0);
  const [workspaceMode, setWorkspaceMode] = useState<'interactive' | 'upload_main'>('interactive');

  // 3. Multiple Lookup Source Files
  const [lookupSources, setLookupSources] = useState<LookupSource[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [sourceCounter, setSourceCounter] = useState<number>(0);

  // Merge Mode: 'side_by_side' | 'consolidate'
  const [mergeMode, setMergeMode] = useState<'side_by_side' | 'consolidate'>('side_by_side');
  const [notFoundText, setNotFoundText] = useState<string>('Not Found');
  const [liveAutoLookup, setLiveAutoLookup] = useState<boolean>(true);

  // 4. Column Arrangement, Widths, Renames & Print Formatting
  const [displayColumnOrder, setDisplayColumnOrder] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnCustomLabels, setColumnCustomLabels] = useState<Record<string, string>>({});
  const [columnAlignments, setColumnAlignments] = useState<Record<string, 'left' | 'center' | 'right'>>({});
  const [hiddenColumnsForPrint, setHiddenColumnsForPrint] = useState<Set<string>>(new Set());

  // Drag-and-drop state
  const [draggedColKey, setDraggedColKey] = useState<string | null>(null);
  const [dragOverColKey, setDragOverColKey] = useState<string | null>(null);

  // Resize state
  const [resizingColKey, setResizingColKey] = useState<string | null>(null);
  const [resizeStartX, setResizeStartX] = useState<number>(0);
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0);
  const [liveResizingWidth, setLiveResizingWidth] = useState<number | null>(null);

  // Quick Search & Autocomplete
  const [quickSearchInput, setQuickSearchInput] = useState<string>('');

  // Modals & Panels
  const [showLayoutStudioModal, setShowLayoutStudioModal] = useState<boolean>(false);
  const [studioTab, setStudioTab] = useState<'split' | 'columns' | 'preview'>('split');
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pasteText, setPasteText] = useState<string>('');
  const [replaceExistingPaste, setReplaceExistingPaste] = useState<boolean>(true);
  const [showSourceInspector, setShowSourceInspector] = useState<boolean>(false);
  const [inspectorActiveSourceId, setInspectorActiveSourceId] = useState<string | null>(null);
  const [showRegisterImportModal, setShowRegisterImportModal] = useState<boolean>(false);
  const [showRegisterSourceModal, setShowRegisterSourceModal] = useState<boolean>(false);
  const [sourceMethodTab, setSourceMethodTab] = useState<'upload' | 'register'>('upload');
  const [registerKeyCol, setRegisterKeyCol] = useState<string>('');

  // All available application registers / tables
  const allAvailableRegisters = useMemo(() => {
    if (registers && registers.length > 0) return registers;
    if (activeRegister) return [activeRegister];
    return [];
  }, [registers, activeRegister]);

  // Print Layout Configuration State
  const [printTitle, setPrintTitle] = useState<string>('Extracted Multi-File Lookup Report');
  const [printSubtitle, setPrintSubtitle] = useState<string>('');
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [printPaperSize, setPrintPaperSize] = useState<'A4' | 'letter' | 'legal' | 'A3'>('A4');
  const [printFontSize, setPrintFontSize] = useState<string>('10pt');
  const [printPadding, setPrintPadding] = useState<string>('5px 7px');
  const [printRespectWidths, setPrintRespectWidths] = useState<boolean>(true);
  const [printShowSerial, setPrintShowSerial] = useState<boolean>(true);
  const [printZebra, setPrintZebra] = useState<boolean>(true);
  const [printShowTimestamp, setPrintShowTimestamp] = useState<boolean>(true);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning'>('info');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 3200);
  };

  // String / Key normalization
  const normalizeKey = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val).trim().toLowerCase();
  };

  const getShortFileName = (fileName: string): string => {
    return String(fileName || 'File').replace(/\.(xlsx|xls|csv)$/i, '');
  };

  // Active Lookup Source
  const activeSource = useMemo(() => {
    return lookupSources.find((s) => s.id === activeSourceId) || lookupSources[0] || null;
  }, [lookupSources, activeSourceId]);

  // Smart Header detection
  const detectHeaderRowIndex = (rows: any[][]): number => {
    let bestRow = 0;
    let maxNonEmpty = 0;
    const scanLimit = Math.min(rows.length, 25);
    for (let i = 0; i < scanLimit; i++) {
      const row = rows[i] || [];
      const nonEmptyCount = row.filter(
        (cell) => cell !== null && cell !== undefined && String(cell).trim() !== ''
      ).length;
      if (nonEmptyCount > maxNonEmpty) {
        maxNonEmpty = nonEmptyCount;
        bestRow = i;
      }
    }
    return bestRow;
  };

  const extractHeadersAtRow = (rows: any[][], headerRowIdx: number): DetectedHeader[] => {
    const rawHeader = rows[headerRowIdx] || [];
    const maxCols = rows.reduce((max, r) => Math.max(max, r ? r.length : 0), rawHeader.length);
    const headers: DetectedHeader[] = [];
    const seen: Record<string, number> = {};

    for (let c = 0; c < maxCols; c++) {
      let val = rawHeader[c] !== undefined && rawHeader[c] !== null ? String(rawHeader[c]).trim() : '';
      if (!val) val = `Column_${c + 1}`;
      if (seen[val]) {
        seen[val]++;
        val = `${val}_${seen[val]}`;
      } else {
        seen[val] = 1;
      }
      headers.push({ name: val, index: c });
    }
    return headers;
  };

  const transposeMatrix = (matrix: any[][]): any[][] => {
    if (!matrix || matrix.length === 0) return [];
    const maxCols = matrix.reduce((max, r) => Math.max(max, r ? r.length : 0), 0);
    const transposed: any[][] = [];
    for (let c = 0; c < maxCols; c++) {
      const newRow: any[] = [];
      for (let r = 0; r < matrix.length; r++) {
        newRow.push(matrix[r] && matrix[r][c] !== undefined ? matrix[r][c] : '');
      }
      transposed.push(newRow);
    }
    return transposed;
  };

  const rebuildSourceKeyMap = (src: LookupSource): Map<string, any[]> => {
    const map = new Map<string, any[]>();
    if (!src.rawRows.length || !src.detectedHeaders.length) {
      return map;
    }
    for (let r = src.headerRowIdx + 1; r < src.rawRows.length; r++) {
      const row = src.rawRows[r] || [];
      const normKey = normalizeKey(row[src.selectedKeyIndex]);
      if (normKey !== '' && !map.has(normKey)) {
        map.set(normKey, row);
      }
    }
    return map;
  };

  // Process a loaded source sheet
  const processSourceSheet = (
    src: LookupSource,
    preselectDefaults: boolean = false,
    customHeaderRowIdx: number | null = null,
    sheetNameToUse?: string,
    modeToUse?: 'xlookup' | 'hlookup'
  ): LookupSource => {
    const sheetName = sheetNameToUse || src.sheetName;
    const mode = modeToUse || src.mode;
    const sheet = src.workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    const rawRows = mode === 'hlookup' ? transposeMatrix(raw) : raw;
    const headerIdx = customHeaderRowIdx !== null ? customHeaderRowIdx : detectHeaderRowIndex(rawRows);
    const safeHeaderRowIdx = Math.max(0, Math.min(headerIdx, Math.max(0, rawRows.length - 1)));
    const detectedHeaders = extractHeadersAtRow(rawRows, safeHeaderRowIdx);

    let selectedKeyIndex = src.selectedKeyIndex;
    const selectedReturnColIndices = new Set(src.selectedReturnColIndices);

    if (preselectDefaults) {
      selectedKeyIndex = 0;
      selectedReturnColIndices.clear();
      detectedHeaders.forEach((h) => {
        if (h.index !== 0) selectedReturnColIndices.add(h.index);
      });
    } else {
      if (selectedKeyIndex >= detectedHeaders.length) {
        selectedKeyIndex = 0;
      }
    }

    const updated: LookupSource = {
      ...src,
      sheetName,
      mode,
      rawRows,
      headerRowIdx: safeHeaderRowIdx,
      detectedHeaders,
      selectedKeyIndex,
      selectedReturnColIndices,
      keyMap: new Map(),
      uniqueKeyCount: 0
    };

    const keyMap = rebuildSourceKeyMap(updated);
    updated.keyMap = keyMap;
    updated.uniqueKeyCount = keyMap.size;
    return updated;
  };

  // Upload handler for multiple lookup files
  const handleUploadLookupFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    let loadedCount = 0;
    const newSources: LookupSource[] = [];
    let counter = sourceCounter;

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        const wb = XLSX.read(data, { type: 'array' });
        counter++;
        const theme = FILE_COLOR_THEMES[(counter - 1) % FILE_COLOR_THEMES.length];

        const initialSource: LookupSource = {
          id: 'src_' + Date.now() + '_' + counter,
          fileName: file.name,
          shortLabel: getShortFileName(file.name),
          theme,
          workbook: wb,
          sheetName: wb.SheetNames[0] || 'Sheet1',
          mode: 'xlookup',
          headerRowIdx: 0,
          rawRows: [],
          detectedHeaders: [],
          selectedKeyIndex: 0,
          selectedReturnColIndices: new Set(),
          keyMap: new Map(),
          uniqueKeyCount: 0
        };

        const processed = processSourceSheet(initialSource, true);
        newSources.push(processed);
        loadedCount++;
      } catch (err) {
        showToast(`Could not parse "${file.name}". Please check format.`, 'warning');
      }
    }

    setSourceCounter(counter);
    if (newSources.length > 0) {
      setLookupSources((prev) => [...prev, ...newSources]);
      setActiveSourceId(newSources[newSources.length - 1].id);
      showToast(
        loadedCount === 1
          ? `Added "${newSources[0].fileName}" to lookup pool.`
          : `Added ${loadedCount} lookup files to pool.`,
        'success'
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper to convert an existing application register into a LookupSource
  const createLookupSourceFromRegister = (reg: Register, counterVal: number): LookupSource => {
    const counter = counterVal;
    const theme = FILE_COLOR_THEMES[(counter - 1) % FILE_COLOR_THEMES.length];
    const safeSheetName = (reg.title || 'Table').replace(/[:\\/?*[\]]/g, '').slice(0, 31) || 'Table';

    // Prepare 2D matrix of values (Row 0 = column headers, Row 1..N = row data)
    const headerRow: string[] = (reg.columns || []).map((col) => col.name || 'Column');
    const dataRows: any[][] = (reg.rows || []).map((row) =>
      (reg.columns || []).map((col) => {
        const val = row[col.id];
        return val !== undefined && val !== null ? val : '';
      })
    );
    const rawRows = [headerRow, ...dataRows];

    // Build synthetic XLSX workbook so all SheetJS functions, sheet inspect, and exports work seamlessly!
    const ws = XLSX.utils.aoa_to_sheet(rawRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    const detectedHeaders: DetectedHeader[] = (reg.columns || []).map((col, idx) => ({
      name: col.name || `Col_${idx + 1}`,
      index: idx
    }));

    // Find likely key column index (e.g. column with 'id', 'code', 'roll', 'no', 'reg', 'pin', 'admission', 'key')
    let defaultKeyIndex = 0;
    const keyMatch = detectedHeaders.findIndex((h) =>
      /^(id|code|roll|no|reg|pin|admission|emp|student|key|phone|mobile|aadhar)/i.test(h.name)
    );
    if (keyMatch !== -1) {
      defaultKeyIndex = keyMatch;
    }

    const selectedReturnColIndices = new Set<number>();
    detectedHeaders.forEach((h) => {
      if (h.index !== defaultKeyIndex) {
        selectedReturnColIndices.add(h.index);
      }
    });

    const src: LookupSource = {
      id: `src_reg_${reg.id}_${Date.now()}_${counter}`,
      fileName: `[App Table] ${reg.title}`,
      shortLabel: reg.title,
      theme,
      workbook: wb,
      sheetName: safeSheetName,
      mode: 'xlookup',
      headerRowIdx: 0,
      rawRows,
      detectedHeaders,
      selectedKeyIndex: defaultKeyIndex,
      selectedReturnColIndices,
      keyMap: new Map(),
      uniqueKeyCount: 0,
      isAppRegister: true,
      registerId: reg.id
    };

    const keyMap = rebuildSourceKeyMap(src);
    src.keyMap = keyMap;
    src.uniqueKeyCount = keyMap.size;
    return src;
  };

  // Add a specific application register as a lookup source
  const handleAddRegisterAsSource = (reg: Register) => {
    const existing = lookupSources.find((s) => s.registerId === reg.id);
    if (existing) {
      // Refresh its rows and keyMap in place
      const nextSource = createLookupSourceFromRegister(reg, sourceCounter);
      setLookupSources((prev) =>
        prev.map((s) => (s.id === existing.id ? { ...nextSource, id: existing.id, theme: s.theme } : s))
      );
      setActiveSourceId(existing.id);
      showToast(`Updated existing app table "${reg.title}" in lookup sources!`, 'success');
      return;
    }

    const nextCounter = sourceCounter + 1;
    setSourceCounter(nextCounter);
    const newSource = createLookupSourceFromRegister(reg, nextCounter);
    setLookupSources((prev) => [...prev, newSource]);
    setActiveSourceId(newSource.id);
    showToast(`Added app table "${reg.title}" (${reg.rows.length} rows) as lookup source!`, 'success');
  };

  // Add all application registers as lookup sources
  const handleAddAllRegistersAsSources = () => {
    const list = allAvailableRegisters;
    if (list.length === 0) {
      showToast('No app tables available to add.', 'warning');
      return;
    }

    let addedCount = 0;
    let counter = sourceCounter;
    const newSources: LookupSource[] = [];

    list.forEach((reg) => {
      const alreadyAdded = lookupSources.some((s) => s.registerId === reg.id);
      if (!alreadyAdded) {
        counter++;
        newSources.push(createLookupSourceFromRegister(reg, counter));
        addedCount++;
      }
    });

    if (addedCount === 0) {
      showToast('All application tables are already in your lookup pool.', 'info');
      return;
    }

    setSourceCounter(counter);
    setLookupSources((prev) => [...prev, ...newSources]);
    setActiveSourceId(newSources[newSources.length - 1].id);
    showToast(`Added ${addedCount} application table(s) to lookup pool!`, 'success');
  };

  // Sync key column name across all files
  const handleSyncKeyNames = () => {
    if (!activeSource || !activeSource.detectedHeaders[activeSource.selectedKeyIndex]) return;
    const targetKeyName = normalizeKey(activeSource.detectedHeaders[activeSource.selectedKeyIndex].name);

    setLookupSources((prev) =>
      prev.map((src) => {
        const match = src.detectedHeaders.find((h) => normalizeKey(h.name) === targetKeyName);
        if (match) {
          const updated = { ...src, selectedKeyIndex: match.index };
          updated.keyMap = rebuildSourceKeyMap(updated);
          updated.uniqueKeyCount = updated.keyMap.size;
          return updated;
        }
        return src;
      })
    );
    showToast(`Synced key "${activeSource.detectedHeaders[activeSource.selectedKeyIndex].name}" across matching files!`, 'success');
  };

  // Remove a source file
  const handleRemoveSource = (srcId: string) => {
    setLookupSources((prev) => {
      const next = prev.filter((s) => s.id !== srcId);
      if (activeSourceId === srcId) {
        setActiveSourceId(next[0]?.id || null);
      }
      return next;
    });
    showToast('Removed lookup file.', 'info');
  };

  // Clear all source files
  const handleClearAllSources = () => {
    setLookupSources([]);
    setActiveSourceId(null);
    showToast('Cleared all lookup files.', 'info');
  };

  // Toggle return column for a file
  const handleToggleReturnCol = (srcId: string, colIndex: number) => {
    setLookupSources((prev) =>
      prev.map((s) => {
        if (s.id !== srcId) return s;
        const nextSet = new Set(s.selectedReturnColIndices);
        if (nextSet.has(colIndex)) nextSet.delete(colIndex);
        else nextSet.add(colIndex);
        return { ...s, selectedReturnColIndices: nextSet };
      })
    );
  };

  // Select all return columns for all files
  const handleSelectAllReturnCols = () => {
    setLookupSources((prev) =>
      prev.map((src) => {
        const nextSet = new Set<number>();
        src.detectedHeaders.forEach((h) => {
          if (h.index !== src.selectedKeyIndex) nextSet.add(h.index);
        });
        return { ...src, selectedReturnColIndices: nextSet };
      })
    );
  };

  // Clear all return columns for all files
  const handleClearAllReturnCols = () => {
    setLookupSources((prev) =>
      prev.map((src) => ({ ...src, selectedReturnColIndices: new Set() }))
    );
  };

  // Autocomplete suggestions across all loaded files
  const autocompleteSuggestions = useMemo(() => {
    if (lookupSources.length === 0) return [];
    const seen = new Map<string, { cleanKey: string; fileLabel: string; sampleInfo: string }>();

    lookupSources.forEach((src, sIdx) => {
      const limit = Math.min(src.rawRows.length, src.headerRowIdx + 400);
      for (let r = src.headerRowIdx + 1; r < limit; r++) {
        const row = src.rawRows[r] || [];
        const rawKey = row[src.selectedKeyIndex];
        if (rawKey !== undefined && rawKey !== null && String(rawKey).trim() !== '') {
          const cleanKey = String(rawKey).trim();
          const norm = normalizeKey(cleanKey);
          if (!seen.has(norm)) {
            const previewParts = src.detectedHeaders
              .filter((h) => h.index !== src.selectedKeyIndex)
              .slice(0, 2)
              .map((h) => row[h.index])
              .filter(Boolean);
            seen.set(norm, {
              cleanKey,
              fileLabel: `F${sIdx + 1}: ${src.shortLabel}`,
              sampleInfo: previewParts.join(' | ')
            });
          }
        }
      }
    });

    return Array.from(seen.values()).slice(0, 300);
  }, [lookupSources]);

  // Compute total unique keys
  const totalUniqueKeysAcrossSources = useMemo(() => {
    const all = new Set<string>();
    lookupSources.forEach((s) => {
      for (const k of s.keyMap.keys()) all.add(k);
    });
    return all.size;
  }, [lookupSources]);

  // Extracted column descriptors engine
  const extractedColumns = useMemo((): ResultColumnDesc[] => {
    const multipleFiles = lookupSources.length > 1;

    if (mergeMode === 'consolidate') {
      const unifiedMap = new Map<string, ResultColumnDesc>();
      lookupSources.forEach((src, sIdx) => {
        src.detectedHeaders.forEach((h) => {
          if (!src.selectedReturnColIndices.has(h.index)) return;
          const normName = normalizeKey(h.name);
          const colKey = `cons:${normName}`;
          const customLabel = columnCustomLabels[colKey];
          const displayHeader = customLabel !== undefined ? customLabel : h.name;

          if (!unifiedMap.has(normName)) {
            unifiedMap.set(normName, {
              colKey,
              kind: 'extracted',
              origHeader: h.name,
              displayHeader,
              exportHeader: displayHeader,
              badgeText: multipleFiles ? 'All Files' : src.shortLabel,
              width: columnWidths[colKey] || 165,
              align: columnAlignments[colKey] || 'left',
              hidden: hiddenColumnsForPrint.has(colKey),
              theme: FILE_COLOR_THEMES[0],
              mode: 'consolidate',
              bindings: [{ src, colIndex: h.index, fileIndex: sIdx }]
            });
          } else {
            unifiedMap.get(normName)!.bindings!.push({ src, colIndex: h.index, fileIndex: sIdx });
          }
        });
      });
      return Array.from(unifiedMap.values());
    }

    // Default: 'side_by_side'
    const nameCounts: Record<string, number> = {};
    lookupSources.forEach((src) => {
      src.detectedHeaders.forEach((h) => {
        if (src.selectedReturnColIndices.has(h.index)) {
          const k = normalizeKey(h.name);
          nameCounts[k] = (nameCounts[k] || 0) + 1;
        }
      });
    });

    const cols: ResultColumnDesc[] = [];
    lookupSources.forEach((src, sIdx) => {
      src.detectedHeaders.forEach((h) => {
        if (!src.selectedReturnColIndices.has(h.index)) return;
        const colKey = `ext:${src.id}:${h.index}`;
        const hasCollision = nameCounts[normalizeKey(h.name)] > 1;
        const defaultExportHeader = multipleFiles && hasCollision
          ? `[${src.shortLabel}] ${h.name}`
          : h.name;
        const customLabel = columnCustomLabels[colKey];
        const finalDisplay = customLabel !== undefined ? customLabel : h.name;
        const finalExport = customLabel !== undefined ? customLabel : defaultExportHeader;

        cols.push({
          colKey,
          kind: 'extracted',
          origHeader: h.name,
          displayHeader: finalDisplay,
          exportHeader: finalExport,
          badgeText: multipleFiles ? `F${sIdx + 1}: ${src.shortLabel}` : src.shortLabel,
          width: columnWidths[colKey] || 165,
          align: columnAlignments[colKey] || 'left',
          hidden: hiddenColumnsForPrint.has(colKey),
          theme: src.theme,
          mode: 'side_by_side',
          bindings: [{ src, colIndex: h.index, fileIndex: sIdx }]
        });
      });
    });

    return cols;
  }, [lookupSources, mergeMode, columnCustomLabels, columnWidths, columnAlignments, hiddenColumnsForPrint]);

  // Unified list of all columns (Input + Extracted) in arranged order
  const unifiedColumns = useMemo((): ResultColumnDesc[] => {
    // 1. User Input Columns
    const rawUserCols: ResultColumnDesc[] = userColumns.map((c) => {
      const colKey = `user:${c.id}`;
      const isSearchKey = c.id === selectedUserKeyColId;
      const customLabel = columnCustomLabels[colKey];
      const finalTitle = customLabel !== undefined ? customLabel : c.name;
      return {
        colKey,
        kind: 'user',
        userColId: c.id,
        isSearchKey,
        origHeader: c.name,
        displayHeader: finalTitle,
        exportHeader: finalTitle,
        badgeText: isSearchKey ? 'Search Key' : 'Input Col',
        width: columnWidths[colKey] || (isSearchKey ? 185 : 160),
        align: columnAlignments[colKey] || 'left',
        hidden: hiddenColumnsForPrint.has(colKey)
      };
    });

    const all = [...rawUserCols, ...extractedColumns];
    const availableMap = new Map(all.map((c) => [c.colKey, c]));

    // Sync order
    const nextOrder: string[] = [];
    displayColumnOrder.forEach((k) => {
      if (availableMap.has(k)) nextOrder.push(k);
    });
    all.forEach((c) => {
      if (!nextOrder.includes(c.colKey)) nextOrder.push(c.colKey);
    });

    return nextOrder.map((k) => availableMap.get(k)).filter(Boolean) as ResultColumnDesc[];
  }, [userColumns, extractedColumns, selectedUserKeyColId, columnCustomLabels, columnWidths, columnAlignments, hiddenColumnsForPrint, displayColumnOrder]);

  // Update order when columns change
  useEffect(() => {
    const validKeys = unifiedColumns.map((c) => c.colKey);
    setDisplayColumnOrder(validKeys);
  }, [userColumns.length, extractedColumns.length]);

  // Visible columns for grid and export
  const visibleColumns = useMemo(() => {
    return unifiedColumns.filter((c) => !c.hidden);
  }, [unifiedColumns]);

  // Evaluate single extracted column for a row
  const evaluateExtractedCell = (
    colDesc: ResultColumnDesc,
    normSearchVal: string
  ): { text: string; found: boolean; empty: boolean; matchedFileLabel: string } => {
    if (normSearchVal === '') {
      return { text: '', found: false, empty: true, matchedFileLabel: '' };
    }
    if (!colDesc.bindings || colDesc.bindings.length === 0) {
      return { text: notFoundText, found: false, empty: false, matchedFileLabel: '' };
    }

    for (const binding of colDesc.bindings) {
      const matchedRow = binding.src.keyMap.get(normSearchVal);
      if (matchedRow) {
        const rawVal = matchedRow[binding.colIndex];
        const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
        if (colDesc.mode === 'consolidate') {
          if (valStr.trim() !== '') {
            return {
              text: valStr,
              found: true,
              empty: false,
              matchedFileLabel: `F${binding.fileIndex + 1}: ${binding.src.shortLabel}`
            };
          }
        } else {
          return {
            text: valStr,
            found: true,
            empty: false,
            matchedFileLabel: `F${binding.fileIndex + 1}: ${binding.src.shortLabel}`
          };
        }
      }
    }

    // Second pass for consolidate mode: key matched in a file, but cell was blank
    if (colDesc.mode === 'consolidate') {
      for (const binding of colDesc.bindings) {
        if (binding.src.keyMap.has(normSearchVal)) {
          return {
            text: '',
            found: true,
            empty: false,
            matchedFileLabel: `F${binding.fileIndex + 1}: ${binding.src.shortLabel}`
          };
        }
      }
    }

    return { text: notFoundText, found: false, empty: false, matchedFileLabel: '' };
  };

  // Move column left/right/top/bottom in order
  const moveColumn = (colKey: string, direction: 'left' | 'right' | 'top' | 'bottom') => {
    const currIdx = displayColumnOrder.indexOf(colKey);
    if (currIdx === -1) return;
    let targetIdx = currIdx;
    if (direction === 'left') targetIdx = Math.max(0, currIdx - 1);
    else if (direction === 'right') targetIdx = Math.min(displayColumnOrder.length - 1, currIdx + 1);
    else if (direction === 'top') targetIdx = 0;
    else if (direction === 'bottom') targetIdx = displayColumnOrder.length - 1;

    if (targetIdx === currIdx) return;
    const next = [...displayColumnOrder];
    next.splice(currIdx, 1);
    next.splice(targetIdx, 0, colKey);
    setDisplayColumnOrder(next);
  };

  // Auto-fit single column width
  const autoFitColumnWidth = (colKey: string) => {
    const col = unifiedColumns.find((c) => c.colKey === colKey);
    if (!col) return;
    let maxChars = String(col.displayHeader || '').length + 6;

    userRows.forEach((r) => {
      let cellText = '';
      if (col.kind === 'user' && col.userColId) {
        cellText = r[col.userColId] || '';
      } else {
        const norm = normalizeKey(r[selectedUserKeyColId]);
        cellText = evaluateExtractedCell(col, norm).text;
      }
      if (cellText.length > maxChars) maxChars = cellText.length;
    });

    const px = Math.max(95, Math.min(460, Math.round(maxChars * 8 + 36)));
    setColumnWidths((prev) => ({ ...prev, [colKey]: px }));
  };

  // Auto-fit all columns
  const handleAutoFitAll = () => {
    const newWidths: Record<string, number> = {};
    unifiedColumns.forEach((col) => {
      let maxChars = String(col.displayHeader || '').length + 6;
      userRows.forEach((r) => {
        let cellText = '';
        if (col.kind === 'user' && col.userColId) {
          cellText = r[col.userColId] || '';
        } else {
          const norm = normalizeKey(r[selectedUserKeyColId]);
          cellText = evaluateExtractedCell(col, norm).text;
        }
        if (cellText.length > maxChars) maxChars = cellText.length;
      });
      newWidths[col.colKey] = Math.max(95, Math.min(460, Math.round(maxChars * 8 + 36)));
    });
    setColumnWidths(newWidths);
    showToast('Auto-fitted all column widths!', 'success');
  };

  // Quick Append Key to User Table
  const appendKeyToUserTable = (keyVal: string) => {
    const clean = String(keyVal || '').trim();
    if (!clean) return;

    setUserRows((prev) => {
      const emptyIdx = prev.findIndex(
        (r) => !r[selectedUserKeyColId] || String(r[selectedUserKeyColId]).trim() === ''
      );
      if (emptyIdx !== -1) {
        const copy = [...prev];
        copy[emptyIdx] = { ...copy[emptyIdx], [selectedUserKeyColId]: clean };
        return copy;
      }
      return [...prev, { [selectedUserKeyColId]: clean }];
    });
    showToast(`Added "${clean}" to search table!`, 'success');
  };

  // Add all unique keys across all sources
  const handleAddAllSourceKeys = () => {
    if (lookupSources.length === 0) return;
    const existingNorms = new Set(
      userRows.map((r) => normalizeKey(r[selectedUserKeyColId])).filter(Boolean)
    );

    const newRows: Record<string, string>[] = [];
    lookupSources.forEach((src) => {
      for (let r = src.headerRowIdx + 1; r < src.rawRows.length; r++) {
        const row = src.rawRows[r] || [];
        const rawKey = row[src.selectedKeyIndex];
        if (rawKey !== undefined && rawKey !== null && String(rawKey).trim() !== '') {
          const clean = String(rawKey).trim();
          const norm = normalizeKey(clean);
          if (!existingNorms.has(norm)) {
            existingNorms.add(norm);
            newRows.push({ [selectedUserKeyColId]: clean });
          }
        }
      }
    });

    if (newRows.length === 0) {
      showToast('All keys from loaded files are already in your table.', 'info');
      return;
    }

    setUserRows((prev) => {
      const filtered = prev.filter((r) =>
        userColumns.some((c) => r[c.id] && String(r[c.id]).trim() !== '')
      );
      return [...filtered, ...newRows];
    });
    showToast(`Added ${newRows.length} unique keys to table!`, 'success');
  };

  // Load keys from current Active Register
  const handleLoadKeysFromActiveRegister = () => {
    if (!activeRegister || activeRegister.rows.length === 0) {
      showToast('Active register has no rows to import.', 'warning');
      return;
    }
    const targetCol = registerKeyCol || activeRegister.columns[0]?.id;
    if (!targetCol) return;

    const existingNorms = new Set(
      userRows.map((r) => normalizeKey(r[selectedUserKeyColId])).filter(Boolean)
    );

    const newRows: Record<string, string>[] = [];
    activeRegister.rows.forEach((r) => {
      const val = r[targetCol];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const clean = String(val).trim();
        const norm = normalizeKey(clean);
        if (!existingNorms.has(norm)) {
          existingNorms.add(norm);
          newRows.push({ [selectedUserKeyColId]: clean });
        }
      }
    });

    setUserRows((prev) => {
      const filtered = prev.filter((r) =>
        userColumns.some((c) => r[c.id] && String(r[c.id]).trim() !== '')
      );
      return [...filtered, ...newRows];
    });
    setShowRegisterImportModal(false);
    showToast(`Loaded ${newRows.length} key(s) from "${activeRegister.title}"!`, 'success');
  };

  // Main file upload handler
  const handleUploadMainFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        setMainWorkbook(wb);
        const firstSheet = wb.SheetNames[0] || 'Sheet1';
        setMainSheetName(firstSheet);

        const raw = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { header: 1, defval: '' }) as any[][];
        setMainRawSheetRows(raw);

        const detectedIdx = detectHeaderRowIndex(raw);
        setMainHeaderRowIdx(detectedIdx);
        applyMainFileSheet(raw, detectedIdx);
        showToast(`Loaded Main file "${file.name}" with ${raw.length} rows.`, 'success');
      } catch (err) {
        showToast('Error reading main Excel file.', 'warning');
      }
    };
    reader.readAsArrayBuffer(file);
    if (mainFileInputRef.current) mainFileInputRef.current.value = '';
  };

  const applyMainFileSheet = (rows: any[][], headerIdx: number) => {
    const headers = extractHeadersAtRow(rows, headerIdx);
    if (headers.length === 0) return;

    const newCols: UserColumn[] = headers.map((h, i) => ({
      id: `main_col_${i}`,
      name: h.name
    }));
    setUserColumns(newCols);
    setSelectedUserKeyColId(newCols[0].id);

    const newRows: Record<string, string>[] = [];
    for (let r = headerIdx + 1; r < rows.length; r++) {
      const rawRow = rows[r] || [];
      if (rawRow.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;
      const rowObj: Record<string, string> = {};
      newCols.forEach((col, idx) => {
        rowObj[col.id] = rawRow[headers[idx]?.index] !== undefined ? String(rawRow[headers[idx].index]) : '';
      });
      newRows.push(rowObj);
    }

    setUserRows(newRows.length > 0 ? newRows : [{}]);
  };

  // Build merged 2D array for Export & Print
  const buildExportAOA = (): any[][] => {
    const aoa: any[][] = [];
    aoa.push(visibleColumns.map((c) => c.exportHeader));

    userRows.forEach((r) => {
      const rawSearch = r[selectedUserKeyColId] !== undefined ? String(r[selectedUserKeyColId]) : '';
      const normSearch = normalizeKey(rawSearch);
      const hasAnyInput = userColumns.some((c) => r[c.id] !== undefined && String(r[c.id]).trim() !== '');
      if (!hasAnyInput) return;

      const rowVals = visibleColumns.map((col) => {
        if (col.kind === 'user' && col.userColId) {
          return r[col.userColId] !== undefined ? r[col.userColId] : '';
        }
        return evaluateExtractedCell(col, normSearch).text;
      });
      aoa.push(rowVals);
    });

    return aoa;
  };

  // Export Table to .xlsx
  const handleExportExcel = () => {
    const aoa = buildExportAOA();
    if (aoa.length <= 1) {
      showToast('Add at least one row of data before exporting.', 'warning');
      return;
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = visibleColumns.map((c) => ({ wpx: c.width || 160 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lookup_Result');
    XLSX.writeFile(wb, 'Extracted_MultiFile_Lookup_Result.xlsx');
    showToast('Exported formatted .xlsx with arranged columns and widths!', 'success');
  };

  // Import evaluated lookup table into Data Table as a new Register
  const handleImportAsRegister = () => {
    const aoa = buildExportAOA();
    if (aoa.length <= 1) {
      showToast(
        lang === 'te'
          ? 'రిజిస్టర్‌గా ఇంపోర్ట్ చేయడానికి కనీసం ఒక వరుస డేటా ఉండాలి.'
          : 'Add at least one populated row before importing as register.',
        'warning'
      );
      return;
    }
    const headers = aoa[0] as string[];
    const dataRows = aoa.slice(1) as any[][];

    const regCols = headers.map((name, idx) => ({
      id: `col_${idx + 1}_${(name || `col_${idx}`).replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`,
      name: name || `Column ${idx + 1}`,
      type: 'text' as const,
      required: idx === 0,
      options: [],
      width: visibleColumns[idx]?.width || 160
    }));

    const regRows = dataRows.map((r, rIdx) => {
      const rowObj: any = { id: `row_${Date.now()}_${rIdx}` };
      regCols.forEach((c, cIdx) => {
        rowObj[c.id] = r[cIdx] !== undefined && r[cIdx] !== null ? String(r[cIdx]) : '';
      });
      return rowObj;
    });

    const newReg: Register = {
      id: `reg_lookup_${Date.now()}`,
      title: `Lookup Results (${new Date().toLocaleDateString()})`,
      titleTe: `లుకప్ టేబుల్ డేటా (${new Date().toLocaleDateString()})`,
      description: `Imported from Excel Lookup Studio (${regCols.length} columns, ${regRows.length} rows)`,
      category: 'custom',
      columns: regCols,
      rows: regRows,
      themeColor: '#0a84ff',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (onImportAsRegister) {
      onImportAsRegister(newReg);
      showToast(
        lang === 'te'
          ? `లుకప్ డేటా "${newReg.title}" రిజిస్టర్‌గా విజయవంతంగా ఇంపోర్ట్ చేయబడింది!`
          : `Imported ${regRows.length} rows as "${newReg.title}" into Data Table!`,
        'success'
      );
    }
  };

  // Export Table to CSV
  const handleExportCSV = () => {
    const aoa = buildExportAOA();
    if (aoa.length <= 1) {
      showToast('Add at least one row of data before exporting.', 'warning');
      return;
    }
    const csvEscape = (val: any) => {
      const s = val === null || val === undefined ? '' : String(val);
      return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = '\uFEFF' + aoa.map((row) => row.map(csvEscape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Extracted_MultiFile_Lookup_Result.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exported CSV file!', 'success');
  };

  // Copy result table as TSV
  const handleCopyTable = () => {
    const aoa = buildExportAOA();
    if (aoa.length <= 1) {
      showToast('Table has no data to copy.', 'warning');
      return;
    }
    const tsv = aoa.map((row) => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      showToast('Copied arranged table to clipboard (ready for Excel/Sheets)!', 'success');
    }).catch(() => {
      showToast('Failed to copy to clipboard.', 'warning');
    });
  };

  // Formatted Print Execution
  const handleExecutePrint = () => {
    const aoa = buildExportAOA();
    if (aoa.length <= 1) {
      showToast('Add at least one row of data before printing.', 'warning');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to open the print layout.', 'warning');
      return;
    }

    const serialPx = printShowSerial ? 42 : 0;
    const totalColsPx = visibleColumns.reduce((sum, c) => sum + (c.width || 150), serialPx);

    let colgroupHtml = '<colgroup>';
    if (printShowSerial) {
      const serialPct = ((serialPx / totalColsPx) * 100).toFixed(2);
      colgroupHtml += `<col style="width:${printRespectWidths ? serialPct + '%' : '38px'}" />`;
    }
    visibleColumns.forEach((c) => {
      const pct = (((c.width || 150) / totalColsPx) * 100).toFixed(2);
      colgroupHtml += `<col style="${printRespectWidths ? 'width:' + pct + '%' : ''}" />`;
    });
    colgroupHtml += '</colgroup>';

    let theadHtml = '<thead><tr>';
    if (printShowSerial) {
      theadHtml += '<th style="text-align:center;">#</th>';
    }
    visibleColumns.forEach((c, idx) => {
      const align = c.align || 'left';
      theadHtml += `<th style="text-align:${align};">${aoa[0][idx] || ''}</th>`;
    });
    theadHtml += '</tr></thead>';

    let tbodyHtml = '<tbody>';
    aoa.slice(1).forEach((row, rIdx) => {
      tbodyHtml += '<tr>';
      if (printShowSerial) {
        tbodyHtml += `<td style="text-align:center;color:#666;font-family:monospace;">${rIdx + 1}</td>`;
      }
      row.forEach((cellVal, cIdx) => {
        const align = visibleColumns[cIdx] ? visibleColumns[cIdx].align || 'left' : 'left';
        tbodyHtml += `<td style="text-align:${align};">${cellVal || ''}</td>`;
      });
      tbodyHtml += '</tr>';
    });
    tbodyHtml += '</tbody>';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${printTitle || 'Lookup Report'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 14px; color: #111; margin: 0; }
            .header-box { margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: flex-end; }
            h2 { font-size: 17px; margin: 0; color: #0f172a; font-weight: 700; }
            .subtitle { font-size: 11px; color: #334155; margin-top: 3px; font-weight: 600; }
            .meta { font-size: 9.5px; color: #64748b; text-align: right; line-height: 1.4; }
            table { border-collapse: collapse; width: 100%; font-size: ${printFontSize}; table-layout: ${printRespectWidths ? 'fixed' : 'auto'}; }
            th, td { border: 1px solid #94a3b8; padding: ${printPadding}; overflow-wrap: anywhere; word-break: break-word; vertical-align: top; }
            th { background: #e2e8f0; color: #0f172a; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            ${printZebra ? 'tbody tr:nth-child(even) { background: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }' : ''}
            tr { break-inside: avoid; }
            thead { display: table-header-group; }
            @page { size: ${printPaperSize} ${printOrientation}; margin: 8mm; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <h2>${printTitle}</h2>
              ${printSubtitle ? `<div class="subtitle">${printSubtitle}</div>` : ''}
            </div>
            ${printShowTimestamp ? `
              <div class="meta">
                Printed: ${new Date().toLocaleString()}<br />
                ${aoa.length - 1} Row(s) · ${visibleColumns.length} Column(s)
              </div>
            ` : ''}
          </div>
          <table>
            ${colgroupHtml}
            ${theadHtml}
            ${tbodyHtml}
          </table>
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Drag-and-drop column arrangement handlers
  const handleDragStart = (e: React.DragEvent, colKey: string) => {
    setDraggedColKey(colKey);
    e.dataTransfer.setData('text/plain', colKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColKey !== colKey) {
      setDragOverColKey(colKey);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColKey: string) => {
    e.preventDefault();
    const sourceKey = draggedColKey || e.dataTransfer.getData('text/plain');
    if (!sourceKey || sourceKey === targetColKey) {
      setDraggedColKey(null);
      setDragOverColKey(null);
      return;
    }

    const currIdx = displayColumnOrder.indexOf(sourceKey);
    const targetIdx = displayColumnOrder.indexOf(targetColKey);
    if (currIdx !== -1 && targetIdx !== -1) {
      const next = [...displayColumnOrder];
      next.splice(currIdx, 1);
      next.splice(targetIdx, 0, sourceKey);
      setDisplayColumnOrder(next);
      showToast('Reordered column sequence!', 'info');
    }

    setDraggedColKey(null);
    setDragOverColKey(null);
  };

  // Column resize mouse drag handlers
  const handleResizeMouseDown = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = columnWidths[colKey] || 165;
    setResizingColKey(colKey);
    setResizeStartX(e.clientX);
    setResizeStartWidth(currentWidth);
    setLiveResizingWidth(currentWidth);

    const onMouseMove = (moveEvt: MouseEvent) => {
      const diff = moveEvt.clientX - e.clientX;
      const newWidth = Math.max(75, Math.min(500, currentWidth + diff));
      setLiveResizingWidth(newWidth);
      setColumnWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setResizingColKey(null);
      setLiveResizingWidth(null);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-screen bg-[#121214] text-zinc-100 transition-colors">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border flex items-center gap-2 ${
            toastType === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
            toastType === 'warning' ? 'bg-amber-600 text-white border-amber-500' :
            'bg-[#1c1c1e] text-zinc-100 border-white/20'
          }`}>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Resize Live Tooltip */}
      {resizingColKey && liveResizingWidth !== null && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1c1c1e] text-white text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-white/20 shadow-xl pointer-events-none">
          Width: {liveResizingWidth} px
        </div>
      )}

      {/* Top Banner & Action Ribbon */}
      <div className="border-b border-white/10 bg-[#161618] px-4 sm:px-6 py-3.5 sticky top-14 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold text-lg shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Multi-File Excel Lookup, Arranger & Print Studio
                </h1>
                
              </div>
              <p className="text-xs text-zinc-400">
                Search across multiple spreadsheets at once (XLOOKUP), drag/reorder columns, auto-fit widths, and print in your exact layout.
              </p>
            </div>
          </div>

          {/* Quick Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowLayoutStudioModal(true)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition flex items-center gap-1.5 shadow-xs"
              title="Open Arrange Columns & Print Setup Studio"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Arrange & Print Studio</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-xs"
              title="Export Table with Arranged Order & Resized Widths"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export (.xlsx)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-xs"
            >
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExecutePrint}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#2c2c2e] hover:bg-white/20 text-white border border-white/10 transition flex items-center gap-1.5 shadow-xs"
              title="Print Formatted Table Now"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col gap-5">
        
        {/* Step 1 & Step 2 Configuration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Card: Multiple Lookup Source Files (Step 1) */}
          <div className="lg:col-span-5 bg-[#161618] rounded-2xl border border-white/10 p-4.5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                    1
                  </span>
                  <h2 className="font-bold text-white text-sm">
                    Source Lookup Excel Files
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-zinc-300">
                    {lookupSources.length} File{lookupSources.length === 1 ? '' : 's'} Loaded
                  </span>
                  {lookupSources.length > 0 && (
                    <button
                      onClick={handleClearAllSources}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Dual Methods Selector for Source Lookup Data (Uploads + App Tables) */}
              <div className="mb-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Source Method:
                  </span>
                  <div className="flex rounded-lg bg-black/40 p-0.5 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setSourceMethodTab('upload')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1.5 ${
                        sourceMethodTab === 'upload'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>1. Upload Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSourceMethodTab('register')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition flex items-center gap-1.5 ${
                        sourceMethodTab === 'register'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Database className="w-3 h-3" />
                      <span>2. App Tables ({allAvailableRegisters.length})</span>
                    </button>
                  </div>
                </div>

                {sourceMethodTab === 'upload' ? (
                  <div className="p-3 rounded-xl bg-[#1c1c1e] border border-white/10">
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                        <span>Upload Excel / CSV Files</span>
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">.xlsx, .xls, .csv</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        multiple
                        onChange={handleUploadLookupFiles}
                        className="block w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 border border-white/15 rounded-xl cursor-pointer bg-[#121214]"
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[11px]">
                      <span className="text-zinc-500">
                        Upload multiple sheets anytime into your lookup pool.
                      </span>
                      {activeRegister && (
                        <button
                          type="button"
                          onClick={() => handleAddRegisterAsSource(activeRegister)}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 shrink-0"
                          title="Quickly add current table as lookup source"
                        >
                          <Database className="w-3 h-3" />
                          <span>+ Add Current Table ({activeRegister.rows.length} rows)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#1c1c1e] border border-white/10 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5" />
                        <span>Existed App Tables & Registers</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleAddAllRegistersAsSources}
                          className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition"
                        >
                          + Add All ({allAvailableRegisters.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRegisterSourceModal(true)}
                          className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline"
                        >
                          Browse All
                        </button>
                      </div>
                    </div>

                    {/* Quick list of available application tables */}
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                      {allAvailableRegisters.length === 0 ? (
                        <div className="text-xs text-zinc-500 text-center py-2">
                          No saved registers/tables found in application.
                        </div>
                      ) : (
                        allAvailableRegisters.map((reg) => {
                          const isAlreadyAdded = lookupSources.some((s) => s.registerId === reg.id);
                          return (
                            <div
                              key={reg.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#121214] border border-white/10 hover:border-white/20 transition text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <div className="truncate">
                                  <div className="font-semibold text-zinc-200 truncate max-w-[200px]" title={reg.title}>
                                    {reg.title}
                                  </div>
                                  <div className="text-[10px] text-zinc-400 flex items-center gap-2">
                                    <span>{reg.rows.length} row{reg.rows.length === 1 ? '' : 's'}</span>
                                    <span>•</span>
                                    <span>{reg.columns.length} col{reg.columns.length === 1 ? '' : 's'}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddRegisterAsSource(reg)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 flex items-center gap-1 ${
                                  isAlreadyAdded
                                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs'
                                }`}
                              >
                                {isAlreadyAdded ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>In Pool (Refresh)</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Add as Source</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Loaded Sources Pill Selector List */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Active Sources in Pool (Files & Tables)
                  </span>
                  <button
                    onClick={handleSyncKeyNames}
                    disabled={!activeSource || lookupSources.length <= 1}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-30 disabled:hover:text-blue-400 transition"
                    title="Match active file's key column across all other files"
                  >
                    🔗 Sync Key Column Across Files
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto border border-white/10 rounded-xl p-1.5 bg-[#121214] flex flex-col gap-1.5">
                  {lookupSources.length === 0 ? (
                    <div className="text-xs text-zinc-500 p-4 text-center">
                      No lookup sources loaded yet. Upload files or pick from App Tables above.
                    </div>
                  ) : (
                    lookupSources.map((src, idx) => {
                      const isActive = src.id === activeSource?.id;
                      return (
                        <div
                          key={src.id}
                          onClick={() => setActiveSourceId(src.id)}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                            isActive
                              ? `${src.theme.badgeBg} ring-1 ring-white/20`
                              : 'bg-[#1c1c1e] text-zinc-300 border-white/10 hover:bg-[#242428]'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] opacity-75">F{idx + 1}</span>
                            {src.isAppRegister ? (
                              <span title="Application Table" className="shrink-0 flex items-center">
                                <Database className="w-3.5 h-3.5 text-emerald-400" />
                              </span>
                            ) : (
                              <span title="Uploaded Excel File" className="shrink-0 flex items-center">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                              </span>
                            )}
                            <span className="font-semibold truncate max-w-[170px]" title={src.fileName}>
                              {src.fileName}
                            </span>
                            <span className="text-[10px] opacity-70">
                              ({src.uniqueKeyCount} keys)
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectorActiveSourceId(src.id);
                                setShowSourceInspector(true);
                              }}
                              className="p-1 text-zinc-400 hover:text-white rounded"
                              title="Inspect rows"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveSource(src.id);
                              }}
                              className="p-1 text-zinc-400 hover:text-rose-400 rounded"
                              title="Remove source"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active Selected Lookup File Settings */}
              {activeSource && (
                <div className="bg-[#1c1c1e] rounded-xl p-3 border border-white/10 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Configuring:</span>
                      <span className="text-blue-400 font-semibold truncate max-w-[180px]">
                        {activeSource.fileName}
                      </span>
                      {activeSource.isAppRegister && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          App Table
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Row {activeSource.headerRowIdx + 1} Header
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Worksheet</label>
                      <select
                        value={activeSource.sheetName}
                        onChange={(e) => {
                          const nextSheet = e.target.value;
                          setLookupSources((prev) =>
                            prev.map((s) => (s.id === activeSource.id ? processSourceSheet(s, false, null, nextSheet) : s))
                          );
                        }}
                        className="w-full rounded-lg border border-white/15 px-2.5 py-1.5 text-xs bg-[#242428] text-white focus:outline-none"
                      >
                        {activeSource.workbook.SheetNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Mode</label>
                      <select
                        value={activeSource.mode}
                        onChange={(e) => {
                          const nextMode = e.target.value as 'xlookup' | 'hlookup';
                          setLookupSources((prev) =>
                            prev.map((s) => (s.id === activeSource.id ? processSourceSheet(s, false, null, undefined, nextMode) : s))
                          );
                        }}
                        className="w-full rounded-lg border border-white/15 px-2.5 py-1.5 text-xs bg-[#242428] text-white focus:outline-none"
                      >
                        <option value="xlookup">XLOOKUP / VLOOKUP (Vertical)</option>
                        <option value="hlookup">HLOOKUP (Horizontal Rows)</option>
                      </select>
                    </div>
                  </div>

                  {/* Header Row Override */}
                  <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                    <label className="text-[11px] font-semibold text-zinc-400 whitespace-nowrap">
                      Header Row #:
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={activeSource.headerRowIdx + 1}
                      onChange={(e) => {
                        const newRowIdx = Math.max(0, parseInt(e.target.value, 10) - 1 || 0);
                        setLookupSources((prev) =>
                          prev.map((s) => (s.id === activeSource.id ? processSourceSheet(s, false, newRowIdx) : s))
                        );
                      }}
                      className="w-16 rounded-lg border border-white/15 px-2 py-1 text-xs font-semibold text-center bg-[#242428] text-white focus:outline-none"
                    />
                    <p className="text-[11px] text-zinc-500 leading-tight">
                      Auto-skips top banner titles.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Card Summary */}
            <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
              <span>{totalUniqueKeysAcrossSources} total unique keys across files</span>
              <button
                disabled={lookupSources.length === 0}
                onClick={() => {
                  setInspectorActiveSourceId(activeSource?.id || lookupSources[0]?.id || null);
                  setShowSourceInspector(true);
                }}
                className="font-semibold text-blue-400 hover:text-blue-300 disabled:opacity-30 transition flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Source Files</span>
              </button>
            </div>
          </div>

          {/* Right Card: Multi-File Column Mapping (Step 2) */}
          <div className="lg:col-span-7 bg-[#161618] rounded-2xl border border-white/10 p-4.5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-3 mb-3.5 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                    2
                  </span>
                  <h2 className="font-bold text-white text-sm">
                    Map Search Key & Extract Columns Across Files
                  </h2>
                </div>

                <label className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={liveAutoLookup}
                    onChange={(e) => setLiveAutoLookup(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-0"
                  />
                  <span>Live Auto-Lookup As You Type</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                {/* Left 5 Cols: Key & Merge Mode */}
                <div className="sm:col-span-5 flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Search Key in <span className="text-blue-400 font-bold">Your Table</span>
                    </label>
                    <select
                      value={selectedUserKeyColId}
                      onChange={(e) => setSelectedUserKeyColId(e.target.value)}
                      className="w-full rounded-xl border border-white/15 px-3 py-1.5 text-xs bg-[#1c1c1e] text-white focus:outline-none"
                    >
                      {userColumns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      This ID/Code is matched across all loaded files.
                    </p>
                  </div>

                  {/* Multi-File Merge Mode */}
                  <div className="bg-[#1c1c1e] border border-white/10 rounded-xl p-2.5">
                    <label className="block text-xs font-semibold text-indigo-300 mb-1">
                      Multi-File Merge Mode
                    </label>
                    <select
                      value={mergeMode}
                      onChange={(e) => setMergeMode(e.target.value as any)}
                      className="w-full rounded-lg border border-white/15 px-2.5 py-1.5 text-xs bg-[#242428] font-semibold text-indigo-200 focus:outline-none"
                    >
                      <option value="side_by_side">Side-by-Side Columns (Join All Files)</option>
                      <option value="consolidate">Consolidate / Fallback (Unify Same Columns)</option>
                    </select>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                      {mergeMode === 'side_by_side'
                        ? 'Extracts columns from each file side-by-side for the same key.'
                        : 'Merges columns with matching names into a single column, taking first available value.'}
                    </p>
                  </div>

                  {/* Active File Match Column */}
                  {activeSource && (
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">
                        Match Column in <span className="text-indigo-400">{activeSource.shortLabel}</span>
                      </label>
                      <select
                        value={activeSource.selectedKeyIndex}
                        onChange={(e) => {
                          const newIdx = parseInt(e.target.value, 10);
                          setLookupSources((prev) =>
                            prev.map((s) => {
                              if (s.id !== activeSource.id) return s;
                              const updated = { ...s, selectedKeyIndex: newIdx };
                              updated.keyMap = rebuildSourceKeyMap(updated);
                              updated.uniqueKeyCount = updated.keyMap.size;
                              return updated;
                            })
                          );
                        }}
                        className="w-full rounded-xl border border-white/15 px-3 py-1.5 text-xs bg-[#1c1c1e] text-white focus:outline-none"
                      >
                        {activeSource.detectedHeaders.map((h) => (
                          <option key={h.index} value={h.index}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      If Value Not Found Show:
                    </label>
                    <input
                      type="text"
                      value={notFoundText}
                      onChange={(e) => setNotFoundText(e.target.value)}
                      className="w-full rounded-xl border border-white/15 px-3 py-1.5 text-xs bg-[#1c1c1e] text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right 7 Cols: Return Columns Per File */}
                <div className="sm:col-span-7 flex flex-col">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-zinc-300">
                      Select Return Columns Per File
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAllReturnCols}
                        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300"
                      >
                        Select All
                      </button>
                      <span className="text-zinc-600">|</span>
                      <button
                        onClick={handleClearAllReturnCols}
                        className="text-[11px] font-semibold text-zinc-400 hover:text-zinc-300"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-[200px] max-h-[240px] overflow-y-auto border border-white/10 rounded-xl p-2.5 bg-[#121214] flex flex-col gap-2.5">
                    {lookupSources.length === 0 ? (
                      <div className="text-xs text-zinc-500 p-4 text-center">
                        Upload lookup Excel files in Step 1 to configure return columns.
                      </div>
                    ) : (
                      lookupSources.map((src, sIdx) => (
                        <div key={src.id} className="border border-white/10 rounded-lg p-2 bg-[#1c1c1e]">
                          <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-white/10">
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${src.theme.badgeBg}`}>
                                F{sIdx + 1}
                              </span>
                              <span className="truncate max-w-[150px]">{src.fileName}</span>
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Key: {src.detectedHeaders[src.selectedKeyIndex]?.name || 'Col 1'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 max-h-24 overflow-y-auto">
                            {src.detectedHeaders.map((h) => {
                              if (h.index === src.selectedKeyIndex) return null;
                              const isChecked = src.selectedReturnColIndices.has(h.index);
                              return (
                                <label
                                  key={h.index}
                                  className={`flex items-center gap-1.5 text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition ${
                                    isChecked ? 'bg-white/10 text-white font-medium' : 'text-zinc-400 hover:bg-white/5'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleReturnCol(src.id, h.index)}
                                    className="rounded text-blue-500 focus:ring-0 w-3.5 h-3.5"
                                  />
                                  <span className="truncate" title={h.name}>{h.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Card Action */}
            <div className="pt-3 mt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
              <span>{extractedColumns.length} extracted columns currently mapped</span>
              <button
                onClick={() => showToast('Lookup values refreshed across all files!', 'success')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Lookup Now</span>
              </button>
            </div>
          </div>
        </div>

        {/* Step 3: Interactive Workspace (Create / Edit Table & Search OR Upload Main File) */}
        <div className="bg-[#161618] rounded-2xl border border-white/10 shadow-xs flex flex-col">
          
          {/* Workspace Header & Mode Selector */}
          <div className="p-4 sm:px-6 border-b border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center border border-blue-500/30">
                3
              </span>
              <div>
                <h2 className="font-bold text-white text-base">
                  Search & Result Table (Interactive Scratchpad or Upload Main Sheet)
                </h2>
                <p className="text-xs text-zinc-400">
                  Type search keys below, paste a list, or pull from your current Data Table. Extracted columns appear live!
                </p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="inline-flex rounded-xl bg-[#121214] p-1 border border-white/10 self-start md:self-auto">
              <button
                onClick={() => setWorkspaceMode('interactive')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  workspaceMode === 'interactive'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                ✏️ Interactive Table
              </button>
              <button
                onClick={() => setWorkspaceMode('upload_main')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  workspaceMode === 'upload_main'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                📂 Upload Existing Main File
              </button>
            </div>
          </div>

          {/* Upload Main File Panel (Optional mode) */}
          {workspaceMode === 'upload_main' && (
            <div className="bg-[#1c1c1e] border-b border-white/10 px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Upload Main Excel File (.xlsx, .xls, .csv)
                  </label>
                  <input
                    ref={mainFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleUploadMainFile}
                    className="block w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 border border-white/15 rounded-xl bg-[#121214]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Main File Sheet
                  </label>
                  <select
                    disabled={!mainWorkbook}
                    value={mainSheetName}
                    onChange={(e) => {
                      const sName = e.target.value;
                      setMainSheetName(sName);
                      if (mainWorkbook) {
                        const raw = XLSX.utils.sheet_to_json(mainWorkbook.Sheets[sName], { header: 1, defval: '' }) as any[][];
                        setMainRawSheetRows(raw);
                        const dIdx = detectHeaderRowIndex(raw);
                        setMainHeaderRowIdx(dIdx);
                        applyMainFileSheet(raw, dIdx);
                      }
                    }}
                    className="w-full rounded-xl border border-white/15 px-3 py-1.5 text-xs bg-[#121214] text-white disabled:opacity-40 focus:outline-none"
                  >
                    {mainWorkbook?.SheetNames.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    )) || <option>Upload main file...</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Detected Header Row #
                  </label>
                  <input
                    type="number"
                    min={1}
                    disabled={!mainWorkbook}
                    value={mainHeaderRowIdx + 1}
                    onChange={(e) => {
                      const idx = Math.max(0, parseInt(e.target.value, 10) - 1 || 0);
                      setMainHeaderRowIdx(idx);
                      applyMainFileSheet(mainRawSheetRows, idx);
                    }}
                    className="w-24 rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold bg-[#121214] text-white disabled:opacity-40 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick Search & Table Builder Toolbar */}
          <div className="px-4 sm:px-6 py-3 bg-[#121214] border-b border-white/10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            
            {/* Quick Instant Search / Autocomplete */}
            <div className="flex flex-1 items-center gap-2 max-w-lg">
              <div className="relative flex-1">
                <input
                  type="text"
                  list="lookupSuggestionsList"
                  value={quickSearchInput}
                  onChange={(e) => setQuickSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      appendKeyToUserTable(quickSearchInput);
                      setQuickSearchInput('');
                    }
                  }}
                  placeholder="🔍 Quick Search across loaded files & add to table..."
                  className="w-full rounded-xl border border-white/15 pl-3 pr-3 py-1.5 text-xs bg-[#1c1c1e] text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                />
                <datalist id="lookupSuggestionsList">
                  {autocompleteSuggestions.map((s, idx) => (
                    <option key={idx} value={s.cleanKey}>
                      {s.cleanKey} — {s.sampleInfo} [{s.fileLabel}]
                    </option>
                  ))}
                </datalist>
              </div>

              <button
                onClick={() => {
                  if (quickSearchInput.trim()) {
                    appendKeyToUserTable(quickSearchInput);
                    setQuickSearchInput('');
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition whitespace-nowrap shadow-xs"
              >
                + Add to Table
              </button>
            </div>

            {/* Table Structure Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowLayoutStudioModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 transition shadow-xs flex items-center gap-1.5"
                title="Arrange Sequence, Header Renaming & Print Setup"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Arrange & Resize</span>
              </button>

              <button
                onClick={handleAutoFitAll}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1c1c1e] border border-white/15 text-zinc-300 hover:bg-[#242428] hover:text-white transition shadow-xs"
                title="Auto-fit all column widths"
              >
                ↔ Auto-Fit All
              </button>

              <button
                onClick={() => setUserRows((prev) => [...prev, {}])}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1c1c1e] border border-white/15 text-zinc-300 hover:bg-[#242428] hover:text-white transition shadow-xs"
              >
                + 1 Row
              </button>

              <button
                onClick={() => setUserRows((prev) => [...prev, {}, {}, {}, {}, {}])}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1c1c1e] border border-white/15 text-zinc-300 hover:bg-[#242428] hover:text-white transition shadow-xs"
              >
                + 5 Rows
              </button>

              <button
                onClick={() => setShowPasteModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 transition shadow-xs flex items-center gap-1"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>Paste Keys</span>
              </button>

              {activeRegister && (
                <button
                  onClick={() => setShowRegisterImportModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition shadow-xs flex items-center gap-1"
                  title="Import search keys directly from the active Data Table register"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Pull from Register</span>
                </button>
              )}

              <button
                onClick={() => {
                  const newId = 'col_' + Date.now();
                  setUserColumns((prev) => [...prev, { id: newId, name: `Custom_Col_${prev.length + 1}` }]);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-[#1c1c1e] border border-white/15 text-zinc-300 hover:bg-[#242428] hover:text-white transition shadow-xs"
              >
                + Column
              </button>

              <button
                onClick={handleCopyTable}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#2c2c2e] hover:bg-white/20 text-white border border-white/10 transition shadow-xs flex items-center gap-1"
                title="Copy full result as TSV for Excel"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Result</span>
              </button>

              <button
                onClick={handleImportAsRegister}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40 transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Import evaluated lookup table as a new Register into Data Table"
              >
                <Database className="w-3.5 h-3.5" />
                <span>📥 {lang === 'te' ? 'రిజిస్టర్‌గా ఇంపోర్ట్ చేయండి' : 'Import as Register'}</span>
              </button>

              <button
                onClick={() => {
                  setUserRows([{}, {}, {}]);
                  showToast('Reset table rows.', 'info');
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 transition shadow-xs"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Formatting Help sub-ribbon */}
          <div className="px-4 sm:px-6 py-2 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold flex items-center gap-1 text-amber-300">
                <Sparkles className="w-3 h-3" />
                <span>Studio Formatting Controls:</span>
              </span>
              <span>• <strong>Reorder Columns:</strong> Drag any column header (<strong>⠿</strong>) or click <strong>◀ ▶</strong>.</span>
              <span>• <strong>Resize Width:</strong> Drag the <strong>right border</strong> (double-click to auto-fit).</span>
              <span>• <strong>Rename:</strong> Click directly on any header title to edit for export/print.</span>
            </div>
            {lookupSources.length > 0 && (
              <button
                onClick={handleAddAllSourceKeys}
                className="font-semibold text-amber-300 hover:text-white underline"
              >
                + Add All {totalUniqueKeysAcrossSources} Keys From Files
              </button>
            )}
          </div>

          {/* Interactive Spreadsheet Grid */}
          <div className="p-4 sm:p-6 overflow-x-auto">
            <div className="border border-white/10 rounded-xl overflow-x-auto shadow-inner bg-[#121214]">
              <table className="border-collapse text-left text-xs table-fixed">
                <colgroup>
                  <col style={{ width: '44px', minWidth: '44px' }} />
                  {visibleColumns.map((c) => (
                    <col
                      key={c.colKey}
                      style={{ width: `${c.width}px`, minWidth: `${c.width}px` }}
                    />
                  ))}
                  <col style={{ width: '48px', minWidth: '48px' }} />
                </colgroup>

                <thead className="bg-[#1c1c1e] border-b border-white/10 text-zinc-300 select-none">
                  <tr>
                    <th className="px-2 py-2.5 text-center border-r border-white/10 text-zinc-500 font-semibold w-11">
                      #
                    </th>
                    {visibleColumns.map((colDesc, vIdx) => {
                      const isFirst = vIdx === 0;
                      const isLast = vIdx === visibleColumns.length - 1;
                      const isDragOver = dragOverColKey === colDesc.colKey;
                      const alignClass = colDesc.align === 'right' ? 'text-right' : colDesc.align === 'center' ? 'text-center' : 'text-left';

                      if (colDesc.kind === 'user') {
                        const isSearchKey = colDesc.isSearchKey;
                        return (
                          <th
                            key={colDesc.colKey}
                            draggable
                            onDragStart={(e) => handleDragStart(e, colDesc.colKey)}
                            onDragOver={(e) => handleDragOver(e, colDesc.colKey)}
                            onDrop={(e) => handleDrop(e, colDesc.colKey)}
                            className={`relative group px-2.5 py-2 border-r border-white/10 transition-colors ${
                              isDragOver ? 'bg-blue-600/30' :
                              isSearchKey ? 'bg-blue-950/40 text-blue-200' : 'bg-[#1c1c1e]'
                            }`}
                          >
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-white text-xs" title="Drag to reorder">
                                    ⠿
                                  </span>
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                    isSearchKey ? 'bg-blue-600 text-white' : 'bg-white/10 text-zinc-300'
                                  }`}>
                                    {colDesc.badgeText}
                                  </span>
                                  <span className="text-[10px] font-mono text-zinc-500">
                                    {colDesc.width}px
                                  </span>
                                </div>

                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => moveColumn(colDesc.colKey, 'left')}
                                    disabled={isFirst}
                                    className="px-1 py-0.5 rounded text-[10px] text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                                    title="Move column left"
                                  >
                                    ◀
                                  </button>
                                  <button
                                    onClick={() => moveColumn(colDesc.colKey, 'right')}
                                    disabled={isLast}
                                    className="px-1 py-0.5 rounded text-[10px] text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                                    title="Move column right"
                                  >
                                    ▶
                                  </button>
                                  {userColumns.length > 1 && (
                                    <button
                                      onClick={() => {
                                        setUserColumns((prev) => prev.filter((c) => c.id !== colDesc.userColId));
                                      }}
                                      className="text-zinc-500 hover:text-rose-400 px-1 text-xs"
                                      title="Delete column"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center">
                                <input
                                  type="text"
                                  value={colDesc.displayHeader}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setColumnCustomLabels((prev) => ({ ...prev, [colDesc.colKey]: val }));
                                    if (colDesc.userColId) {
                                      setUserColumns((prev) =>
                                        prev.map((c) => (c.id === colDesc.userColId ? { ...c, name: val } : c))
                                      );
                                    }
                                  }}
                                  className={`bg-transparent font-bold text-xs text-white focus:bg-[#242428] focus:px-1.5 py-0.5 rounded border border-transparent focus:border-blue-400 focus:outline-none w-full ${alignClass}`}
                                  title="Click to rename"
                                />
                              </div>
                            </div>

                            {/* Resize handle */}
                            <div
                              onMouseDown={(e) => handleResizeMouseDown(e, colDesc.colKey)}
                              onDoubleClick={() => autoFitColumnWidth(colDesc.colKey)}
                              className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-blue-500 z-10 transition-colors"
                              title="Drag to resize width (Double-click to auto-fit)"
                            />
                          </th>
                        );
                      }

                      // Extracted Column Header
                      return (
                        <th
                          key={colDesc.colKey}
                          draggable
                          onDragStart={(e) => handleDragStart(e, colDesc.colKey)}
                          onDragOver={(e) => handleDragOver(e, colDesc.colKey)}
                          onDrop={(e) => handleDrop(e, colDesc.colKey)}
                          className={`relative group px-2.5 py-2 border-r border-white/10 transition-colors ${
                            isDragOver ? 'bg-emerald-600/30' : colDesc.theme?.headerBg || 'bg-emerald-950/40 text-emerald-200'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-white text-xs" title="Drag to reorder">
                                  ⠿
                                </span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold truncate ${colDesc.theme?.badgeBg || 'bg-emerald-500/20 text-emerald-300'}`}>
                                  {colDesc.badgeText}
                                </span>
                                <span className="text-[10px] font-mono text-zinc-400">
                                  {colDesc.width}px
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5">
                                <button
                                  onClick={() => moveColumn(colDesc.colKey, 'left')}
                                  disabled={isFirst}
                                  className="px-1 py-0.5 rounded text-[10px] text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                                  title="Move column left"
                                >
                                  ◀
                                </button>
                                <button
                                  onClick={() => moveColumn(colDesc.colKey, 'right')}
                                  disabled={isLast}
                                  className="px-1 py-0.5 rounded text-[10px] text-zinc-400 hover:bg-white/10 hover:text-white disabled:opacity-20"
                                  title="Move column right"
                                >
                                  ▶
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-emerald-400 text-xs">⚡</span>
                              <input
                                type="text"
                                value={colDesc.displayHeader}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setColumnCustomLabels((prev) => ({ ...prev, [colDesc.colKey]: val }));
                                }}
                                className={`bg-transparent font-bold text-xs text-white focus:bg-[#242428] focus:px-1.5 py-0.5 rounded border border-transparent focus:border-emerald-400 focus:outline-none w-full ${alignClass}`}
                                title="Click to rename extracted header for print"
                              />
                            </div>
                          </div>

                          {/* Resize handle */}
                          <div
                            onMouseDown={(e) => handleResizeMouseDown(e, colDesc.colKey)}
                            onDoubleClick={() => autoFitColumnWidth(colDesc.colKey)}
                            className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-emerald-500 z-10 transition-colors"
                            title="Drag to resize width (Double-click to auto-fit)"
                          />
                        </th>
                      );
                    })}
                    <th className="px-2 py-2 text-center text-zinc-500 text-xs w-12">
                      Del
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10 bg-[#121214]">
                  {userRows.map((rowObj, rIdx) => {
                    const rawSearchVal = rowObj[selectedUserKeyColId] || '';
                    const normSearchVal = normalizeKey(rawSearchVal);
                    const isEven = rIdx % 2 === 0;

                    return (
                      <tr key={rIdx} className={`hover:bg-white/5 transition-colors ${isEven ? 'bg-[#121214]' : 'bg-[#161618]'}`}>
                        <td className="px-2 py-2 text-center border-r border-white/10 text-zinc-500 font-mono text-[11px]">
                          {rIdx + 1}
                        </td>

                        {visibleColumns.map((colDesc) => {
                          const alignClass = colDesc.align === 'right' ? 'text-right' : colDesc.align === 'center' ? 'text-center' : 'text-left';

                          // Editable Input Column Cell
                          if (colDesc.kind === 'user' && colDesc.userColId) {
                            const isSearchKey = colDesc.isSearchKey;
                            const val = rowObj[colDesc.userColId] || '';

                            return (
                              <td key={colDesc.colKey} className={`p-1 border-r border-white/10 ${isSearchKey ? 'bg-blue-950/20' : ''}`}>
                                <input
                                  type="text"
                                  value={val}
                                  placeholder={isSearchKey ? 'Type key (e.g. ID)...' : ''}
                                  onChange={(e) => {
                                    const nextVal = e.target.value;
                                    setUserRows((prev) => {
                                      const copy = [...prev];
                                      copy[rIdx] = { ...copy[rIdx], [colDesc.userColId!]: nextVal };
                                      return copy;
                                    });
                                  }}
                                  className={`w-full bg-transparent px-2 py-1 text-xs text-white rounded border border-transparent focus:bg-[#242428] focus:border-blue-500 focus:outline-none ${alignClass}`}
                                />
                              </td>
                            );
                          }

                          // Auto-Extracted Column Cell (Calculated via XLOOKUP / VLOOKUP / HLOOKUP)
                          const res = evaluateExtractedCell(colDesc, normSearchVal);
                          return (
                            <td
                              key={colDesc.colKey}
                              className={`px-3 py-1.5 border-r border-white/10 text-xs truncate ${alignClass} ${
                                res.empty ? 'text-zinc-600' :
                                res.found ? 'text-emerald-300 font-medium' : 'text-rose-400/80 italic'
                              }`}
                              title={res.found && res.matchedFileLabel ? `Found in ${res.matchedFileLabel}` : undefined}
                            >
                              {res.empty ? '—' : res.text}
                            </td>
                          );
                        })}

                        {/* Delete Row button */}
                        <td className="px-1 py-1 text-center">
                          <button
                            onClick={() => {
                              setUserRows((prev) => {
                                const next = prev.filter((_, i) => i !== rIdx);
                                return next.length > 0 ? next : [{}];
                              });
                            }}
                            className="text-zinc-600 hover:text-rose-400 p-1 rounded"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Stats & Footer Note */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/40 inline-block" />
                  <span>Editable Input Columns</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
                  <span>Extracted Multi-File Columns</span>
                </span>
              </div>
              <div className="font-mono text-zinc-400">
                {userRows.filter((r) => userColumns.some((c) => r[c.id])).length} populated row(s) · {visibleColumns.length} visible column(s)
              </div>
            </div>

            {/* Post-Lookup Table Action: Import as Register */}
            <div className={`mt-4 p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
              isLight
                ? 'bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border-emerald-200 text-slate-800'
                : 'bg-gradient-to-r from-emerald-950/40 via-[#18181b] to-[#141416] border-emerald-500/30 text-white'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-sm">
                  <Database className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold flex items-center gap-2">
                    <span>{lang === 'te' ? 'లుకప్ ఫలితాలను రిజిస్టర్‌గా సేవ్ చేయండి' : 'Import Lookup Table as Register'}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/30">
                      {userRows.filter((r) => userColumns.some((c) => r[c.id])).length} {lang === 'te' ? 'వరుసలు' : 'Rows'}
                    </span>
                  </h4>
                  <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                    {lang === 'te'
                      ? 'ఈ లుకప్ టేబుల్‌ను ఒక పూర్తి డేటా రిజిస్టర్‌గా మార్చి డేటా టేబుల్, పివొట్ మరియు ఫారమ్‌లలో ఉపయోగించుకోండి.'
                      : 'Convert all visible lookup columns & evaluated values into a new Data Table register to filter, edit, build forms, or export.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleImportAsRegister}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 border border-emerald-400/40"
                  title="Import into Data Table as a new Register"
                >
                  <Database className="w-4 h-4" />
                  <span>📥 {lang === 'te' ? 'రిజిస్టర్‌గా ఇంపోర్ట్ చేయండి' : 'Import as Register'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Arrange, Resize & Print Studio */}
      {showLayoutStudioModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#161618] rounded-2xl shadow-2xl border border-white/15 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden text-zinc-100">
            
            {/* Header */}
            <div className="px-6 py-4 bg-[#121214] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Arrange Columns, Resize Widths & Print Studio
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Reorder any input or extracted column, rename headers, set pixel widths, and configure your print sheet.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLayoutStudioModal(false)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 bg-[#121214]">
              
              {/* Left 7 Cols: Column Order & Widths List */}
              <div className="lg:col-span-7 bg-[#161618] rounded-xl border border-white/10 p-4 flex flex-col shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      1. Column Sequence & Exact Widths
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Use ⬆ ⬇ to reorder, rename header for print, or slide width.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={handleAutoFitAll}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 text-[11px] font-semibold border border-blue-500/30"
                    >
                      ↔ Auto-Fit All
                    </button>
                    <button
                      onClick={() => {
                        const newWidths: Record<string, number> = {};
                        unifiedColumns.forEach((c) => (newWidths[c.colKey] = 160));
                        setColumnWidths(newWidths);
                        showToast('Set all columns to equal 160px width!', 'info');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 text-zinc-200 hover:bg-white/15 text-[11px] font-semibold"
                    >
                      = Equal Widths
                    </button>
                    <button
                      onClick={() => {
                        const newWidths: Record<string, number> = {};
                        unifiedColumns.forEach((c) => (newWidths[c.colKey] = 115));
                        setColumnWidths(newWidths);
                        showToast('Applied compact print fit widths (115px)!', 'info');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[11px] font-semibold border border-emerald-500/30"
                    >
                      🖨 Compact Print Fit
                    </button>
                    <button
                      onClick={() => {
                        const defaults = unifiedColumns.map((c) => c.colKey);
                        setDisplayColumnOrder(defaults);
                        showToast('Reset column order to default.', 'info');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-[11px] font-semibold border border-rose-500/20"
                    >
                      ↺ Reset Order
                    </button>
                  </div>
                </div>

                {/* Columns List */}
                <div className="flex-1 overflow-y-auto max-h-[420px] flex flex-col gap-2 pr-1">
                  {unifiedColumns.map((col, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === unifiedColumns.length - 1;

                    return (
                      <div
                        key={col.colKey}
                        className={`p-3 rounded-xl border flex flex-col gap-2.5 transition ${
                          col.hidden ? 'opacity-40 bg-[#1c1c1e] border-white/5' : 'bg-[#1c1c1e] border-white/10 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[11px] text-zinc-500 w-5">#{idx + 1}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase truncate ${
                              col.kind === 'user'
                                ? col.isSearchKey ? 'bg-blue-600 text-white' : 'bg-white/10 text-zinc-300'
                                : col.theme?.badgeBg || 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {col.badgeText}
                            </span>
                            <input
                              type="text"
                              value={col.displayHeader}
                              onChange={(e) => {
                                const val = e.target.value;
                                setColumnCustomLabels((prev) => ({ ...prev, [col.colKey]: val }));
                                if (col.userColId) {
                                  setUserColumns((prev) =>
                                    prev.map((c) => (c.id === col.userColId ? { ...c, name: val } : c))
                                  );
                                }
                              }}
                              className="bg-[#242428] border border-white/15 px-2.5 py-1 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 w-44"
                              placeholder="Header Title..."
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveColumn(col.colKey, 'top')}
                              disabled={isFirst}
                              className="px-1.5 py-1 rounded bg-[#242428] text-zinc-400 hover:text-white disabled:opacity-20 text-[10px] font-bold"
                              title="Move to Top"
                            >
                              ⤒
                            </button>
                            <button
                              onClick={() => moveColumn(col.colKey, 'left')}
                              disabled={isFirst}
                              className="px-1.5 py-1 rounded bg-[#242428] text-zinc-400 hover:text-white disabled:opacity-20 text-[10px] font-bold"
                              title="Move Up"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveColumn(col.colKey, 'right')}
                              disabled={isLast}
                              className="px-1.5 py-1 rounded bg-[#242428] text-zinc-400 hover:text-white disabled:opacity-20 text-[10px] font-bold"
                              title="Move Down"
                            >
                              ▼
                            </button>
                            <button
                              onClick={() => moveColumn(col.colKey, 'bottom')}
                              disabled={isLast}
                              className="px-1.5 py-1 rounded bg-[#242428] text-zinc-400 hover:text-white disabled:opacity-20 text-[10px] font-bold"
                              title="Move to Bottom"
                            >
                              ⤓
                            </button>
                          </div>
                        </div>

                        {/* Width slider & Alignment */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2 border-t border-white/10 text-xs">
                          <div className="sm:col-span-6 flex items-center gap-2">
                            <span className="text-[11px] text-zinc-400 whitespace-nowrap">Width:</span>
                            <input
                              type="range"
                              min={75}
                              max={460}
                              value={col.width}
                              onChange={(e) => {
                                const w = parseInt(e.target.value, 10);
                                setColumnWidths((prev) => ({ ...prev, [col.colKey]: w }));
                              }}
                              className="w-full accent-blue-500 cursor-pointer"
                            />
                            <span className="font-mono text-[11px] text-zinc-300 w-12 text-right">{col.width}px</span>
                          </div>

                          <div className="sm:col-span-3 flex items-center gap-1.5">
                            <span className="text-[11px] text-zinc-400">Align:</span>
                            <select
                              value={col.align}
                              onChange={(e) => {
                                const a = e.target.value as 'left' | 'center' | 'right';
                                setColumnAlignments((prev) => ({ ...prev, [col.colKey]: a }));
                              }}
                              className="bg-[#242428] border border-white/15 px-2 py-0.5 rounded text-[11px] text-white focus:outline-none"
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3 flex items-center justify-end gap-1.5">
                            <label className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!col.hidden}
                                onChange={(e) => {
                                  setHiddenColumnsForPrint((prev) => {
                                    const next = new Set(prev);
                                    if (e.target.checked) next.delete(col.colKey);
                                    else next.add(col.colKey);
                                    return next;
                                  });
                                }}
                                className="rounded text-blue-500 focus:ring-0 w-3.5 h-3.5"
                              />
                              <span>Include in Print</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 Cols: Required Print Page Formatting Settings */}
              <div className="lg:col-span-5 bg-[#161618] rounded-xl border border-white/10 p-4 flex flex-col justify-between shadow-xs">
                <div className="flex flex-col gap-3.5">
                  <div className="pb-2 border-b border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                      2. Required Print Page Format
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Customize how the table appears when printed or saved as PDF.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Print Report Title</label>
                    <input
                      type="text"
                      value={printTitle}
                      onChange={(e) => setPrintTitle(e.target.value)}
                      placeholder="Report Title..."
                      className="w-full rounded-xl border border-white/15 px-3 py-1.5 text-xs bg-[#1c1c1e] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Subtitle / Notes</label>
                    <input
                      type="text"
                      value={printSubtitle}
                      onChange={(e) => setPrintSubtitle(e.target.value)}
                      placeholder="e.g. Verified Consolidated Data Sheet"
                      className="w-full rounded-xl border border-white/15 px-3 py-1.5 text-xs bg-[#1c1c1e] text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Page Orientation</label>
                      <select
                        value={printOrientation}
                        onChange={(e) => setPrintOrientation(e.target.value as any)}
                        className="w-full rounded-xl border border-white/15 px-2.5 py-1.5 text-xs bg-[#1c1c1e] text-white focus:outline-none"
                      >
                        <option value="landscape">Landscape (Wide)</option>
                        <option value="portrait">Portrait (Tall)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Paper Size</label>
                      <select
                        value={printPaperSize}
                        onChange={(e) => setPrintPaperSize(e.target.value as any)}
                        className="w-full rounded-xl border border-white/15 px-2.5 py-1.5 text-xs bg-[#1c1c1e] text-white focus:outline-none"
                      >
                        <option value="A4">A4 Standard</option>
                        <option value="letter">US Letter</option>
                        <option value="legal">Legal (Extra Wide)</option>
                        <option value="A3">A3 Large Sheet</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Print Font Size</label>
                      <select
                        value={printFontSize}
                        onChange={(e) => setPrintFontSize(e.target.value)}
                        className="w-full rounded-xl border border-white/15 px-2.5 py-1.5 text-xs bg-[#1c1c1e] text-white focus:outline-none"
                      >
                        <option value="8pt">8 pt (Ultra Compact)</option>
                        <option value="9pt">9 pt (Compact)</option>
                        <option value="10pt">10 pt (Standard)</option>
                        <option value="11pt">11 pt (Medium)</option>
                        <option value="12pt">12 pt (Large)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Padding Density</label>
                      <select
                        value={printPadding}
                        onChange={(e) => setPrintPadding(e.target.value)}
                        className="w-full rounded-xl border border-white/15 px-2.5 py-1.5 text-xs bg-[#1c1c1e] text-white focus:outline-none"
                      >
                        <option value="3px 4px">Compact (Tight)</option>
                        <option value="5px 7px">Normal (Balanced)</option>
                        <option value="8px 10px">Spacious (Roomy)</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-[#1c1c1e] rounded-xl p-3 border border-white/10 flex flex-col gap-2.5">
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printRespectWidths}
                        onChange={(e) => setPrintRespectWidths(e.target.checked)}
                        className="rounded text-blue-500 focus:ring-0"
                      />
                      <span>Apply Resized Column Width Proportions in Print</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printShowSerial}
                        onChange={(e) => setPrintShowSerial(e.target.checked)}
                        className="rounded text-blue-500 focus:ring-0"
                      />
                      <span>Include Row Serial Number (#) Column</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printZebra}
                        onChange={(e) => setPrintZebra(e.target.checked)}
                        className="rounded text-blue-500 focus:ring-0"
                      />
                      <span>Alternating Zebra Row Shading for Readability</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={printShowTimestamp}
                        onChange={(e) => setPrintShowTimestamp(e.target.checked)}
                        className="rounded text-blue-500 focus:ring-0"
                      />
                      <span>Show Printed Timestamp & Summary Header</span>
                    </label>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={handleExecutePrint}
                    className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-200 transition shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Formatted Table Now</span>
                  </button>
                  <button
                    onClick={() => setShowLayoutStudioModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
                  >
                    Apply & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Paste Keys from Clipboard */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#161618] rounded-2xl shadow-2xl border border-white/15 max-w-lg w-full p-6 text-zinc-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-indigo-400" />
                <span>Paste Lookup Keys from Excel / Clipboard</span>
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              Paste a list of IDs, names, or codes (one per line, or tab-separated columns copied from Excel). They will be added into your Search Key column.
            </p>
            <textarea
              rows={7}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="e.g.&#10;EMP-101&#10;EMP-102&#10;EMP-103"
              className="w-full border border-white/15 rounded-xl p-3 text-xs font-mono bg-[#1c1c1e] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExistingPaste}
                  onChange={(e) => setReplaceExistingPaste(e.target.checked)}
                  className="rounded text-blue-500 focus:ring-0"
                />
                <span>Replace existing empty rows</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPasteModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-white/10 hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                    if (lines.length === 0) {
                      setShowPasteModal(false);
                      return;
                    }
                    setUserRows((prev) => {
                      const base = replaceExistingPaste ? [] : prev.filter((r) => userColumns.some((c) => r[c.id]));
                      const newRows = lines.map((line) => {
                        const parts = line.split('\t');
                        const rowObj: Record<string, string> = { [selectedUserKeyColId]: parts[0]?.trim() || '' };
                        if (parts.length > 1) {
                          let pIdx = 1;
                          userColumns.forEach((col) => {
                            if (col.id !== selectedUserKeyColId && pIdx < parts.length) {
                              rowObj[col.id] = parts[pIdx].trim();
                              pIdx++;
                            }
                          });
                        }
                        return rowObj;
                      });
                      return [...base, ...newRows];
                    });
                    setPasteText('');
                    setShowPasteModal(false);
                    showToast(`Inserted ${lines.length} key(s) into search table!`, 'success');
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500"
                >
                  Insert Values & Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Source Files Data Inspector */}
      {showSourceInspector && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-[#161618] rounded-2xl shadow-2xl border border-white/15 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
            <div className="px-6 py-4 bg-[#121214] border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" />
                  <span>Source Lookup Files Data Inspector</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Inspect raw rows inside your loaded files, or click "+ Add to Table" to populate keys directly.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddAllSourceKeys}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-xs"
                >
                  + Add All Unique Keys From All Files
                </button>
                <button
                  onClick={() => setShowSourceInspector(false)}
                  className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* File Switcher Tabs inside Preview */}
            <div className="px-6 py-3 bg-[#161618] border-b border-white/10 flex flex-wrap gap-2">
              {lookupSources.map((src, idx) => {
                const isSelected = src.id === (inspectorActiveSourceId || activeSource?.id);
                return (
                  <button
                    key={src.id}
                    onClick={() => setInspectorActiveSourceId(src.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : 'bg-[#1c1c1e] text-zinc-300 border-white/10 hover:bg-[#242428]'
                    }`}
                  >
                    <span>F{idx + 1}: {src.fileName}</span>
                    <span className="text-[10px] opacity-75">({src.uniqueKeyCount} keys)</span>
                  </button>
                );
              })}
            </div>

            {/* Table Inspector */}
            <div className="flex-1 overflow-auto p-4 bg-[#121214]">
              {(() => {
                const targetSrc = lookupSources.find(
                  (s) => s.id === (inspectorActiveSourceId || activeSource?.id)
                ) || lookupSources[0];

                if (!targetSrc) {
                  return (
                    <div className="text-center text-zinc-500 py-12 text-xs">
                      No files loaded.
                    </div>
                  );
                }

                const maxPreview = Math.min(targetSrc.rawRows.length, targetSrc.headerRowIdx + 100);

                return (
                  <div className="border border-white/10 rounded-xl overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-[#1c1c1e] text-zinc-200 sticky top-0 border-b border-white/10">
                        <tr>
                          <th className="p-2.5 border-r border-white/10 text-center w-28 text-zinc-400">
                            Action
                          </th>
                          {targetSrc.detectedHeaders.map((h) => {
                            const isKey = h.index === targetSrc.selectedKeyIndex;
                            return (
                              <th
                                key={h.index}
                                className={`p-2.5 border-r border-white/10 whitespace-nowrap ${
                                  isKey ? 'bg-blue-950/60 text-blue-200 font-bold' : ''
                                }`}
                              >
                                {h.name} {isKey ? '🔑 (Match Key)' : ''}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 bg-[#121214]">
                        {Array.from({ length: Math.max(0, maxPreview - targetSrc.headerRowIdx - 1) }).map((_, i) => {
                          const r = targetSrc.headerRowIdx + 1 + i;
                          const row = targetSrc.rawRows[r] || [];
                          const keyVal = row[targetSrc.selectedKeyIndex] !== undefined ? String(row[targetSrc.selectedKeyIndex]).trim() : '';

                          return (
                            <tr key={r} className="hover:bg-white/5 transition-colors">
                              <td className="p-1.5 border-r border-white/10 text-center">
                                <button
                                  onClick={() => appendKeyToUserTable(keyVal)}
                                  className="px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-600 hover:text-white font-semibold text-[11px] transition"
                                >
                                  + Add Key
                                </button>
                              </td>
                              {targetSrc.detectedHeaders.map((h) => (
                                <td key={h.index} className="p-2 border-r border-white/10 whitespace-nowrap text-zinc-300">
                                  {row[h.index] !== undefined ? String(row[h.index]) : ''}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Pull Keys from Current Active Register */}
      {showRegisterImportModal && activeRegister && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#161618] rounded-2xl shadow-2xl border border-white/15 max-w-md w-full p-6 text-zinc-100">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <span>Pull Keys from Active Register</span>
              </h3>
              <button
                onClick={() => setShowRegisterImportModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Choose a column from your current Data Table <strong>"{activeRegister.title}"</strong> ({activeRegister.rows.length} rows) to populate as search keys in this Studio.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Select Register Key Column
              </label>
              <select
                value={registerKeyCol || activeRegister.columns[0]?.id || ''}
                onChange={(e) => setRegisterKeyCol(e.target.value)}
                className="w-full rounded-xl border border-white/15 px-3 py-2 text-xs bg-[#1c1c1e] text-white focus:outline-none"
              >
                {activeRegister.columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setShowRegisterImportModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-white/10 hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                onClick={handleLoadKeysFromActiveRegister}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs"
              >
                Import Keys Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Browse & Add Existed App Tables / Registers as Lookup Sources */}
      {showRegisterSourceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#161618] rounded-2xl shadow-2xl border border-white/15 max-w-2xl w-full p-6 text-zinc-100 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Add From Existed Application Tables
                </h3>
              </div>
              <button
                onClick={() => setShowRegisterSourceModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4 shrink-0">
              Select any table or register saved inside this application to join your multi-file lookup pool alongside uploaded Excel files.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {allAvailableRegisters.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  No tables or registers found in this application yet.
                </div>
              ) : (
                allAvailableRegisters.map((reg) => {
                  const isAdded = lookupSources.some((s) => s.registerId === reg.id);
                  return (
                    <div
                      key={reg.id}
                      className="p-3.5 rounded-xl bg-[#1c1c1e] border border-white/10 hover:border-white/20 transition flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">{reg.title}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-300 font-mono">
                              {reg.rows.length} rows • {reg.columns.length} columns
                            </span>
                          </div>
                          {reg.description && (
                            <p className="text-xs text-zinc-400 mt-1">{reg.description}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            handleAddRegisterAsSource(reg);
                            setShowRegisterSourceModal(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                            isAdded
                              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                              : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Update In Pool</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add as Source</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Columns preview */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold self-center mr-1">
                          Columns:
                        </span>
                        {reg.columns.map((c, cIdx) => (
                          <span
                            key={c.id || cIdx}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-300"
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/10 mt-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleAddAllRegistersAsSources();
                  setShowRegisterSourceModal(false);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20"
              >
                + Add All {allAvailableRegisters.length} Tables to Pool
              </button>
              <button
                type="button"
                onClick={() => setShowRegisterSourceModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-zinc-300 bg-white/10 hover:bg-white/15"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
