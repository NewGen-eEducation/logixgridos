import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Register, 
  ColumnDef, 
  RowData,
  GoogleSheetsPivotConfig, 
  GoogleSheetsAggregation, 
  PivotShowAs,
  SavedPivotTable
} from '../types/register';
import { Language, translations } from '../utils/translations';
import { idbGetItemSync, idbSetItem } from '../utils/indexedDBStorage';
import { executeGoogleSheetsPivot, PivotGridMatrix, getFieldDisplayValue } from '../utils/googleSheetsPivot';
import { PivotSummaryListModal } from './PivotSummaryListModal';
import { ExportDropdown } from './ExportDropdown';
import { exportPivotTableToExcelOrCSV } from '../utils/exportUtils';
import { ConfirmModal } from './ConfirmModal';
import { NewPivotModal, RenamePivotModal, PivotTemplateType } from './PivotModals';
import { 
  Download, 
  Plus, 
  X, 
  Check, 
  SlidersHorizontal, 
  Sparkles, 
  ChevronUp,
  ChevronDown, 
  DollarSign, 
  Percent, 
  Copy, 
  Table as TableIcon,
  ListFilter,
  MoreVertical,
  Edit2,
  Trash2,
  Layers,
  FileSpreadsheet,
  BarChart3,
  LayoutGrid,
  Printer
} from 'lucide-react';
import { PivotChartsView } from './PivotChartsView';
import { TablePrintModal, PrintColumnItem, PrintRowItem } from './TablePrintModal';
import { DepartmentProfile } from '../types/register';

interface PivotTableProps {
  register: Register;
  onUpdateRegister?: (updater: (prev: Register) => Register) => void;
  lang: Language;
  deptProfile?: DepartmentProfile;
}

export const PivotTable: React.FC<PivotTableProps> = ({ register, onUpdateRegister, lang, deptProfile }) => {
  const t = translations[lang];

  // Candidates for dimensions and metrics
  const dimensionCandidates = useMemo(
    () => register.columns.filter((c) => c.type === 'select' || c.type === 'multiple_choice' || c.type === 'text' || c.type === 'date'),
    [register.columns]
  );

  const valueCandidates = useMemo(
    () => register.columns.filter((c) => c.type === 'number' || c.type === 'currency' || c.type === 'formula' || c.type === 'linear_scale'),
    [register.columns]
  );

  // Helper to construct a fresh default config (empty every time as requested)
  const createDefaultConfig = (): GoogleSheetsPivotConfig => ({
    rows: [],
    columns: [],
    values: [],
    filters: [],
  });

  // Multiple Pivot Tables management state
  const [pivotTables, setPivotTables] = useState<SavedPivotTable[]>(() => {
    if (register.pivotTables && register.pivotTables.length > 0) {
      return register.pivotTables;
    }
    try {
      const saved = idbGetItemSync<SavedPivotTable[] | string>(`dyn_pivot_tables_${register.id}`);
      if (saved) {
        const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: `pivot_${Date.now()}_1`,
        name: 'Pivot 1',
        config: { rows: [], columns: [], values: [], filters: [] },
        formatMode: 'default',
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [activePivotId, setActivePivotId] = useState<string>(() => pivotTables[0]?.id || `pivot_${Date.now()}`);

  const onUpdateRegisterRef = useRef(onUpdateRegister);
  onUpdateRegisterRef.current = onUpdateRegister;

  // Track the last persisted tables JSON to avoid redundant updates to parent
  const lastPersistedRef = useRef<string>(JSON.stringify(pivotTables));
  const prevRegisterIdRef = useRef(register.id);

  // Re-sync if register.id changes to another register
  useEffect(() => {
    if (prevRegisterIdRef.current === register.id) return;
    prevRegisterIdRef.current = register.id;

    if (register.pivotTables && register.pivotTables.length > 0) {
      setPivotTables(register.pivotTables);
      setActivePivotId(register.pivotTables[0].id);
      lastPersistedRef.current = JSON.stringify(register.pivotTables);
    } else {
      try {
        const saved = idbGetItemSync<SavedPivotTable[] | string>(`dyn_pivot_tables_${register.id}`);
        if (saved) {
          const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPivotTables(parsed);
            setActivePivotId(parsed[0].id);
            lastPersistedRef.current = JSON.stringify(parsed);
            return;
          }
        }
      } catch {
        // ignore
      }
      const initial: SavedPivotTable[] = [
        {
          id: `pivot_${Date.now()}_1`,
          name: 'Pivot 1',
          config: createDefaultConfig(),
          formatMode: 'default' as const,
          createdAt: new Date().toISOString(),
        },
      ];
      setPivotTables(initial);
      setActivePivotId(initial[0].id);
      lastPersistedRef.current = JSON.stringify(initial);
    }
  }, [register.id]);

  // Persist pivot tables safely in useEffect (commit phase, never during render phase)
  useEffect(() => {
    const serialized = JSON.stringify(pivotTables);
    if (serialized === lastPersistedRef.current) return;
    lastPersistedRef.current = serialized;

    try {
      idbSetItem(`dyn_pivot_tables_${register.id}`, pivotTables);
    } catch {
      // ignore
    }

    if (onUpdateRegisterRef.current) {
      onUpdateRegisterRef.current((prev) => {
        if (JSON.stringify(prev.pivotTables) === serialized) {
          return prev;
        }
        return {
          ...prev,
          pivotTables,
        };
      });
    }
  }, [pivotTables, register.id]);

  // Active Pivot Table Object
  const activePivotTable = useMemo(() => {
    return pivotTables.find((p) => p.id === activePivotId) || pivotTables[0] || {
      id: 'fallback',
      name: 'Pivot 1',
      config: createDefaultConfig(),
      formatMode: 'default' as const,
    };
  }, [pivotTables, activePivotId]);

  const pivotConfig = activePivotTable.config;
  const formatMode = activePivotTable.formatMode || 'default';

  // Update config of currently active pivot table (pure state update, no side effects inside reducer)
  const setPivotConfig = (updaterOrValue: GoogleSheetsPivotConfig | ((prev: GoogleSheetsPivotConfig) => GoogleSheetsPivotConfig)) => {
    setPivotTables((prevList) =>
      prevList.map((pt) => {
        if (pt.id === activePivotId) {
          const nextConfig = typeof updaterOrValue === 'function' ? updaterOrValue(pt.config) : updaterOrValue;
          return {
            ...pt,
            config: nextConfig,
            updatedAt: new Date().toISOString(),
          };
        }
        return pt;
      })
    );
  };

  // Update format mode of currently active pivot table (pure state update)
  const setFormatMode = (mode: 'default' | 'currency' | 'percent') => {
    setPivotTables((prevList) =>
      prevList.map((pt) => {
        if (pt.id === activePivotId) {
          return {
            ...pt,
            formatMode: mode,
            updatedAt: new Date().toISOString(),
          };
        }
        return pt;
      })
    );
  };

  // Modal States for Add, Rename, Delete
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTargetPivot, setRenameTargetPivot] = useState<SavedPivotTable | null>(null);
  const [deleteModalTarget, setDeleteModalTarget] = useState<SavedPivotTable | null>(null);
  const [cannotDeleteToast, setCannotDeleteToast] = useState(false);

  // Add a new Pivot Table with Template
  const handleCreateNewPivot = (name: string, _template?: PivotTemplateType) => {
    const newId = `pivot_${Date.now()}`;
    const config: GoogleSheetsPivotConfig = { rows: [], columns: [], values: [], filters: [] };

    const newPivot: SavedPivotTable = {
      id: newId,
      name: name.trim() || `Pivot ${pivotTables.length + 1}`,
      config,
      formatMode: 'default',
      createdAt: new Date().toISOString(),
    };

    setPivotTables((prev) => [...prev, newPivot]);
    setActivePivotId(newId);
    setIsAddModalOpen(false);
  };

  // Quick fallback if user clicks without modal
  const handleAddNewPivotTable = () => {
    setIsAddModalOpen(true);
  };

  // Duplicate current Pivot Table
  const handleDuplicatePivotTable = (sourceId: string) => {
    const source = pivotTables.find((p) => p.id === sourceId);
    if (!source) return;
    const newId = `pivot_${Date.now()}`;
    const newPivot: SavedPivotTable = {
      id: newId,
      name: `${source.name} (Copy)`,
      config: JSON.parse(JSON.stringify(source.config)),
      formatMode: source.formatMode || 'default',
      createdAt: new Date().toISOString(),
    };
    setPivotTables((prev) => [...prev, newPivot]);
    setActivePivotId(newId);
    setTabMenuId(null);
  };

  // Open Rename Modal
  const openRenameModal = (pt?: SavedPivotTable) => {
    const target = pt || activePivotTable;
    setRenameTargetPivot(target);
    setIsRenameModalOpen(true);
    setTabMenuId(null);
  };

  const handleSaveRename = (newName: string) => {
    const targetId = renameTargetPivot?.id || activePivotId;
    const trimmed = newName.trim();
    if (trimmed) {
      setPivotTables((prev) =>
        prev.map((p) =>
          p.id === targetId ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p
        )
      );
    }
    setIsRenameModalOpen(false);
    setRenameTargetPivot(null);
  };

  // Inline Rename on Tab (Double Click)
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRenamingTab = (pt: SavedPivotTable) => {
    setRenamingTabId(pt.id);
    setRenameDraft(pt.name);
    setTabMenuId(null);
    setTimeout(() => renameInputRef.current?.focus(), 50);
  };

  const saveRenameTab = () => {
    if (!renamingTabId) return;
    const trimmed = renameDraft.trim();
    if (trimmed) {
      setPivotTables((prev) =>
        prev.map((p) =>
          p.id === renamingTabId ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p
        )
      );
    }
    setRenamingTabId(null);
  };

  // Delete Pivot Table with Confirmation
  const handleDeletePivotTable = (deleteId: string) => {
    if (pivotTables.length <= 1) {
      setCannotDeleteToast(true);
      setTimeout(() => setCannotDeleteToast(false), 3000);
      setDeleteModalTarget(null);
      return;
    }
    setPivotTables((prev) => {
      const updated = prev.filter((p) => p.id !== deleteId);
      if (activePivotId === deleteId && updated.length > 0) {
        setActivePivotId(updated[0].id);
      }
      return updated;
    });
    setTabMenuId(null);
    setDeleteModalTarget(null);
  };

  // UI States
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'chart' | 'split'>('table');
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; colIdx: number; label: string; formula: string }>({
    rowIdx: 0,
    colIdx: 0,
    label: 'A1',
    formula: 'PIVOT TABLE',
  });

  // Dropdown open states for "Add" buttons in editor
  const [openDropdown, setOpenDropdown] = useState<'rows' | 'columns' | 'values' | 'filters' | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  const [tabMenuId, setTabMenuId] = useState<string | null>(null);

  // Summary List Menu state for Value Column Headers (Summarize By dropdown)
  const [summaryListMenuCol, setSummaryListMenuCol] = useState<{
    valueIndex: number;
    valueId: string;
  } | null>(null);

  // Drilldown Summary List Modal State (Excel Show Details / Underlying Records)
  const [summaryListModal, setSummaryListModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    summaryValueDisplay?: string;
    summaryMethod?: string;
    rows: RowData[];
  } | null>(null);

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Compute Pivot Result
  const pivotResult: PivotGridMatrix = useMemo(() => {
    return executeGoogleSheetsPivot(register.rows, register.columns, pivotConfig);
  }, [register.rows, register.columns, pivotConfig]);

  const activeRowFields = useMemo(
    () => (pivotConfig.rows || []).map((r) => register.columns.find((c) => c.id === r.id)).filter(Boolean) as ColumnDef[],
    [pivotConfig.rows, register.columns]
  );
  const activeColFields = useMemo(
    () => (pivotConfig.columns || []).map((c) => register.columns.find((col) => col.id === c.id)).filter(Boolean) as ColumnDef[],
    [pivotConfig.columns, register.columns]
  );
  const activeRowField = activeRowFields[0] || null;
  const activeColField = activeColFields[0] || null;
  const rowFieldTitle = activeRowFields.length > 0 ? activeRowFields.map((f) => f.name).join(' › ') : 'All Records';
  const colFieldTitle = activeColFields.length > 0 ? activeColFields.map((f) => f.name).join(' › ') : '';
  const activeValueConfigs = pivotConfig.values;
  const isMultiRow = activeRowFields.length > 1;
  const isMultiCol = activeColFields.length > 1;
  const rowColsCount = isMultiRow ? activeRowFields.length : 1;
  const headerRowCount = isMultiCol
    ? (activeValueConfigs.length > 1 ? 3 : 2)
    : (activeValueConfigs.length > 1 ? 2 : 1);
  const isPivotConfigEmpty = (pivotConfig.rows || []).length === 0 && (pivotConfig.columns || []).length === 0 && (pivotConfig.values || []).length === 0;

  // Group columns by parent dimension when multiple column fields are configured (e.g. Medium and Sex)
  const colHierarchyGroups = useMemo(() => {
    if (activeColFields.length <= 1) return null;
    const groups: { parentKey: string; colKeys: string[] }[] = [];
    pivotResult.colKeys.forEach((ck) => {
      const parentKey = ck.split(' › ')[0] || ck;
      const existing = groups.find((g) => g.parentKey === parentKey);
      if (existing) {
        existing.colKeys.push(ck);
      } else {
        groups.push({ parentKey, colKeys: [ck] });
      }
    });
    return groups;
  }, [pivotResult.colKeys, activeColFields]);

  // Copy Pivot Table to Clipboard (TSV format)
  const handleCopyTable = async () => {
    const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotals } = pivotResult;
    const vConfigs = activeValueConfigs.length > 0 ? activeValueConfigs : [{ id: '', summarizeBy: 'COUNTA' as const, showAs: 'DEFAULT' as const }];
    const lines: string[] = [];

    // Header 1: Column dimension labels
    const rowHead = isMultiRow ? activeRowFields.map((f) => f.name).join('\t') : (rowFieldTitle || 'Row');
    const headerRow: string[] = [rowHead];
    colKeys.forEach((cKey) => {
      vConfigs.forEach((v) => {
        const vName = register.columns.find((c) => c.id === v.id)?.name || '';
        headerRow.push(`${cKey} - ${v.summarizeBy} ${vName}`);
      });
    });
    if (pivotConfig.rows[0]?.showTotals) {
      vConfigs.forEach((v) => {
        const vName = register.columns.find((c) => c.id === v.id)?.name || '';
        headerRow.push(`Grand Total - ${v.summarizeBy} ${vName}`);
      });
    }
    lines.push(headerRow.join('\t'));

    // Data rows
    rowKeys.forEach((rKey) => {
      const rParts = isMultiRow ? rKey.split(' › ') : [rKey];
      const line: string[] = [...rParts];
      colKeys.forEach((cKey) => {
        vConfigs.forEach((v) => {
          line.push(matrix[rKey]?.[cKey]?.[v.id]?.formatted || '0');
        });
      });
      if (pivotConfig.rows[0]?.showTotals) {
        vConfigs.forEach((v) => {
          line.push(rowTotals[rKey]?.[v.id]?.formatted || '0');
        });
      }
      lines.push(line.join('\t'));
    });

    if (pivotConfig.columns[0]?.showTotals) {
      const totHeader = isMultiRow
        ? ['Grand Total', ...Array(activeRowFields.length - 1).fill('')]
        : ['Grand Total'];
      const totLine: string[] = [...totHeader];
      colKeys.forEach((cKey) => {
        vConfigs.forEach((v) => {
          totLine.push(colTotals[cKey]?.[v.id]?.formatted || '0');
        });
      });
      if (pivotConfig.rows[0]?.showTotals) {
        vConfigs.forEach((v) => {
          totLine.push(grandTotals[v.id]?.formatted || '0');
        });
      }
      lines.push(totLine.join('\t'));
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    } catch {
      // fallback
    }
  };

  

  // Field Add Handlers
  const handleAddRow = (colId: string) => {
    if (pivotConfig.rows.some((r) => r.id === colId)) return;
    setPivotConfig((prev) => ({
      ...prev,
      rows: [...prev.rows, { id: colId, order: 'asc', sortBy: 'self', showTotals: true }],
    }));
    setOpenDropdown(null);
  };

  const handleAddColumn = (colId: string) => {
    if (pivotConfig.columns.some((c) => c.id === colId)) return;
    setPivotConfig((prev) => ({
      ...prev,
      columns: [...prev.columns, { id: colId, order: 'asc', sortBy: 'self', showTotals: true }],
    }));
    setOpenDropdown(null);
  };

  const handleAddValue = (colId: string) => {
    const colDef = register.columns.find((c) => c.id === colId);
    const isNum = colDef?.type === 'number' || colDef?.type === 'currency' || colDef?.type === 'formula';
    setPivotConfig((prev) => ({
      ...prev,
      values: [
        ...prev.values,
        { id: colId, summarizeBy: isNum ? 'SUM' : 'COUNTA', showAs: 'DEFAULT' },
      ],
    }));
    setOpenDropdown(null);
  };

  const handleAddFilter = (colId: string) => {
    if (pivotConfig.filters.some((f) => f.id === colId)) return;
    setPivotConfig((prev) => ({
      ...prev,
      filters: [...prev.filters, { id: colId, selectedValues: [], showingAll: true }],
    }));
    setOpenDropdown(null);
  };

  // Field Remove Handlers
  const handleRemoveRow = (idx: number) => {
    setPivotConfig((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveColumn = (idx: number) => {
    setPivotConfig((prev) => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveValue = (idx: number) => {
    setPivotConfig((prev) => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== idx),
    }));
  };

  const handleRemoveFilter = (idx: number) => {
    setPivotConfig((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== idx),
    }));
  };

  // Field Move (Rearrange) Handlers
  const handleMoveRow = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= pivotConfig.rows.length) return;
    const updated = [...pivotConfig.rows];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPivotConfig({ ...pivotConfig, rows: updated });
  };

  const handleMoveColumn = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= pivotConfig.columns.length) return;
    const updated = [...pivotConfig.columns];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPivotConfig({ ...pivotConfig, columns: updated });
  };

  const handleMoveValue = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= pivotConfig.values.length) return;
    const updated = [...pivotConfig.values];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPivotConfig({ ...pivotConfig, values: updated });
  };

  const handleMoveFilter = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= pivotConfig.filters.length) return;
    const updated = [...pivotConfig.filters];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setPivotConfig({ ...pivotConfig, filters: updated });
  };

  // Quick Summarize By handler (from the summary list dropdown)
  const handleSetSummaryAggregation = (valueIndex: number, summarizeBy: GoogleSheetsAggregation) => {
    const updated = [...pivotConfig.values];
    if (updated[valueIndex]) {
      updated[valueIndex] = {
        ...updated[valueIndex],
        summarizeBy,
      };
      setPivotConfig({
        ...pivotConfig,
        values: updated,
      });
    }
    setSummaryListMenuCol(null);
  };

  const handleSetSummaryShowAs = (valueIndex: number, showAs: PivotShowAs) => {
    const updated = [...pivotConfig.values];
    if (updated[valueIndex]) {
      updated[valueIndex] = {
        ...updated[valueIndex],
        showAs,
      };
      setPivotConfig({
        ...pivotConfig,
        values: updated,
      });
    }
    setSummaryListMenuCol(null);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotals } = pivotResult;
    const lines: string[] = [];

    // Header line
    const rowHead = isMultiRow
      ? activeRowFields.map((f) => `"${f.name}"`).join(',')
      : `"${rowFieldTitle || 'Row'}"`;
    const headerCols = [rowHead, ...colKeys.map((c) => `"${c}"`)];
    if (pivotConfig.rows[0]?.showTotals) headerCols.push('"Grand Total"');
    lines.push(headerCols.join(','));

    // Data rows
    rowKeys.forEach((rKey) => {
      const vConfig = activeValueConfigs[0];
      const vId = vConfig?.id || '';
      const rParts = isMultiRow
        ? rKey.split(' › ').map((p) => `"${p}"`)
        : [`"${rKey}"`];
      const rowLine = [...rParts];

      colKeys.forEach((cKey) => {
        rowLine.push(`"${matrix[rKey]?.[cKey]?.[vId]?.formatted || '0'}"`);
      });

      if (pivotConfig.rows[0]?.showTotals) {
        rowLine.push(`"${rowTotals[rKey]?.[vId]?.formatted || '0'}"`);
      }

      lines.push(rowLine.join(','));
    });

    // Column totals row
    if (pivotConfig.columns[0]?.showTotals) {
      const vConfig = activeValueConfigs[0];
      const vId = vConfig?.id || '';
      const totHeader = isMultiRow
        ? ['"Grand Total"', ...Array(activeRowFields.length - 1).fill('""')]
        : ['"Grand Total"'];
      const totLine = [...totHeader];

      colKeys.forEach((cKey) => {
        totLine.push(`"${colTotals[cKey]?.[vId]?.formatted || '0'}"`);
      });

      if (pivotConfig.rows[0]?.showTotals) {
        totLine.push(`"${grandTotals[vId]?.formatted || '0'}"`);
      }

      lines.push(totLine.join(','));
    }

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `excel_pivot_${activePivotTable.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to get column letter for grid (A, B, C...)
  const getColLetter = (idx: number) => String.fromCharCode(65 + (idx % 26));

  // Prepare Columns and Rows for TablePrintModal (Pivot Table Cross-Tabulation)
  const { pivotPrintColumns, pivotPrintRows } = useMemo(() => {
    const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotals } = pivotResult;
    const vConfigs = activeValueConfigs.length > 0
      ? activeValueConfigs
      : [{ id: '', summarizeBy: 'COUNTA' as const, showAs: 'DEFAULT' as const }];

    const cols: PrintColumnItem[] = [];
    if (activeRowFields.length > 1) {
      activeRowFields.forEach((rf, idx) => {
        cols.push({
          id: `__rowKey_${idx}`,
          name: rf.name,
          align: 'left',
        });
      });
    } else {
      cols.push({
        id: '__rowKey',
        name: rowFieldTitle,
        align: 'left',
      });
    }

    colKeys.forEach((cKey) => {
      vConfigs.forEach((v) => {
        const vCol = register.columns.find((c) => c.id === v.id);
        const colLabel = vConfigs.length > 1
          ? `${cKey} (${v.customName || `${v.summarizeBy} ${vCol?.name || ''}`})`
          : cKey;
        cols.push({
          id: `col_${cKey}_${v.id}`,
          name: colLabel,
          align: 'right',
        });
      });
    });

    if (pivotConfig.rows[0]?.showTotals) {
      vConfigs.forEach((v) => {
        const vCol = register.columns.find((c) => c.id === v.id);
        const totalLabel = vConfigs.length > 1
          ? `Grand Total (${v.customName || `${v.summarizeBy} ${vCol?.name || ''}`})`
          : 'Grand Total';
        cols.push({
          id: `col_grand_total_${v.id}`,
          name: totalLabel,
          align: 'right',
        });
      });
    }

    const rowsData: PrintRowItem[] = [];
    rowKeys.forEach((rKey, rIdx) => {
      const cells: Record<string, any> = {};
      if (activeRowFields.length > 1) {
        const rParts = rKey.split(' › ');
        activeRowFields.forEach((_, idx) => {
          cells[`__rowKey_${idx}`] = rParts[idx] || '';
        });
      } else {
        cells.__rowKey = rKey;
      }
      colKeys.forEach((cKey) => {
        vConfigs.forEach((v) => {
          cells[`col_${cKey}_${v.id}`] = matrix[rKey]?.[cKey]?.[v.id]?.formatted || '0';
        });
      });
      if (pivotConfig.rows[0]?.showTotals) {
        vConfigs.forEach((v) => {
          cells[`col_grand_total_${v.id}`] = rowTotals[rKey]?.[v.id]?.formatted || '0';
        });
      }
      rowsData.push({ id: rIdx, cells });
    });

    // Column grand totals row
    if (pivotConfig.columns[0]?.showTotals) {
      const totCells: Record<string, any> = {};
      if (activeRowFields.length > 1) {
        activeRowFields.forEach((_, idx) => {
          totCells[`__rowKey_${idx}`] = idx === 0 ? 'Grand Total' : '';
        });
      } else {
        totCells.__rowKey = 'Grand Total';
      }
      colKeys.forEach((cKey) => {
        vConfigs.forEach((v) => {
          totCells[`col_${cKey}_${v.id}`] = colTotals[cKey]?.[v.id]?.formatted || '0';
        });
      });
      if (pivotConfig.rows[0]?.showTotals) {
        vConfigs.forEach((v) => {
          totCells[`col_grand_total_${v.id}`] = grandTotals[v.id]?.formatted || '0';
        });
      }
      rowsData.push({
        id: 'pivot-grand-total',
        cells: totCells,
        isTotalRow: true,
      });
    }

    return { pivotPrintColumns: cols, pivotPrintRows: rowsData };
  }, [pivotResult, activeValueConfigs, activeRowFields, rowFieldTitle, register.columns, pivotConfig]);

  return (
    <div className="bg-[#1c1c1e] text-white rounded-2xl border border-white/10 shadow-xl flex flex-col overflow-hidden max-w-full">
      {/* 1. Header Bar: Multi-Pivot Switcher & Tools */}
      <div className="bg-[#161618] border-b border-white/10 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
            <TableIcon className="w-4 h-4" />
          </div>

          {/* Multi-Pivot Controls */}
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <div className="relative">
              <select
                value={activePivotId}
                onChange={(e) => setActivePivotId(e.target.value)}
                className="bg-[#242426] border border-white/15 hover:border-emerald-500/50 rounded-xl px-2.5 py-1 text-xs sm:text-sm font-bold text-white cursor-pointer pr-7 appearance-none focus:outline-none"
              >
                {pivotTables.map((pt, idx) => (
                  <option key={pt.id} value={pt.id} className="bg-[#1c1c1e] text-white">
                    {pt.name} ({idx + 1} of {pivotTables.length})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* + Add New Pivot Table button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs"
              title="Add a new Pivot Table"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span className="hidden sm:inline">New Pivot</span>
            </button>

            {/* Rename Pivot Button */}
            <button
              onClick={() => openRenameModal()}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-[#2c2c2e] hover:bg-[#38383c] border border-white/10 rounded-xl transition-all cursor-pointer shrink-0"
              title="Rename current Pivot Table"
            >
              <Edit2 className="w-3 h-3 text-blue-400" />
              <span className="hidden md:inline">Rename</span>
            </button>

            {/* Duplicate Pivot Button */}
            <button
              onClick={() => handleDuplicatePivotTable(activePivotId)}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-[#2c2c2e] hover:bg-[#38383c] border border-white/10 rounded-xl transition-all cursor-pointer shrink-0"
              title="Duplicate current Pivot Table"
            >
              <Copy className="w-3 h-3 text-zinc-400" />
              <span className="hidden lg:inline">Copy</span>
            </button>

            {/* Delete Pivot Button */}
            <button
              onClick={() => {
                if (pivotTables.length <= 1) {
                  setCannotDeleteToast(true);
                  setTimeout(() => setCannotDeleteToast(false), 3000);
                  return;
                }
                setDeleteModalTarget(activePivotTable);
              }}
              disabled={pivotTables.length <= 1}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-xl border transition-all cursor-pointer shrink-0 ${
                pivotTables.length > 1
                  ? 'text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border-rose-500/30 active:scale-95'
                  : 'text-zinc-600 bg-transparent border-white/5 cursor-not-allowed opacity-40'
              }`}
              title={pivotTables.length > 1 ? "Delete current Pivot Table" : "Cannot delete only Pivot Table"}
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden md:inline">Delete</span>
            </button>

            {cannotDeleteToast && (
              <span className="text-[10px] text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg animate-in fade-in">
                At least 1 pivot required
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Table / Chart / Split View Mode Switcher */}
          <div className="flex items-center p-0.5 bg-[#1c1c1e] border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Table Grid Matrix View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'chart' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Charts Visualization (Bar, Line & Pie)"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Charts</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'split' ? 'bg-blue-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Split View (Table + Charts)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

          <button
            onClick={() => setFormatMode(formatMode === 'currency' ? 'default' : 'currency')}
            className={`p-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              formatMode === 'currency' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-[#2c2c2e] border-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Format as Currency (₹)"
          >
            <DollarSign className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setFormatMode(formatMode === 'percent' ? 'default' : 'percent')}
            className={`p-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              formatMode === 'percent' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-[#2c2c2e] border-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Format as Percent (%)"
          >
            <Percent className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

          <button
            onClick={handleCopyTable}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-all cursor-pointer active:scale-95"
            title="Copy Pivot Table in Excel TSV format"
          >
            {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{copiedToast ? 'Copied' : 'Copy'}</span>
          </button>

          <ExportDropdown
            label="Excel / CSV"
            variant="compact"
            title="Export Pivot Table to Excel (.xlsx) or CSV"
            onExportXLSX={() => exportPivotTableToExcelOrCSV({
              register,
              pivotResult,
              pivotConfig,
              pivotName: activePivotTable.name,
              format: 'xlsx'
            })}
            onExportCSV={() => exportPivotTableToExcelOrCSV({
              register,
              pivotResult,
              pivotConfig,
              pivotName: activePivotTable.name,
              format: 'csv'
            })}
          />

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-200 bg-[#2c2c2e] hover:bg-[#3a3a3c] border border-white/10 rounded-lg transition-all cursor-pointer active:scale-95 shadow-xs"
            title="Print Pivot Table in A4 / Legal with column selection & repeating headers"
          >
            <Printer className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={() => setIsEditorOpen(!isEditorOpen)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
              isEditorOpen ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-[#2c2c2e] border-white/10 text-zinc-300 hover:text-white'
            }`}
            title="Toggle Pivot Field Editor"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
        </div>
      </div>

      {/* 2. Formula Bar */}
      <div className="bg-[#161618] border-b border-white/10 px-4 py-1.5 flex items-center gap-2 text-xs font-mono text-zinc-300 no-print">
        <span className="w-12 text-center font-bold text-white border-r border-white/10 pr-2">
          {activeCell.label}
        </span>
        <span className="text-zinc-500 font-bold italic select-none">fx</span>
        <div className="flex-1 bg-[#242426] px-2 py-0.5 rounded-lg border border-white/10 text-[11px] text-zinc-300 truncate">
          {activeCell.formula}
        </div>
      </div>

      {/* 3. Main Split View: Left = Canvas (Table or Charts), Right = Pivot Table Editor Sidebar */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-[560px] lg:h-[calc(100vh-230px)] bg-[#121214] overflow-hidden rounded-b-2xl border border-t-0 border-white/10">
        
        {/* Spreadsheet Grid Canvas */}
        {viewMode !== 'chart' && (
          <div className={`flex-1 overflow-y-auto bg-[#161618] p-3 sm:p-4 flex flex-col justify-between ${
            viewMode === 'split' ? 'border-b lg:border-b-0 lg:border-r border-white/10' : ''
          }`}>
            {isPivotConfigEmpty ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#1c1c1e] rounded-xl border border-white/10 shadow-lg">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 shadow-lg shadow-blue-500/5">
                  <TableIcon className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Build Your Pivot Table</h3>
                <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
                  Choose your desired fields from the <span className="text-blue-400 font-semibold">Pivot Table Editor</span> on the right. Add fields to <strong>Rows</strong>, <strong>Columns</strong>, and <strong>Values</strong> to analyze your data with zero formulas.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditorOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Open Field Editor</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col">
                {/* Horizontal scroll indicator if table has columns */}
                {pivotResult.colKeys.length > 2 && (
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1.5 px-1 font-mono">
                    <span className="flex items-center gap-1.5 text-zinc-300">
                      <span className="text-blue-400 font-bold">↔</span>
                      <span>Horizontal scroll ({pivotResult.colKeys.length} columns)</span>
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Scroll horizontally to view all columns
                    </span>
                  </div>
                )}
                {/* Auto-Fit Pivot Table Height (No vertical scrollbar, height fits rows naturally, horizontal scroll only) */}
                <div className="w-full overflow-x-auto overflow-y-hidden border border-white/10 shadow-lg rounded-xl bg-[#1c1c1e] custom-scrollbar relative">
                  <table className="min-w-max w-full text-left border-collapse font-sans text-xs select-none">
                    {/* Google Sheets / Excel Column Header Row (A, B, C...) */}
                    <thead className="sticky top-0 z-20 bg-[#242426] border-b border-white/10 text-zinc-400 font-mono text-[11px] text-center shadow-xs">
                      <tr>
                        <th className="w-10 py-1 border-r border-b border-white/10 bg-[#1e1e20]" />
                        {/* Row header column(s) */}
                        {isMultiRow ? (
                          activeRowFields.map((rf, rColIdx) => (
                            <th key={`col-letter-row-${rf.id}`} className="py-1 px-3 border-r border-b border-white/10 font-semibold text-zinc-300 whitespace-nowrap min-w-[120px]">
                              {getColLetter(rColIdx)}
                            </th>
                          ))
                        ) : (
                          <th className="py-1 px-3 border-r border-b border-white/10 font-semibold text-zinc-300 whitespace-nowrap min-w-[130px]">
                            A
                          </th>
                        )}
                        {/* Column header columns for each metric */}
                        {pivotResult.colKeys.map((cKey, cIdx) => (
                          (activeValueConfigs.length > 0 ? activeValueConfigs : [{ id: '', summarizeBy: 'COUNTA' as const, showAs: 'DEFAULT' as const }]).map((_, vIdx) => {
                            const totalVals = activeValueConfigs.length > 0 ? activeValueConfigs.length : 1;
                            const letterIdx = rowColsCount + cIdx * totalVals + vIdx;
                            return (
                              <th key={`${cKey}-${vIdx}`} className="py-1 px-3 border-r border-b border-white/10 font-semibold text-zinc-400 whitespace-nowrap min-w-[95px]">
                                {getColLetter(letterIdx)}
                              </th>
                            );
                          })
                        ))}
                        {/* Grand total column(s) */}
                        {pivotConfig.rows[0]?.showTotals &&
                          (activeValueConfigs.length > 0 ? activeValueConfigs : [{ id: '', summarizeBy: 'COUNTA' as const, showAs: 'DEFAULT' as const }]).map((_, vIdx) => {
                            const totalVals = activeValueConfigs.length > 0 ? activeValueConfigs.length : 1;
                            const letterIdx = rowColsCount + pivotResult.colKeys.length * totalVals + vIdx;
                            return (
                              <th key={`gt-${vIdx}`} className="py-1 px-3 border-b border-white/10 font-semibold text-zinc-400 whitespace-nowrap min-w-[100px]">
                                {getColLetter(letterIdx)}
                              </th>
                            );
                          })
                        }
                      </tr>
                    </thead>

                    <tbody>
                      {/* Pivot Title / Dimension Meta Header Row (Row 1) */}
                      <tr className="bg-[#242426] border-b border-white/10 font-semibold text-white text-xs">
                        {/* Row index 1 */}
                        <td className="py-1 text-center font-mono text-[11px] text-zinc-500 border-r border-white/10 bg-[#1e1e20]">
                          1
                        </td>
                        {/* Row Header Label(s) */}
                        {isMultiRow ? (
                          activeRowFields.map((rf) => (
                            <td
                              key={`hdr-rf-${rf.id}`}
                              rowSpan={headerRowCount}
                              className="py-2.5 px-3 border-r border-white/10 font-bold text-white bg-[#2c2c2e] align-top whitespace-nowrap min-w-[120px]"
                            >
                              <div className="flex items-center justify-between">
                                <span>{rf.name}</span>
                              </div>
                            </td>
                          ))
                        ) : (
                          <td
                            rowSpan={headerRowCount}
                            className="py-2.5 px-3 border-r border-white/10 font-bold text-white bg-[#2c2c2e] align-top whitespace-nowrap min-w-[130px]"
                          >
                            <div className="flex items-center justify-between">
                              <span>{activeRowField?.name || 'All Records'}</span>
                              {activeColFields.length > 0 && (
                                <span className="text-[10px] text-zinc-400 font-normal">
                                  by {colFieldTitle} →
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Multi-Column Hierarchical Header (e.g. Medium › Sex) */}
                        {isMultiCol && colHierarchyGroups ? (
                          <>
                            {colHierarchyGroups.map((grp) => {
                              const valCount = activeValueConfigs.length > 0 ? activeValueConfigs.length : 1;
                              const span = grp.colKeys.length * valCount;
                              return (
                                <td
                                  key={`grp-${grp.parentKey}`}
                                  colSpan={span}
                                  className="py-2 px-3 border-r border-white/10 text-center font-bold text-zinc-100 bg-[#2c2c2e] text-xs whitespace-nowrap"
                                >
                                  {grp.parentKey}
                                </td>
                              );
                            })}
                            {pivotConfig.rows[0]?.showTotals && (
                              <td
                                rowSpan={activeValueConfigs.length > 1 ? 2 : headerRowCount}
                                colSpan={activeValueConfigs.length > 0 ? activeValueConfigs.length : 1}
                                className="py-2.5 px-3 text-center font-bold text-white bg-[#3a3a3c] align-middle whitespace-nowrap min-w-[100px]"
                              >
                                Grand Total
                              </td>
                            )}
                          </>
                        ) : (
                    // Single column field or no column fields
                    <>
                      {activeValueConfigs.length > 1 ? (
                        <>
                          {pivotResult.colKeys.map((cKey) => (
                            <td key={cKey} colSpan={activeValueConfigs.length} className="py-2.5 px-3 border-r border-white/10 text-center font-bold text-zinc-200 bg-[#2c2c2e]/70">
                              {cKey}
                            </td>
                          ))}
                          {pivotConfig.rows[0]?.showTotals && (
                            <td colSpan={activeValueConfigs.length} className="py-2.5 px-3 text-center font-bold text-white bg-[#3a3a3c]">
                              Grand Total
                            </td>
                          )}
                        </>
                      ) : (
                        <>
                          {pivotResult.colKeys.map((cKey) => {
                            const vConfig = activeValueConfigs[0];
                            return (
                              <td key={cKey} className="py-2.5 px-3 border-r border-white/10 text-right font-bold text-zinc-200 bg-[#2c2c2e]/70">
                                <div>{cKey}</div>
                                {vConfig && (
                                  <div className="flex items-center justify-end gap-1 mt-0.5">
                                    <span className="text-[10px] text-zinc-400 font-normal truncate">
                                      {vConfig.customName || `${vConfig.summarizeBy} of ${register.columns.find((c) => c.id === vConfig.id)?.name || ''}`}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSummaryListMenuCol(
                                          summaryListMenuCol?.valueIndex === 0 ? null : { valueIndex: 0, valueId: vConfig.id }
                                        );
                                      }}
                                      className="p-0.5 rounded bg-white/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                                      title="Change Summary Calculation (Sum, Avg, Count, Max, Min...)"
                                    >
                                      <span className="text-[10px] font-bold">Σ▼</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          {pivotConfig.rows[0]?.showTotals && (
                            <td className="py-2.5 px-3 text-right font-bold text-white bg-[#3a3a3c]">
                              <div className="flex items-center justify-end gap-1.5">
                                <span>Grand Total</span>
                                {activeValueConfigs[0] && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSummaryListMenuCol(
                                        summaryListMenuCol?.valueIndex === 0 ? null : { valueIndex: 0, valueId: activeValueConfigs[0].id }
                                      );
                                    }}
                                    className="p-0.5 rounded bg-white/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                                    title="Change Summary Calculation"
                                  >
                                    <span className="text-[10px] font-bold">Σ▼</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </>
                      )}
                    </>
                  )}
                </tr>

                {/* Sub-header Row 2 when isMultiCol is active: Sub-column dimensions (e.g. Sex: Boys, Girls) */}
                {isMultiCol && (
                  <tr className="bg-[#242426] border-b border-white/10 text-[11px] font-semibold text-zinc-300">
                    <td className="py-1 text-center font-mono text-[10px] text-zinc-500 border-r border-white/10 bg-[#1e1e20]">
                      2
                    </td>
                    {/* Row headers already spanned from Row 1 */}
                    {pivotResult.colKeys.map((cKey) => {
                      const subLabel = cKey.split(' › ').slice(1).join(' › ') || cKey;
                      if (activeValueConfigs.length > 1) {
                        return (
                          <td
                            key={`subcol-${cKey}`}
                            colSpan={activeValueConfigs.length}
                            className="py-1.5 px-3 border-r border-white/10 text-center font-semibold text-zinc-200 bg-[#242426]"
                          >
                            {subLabel}
                          </td>
                        );
                      }
                      const vConfig = activeValueConfigs[0];
                      return (
                        <td
                          key={`subcol-${cKey}`}
                          className="py-1.5 px-3 border-r border-white/10 text-right font-semibold text-zinc-200 bg-[#242426]"
                        >
                          <div>{subLabel}</div>
                          {vConfig && (
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[10px] text-zinc-400 font-normal truncate">
                                {vConfig.customName || `${vConfig.summarizeBy} of ${register.columns.find((c) => c.id === vConfig.id)?.name || ''}`}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSummaryListMenuCol(
                                    summaryListMenuCol?.valueIndex === 0 ? null : { valueIndex: 0, valueId: vConfig.id }
                                  );
                                }}
                                className="p-0.5 rounded bg-white/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                                title="Change Summary Calculation"
                              >
                                <span className="text-[10px] font-bold">Σ▼</span>
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}

                {/* Sub-header row if multiple values configured */}
                {activeValueConfigs.length > 1 && (
                  <tr className="bg-[#1f1f21] border-b border-white/10 text-[11px] text-zinc-300 font-medium">
                    <td className="py-0.5 text-center font-mono text-[10px] text-zinc-500 border-r border-white/10 bg-[#18181a]">
                      {isMultiCol ? 3 : 2}
                    </td>
                    {pivotResult.colKeys.map((cKey) => (
                      activeValueConfigs.map((v, vIdx) => {
                        const valCol = register.columns.find((c) => c.id === v.id);
                        const label = v.customName || `${v.summarizeBy} ${valCol?.name || ''}`;
                        return (
                          <td key={`${cKey}-${v.id}`} className="py-1 px-3 border-r border-white/10 text-right font-medium text-zinc-300">
                            <div className="flex items-center justify-end gap-1">
                              <span className="truncate">{label}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSummaryListMenuCol(
                                    summaryListMenuCol?.valueIndex === vIdx ? null : { valueIndex: vIdx, valueId: v.id }
                                  );
                                }}
                                className="p-0.5 rounded hover:bg-white/10 text-emerald-400 cursor-pointer"
                                title="Summary List: Change Calculation"
                              >
                                <span className="text-[9px] font-bold">Σ▼</span>
                              </button>
                            </div>
                          </td>
                        );
                      })
                    ))}
                    {pivotConfig.rows[0]?.showTotals &&
                      activeValueConfigs.map((v, vIdx) => {
                        const valCol = register.columns.find((c) => c.id === v.id);
                        const label = v.customName || `${v.summarizeBy} ${valCol?.name || ''}`;
                        return (
                          <td key={`tot-${v.id}`} className="py-1 px-3 border-r border-white/10 text-right font-semibold text-white">
                            <div className="flex items-center justify-end gap-1">
                              <span className="truncate">{label}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSummaryListMenuCol(
                                    summaryListMenuCol?.valueIndex === vIdx ? null : { valueIndex: vIdx, valueId: v.id }
                                  );
                                }}
                                className="p-0.5 rounded hover:bg-white/10 text-emerald-400 cursor-pointer"
                                title="Summary List: Change Calculation"
                              >
                                <span className="text-[9px] font-bold">Σ▼</span>
                              </button>
                            </div>
                          </td>
                        );
                      })
                    }
                  </tr>
                )}

                {/* Data Rows */}
                {pivotResult.rowKeys.map((rKey, rIdx) => {
                  const rowNum = rIdx + headerRowCount + 1;
                  const vConfigs = activeValueConfigs.length > 0 ? activeValueConfigs : [{ id: '', summarizeBy: 'COUNTA' as const, showAs: 'DEFAULT' as const }];
                  const rParts = isMultiRow ? rKey.split(' › ') : [rKey];

                  return (
                    <tr key={rKey} className="border-b border-white/5 hover:bg-white/[0.04] transition-colors">
                      {/* Row index number */}
                      <td className="py-1 text-center font-mono text-[11px] text-zinc-500 border-r border-white/10 bg-[#1e1e20]">
                        {rowNum}
                      </td>

                      {/* Row Label(s) */}
                      {isMultiRow ? (
                        rParts.map((part, pIdx) => {
                          const colLetter = getColLetter(pIdx);
                          const rfName = activeRowFields[pIdx]?.name || `Row ${pIdx + 1}`;
                          return (
                            <td
                              key={`rp-${rKey}-${pIdx}`}
                              onClick={() => setActiveCell({ rowIdx: rowNum, colIdx: pIdx, label: `${colLetter}${rowNum}`, formula: `${rfName}: ${part}` })}
                              className="py-2 px-3 border-r border-white/10 font-medium text-white bg-[#1c1c1e] cursor-pointer hover:bg-white/[0.04]"
                            >
                              {part}
                            </td>
                          );
                        })
                      ) : (
                        <td
                          onClick={() => setActiveCell({ rowIdx: rowNum, colIdx: 0, label: `A${rowNum}`, formula: rKey })}
                          className="py-2 px-3 border-r border-white/10 font-medium text-white bg-[#1c1c1e] cursor-pointer hover:bg-white/[0.04]"
                        >
                          {rKey}
                        </td>
                      )}

                      {/* Matrix Value Cells with Excel Summary List button */}
                      {pivotResult.colKeys.map((cKey, cIdx) => {
                        const cellColLetter = getColLetter(rowColsCount + cIdx);
                        const cellRef = `${cellColLetter}${rowNum}`;
                        const isCurrentActive = activeCell.label === cellRef;

                        return vConfigs.map((vConfig, vIdx) => {
                          const cell = pivotResult.matrix[rKey]?.[cKey]?.[vConfig.id];
                          let displayVal = cell?.formatted || '0';
                          if (formatMode === 'currency') displayVal = `₹ ${cell?.raw?.toLocaleString() || 0}`;
                          if (formatMode === 'percent') displayVal = `${(cell?.raw || 0).toFixed(2)}%`;

                          const cellUnderlyingRows = pivotResult.cellBuckets?.[rKey]?.[cKey] || [];
                          const rowFormulaDesc = isMultiRow
                            ? activeRowFields.map((f, i) => `${f.name}='${rParts[i] || ''}'`).join(', ')
                            : `${activeRowField?.name || 'Row'}='${rKey}'`;
                          const colFormulaDesc = isMultiCol
                            ? activeColFields.map((f, i) => `${f.name}='${cKey.split(' › ')[i] || ''}'`).join(', ')
                            : `${activeColField?.name || 'Col'}='${cKey}'`;

                          return (
                            <td
                              key={`${cKey}-${vConfig.id}-${vIdx}`}
                              onClick={() =>
                                setActiveCell({
                                  rowIdx: rowNum,
                                  colIdx: rowColsCount + cIdx,
                                  label: cellRef,
                                  formula: `=GETPIVOTDATA("${vConfig.summarizeBy}", ${rowFormulaDesc}, ${colFormulaDesc}) → ${displayVal}`,
                                })
                              }
                              onDoubleClick={() => {
                                if (cellUnderlyingRows.length > 0) {
                                  setSummaryListModal({
                                    isOpen: true,
                                    title: `${rKey} · ${cKey}`,
                                    subtitle: `Excel Details: ${cellUnderlyingRows.length} records contributing to ${displayVal}`,
                                    summaryValueDisplay: displayVal,
                                    summaryMethod: vConfig.summarizeBy,
                                    rows: cellUnderlyingRows,
                                  });
                                }
                              }}
                              className={`py-2 px-3 border-r border-white/10 text-right font-mono tabular-nums cursor-pointer transition-colors group relative ${
                                isCurrentActive
                                  ? 'bg-blue-500/25 ring-2 ring-[#0a84ff] ring-inset font-bold text-white'
                                  : 'hover:bg-white/[0.04] text-zinc-200'
                              }`}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Summary List Button Beside Summary Value like in Excel */}
                                {cellUnderlyingRows.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSummaryListModal({
                                        isOpen: true,
                                        title: `${rKey} · ${cKey}`,
                                        subtitle: `Excel Details: ${cellUnderlyingRows.length} underlying records contributing to ${displayVal}`,
                                        summaryValueDisplay: displayVal,
                                        summaryMethod: vConfig.summarizeBy,
                                        rows: cellUnderlyingRows,
                                      });
                                    }}
                                    className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
                                    title={`Excel Summary List (${cellUnderlyingRows.length} records)`}
                                  >
                                    <ListFilter className="w-3 h-3" />
                                  </button>
                                )}
                                <span>{displayVal}</span>
                              </div>
                            </td>
                          );
                        });
                      })}

                      {/* Row Grand Total Cell with Excel Summary List button */}
                      {pivotConfig.rows[0]?.showTotals &&
                        vConfigs.map((vConfig) => {
                          const rowUnderlyingRows = pivotResult.rowBuckets?.[rKey] || [];
                          const totVal = pivotResult.rowTotals[rKey]?.[vConfig.id]?.formatted || '0';

                          return (
                            <td
                              key={`row-tot-${vConfig.id}`}
                              onClick={() => {
                                const totCol = getColLetter(rowColsCount + pivotResult.colKeys.length);
                                setActiveCell({
                                  rowIdx: rowNum,
                                  colIdx: rowColsCount + pivotResult.colKeys.length,
                                  label: `${totCol}${rowNum}`,
                                  formula: `Row Total for '${rKey}': ${totVal}`,
                                });
                              }}
                              onDoubleClick={() => {
                                if (rowUnderlyingRows.length > 0) {
                                  setSummaryListModal({
                                    isOpen: true,
                                    title: `Row Total: ${rKey}`,
                                    subtitle: `Excel Details: ${rowUnderlyingRows.length} records contributing to ${totVal}`,
                                    summaryValueDisplay: totVal,
                                    summaryMethod: vConfig.summarizeBy,
                                    rows: rowUnderlyingRows,
                                  });
                                }
                              }}
                              className="py-2 px-3 text-right font-mono tabular-nums font-bold text-white bg-[#242426] border-r border-white/10 cursor-pointer hover:bg-[#2c2c2e] group"
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                {rowUnderlyingRows.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSummaryListModal({
                                        isOpen: true,
                                        title: `Row Total: ${rKey}`,
                                        subtitle: `Excel Details: ${rowUnderlyingRows.length} records contributing to ${totVal}`,
                                        summaryValueDisplay: totVal,
                                        summaryMethod: vConfig.summarizeBy,
                                        rows: rowUnderlyingRows,
                                      });
                                    }}
                                    className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
                                    title={`Excel Summary List (${rowUnderlyingRows.length} records)`}
                                  >
                                    <ListFilter className="w-3 h-3" />
                                  </button>
                                )}
                                <span>{totVal}</span>
                              </div>
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}

                {/* Column Grand Total Row with Excel Summary List button */}
                {(pivotConfig.columns.length === 0 ? (pivotConfig.rows[0]?.showTotals !== false) : (pivotConfig.columns[0]?.showTotals !== false)) && (
                  <tr className="bg-[#242426] border-t-2 border-white/15 font-bold text-white font-mono tabular-nums">
                    {/* Index */}
                    <td className="py-1 text-center text-[11px] text-zinc-500 border-r border-white/10 bg-[#1e1e20]">
                      {pivotResult.rowKeys.length + headerRowCount + 1}
                    </td>

                    {/* Label */}
                    <td colSpan={rowColsCount} className="py-2.5 px-3 border-r border-white/10 font-bold text-white whitespace-nowrap min-w-[130px]">
                      Grand Total
                    </td>

                    {/* Col totals */}
                    {pivotResult.colKeys.map((cKey) => {
                      const vConfigs = activeValueConfigs.length > 0 ? activeValueConfigs : [{ id: '', summarizeBy: 'COUNTA' as const, showAs: 'DEFAULT' as const }];
                      return vConfigs.map((vConfig, vIdx) => {
                        const colUnderlyingRows = (pivotResult.colBuckets?.[cKey] && pivotResult.colBuckets[cKey].length > 0)
                          ? pivotResult.colBuckets[cKey]
                          : (pivotResult.filteredRows || register.rows);
                        const colVal = pivotResult.colTotals[cKey]?.[vConfig.id]?.formatted 
                          || pivotResult.grandTotals[vConfig.id]?.formatted 
                          || '0';

                        return (
                          <td 
                            key={`col-tot-${cKey}-${vConfig.id}-${vIdx}`} 
                            onDoubleClick={() => {
                              if (colUnderlyingRows.length > 0) {
                                setSummaryListModal({
                                  isOpen: true,
                                  title: `Column Total: ${cKey === 'Total' ? 'Grand Total' : cKey}`,
                                  subtitle: `Excel Details: ${colUnderlyingRows.length} records contributing to ${colVal}`,
                                  summaryValueDisplay: colVal,
                                  summaryMethod: vConfig.summarizeBy,
                                  rows: colUnderlyingRows,
                                });
                              }
                            }}
                            className="py-2.5 px-3 border-r border-white/10 text-right font-bold text-white group cursor-pointer hover:bg-white/5 whitespace-nowrap min-w-[95px]"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              {colUnderlyingRows.length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSummaryListModal({
                                      isOpen: true,
                                      title: `Column Total: ${cKey === 'Total' ? 'Grand Total' : cKey}`,
                                      subtitle: `Excel Details: ${colUnderlyingRows.length} records contributing to ${colVal}`,
                                      summaryValueDisplay: colVal,
                                      summaryMethod: vConfig.summarizeBy,
                                      rows: colUnderlyingRows,
                                    });
                                  }}
                                  className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0 opacity-70 group-hover:opacity-100"
                                  title={`Excel Summary List (${colUnderlyingRows.length} records)`}
                                >
                                  <ListFilter className="w-3 h-3" />
                                </button>
                              )}
                              <span>{colVal}</span>
                            </div>
                          </td>
                        );
                      });
                    })}

                    {/* Grand Total Corner */}
                    {(pivotConfig.rows[0]?.showTotals !== false) &&
                      (activeValueConfigs.length > 0 ? activeValueConfigs : [{ id: '', summarizeBy: 'COUNTA' as const, showAs: 'DEFAULT' as const }]).map((vConfig) => {
                        const grandUnderlyingRows = pivotResult.filteredRows || register.rows;
                        const grandVal = pivotResult.grandTotals[vConfig.id]?.formatted || '0';

                        return (
                          <td 
                            key={`grand-${vConfig.id}`} 
                            onDoubleClick={() => {
                              setSummaryListModal({
                                isOpen: true,
                                title: `Grand Total Summary List`,
                                subtitle: `Excel Details: All ${grandUnderlyingRows.length} contributing records`,
                                summaryValueDisplay: grandVal,
                                summaryMethod: vConfig.summarizeBy,
                                rows: grandUnderlyingRows,
                              });
                            }}
                            className="py-2.5 px-3 text-right font-bold text-emerald-400 bg-emerald-500/15 border-r border-white/10 text-sm group cursor-pointer hover:bg-emerald-500/25 whitespace-nowrap min-w-[100px]"
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSummaryListModal({
                                    isOpen: true,
                                    title: `Grand Total Summary List`,
                                    subtitle: `Excel Details: All ${grandUnderlyingRows.length} contributing records`,
                                    summaryValueDisplay: grandVal,
                                    summaryMethod: vConfig.summarizeBy,
                                    rows: grandUnderlyingRows,
                                  });
                                }}
                                className="p-1 rounded text-emerald-400 hover:bg-white/20 transition-all cursor-pointer shrink-0"
                                title={`Excel Summary List (${grandUnderlyingRows.length} records)`}
                              >
                                <ListFilter className="w-3.5 h-3.5" />
                              </button>
                              <span>{grandVal}</span>
                            </div>
                          </td>
                        );
                      })}
                  </tr>
                )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* 4. Excel / Sheets Bottom Sheet Tab Bar (Supports multiple pivot tables for a register) */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-xs text-zinc-400 bg-[#1c1c1e] px-3 py-2 rounded-xl border">
            {/* Sheet Tabs List */}
            <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto py-0.5">
              {/* + New Pivot Table Tab button */}
              <button
                type="button"
                onClick={handleAddNewPivotTable}
                className="flex items-center gap-1 p-1.5 px-2 bg-[#28282b] hover:bg-[#343438] text-emerald-400 hover:text-white rounded-lg border border-white/10 font-bold transition-all cursor-pointer shadow-xs"
                title="Add New Pivot Table for this register"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px]">Add Pivot</span>
              </button>

              <div className="h-4 w-[1px] bg-white/10 mx-1" />

              {/* Individual Pivot Table Tabs */}
              {pivotTables.map((pt) => {
                const isActive = pt.id === activePivotId;
                const isRenaming = pt.id === renamingTabId;

                return (
                  <div
                    key={pt.id}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer border shadow-xs ${
                      isActive
                        ? 'bg-[#2c2c2e] text-white border-white/20 border-b-2 border-b-[#0a84ff]'
                        : 'bg-[#1e1e20] text-zinc-400 hover:text-white hover:bg-[#28282a] border-white/5'
                    }`}
                    onClick={() => setActivePivotId(pt.id)}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#0a84ff]' : 'bg-zinc-600'}`} />

                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={saveRenameTab}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRenameTab();
                          if (e.key === 'Escape') setRenamingTabId(null);
                        }}
                        className="bg-[#161618] text-white px-1.5 py-0.5 rounded text-xs border border-blue-500 focus:outline-none w-24"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span onDoubleClick={() => startRenamingTab(pt)}>
                        {pt.name}
                      </span>
                    )}

                    {/* Tab Menu Trigger (...) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTabMenuId(tabMenuId === pt.id ? null : pt.id);
                      }}
                      className="p-0.5 hover:bg-white/15 rounded text-zinc-400 hover:text-white ml-0.5 transition-colors cursor-pointer"
                      title="Pivot Table options (Rename, Duplicate, Delete)"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>

                    {/* Context Menu Dropdown */}
                    {tabMenuId === pt.id && (
                      <div 
                        className="absolute bottom-full left-0 mb-1 w-44 bg-[#2c2c2e] rounded-xl shadow-2xl border border-white/15 py-1 z-40 text-xs text-white"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => openRenameModal(pt)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Rename Pivot</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicatePivotTable(pt.id)}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Duplicate</span>
                        </button>

                        {pivotTables.length > 1 && (
                          <>
                            <div className="h-[1px] bg-white/10 my-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setTabMenuId(null);
                                setDeleteModalTarget(pt);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-500/20 text-red-400 text-left cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Status counts */}
            <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 font-mono">
              <span>{pivotTables.length} Pivot Tables</span>
              <span>·</span>
              <span>{pivotResult.filteredRowCount} rows</span>
              <span>·</span>
              <span className="text-[#30d158] font-medium">Ready</span>
            </div>
          </div>
        </div>
        )}

        {/* Charts Visualization Canvas */}
        {viewMode !== 'table' && (
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <PivotChartsView
              pivotResult={pivotResult}
              pivotConfig={pivotConfig}
              columns={register.columns}
              pivotName={activePivotTable.name}
              formatMode={formatMode}
            />
          </div>
        )}

        {/* 5. Pivot Table Editor Sidebar */}
        {isEditorOpen && (
          <aside className="w-full lg:w-80 bg-[#1c1c1e] text-white border-l border-white/10 flex flex-col shrink-0 overflow-y-auto max-h-[700px] shadow-xl no-print pivot-builder-sidebar">
            {/* Editor Panel Header */}
            <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between bg-[#161618] sticky top-0 z-10">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                  <span>Pivot Editor: {activePivotTable.name}</span>
                </h3>
                <p className="text-[10px] text-zinc-400">Configure rows, columns & summary values</p>
              </div>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 sm:p-4 space-y-4 flex-1">
              {/* Data Range box */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Data Range
                </label>
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#242426] border border-white/10 rounded-xl text-xs font-mono text-zinc-300">
                  <span className="truncate">'{register.title}'!A1:{getColLetter(register.columns.length - 1)}{register.rows.length + 1}</span>
                  <TableIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0 ml-1" />
                </div>
              </div>

             

              {/* -------------------- 1. ROWS SECTION -------------------- */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">Rows</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'rows' ? null : 'rows')}
                      className="text-xs font-semibold text-[#0a84ff] hover:text-blue-400 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>

                    {openDropdown === 'rows' && (
                      <div className="absolute right-0 mt-1 w-48 bg-[#2c2c2e] rounded-xl shadow-xl border border-white/15 py-1 z-30 max-h-56 overflow-y-auto">
                        {register.columns.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleAddRow(c.id)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-white truncate cursor-pointer"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Added Row Cards */}
                {pivotConfig.rows.map((r, rIdx) => {
                  const colDef = register.columns.find((c) => c.id === r.id);
                  return (
                    <div key={r.id} className="bg-[#242426] border border-white/10 rounded-xl p-2.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span className="truncate">{colDef?.name || r.id}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={rIdx === 0}
                            onClick={() => handleMoveRow(rIdx, 'up')}
                            className="text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed p-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={rIdx === pivotConfig.rows.length - 1}
                            onClick={() => handleMoveRow(rIdx, 'down')}
                            className="text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed p-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(rIdx)}
                            className="text-zinc-400 hover:text-red-400 cursor-pointer p-0.5 rounded hover:bg-white/10 transition-colors ml-0.5"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-zinc-400 block mb-0.5">Order</label>
                          <select
                            value={r.order}
                            onChange={(e) => {
                              const updated = [...pivotConfig.rows];
                              updated[rIdx].order = e.target.value as any;
                              setPivotConfig({ ...pivotConfig, rows: updated });
                            }}
                            className="w-full bg-[#2c2c2e] border border-white/10 text-white rounded-lg px-2 py-1"
                          >
                            <option value="asc" className="bg-[#1c1c1e]">Ascending</option>
                            <option value="desc" className="bg-[#1c1c1e]">Descending</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-zinc-400 block mb-0.5">Sort by</label>
                          <select
                            value={r.sortBy}
                            onChange={(e) => {
                              const updated = [...pivotConfig.rows];
                              updated[rIdx].sortBy = e.target.value;
                              setPivotConfig({ ...pivotConfig, rows: updated });
                            }}
                            className="w-full bg-[#2c2c2e] border border-white/10 text-white rounded-lg px-2 py-1"
                          >
                            <option value="self" className="bg-[#1c1c1e]">{colDef?.name || 'Self'}</option>
                            {activeValueConfigs.map((v) => (
                              <option key={v.id} value={v.id} className="bg-[#1c1c1e]">
                                {v.summarizeBy} {register.columns.find((c) => c.id === v.id)?.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 pt-0.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={r.showTotals}
                          onChange={(e) => {
                            const updated = [...pivotConfig.rows];
                            updated[rIdx].showTotals = e.target.checked;
                            setPivotConfig({ ...pivotConfig, rows: updated });
                          }}
                          className="rounded accent-[#0a84ff]"
                        />
                        <span className="text-[11px]">Show Totals</span>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* -------------------- 2. COLUMNS SECTION -------------------- */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">Columns</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'columns' ? null : 'columns')}
                      className="text-xs font-semibold text-[#0a84ff] hover:text-blue-400 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>

                    {openDropdown === 'columns' && (
                      <div className="absolute right-0 mt-1 w-48 bg-[#2c2c2e] rounded-xl shadow-xl border border-white/15 py-1 z-30 max-h-56 overflow-y-auto">
                        {register.columns.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleAddColumn(c.id)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-white truncate cursor-pointer"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Added Column Cards */}
                {pivotConfig.columns.map((c, cIdx) => {
                  const colDef = register.columns.find((col) => col.id === c.id);
                  return (
                    <div key={c.id} className="bg-[#242426] border border-white/10 rounded-xl p-2.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span className="truncate">{colDef?.name || c.id}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={cIdx === 0}
                            onClick={() => handleMoveColumn(cIdx, 'up')}
                            className="text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed p-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={cIdx === pivotConfig.columns.length - 1}
                            onClick={() => handleMoveColumn(cIdx, 'down')}
                            className="text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed p-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveColumn(cIdx)}
                            className="text-zinc-400 hover:text-red-400 cursor-pointer p-0.5 rounded hover:bg-white/10 transition-colors ml-0.5"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <label className="text-zinc-400 block mb-0.5">Order</label>
                          <select
                            value={c.order}
                            onChange={(e) => {
                              const updated = [...pivotConfig.columns];
                              updated[cIdx].order = e.target.value as any;
                              setPivotConfig({ ...pivotConfig, columns: updated });
                            }}
                            className="w-full bg-[#2c2c2e] border border-white/10 text-white rounded-lg px-2 py-1"
                          >
                            <option value="asc" className="bg-[#1c1c1e]">Ascending</option>
                            <option value="desc" className="bg-[#1c1c1e]">Descending</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-zinc-400 block mb-0.5">Sort by</label>
                          <select
                            value={c.sortBy}
                            onChange={(e) => {
                              const updated = [...pivotConfig.columns];
                              updated[cIdx].sortBy = e.target.value;
                              setPivotConfig({ ...pivotConfig, columns: updated });
                            }}
                            className="w-full bg-[#2c2c2e] border border-white/10 text-white rounded-lg px-2 py-1"
                          >
                            <option value="self" className="bg-[#1c1c1e]">{colDef?.name || 'Self'}</option>
                          </select>
                        </div>
                      </div>

                      <label className="flex items-center gap-2 pt-0.5 cursor-pointer text-zinc-300">
                        <input
                          type="checkbox"
                          checked={c.showTotals}
                          onChange={(e) => {
                            const updated = [...pivotConfig.columns];
                            updated[cIdx].showTotals = e.target.checked;
                            setPivotConfig({ ...pivotConfig, columns: updated });
                          }}
                          className="rounded accent-[#0a84ff]"
                        />
                        <span className="text-[11px]">Show Totals</span>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* -------------------- 3. VALUES SECTION -------------------- */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">Values</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'values' ? null : 'values')}
                      className="text-xs font-semibold text-[#0a84ff] hover:text-blue-400 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>

                    {openDropdown === 'values' && (
                      <div className="absolute right-0 mt-1 w-48 bg-[#2c2c2e] rounded-xl shadow-xl border border-white/15 py-1 z-30 max-h-56 overflow-y-auto">
                        {register.columns.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleAddValue(c.id)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-white truncate cursor-pointer"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Added Value Cards */}
                {pivotConfig.values.map((v, vIdx) => {
                  const colDef = register.columns.find((col) => col.id === v.id);
                  return (
                    <div key={`${v.id}-${vIdx}`} className="bg-[#242426] border border-white/10 rounded-xl p-2.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span className="truncate">{colDef?.name || v.id}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={vIdx === 0}
                            onClick={() => handleMoveValue(vIdx, 'up')}
                            className="text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed p-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={vIdx === pivotConfig.values.length - 1}
                            onClick={() => handleMoveValue(vIdx, 'down')}
                            className="text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed p-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveValue(vIdx)}
                            className="text-zinc-400 hover:text-red-400 cursor-pointer p-0.5 rounded hover:bg-white/10 transition-colors ml-0.5"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-[11px]">
                        <div>
                          <label className="text-zinc-400 block mb-0.5 font-medium">Summarize by (Excel functions)</label>
                          <select
                            value={v.summarizeBy}
                            onChange={(e) => {
                              const updated = [...pivotConfig.values];
                              updated[vIdx].summarizeBy = e.target.value as GoogleSheetsAggregation;
                              setPivotConfig({ ...pivotConfig, values: updated });
                            }}
                            className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2 py-1 text-white font-medium"
                          >
                            <option value="SUM" className="bg-[#1c1c1e]">SUM (Sum of values)</option>
                            <option value="COUNTA" className="bg-[#1c1c1e]">COUNTA (Count all non-empty)</option>
                            <option value="COUNT" className="bg-[#1c1c1e]">COUNT (Count numbers)</option>
                            <option value="COUNTUNIQUE" className="bg-[#1c1c1e]">COUNTUNIQUE (Distinct count)</option>
                            <option value="AVERAGE" className="bg-[#1c1c1e]">AVERAGE (Mean average)</option>
                            <option value="MAX" className="bg-[#1c1c1e]">MAX (Maximum value)</option>
                            <option value="MIN" className="bg-[#1c1c1e]">MIN (Minimum value)</option>
                            <option value="MEDIAN" className="bg-[#1c1c1e]">MEDIAN (Median value)</option>
                            <option value="PRODUCT" className="bg-[#1c1c1e]">PRODUCT (Product)</option>
                            <option value="STDEV" className="bg-[#1c1c1e]">STDEV (Standard deviation)</option>
                            <option value="VAR" className="bg-[#1c1c1e]">VAR (Variance)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-zinc-400 block mb-0.5">Show as</label>
                          <select
                            value={v.showAs}
                            onChange={(e) => {
                              const updated = [...pivotConfig.values];
                              updated[vIdx].showAs = e.target.value as PivotShowAs;
                              setPivotConfig({ ...pivotConfig, values: updated });
                            }}
                            className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2 py-1 text-white"
                          >
                            <option value="DEFAULT" className="bg-[#1c1c1e]">Default</option>
                            <option value="PERCENT_OF_ROW" className="bg-[#1c1c1e]">% of row</option>
                            <option value="PERCENT_OF_COLUMN" className="bg-[#1c1c1e]">% of column</option>
                            <option value="PERCENT_OF_GRAND_TOTAL" className="bg-[#1c1c1e]">% of grand total</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-zinc-400 block mb-0.5">Custom Heading</label>
                          <input
                            type="text"
                            placeholder={colDef?.name || 'Custom heading'}
                            value={v.customName || ''}
                            onChange={(e) => {
                              const updated = [...pivotConfig.values];
                              updated[vIdx].customName = e.target.value;
                              setPivotConfig({ ...pivotConfig, values: updated });
                            }}
                            className="w-full bg-[#2c2c2e] border border-white/10 rounded-lg px-2 py-1 text-white text-[11px]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* -------------------- 4. FILTERS SECTION -------------------- */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">Filters</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(openDropdown === 'filters' ? null : 'filters')}
                      className="text-xs font-semibold text-[#0a84ff] hover:text-blue-400 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>

                    {openDropdown === 'filters' && (
                      <div className="absolute right-0 mt-1 w-48 bg-[#2c2c2e] rounded-xl shadow-xl border border-white/15 py-1 z-30 max-h-56 overflow-y-auto">
                        {register.columns.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleAddFilter(c.id)}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 text-white truncate cursor-pointer"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Added Filter Cards */}
                {pivotConfig.filters.map((f, fIdx) => {
                  const colDef = register.columns.find((col) => col.id === f.id);
                  const distinctVals = Array.from(new Set(register.rows.map((r) => getFieldDisplayValue(r, colDef, register.columns, f.id))));

                  return (
                    <div key={f.id} className="bg-[#242426] border border-white/10 rounded-xl p-2.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span className="truncate">{colDef?.name || f.id}</span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={fIdx === 0}
                            onClick={() => handleMoveFilter(fIdx, 'up')}
                            className="text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed p-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={fIdx === pivotConfig.filters.length - 1}
                            onClick={() => handleMoveFilter(fIdx, 'down')}
                            className="text-zinc-400 hover:text-white disabled:opacity-20 disabled:hover:text-zinc-400 cursor-pointer disabled:cursor-not-allowed p-0.5 rounded hover:bg-white/10 transition-colors"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveFilter(fIdx)}
                            className="text-zinc-400 hover:text-red-400 cursor-pointer p-0.5 rounded hover:bg-white/10 transition-colors ml-0.5"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] space-y-1.5">
                        <div className="flex items-center justify-between text-zinc-400">
                          <span>Status:</span>
                          <span className="text-[#0a84ff] font-medium">
                            {f.showingAll ? 'All' : `${f.selectedValues.length} selected`}
                          </span>
                        </div>

                        {/* Search and Quick Select */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="text"
                            placeholder="Search..."
                            value={filterSearch[f.id] || ''}
                            onChange={(e) => setFilterSearch({ ...filterSearch, [f.id]: e.target.value })}
                            className="flex-1 bg-[#2c2c2e] border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...pivotConfig.filters];
                              updated[fIdx].showingAll = true;
                              updated[fIdx].selectedValues = [...distinctVals];
                              setPivotConfig({ ...pivotConfig, filters: updated });
                            }}
                            className="text-[10px] text-[#0a84ff] hover:underline font-semibold cursor-pointer shrink-0"
                          >
                            All
                          </button>
                          <span className="text-zinc-600 text-[10px]">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...pivotConfig.filters];
                              updated[fIdx].showingAll = false;
                              updated[fIdx].selectedValues = [];
                              setPivotConfig({ ...pivotConfig, filters: updated });
                            }}
                            className="text-[10px] text-zinc-400 hover:underline font-semibold cursor-pointer shrink-0"
                          >
                            Clear
                          </button>
                        </div>

                        {/* Checklist of values */}
                        <div className="bg-[#2c2c2e] border border-white/10 rounded-lg p-1.5 max-h-28 overflow-y-auto space-y-1">
                          {distinctVals
                            .filter((val) => {
                              const q = (filterSearch[f.id] || '').toLowerCase().trim();
                              return !q || val.toLowerCase().includes(q);
                            })
                            .map((val) => {
                            const isChecked = f.showingAll || f.selectedValues.includes(val);
                            return (
                              <label key={val} className="flex items-center gap-2 cursor-pointer text-zinc-300 hover:bg-white/5 p-1 rounded-md">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const updated = [...pivotConfig.filters];
                                    let currentSel = f.showingAll ? [...distinctVals] : [...f.selectedValues];
                                    if (e.target.checked) {
                                      currentSel.push(val);
                                    } else {
                                      currentSel = currentSel.filter((v) => v !== val);
                                    }
                                    updated[fIdx].showingAll = currentSel.length === distinctVals.length;
                                    updated[fIdx].selectedValues = currentSel;
                                    setPivotConfig({ ...pivotConfig, filters: updated });
                                  }}
                                  className="rounded accent-[#0a84ff]"
                                />
                                <span className="truncate">{val}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 6. Excel "Summarize Values By" Dropdown Popover (When clicking Σ▼ beside summary value) */}
      {summaryListMenuCol && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 animate-in fade-in duration-100"
          onClick={() => setSummaryListMenuCol(null)}
        >
          <div 
            className="bg-[#222225] border border-white/15 rounded-2xl shadow-2xl p-4 w-full max-w-sm text-white space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                  Σ
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Summarize Values By</h4>
                  <p className="text-[10px] text-zinc-400">Excel calculation function</p>
                </div>
              </div>
              <button
                onClick={() => setSummaryListMenuCol(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aggregations List */}
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {[
                { key: 'SUM', label: 'SUM (Sum of numbers)' },
                { key: 'COUNTA', label: 'COUNTA (Count non-empty entries)' },
                { key: 'COUNT', label: 'COUNT (Count numbers)' },
                { key: 'COUNTUNIQUE', label: 'COUNTUNIQUE (Distinct count)' },
                { key: 'AVERAGE', label: 'AVERAGE (Mean value)' },
                { key: 'MAX', label: 'MAX (Highest value)' },
                { key: 'MIN', label: 'MIN (Lowest value)' },
                { key: 'MEDIAN', label: 'MEDIAN (Median value)' },
                { key: 'PRODUCT', label: 'PRODUCT (Multiply values)' },
                { key: 'STDEV', label: 'STDEV (Standard deviation)' },
                { key: 'VAR', label: 'VAR (Variance)' },
              ].map(({ key, label }) => {
                const currentMethod = pivotConfig.values[summaryListMenuCol.valueIndex]?.summarizeBy;
                const isSelected = currentMethod === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSetSummaryAggregation(summaryListMenuCol.valueIndex, key as GoogleSheetsAggregation)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#0a84ff]/20 text-[#0a84ff] border border-[#0a84ff]/30 font-bold'
                        : 'hover:bg-white/10 text-zinc-200'
                    }`}
                  >
                    <span>{label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0a84ff]" />}
                  </button>
                );
              })}
            </div>

            {/* Show Value As */}
            <div className="pt-2 border-t border-white/10">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Show Value As
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  { key: 'DEFAULT', label: 'Normal' },
                  { key: 'PERCENT_OF_GRAND_TOTAL', label: '% of Grand Total' },
                  { key: 'PERCENT_OF_ROW', label: '% of Row Total' },
                  { key: 'PERCENT_OF_COLUMN', label: '% of Col Total' },
                ].map(({ key, label }) => {
                  const currentShowAs = pivotConfig.values[summaryListMenuCol.valueIndex]?.showAs || 'DEFAULT';
                  const isSelected = currentShowAs === key;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleSetSummaryShowAs(summaryListMenuCol.valueIndex, key as PivotShowAs)}
                      className={`p-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold'
                          : 'bg-[#2c2c2e] border-white/10 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Excel Drilldown Summary List Modal (Show Underlying Records) */}
      {summaryListModal && summaryListModal.isOpen && (
        <PivotSummaryListModal
          title={summaryListModal.title}
          subtitle={summaryListModal.subtitle}
          summaryValueDisplay={summaryListModal.summaryValueDisplay}
          summaryMethod={summaryListModal.summaryMethod}
          rows={summaryListModal.rows}
          columns={register.columns}
          onClose={() => setSummaryListModal(null)}
        />
      )}

      {/* 8. Add New Pivot Table Modal */}
      <NewPivotModal
        isOpen={isAddModalOpen}
        defaultName={`Pivot ${pivotTables.length + 1}`}
        columns={register.columns}
        onClose={() => setIsAddModalOpen(false)}
        onCreate={handleCreateNewPivot}
      />

      {/* 9. Rename Pivot Table Modal */}
      <RenamePivotModal
        isOpen={isRenameModalOpen}
        currentName={renameTargetPivot?.name || activePivotTable.name}
        onClose={() => {
          setIsRenameModalOpen(false);
          setRenameTargetPivot(null);
        }}
        onSave={handleSaveRename}
      />

      {/* 10. Delete Pivot Table Confirmation Modal */}
      {deleteModalTarget && (
        <ConfirmModal
          isOpen={!!deleteModalTarget}
          title="Delete Pivot Table?"
          message={`Are you sure you want to delete "${deleteModalTarget.name}"? This cross-tabulation table will be permanently removed.`}
          confirmLabel="Delete Pivot Table"
          isDestructive={true}
          onConfirm={() => handleDeletePivotTable(deleteModalTarget.id)}
          onClose={() => setDeleteModalTarget(null)}
        />
      )}

      {/* 11. Pivot Table Print Studio Modal */}
      <TablePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        documentTitle={`${register.title} - ${activePivotTable.name}`}
        defaultSubtitle="Pivot Cross-Tabulation Matrix"
        columns={pivotPrintColumns}
        rows={pivotPrintRows}
        deptProfile={deptProfile}
        lang={lang}
        totalRecordsCount={register.rows.length}
        sourceDescription={`AnalytixGrid Pivot • ${activePivotTable.name}`}
      />
    </div>
  );
};
