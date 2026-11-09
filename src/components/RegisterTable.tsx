import React, { useState, useMemo, useEffect } from 'react';
import { Register, ColumnDef, RowData, SortConfig, DepartmentProfile } from '../types/register';
import { Language, translations } from '../utils/translations';
import { getRowCellValue, parseNumeric } from '../utils/calculations';
import { 
  Plus, 
  Settings2, 
  Download, 
  Upload, 
  Search, 
  Trash2, 
  Copy, 
  Edit3, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Layers, 
  Calculator, 
  Check, 
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  Send,
  FileEdit,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Replace,
  BarChart3,
  Sparkles,
  TrendingUp,
  ListFilter,
  Paintbrush,
  Table as TableIcon,
  Undo2,
  Redo2,
  Eye,
  EyeOff
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { ExecutiveSummaryBanner } from './ExecutiveSummaryBanner';
import { ExecutiveSummaryModal } from './ExecutiveSummaryModal';
import { RowSlipModal } from './RowSlipModal';
import { DataHealthModal } from './DataHealthModal';
import { BulkUpdateModal } from './BulkUpdateModal';
import { FindReplaceModal } from './FindReplaceModal';
import { PivotSummaryListModal } from './PivotSummaryListModal';
import { ExportDropdown } from './ExportDropdown';
import { ConditionalFormattingModal } from './ConditionalFormattingModal';
import { TablePrintModal, PrintColumnItem, PrintRowItem } from './TablePrintModal';
import { WhatsAppIcon } from './WhatsAppIcon';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import { exportRegisterToExcelOrCSV } from '../utils/exportUtils';
import { computeColumnStatistics, evaluateCellFormatting } from '../utils/conditionalFormatting';
import { ConditionalFormattingRule } from '../types/register';

interface RegisterTableProps {
  register: Register;
  lang: Language;
  onAddRow: () => void;
  onEditRow: (row: RowData, rowIndex: number) => void;
  onDeleteRow: (rowIndex: number) => void;
  onDuplicateRow: (rowIndex: number) => void;
  onBulkDelete: (indices: number[]) => void;
  onBulkDuplicate: (indices: number[]) => void;
  onClearAllRows?: () => void;
  onDeleteRegister?: () => void;
  onInlineUpdateCell: (rowIndex: number, columnId: string, value: any) => void;
  onOpenColumnModal: () => void;
  onOpenImportModal: () => void;
  onOpenExcelImportModal?: () => void;
  onExportCSV: () => void;
  onNavigateToFillForm?: () => void;
  onNavigateToBuilder?: () => void;
  onNavigateToPivot?: () => void;
  deptProfile?: DepartmentProfile;
  onOpenDeptSettings?: () => void;
  onUpdateRegister?: (updater: (prev: Register) => Register) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  undoCount?: number;
  redoCount?: number;
}

export const RegisterTable: React.FC<RegisterTableProps> = ({
  register,
  lang,
  onAddRow,
  onEditRow,
  onDeleteRow,
  onDuplicateRow,
  onBulkDelete,
  onBulkDuplicate,
  onClearAllRows,
  onDeleteRegister,
  onInlineUpdateCell,
  onOpenColumnModal,
  onOpenImportModal,
  onOpenExcelImportModal,
  onExportCSV,
  onNavigateToFillForm,
  onNavigateToBuilder,
  onNavigateToPivot,
  deptProfile,
  onOpenDeptSettings,
  onUpdateRegister,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  undoCount = 0,
  redoCount = 0,
}) => {
  const t = translations[lang];

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [groupByColId, setGroupByColId] = useState<string>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Conditional Formatting Rules state
  const [showConditionalModal, setShowConditionalModal] = useState(false);
  const [conditionalRules, setConditionalRules] = useState<ConditionalFormattingRule[]>(() => register.conditionalRules || []);

  useEffect(() => {
    setConditionalRules(register.conditionalRules || []);
  }, [register.conditionalRules]);

  const handleSaveConditionalRules = (newRules: ConditionalFormattingRule[]) => {
    setConditionalRules(newRules);
    onUpdateRegister?.((prev) => ({
      ...prev,
      conditionalRules: newRules,
      updatedAt: new Date().toISOString().split('T')[0],
    }));
  };

  // Table visual layout states
  const [density, setDensity] = useState<'compact' | 'normal'>('normal');
  const [autoFitColumns, setAutoFitColumns] = useState<boolean>(true);

  // Actions column visibility: show for 5 seconds when table opens, then auto-hide.
  // Re-appears automatically if rows are check-marked, or if toggled by user!
  const [showActionsColumn, setShowActionsColumn] = useState<boolean>(true);
  useEffect(() => {
    setShowActionsColumn(true);
    const timer = setTimeout(() => {
      setShowActionsColumn(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [register.id]);

  const isActionsVisible = showActionsColumn || selectedIndices.length > 0;

  // Deletion in-app confirmation states
  const [deletingRowIndex, setDeletingRowIndex] = useState<number | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showDeleteRegisterConfirm, setShowDeleteRegisterConfirm] = useState(false);

  // Superpower Modals states
  const [slipRowIndex, setSlipRowIndex] = useState<number | null>(null);
  const [showFullExecutiveModal, setShowFullExecutiveModal] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [showFindReplaceModal, setShowFindReplaceModal] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [whatsAppModalState, setWhatsAppModalState] = useState<{
    isOpen: boolean;
    row?: RowData | null;
    rowIndex?: number | null;
  }>({ isOpen: false, row: null, rowIndex: null });
  
  // Drill-down Summary List Modal
  const [summaryListModal, setSummaryListModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    summaryValueDisplay?: string;
    summaryMethod?: string;
    rows: RowData[];
  } | null>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colId: string } | null>(null);
  const [cellDraftValue, setCellDraftValue] = useState<any>('');

  // Filter state for specific column
  const [filterColId, setFilterColId] = useState<string>('all');
  const [filterVal, setFilterVal] = useState<string>('');

  // Handle Sort Toggle
  const handleSort = (columnId: string) => {
    if (sortConfig?.columnId === columnId) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ columnId, direction: 'desc' });
      } else {
        setSortConfig(null);
      }
    } else {
      setSortConfig({ columnId, direction: 'asc' });
    }
  };

  // Filtered & Sorted Rows
  const processedRows = useMemo(() => {
    let result = register.rows.map((row, originalIndex) => ({
      ...row,
      __originalIndex: originalIndex,
    }));

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) => {
        return register.columns.some((col) => {
          const val = getRowCellValue(row, col, register.columns);
          return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
        });
      });
    }

    // Specific column filter
    if (filterColId !== 'all' && filterVal.trim()) {
      const targetCol = register.columns.find((c) => c.id === filterColId);
      if (targetCol) {
        const valSearch = filterVal.toLowerCase();
        result = result.filter((row) => {
          const v = getRowCellValue(row, targetCol, register.columns);
          return v !== undefined && v !== null && String(v).toLowerCase().includes(valSearch);
        });
      }
    }

    // Sorting
    if (sortConfig) {
      const col = register.columns.find((c) => c.id === sortConfig.columnId);
      if (col) {
        result.sort((a, b) => {
          const valA = getRowCellValue(a, col, register.columns);
          const valB = getRowCellValue(b, col, register.columns);

          if (col.type === 'number' || col.type === 'currency' || col.type === 'formula') {
            const numA = parseNumeric(valA);
            const numB = parseNumeric(valB);
            return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
          }

          const strA = String(valA ?? '').toLowerCase();
          const strB = String(valB ?? '').toLowerCase();
          return sortConfig.direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
        });
      }
    }

    return result;
  }, [register.rows, register.columns, searchTerm, filterColId, filterVal, sortConfig]);

  // Grouping logic
  const groupedData = useMemo(() => {
    if (groupByColId === 'none') {
      return null;
    }
    const groupCol = register.columns.find((c) => c.id === groupByColId);
    if (!groupCol) return null;

    const groups: Record<string, typeof processedRows> = {};
    processedRows.forEach((row) => {
      const key = String((row as Record<string, any>)[groupByColId] ?? 'Other / Unassigned');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    return groups;
  }, [processedRows, groupByColId, register.columns]);

  // Select all toggle
  const allCurrentIndices = processedRows.map((r) => r.__originalIndex);
  const isAllSelected = allCurrentIndices.length > 0 && allCurrentIndices.every((idx) => selectedIndices.includes(idx));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIndices((prev) => prev.filter((idx) => !allCurrentIndices.includes(idx)));
    } else {
      setSelectedIndices((prev) => Array.from(new Set([...prev, ...allCurrentIndices])));
    }
  };

  const [lastSelectedRowIndex, setLastSelectedRowIndex] = useState<number | null>(null);

  const handleToggleRowSelect = (originalIndex: number, e?: React.MouseEvent) => {
    if (e && e.shiftKey && lastSelectedRowIndex !== null) {
      const currentIndexInProcessed = processedRows.findIndex((r) => r.__originalIndex === originalIndex);
      const lastIndexInProcessed = processedRows.findIndex((r) => r.__originalIndex === lastSelectedRowIndex);
      if (currentIndexInProcessed !== -1 && lastIndexInProcessed !== -1) {
        const start = Math.min(currentIndexInProcessed, lastIndexInProcessed);
        const end = Math.max(currentIndexInProcessed, lastIndexInProcessed);
        const rangeIndices = processedRows.slice(start, end + 1).map((r) => r.__originalIndex);
        setSelectedIndices((prev) => Array.from(new Set([...prev, ...rangeIndices])));
        return;
      }
    }

    setLastSelectedRowIndex(originalIndex);
    setSelectedIndices((prev) =>
      prev.includes(originalIndex) ? prev.filter((i) => i !== originalIndex) : [...prev, originalIndex]
    );
  };

  // Inline cell edit handlers
  const handleStartCellEdit = (rowIndex: number, col: ColumnDef, initialValue: any) => {
    if (col.type === 'formula') return; // Cannot edit calculated formula cells directly
    setEditingCell({ rowIndex, colId: col.id });
    setCellDraftValue(initialValue ?? '');
  };

  const handleSaveCellEdit = () => {
    if (editingCell) {
      onInlineUpdateCell(editingCell.rowIndex, editingCell.colId, cellDraftValue);
      setEditingCell(null);
    }
  };

  const handleCancelCellEdit = () => {
    setEditingCell(null);
  };

  // Group collapse toggle
  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Bulk Field Update Handler (batched for single atomic undo/redo action)
  const handleBulkUpdateField = (columnId: string, val: any) => {
    if (onUpdateRegister) {
      onUpdateRegister((reg) => {
        const rows = [...reg.rows];
        selectedIndices.forEach((rowIndex) => {
          if (rows[rowIndex]) {
            rows[rowIndex] = { ...rows[rowIndex], [columnId]: val };
          }
        });
        return { ...reg, rows };
      });
    } else {
      selectedIndices.forEach((rowIndex) => {
        onInlineUpdateCell(rowIndex, columnId, val);
      });
    }
  };

  // Find & Replace Handler (batched for single atomic undo/redo action)
  const handleFindReplace = (targetColId: string, findText: string, replaceText: string, matchCase: boolean): number => {
    let replaceCount = 0;
    if (onUpdateRegister) {
      onUpdateRegister((reg) => {
        const updatedRows = reg.rows.map((row) => {
          let rowChanged = false;
          const updatedRow = { ...row };
          const colsToScan = targetColId === 'all'
            ? reg.columns.filter((c) => c.type !== 'formula')
            : reg.columns.filter((c) => c.id === targetColId);

          colsToScan.forEach((col) => {
            const val = row[col.id];
            if (typeof val === 'string') {
              const regex = new RegExp(
                findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                matchCase ? 'g' : 'gi'
              );
              if (regex.test(val)) {
                updatedRow[col.id] = val.replace(regex, replaceText);
                replaceCount += 1;
                rowChanged = true;
              }
            }
          });
          return rowChanged ? updatedRow : row;
        });
        return { ...reg, rows: updatedRows };
      });
      return replaceCount;
    }

    register.rows.forEach((row, rowIndex) => {
      const colsToScan = targetColId === 'all'
        ? register.columns.filter((c) => c.type !== 'formula')
        : register.columns.filter((c) => c.id === targetColId);

      colsToScan.forEach((col) => {
        const val = row[col.id];
        if (typeof val === 'string') {
          const regex = new RegExp(
            findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            matchCase ? 'g' : 'gi'
          );
          if (regex.test(val)) {
            const updated = val.replace(regex, replaceText);
            onInlineUpdateCell(rowIndex, col.id, updated);
            replaceCount += 1;
          }
        }
      });
    });
    return replaceCount;
  };

  // Export Selected Rows Handler
  const handleExportSelected = () => {
    if (selectedIndices.length === 0) return;
    const selectedRows = selectedIndices.map((i) => register.rows[i]).filter(Boolean);
    const headers = register.columns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(',');
    const rowsCSV = selectedRows.map((r) =>
      register.columns
        .map((c) => {
          const val = getRowCellValue(r, c, register.columns);
          return `"${String(val ?? '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );
    const csvContent = [headers, ...rowsCSV].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${register.title.toLowerCase().replace(/\s+/g, '_')}_selected_${selectedIndices.length}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Summary row totals for numeric columns
  const columnSummaries = useMemo(() => {
    const sums: Record<string, { total: number; avg: number; count: number }> = {};
    register.columns.forEach((col) => {
      if (col.type === 'number' || col.type === 'currency' || col.type === 'formula') {
        let sum = 0;
        let count = 0;
        processedRows.forEach((row) => {
          const val = getRowCellValue(row, col, register.columns);
          const num = parseNumeric(val);
          if (!isNaN(num)) {
            sum += num;
            count += 1;
          }
        });
        sums[col.id] = {
          total: Math.round(sum * 100) / 100,
          avg: count > 0 ? Math.round((sum / count) * 100) / 100 : 0,
          count,
        };
      }
    });
    return sums;
  }, [processedRows, register.columns]);

  // Precompute Column Statistics for Conditional Formatting (Color Scales, Data Bars, Top/Bottom N, Duplicates)
  const columnStatsMap = useMemo(
    () => computeColumnStatistics(processedRows, register.columns, conditionalRules),
    [processedRows, register.columns, conditionalRules]
  );

  // Formatted columns for Print Document Studio
  const printColumns: PrintColumnItem[] = useMemo(() => {
    return register.columns.map((col) => ({
      id: col.id,
      name: (lang === 'te' && col.nameTe) ? col.nameTe : col.name,
      align: (col.type === 'number' || col.type === 'currency' || col.type === 'formula') ? 'right' : 'left',
      type: col.type,
    }));
  }, [register.columns, lang]);

  // Formatted rows for Print Document Studio
  const printRows: PrintRowItem[] = useMemo(() => {
    const targetRows = selectedIndices.length > 0
      ? selectedIndices.map((i) => register.rows[i]).filter(Boolean)
      : processedRows;

    const formatted: PrintRowItem[] = targetRows.map((row, idx) => {
      const cells: Record<string, any> = {};
      register.columns.forEach((col) => {
        const val = getRowCellValue(row, col, register.columns);
        if (col.type === 'checkbox') {
          cells[col.id] = val ? 'Yes' : 'No';
        } else if (col.type === 'currency') {
          const num = parseNumeric(val);
          cells[col.id] = isNaN(num) ? '' : `${col.unit || '₹'} ${num.toLocaleString()}`;
        } else if (col.type === 'number' || col.type === 'formula') {
          const num = parseNumeric(val);
          cells[col.id] = isNaN(num) ? '' : `${num.toLocaleString()}${col.unit ? ` ${col.unit}` : ''}`;
        } else {
          cells[col.id] = val ?? '';
        }
      });
      return { id: idx, cells };
    });

    if (Object.keys(columnSummaries).length > 0) {
      const totalCells: Record<string, any> = {};
      register.columns.forEach((col, idx) => {
        if (idx === 0) {
          totalCells[col.id] = 'TOTAL / SUMMARY';
        } else if (columnSummaries[col.id]) {
          const num = columnSummaries[col.id].total;
          totalCells[col.id] = col.type === 'currency' ? `${col.unit || '₹'} ${num.toLocaleString()}` : `${num.toLocaleString()}${col.unit ? ` ${col.unit}` : ''}`;
        } else {
          totalCells[col.id] = '';
        }
      });
      formatted.push({
        id: 'grand-total',
        cells: totalCells,
        isTotalRow: true,
      });
    }

    return formatted;
  }, [register.rows, register.columns, processedRows, selectedIndices, columnSummaries]);

  return (
    <div className="space-y-3.5">
      
      {/* 1. EXECUTIVE KPI SUMMARY BANNER (Google Sheets lacks live embedded summary) */}
      <ExecutiveSummaryBanner
        register={register}
        filteredRows={processedRows}
        lang={lang}
        onOpenFullSummary={() => setShowFullExecutiveModal(true)}
        onOpenHealthInspector={() => setShowHealthModal(true)}
      />

      {/* 2. FLOATING / STICKY BULK ACTION BAR WHEN ROWS ARE SELECTED */}
      {selectedIndices.length > 0 && (
        <div className="bg-[#1c1c1e] border border-blue-500/40 p-2.5 sm:px-4 rounded-xl flex flex-wrap items-center justify-between gap-2.5 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-blue-600 text-white font-black px-2.5 py-0.5 rounded-lg text-xs font-mono shadow-sm">
              {selectedIndices.length} Selected
            </span>
            <span className="text-zinc-300 text-xs font-medium hidden sm:inline">
              Bulk actions for selected records:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setShowBulkUpdateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Bulk Update Field</span>
            </button>

            <button
              onClick={() => onBulkDuplicate(selectedIndices)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 active:scale-95 rounded-xl transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>

            <ExportDropdown
              variant="compact"
              label={`Export (${selectedIndices.length})`}
              title="Export selected rows to Excel or CSV"
              onExportXLSX={() => {
                const selectedRows = selectedIndices.map((idx) => register.rows[idx]).filter(Boolean);
                exportRegisterToExcelOrCSV({
                  register,
                  rows: selectedRows,
                  format: 'xlsx',
                  filename: `${register.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_selected_${selectedRows.length}.xlsx`,
                  deptProfile
                });
              }}
              onExportCSV={() => {
                const selectedRows = selectedIndices.map((idx) => register.rows[idx]).filter(Boolean);
                exportRegisterToExcelOrCSV({
                  register,
                  rows: selectedRows,
                  format: 'csv',
                  filename: `${register.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_selected_${selectedRows.length}.csv`,
                  deptProfile
                });
              }}
            />

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-white/10 hover:bg-white/15 active:scale-95 rounded-xl transition-all cursor-pointer"
              title="Print selected rows (A4 / Legal)"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print ({selectedIndices.length})</span>
            </button>

            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-600 active:scale-95 rounded-xl transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedIndices([])}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10"
              title="Deselect all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. CONTROL & TOOLBAR */}
      <div className="bg-[#161618] p-3 sm:p-4 rounded-2xl border border-white/10 shadow-lg space-y-3">
        {/* LINE 1: Table Settings & Query Controls (Undo/Redo, Search, Column Filters, Group By, Find & Replace, Formatting) */}
        <div className="flex flex-wrap items-center gap-2 w-full">
          {/* Undo & Redo Action Pair */}
          <div className="flex items-center bg-[#2c2c2e] border border-white/10 rounded-xl p-0.5 shadow-xs shrink-0">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                canUndo
                  ? 'text-zinc-200 hover:text-white hover:bg-white/10 cursor-pointer active:scale-95'
                  : 'text-zinc-600 cursor-not-allowed opacity-35'
              }`}
              title="Undo last change (Ctrl+Z / ⌘Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden xs:inline">Undo</span>
              {undoCount > 0 && (
                <span className="text-[10px] text-zinc-400 font-mono hidden md:inline">({undoCount})</span>
              )}
            </button>
            <div className="w-[1px] h-3.5 bg-white/10 mx-0.5" />
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                canRedo
                  ? 'text-zinc-200 hover:text-white hover:bg-white/10 cursor-pointer active:scale-95'
                  : 'text-zinc-600 cursor-not-allowed opacity-35'
              }`}
              title="Redo change (Ctrl+Y / Ctrl+Shift+Z / ⌘⇧Z)"
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden xs:inline">Redo</span>
              {redoCount > 0 && (
                <span className="text-[10px] text-zinc-400 font-mono hidden md:inline">({redoCount})</span>
              )}
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[150px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search records..."
              className="w-full pl-7 pr-6 py-1.5 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 bg-[#2c2c2e] text-white placeholder-zinc-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Column-Specific Filter */}
          <div className="flex items-center gap-1 bg-[#2c2c2e] border border-white/10 rounded-xl px-2.5 py-1 text-zinc-300 shrink-0">
            <Filter className="w-3 h-3 text-zinc-400 shrink-0" />
            <select
              value={filterColId}
              onChange={(e) => {
                setFilterColId(e.target.value);
                setFilterVal('');
              }}
              className="text-[11px] sm:text-xs bg-transparent border-none text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#2c2c2e] text-white">All Cols</option>
              {register.columns.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#2c2c2e] text-white">
                  {(lang === 'te' && c.nameTe) ? c.nameTe : c.name}
                </option>
              ))}
            </select>
            {filterColId !== 'all' && (
              <input
                type="text"
                placeholder="Filter..."
                value={filterVal}
                onChange={(e) => setFilterVal(e.target.value)}
                className="w-16 text-[11px] px-1 py-0.5 border border-white/15 rounded bg-[#1c1c1e] text-white focus:outline-none"
              />
            )}
          </div>

          {/* Group By selector */}
          <div className="flex items-center gap-1 bg-[#2c2c2e] border border-white/10 rounded-xl px-2.5 py-1 text-zinc-300 shrink-0">
            <Layers className="w-3 h-3 text-zinc-400 shrink-0" />
            <select
              value={groupByColId}
              onChange={(e) => setGroupByColId(e.target.value)}
              className="text-[11px] sm:text-xs bg-transparent border-none text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="none" className="bg-[#2c2c2e] text-white">{t.noGrouping}</option>
              {register.columns
                .filter((c) => c.type === 'select' || c.type === 'text')
                .map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#2c2c2e] text-white">
                    {(lang === 'te' && c.nameTe) ? c.nameTe : c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Find & Replace Trigger */}
          <button
            onClick={() => setShowFindReplaceModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white bg-[#2c2c2e] hover:bg-[#3a3a3c] border border-white/10 rounded-xl transition-all cursor-pointer shrink-0"
            title="Find and replace across columns"
          >
            <Replace className="w-3.5 h-3.5 text-purple-400" />
            <span>Find & Replace</span>
          </button>

          {/* Conditional Formatting Trigger (Google Sheets & Excel Style) */}
          <button
            onClick={() => setShowConditionalModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${
              conditionalRules.filter((r) => r.enabled).length > 0
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-300 hover:bg-purple-600/30'
                : 'bg-[#2c2c2e] hover:bg-[#3a3a3c] text-zinc-300 hover:text-white border-white/10'
            }`}
            title="Conditional Formatting Rules (Google Sheets & Excel Style)"
          >
            <Paintbrush className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Formatting</span>
            {conditionalRules.filter((r) => r.enabled).length > 0 && (
              <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {conditionalRules.filter((r) => r.enabled).length}
              </span>
            )}
          </button>
        </div>

        {/* LINE 2: Actions & Entry (Fill Form, Import, Export, Print, Manage Columns, + Add Entry) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10 w-full">
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToFillForm && (
              <button
                onClick={onNavigateToFillForm}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Fill Form</span>
              </button>
            )}

            {onOpenExcelImportModal && (
              <button
                type="button"
                onClick={onOpenExcelImportModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-xs"
                title="Import Excel (.xlsx) or CSV spreadsheet data"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import</span>
              </button>
            )}

            {/* Export to Excel (.xlsx) / CSV */}
            <ExportDropdown
              label="Export"
              variant="emerald"
              title="Export register data to Excel (.xlsx) or CSV"
              onExportXLSX={() => exportRegisterToExcelOrCSV({
                register,
                rows: processedRows,
                format: 'xlsx',
                deptProfile
              })}
              onExportCSV={() => exportRegisterToExcelOrCSV({
                register,
                rows: processedRows,
                format: 'csv',
                deptProfile
              })}
            />

            {/* Print Button (A4 / Legal with Column Selection & Repeating Headers) */}
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 bg-[#2c2c2e] hover:bg-[#3a3a3c] border border-white/10 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-xs"
              title="Print table report in A4 / Legal with custom column selection & repeating headers"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Print</span>
            </button>

            {/* Direct WhatsApp Share Button */}
            <button
              type="button"
              onClick={() => setWhatsAppModalState({ isOpen: true, row: null, rowIndex: null })}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-xs"
              title={lang === 'te' ? 'టేబుల్ డేటాను వాట్సాప్‌లో నేరుగా షేర్ చేయండి' : 'Direct WhatsApp Share table data & reports'}
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-400" />
              <span>{t.shareWhatsApp || 'WhatsApp'}</span>
            </button>

            <button
              onClick={onOpenColumnModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-300 bg-[#2c2c2e] hover:bg-[#3a3a3c] border border-white/10 rounded-xl transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-xs"
            >
              <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Manage Columns</span>
            </button>

            {/* Show / Hide Actions Column Toggle */}
            <button
              type="button"
              onClick={() => setShowActionsColumn((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap active:scale-95 shadow-xs ${
                isActionsVisible
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300 hover:bg-blue-500/25'
                  : 'bg-[#2c2c2e] hover:bg-[#3a3a3c] border-white/10 text-zinc-400 hover:text-white'
              }`}
              title={
                isActionsVisible
                  ? (lang === 'te' ? 'చర్యల కాలమ్ దాచండి (Hide Actions Column)' : 'Actions Column Visible (Click to Hide)')
                  : (lang === 'te' ? 'చర్యల కాలమ్ చూపించండి (Show Actions Column)' : 'Actions Column Hidden (Click to Show)')
              }
            >
              {isActionsVisible ? <Eye className="w-3.5 h-3.5 text-blue-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{isActionsVisible ? (lang === 'te' ? 'యాక్షన్స్' : 'Actions') : (lang === 'te' ? 'యాక్షన్స్ దాచబడింది' : 'Actions Hidden')}</span>
            </button>

            {/* Multiple Rows Delete Option in Toolbar */}
            {selectedIndices.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 rounded-xl shadow-md shadow-rose-500/25 transition-all cursor-pointer whitespace-nowrap animate-in fade-in"
                title={`Delete ${selectedIndices.length} selected row(s)`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIndices.length})</span>
              </button>
            )}
          </div>

          <button
            onClick={onAddRow}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer whitespace-nowrap shrink-0 ml-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Entry</span>
          </button>
        </div>
      </div>

      {/* 4. MAIN DATA TABLE */}
      <div className="bg-[#1c1c1e] rounded-2xl border border-white/10 shadow-xl overflow-hidden w-full">
        <div className="overflow-x-auto max-h-[calc(100vh-220px)] min-h-[420px] scrollbar-thin">
          <table className={`w-full text-left border-collapse ${autoFitColumns ? 'table-auto' : 'table-fixed'}`}>
            {/* Table Header: Solid Opaque Background Across All Themes */}
            <thead className="bg-[#161618] sticky top-0 z-20 border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400 select-none">
              <tr>
                {/* Select All Checkbox */}
                <th className="sticky top-0 z-20 bg-[#161618] py-2.5 px-3 w-10 text-center border-r border-white/10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded accent-[#0a84ff] cursor-pointer"
                    title={isAllSelected ? "Deselect all rows" : "Select all rows"}
                  />
                </th>

                {/* Row Index */}
                <th className="sticky top-0 z-20 bg-[#161618] py-2.5 px-2.5 w-12 text-center font-mono border-r border-white/10 text-zinc-500">
                  #
                </th>

                {/* Actions Column (Moved to Left Side of Table) - Auto-hidden after 5s or visible when rows checked */}
                {isActionsVisible && (
                  <th className="sticky top-0 z-20 bg-[#161618] py-2.5 px-2.5 w-32 text-center font-semibold text-zinc-400 border-r border-white/10 animate-in fade-in duration-200">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{t.actions}</span>
                      {selectedIndices.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowBulkDeleteConfirm(true);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold shadow-xs active:scale-95 cursor-pointer transition-all"
                          title={`Delete ${selectedIndices.length} selected row(s)`}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>({selectedIndices.length})</span>
                        </button>
                      )}
                    </div>
                  </th>
                )}

                {/* Dynamic Columns */}
                {register.columns.map((col) => {
                  const isSorted = sortConfig?.columnId === col.id;
                  const isFormula = col.type === 'formula';
                  const isNumeric = col.type === 'number' || col.type === 'currency' || col.type === 'formula';

                  return (
                    <th
                      key={col.id}
                      style={{ minWidth: col.width ? `${col.width}px` : '120px' }}
                      className={`sticky top-0 z-20 bg-[#161618] py-2.5 px-3 font-semibold border-r border-white/10 cursor-pointer hover:bg-white/5 transition-colors group ${
                        isNumeric ? 'text-right' : 'text-left'
                      }`}
                      onClick={() => handleSort(col.id)}
                    >
                      <div className={`flex items-center gap-1.5 ${isNumeric ? 'justify-end' : 'justify-between'}`}>
                        <div className="flex items-center gap-1.5 truncate">
                          {isFormula && <Calculator className="w-3 h-3 text-purple-400 shrink-0" />}
                          <span className="truncate text-zinc-200">
                            {(lang === 'te' && col.nameTe) ? col.nameTe : col.name}
                          </span>
                          {col.unit && <span className="text-zinc-500 text-[10px] lowercase">({col.unit})</span>}
                        </div>

                        <span className="shrink-0 text-zinc-500">
                          {isSorted ? (
                            sortConfig?.direction === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-blue-400" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-blue-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-white/5 text-xs text-zinc-200">
              {processedRows.length === 0 ? (
                <tr>
                  <td colSpan={register.columns.length + (isActionsVisible ? 3 : 2)} className="py-12 text-center text-zinc-500">
                    <p className="text-sm font-medium">{t.noData}</p>
                    <button
                      onClick={onAddRow}
                      className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-400 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 rounded-xl transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.addFirstRecord}</span>
                    </button>
                  </td>
                </tr>
              ) : groupedData ? (
                // Grouped Table Rendering
                Object.entries(groupedData).map(([groupName, groupRows]) => {
                  const isCollapsed = collapsedGroups[groupName];
                  return (
                    <React.Fragment key={groupName}>
                      {/* Group Header Row */}
                      <tr className="bg-[#242426] font-semibold text-zinc-300 hover:bg-[#2c2c2e] cursor-pointer">
                        <td
                          colSpan={register.columns.length + (isActionsVisible ? 3 : 2)}
                          className="py-2 px-3 border-b border-white/10"
                          onClick={() => toggleGroupCollapse(groupName)}
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-400" />
                            )}
                            <span className="text-[11px] uppercase tracking-wider text-zinc-500">{groupByColId}:</span>
                            <span className="font-bold text-white">{groupName}</span>
                            <span className="text-[11px] text-zinc-500 font-mono">({groupRows.length} records)</span>
                          </div>
                        </td>
                      </tr>

                      {/* Group Rows */}
                      {!isCollapsed &&
                        groupRows.map((row) => (
                          <TableRowItem
                            key={row.__originalIndex}
                            row={row}
                            originalIndex={row.__originalIndex}
                            columns={register.columns}
                            isSelected={selectedIndices.includes(row.__originalIndex)}
                            isActionsVisible={isActionsVisible}
                            onToggleSelect={(e) => handleToggleRowSelect(row.__originalIndex, e)}
                            onEdit={() => onEditRow(row, row.__originalIndex)}
                            onDelete={() => setDeletingRowIndex(row.__originalIndex)}
                            onDuplicate={() => onDuplicateRow(row.__originalIndex)}
                            onPrintSlip={() => setSlipRowIndex(row.__originalIndex)}
                            onWhatsAppShare={() => setWhatsAppModalState({ isOpen: true, row, rowIndex: row.__originalIndex })}
                            editingCell={editingCell}
                            cellDraftValue={cellDraftValue}
                            onStartCellEdit={handleStartCellEdit}
                            onSaveCellEdit={handleSaveCellEdit}
                            onCancelCellEdit={handleCancelCellEdit}
                            onDraftChange={setCellDraftValue}
                            conditionalRules={conditionalRules}
                            columnStatsMap={columnStatsMap}
                          />
                        ))}
                    </React.Fragment>
                  );
                })
              ) : (
                // Regular Table Rendering
                processedRows.map((row, idx) => (
                  <TableRowItem
                    key={row.__originalIndex}
                    row={row}
                    originalIndex={row.__originalIndex}
                    displayIndex={idx + 1}
                    columns={register.columns}
                    isSelected={selectedIndices.includes(row.__originalIndex)}
                    isActionsVisible={isActionsVisible}
                    onToggleSelect={(e) => handleToggleRowSelect(row.__originalIndex, e)}
                    onEdit={() => onEditRow(row, row.__originalIndex)}
                    onDelete={() => setDeletingRowIndex(row.__originalIndex)}
                    onDuplicate={() => onDuplicateRow(row.__originalIndex)}
                    onPrintSlip={() => setSlipRowIndex(row.__originalIndex)}
                    onWhatsAppShare={() => setWhatsAppModalState({ isOpen: true, row, rowIndex: row.__originalIndex })}
                    editingCell={editingCell}
                    cellDraftValue={cellDraftValue}
                    onStartCellEdit={handleStartCellEdit}
                    onSaveCellEdit={handleSaveCellEdit}
                    onCancelCellEdit={handleCancelCellEdit}
                    onDraftChange={setCellDraftValue}
                    conditionalRules={conditionalRules}
                    columnStatsMap={columnStatsMap}
                  />
                ))
              )}
            </tbody>

            {/* Bottom Summary / Totals Row */}
            {processedRows.length > 0 && Object.keys(columnSummaries).length > 0 && (
              <tfoot className="bg-[#161618] border-t-2 border-white/15 text-xs font-mono font-bold text-zinc-300">
                <tr>
                  <td className="py-2.5 px-3 border-r border-white/10" />
                  <td className="py-2.5 px-2 text-center text-zinc-500 border-r border-white/10 text-[10px]">
                    Σ
                  </td>
                  {/* Actions Column Summary */}
                  {isActionsVisible && (
                    <td className="py-2.5 px-3 text-center text-[10px] text-zinc-400 font-sans border-r border-white/10">
                      {processedRows.length} Rows
                    </td>
                  )}
                  {register.columns.map((col) => {
                    const sumData = columnSummaries[col.id];
                    const isNumeric = col.type === 'number' || col.type === 'currency' || col.type === 'formula';
                    return (
                      <td
                        key={col.id}
                        className={`py-2 px-3 border-r border-white/10 ${isNumeric ? 'text-right' : 'text-left'}`}
                      >
                        {sumData ? (
                          <div className="flex items-center justify-end gap-1.5 group">
                            <div>
                              <div className="text-emerald-400 font-bold">
                                {col.unit ? `${col.unit} ` : ''}{sumData.total.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-zinc-500 font-normal">
                                avg: {sumData.avg.toLocaleString()}
                              </div>
                            </div>

                            {/* Pivot Table Summary List Button beside summary value like in Excel */}
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSummaryListModal({
                                    isOpen: true,
                                    title: `${col.name} Summary List`,
                                    subtitle: `Excel Drilldown: ${processedRows.length} records contributing to total ${col.unit ? `${col.unit} ` : ''}${sumData.total.toLocaleString()}`,
                                    summaryValueDisplay: `${col.unit ? `${col.unit} ` : ''}${sumData.total.toLocaleString()}`,
                                    summaryMethod: 'SUM',
                                    rows: processedRows,
                                  });
                                }}
                                className="p-1 rounded text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0"
                                title="Excel Summary List · View underlying records"
                              >
                                <ListFilter className="w-3.5 h-3.5" />
                              </button>

                              {onNavigateToPivot && (
                                <button
                                  type="button"
                                  onClick={onNavigateToPivot}
                                  className="p-1 rounded text-zinc-400 hover:text-blue-400 hover:bg-blue-500/20 transition-all cursor-pointer shrink-0"
                                  title="Open in Pivot Table"
                                >
                                  <TableIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* MODALS */}

      {/* 1-Click Printable Slip / Receipt Modal */}
      {slipRowIndex !== null && register.rows[slipRowIndex] && (
        <RowSlipModal
          register={register}
          row={register.rows[slipRowIndex]}
          rowIndex={slipRowIndex}
          onClose={() => setSlipRowIndex(null)}
          lang={lang}
          deptProfile={deptProfile}
        />
      )}

      {/* Executive Analytics Dashboard Modal */}
      {showFullExecutiveModal && (
        <ExecutiveSummaryModal
          register={register}
          rows={processedRows}
          onClose={() => setShowFullExecutiveModal(false)}
          lang={lang}
        />
      )}

      {/* Data Health & Quality Inspector Modal */}
      {showHealthModal && (
        <DataHealthModal
          register={register}
          onEditRow={onEditRow}
          onClose={() => setShowHealthModal(false)}
          lang={lang}
        />
      )}

      {/* Bulk Update Field Modal */}
      {showBulkUpdateModal && (
        <BulkUpdateModal
          columns={register.columns}
          selectedCount={selectedIndices.length}
          onApply={handleBulkUpdateField}
          onClose={() => setShowBulkUpdateModal(false)}
          lang={lang}
        />
      )}

      {/* Find & Replace Modal */}
      {showFindReplaceModal && (
        <FindReplaceModal
          columns={register.columns}
          onApply={handleFindReplace}
          onClose={() => setShowFindReplaceModal(false)}
        />
      )}

      {/* In-app Confirm Modal for Single Row Delete */}
      <ConfirmModal
        isOpen={deletingRowIndex !== null}
        title="Delete Entry"
        message={t.deleteRowConfirm || "Are you sure you want to delete this response record? This action cannot be undone."}
        confirmLabel="Delete"
        cancelLabel={t.cancel || "Cancel"}
        isDestructive={true}
        onConfirm={() => {
          if (deletingRowIndex !== null) {
            onDeleteRow(deletingRowIndex);
            setDeletingRowIndex(null);
          }
        }}
        onClose={() => setDeletingRowIndex(null)}
      />

      {/* In-app Confirm Modal for Bulk Delete */}
      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        title={`Delete ${selectedIndices.length} Records`}
        message={`Are you sure you want to permanently delete ${selectedIndices.length} selected responses? This cannot be undone.`}
        confirmLabel="Delete Selected"
        cancelLabel={t.cancel || "Cancel"}
        isDestructive={true}
        onConfirm={() => {
          onBulkDelete(selectedIndices);
          setSelectedIndices([]);
          setShowBulkDeleteConfirm(false);
        }}
        onClose={() => setShowBulkDeleteConfirm(false)}
      />

      {/* In-app Confirm Modal for Clear All Responses */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        title={t.clearAllResponses || "Delete All Responses"}
        message={t.clearAllResponsesConfirm || `Are you sure you want to delete all ${register.rows.length} responses in "${register.title}"? This action cannot be undone.`}
        confirmLabel="Delete All Responses"
        cancelLabel={t.cancel || "Cancel"}
        isDestructive={true}
        onConfirm={() => {
          onClearAllRows?.();
          setSelectedIndices([]);
          setShowClearAllConfirm(false);
        }}
        onClose={() => setShowClearAllConfirm(false)}
      />

      {/* In-app Confirm Modal for Delete Active Register */}
      <ConfirmModal
        isOpen={showDeleteRegisterConfirm}
        title={t.deleteRegister || "Delete Register"}
        message={`Are you sure you want to permanently delete "${register.title}" and all ${register.rows.length} response records? This action cannot be undone.`}
        confirmLabel="Delete Register"
        cancelLabel={t.cancel || "Cancel"}
        isDestructive={true}
        onConfirm={() => {
          onDeleteRegister?.();
          setShowDeleteRegisterConfirm(false);
        }}
        onClose={() => setShowDeleteRegisterConfirm(false)}
      />

      {/* Drilldown Summary List Modal */}
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

      {/* Conditional Formatting Rules Modal (Google Sheets & Excel style) */}
      <ConditionalFormattingModal
        isOpen={showConditionalModal}
        onClose={() => setShowConditionalModal(false)}
        columns={register.columns}
        rules={conditionalRules}
        onSaveRules={handleSaveConditionalRules}
      />

      {/* Table Print Studio Modal (A4/Legal, Portrait/Landscape, Auto-fit, Repeating Headers) */}
      <TablePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        documentTitle={register.title}
        defaultSubtitle={register.description || undefined}
        columns={printColumns}
        rows={printRows}
        deptProfile={deptProfile}
        lang={lang}
        totalRecordsCount={register.rows.length}
        sourceDescription={selectedIndices.length > 0 ? `${selectedIndices.length} Selected Records` : `All Filtered Records (${processedRows.length})`}
      />

      {/* Direct WhatsApp Share Modal */}
      <WhatsAppShareModal
        isOpen={whatsAppModalState.isOpen}
        onClose={() => setWhatsAppModalState({ isOpen: false, row: null, rowIndex: null })}
        register={register}
        rows={processedRows}
        selectedIndices={selectedIndices}
        initialSingleRow={whatsAppModalState.row}
        initialRowIndex={whatsAppModalState.rowIndex}
        lang={lang}
      />

    </div>
  );
};

// Row Component
interface TableRowItemProps {
  row: RowData & { __originalIndex: number };
  originalIndex: number;
  displayIndex?: number;
  columns: ColumnDef[];
  isSelected: boolean;
  onToggleSelect: (e?: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPrintSlip: () => void;
  onWhatsAppShare?: () => void;
  isActionsVisible?: boolean;
  editingCell: { rowIndex: number; colId: string } | null;
  cellDraftValue: any;
  onStartCellEdit: (rowIndex: number, col: ColumnDef, initialValue: any) => void;
  onSaveCellEdit: () => void;
  onCancelCellEdit: () => void;
  onDraftChange: (val: any) => void;
  conditionalRules?: ConditionalFormattingRule[];
  columnStatsMap?: Record<string, any>;
}

const TableRowItem: React.FC<TableRowItemProps> = ({
  row,
  originalIndex,
  displayIndex,
  columns,
  isSelected,
  isActionsVisible = true,
  onToggleSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onPrintSlip,
  onWhatsAppShare,
  editingCell,
  cellDraftValue,
  onStartCellEdit,
  onSaveCellEdit,
  onCancelCellEdit,
  onDraftChange,
  conditionalRules = [],
  columnStatsMap = {},
}) => {
  return (
    <tr
      className={`hover:bg-white/[0.04] transition-colors border-b border-white/5 ${
        isSelected ? 'bg-blue-500/15' : ''
      }`}
    >
      {/* Checkbox */}
      <td className="py-2.5 px-3 text-center border-r border-white/10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(e.nativeEvent as unknown as React.MouseEvent)}
          onClick={(e) => e.stopPropagation()}
          className="rounded accent-[#0a84ff] cursor-pointer"
        />
      </td>

      {/* Row Index */}
      <td className="py-2.5 px-2.5 text-center text-zinc-500 font-mono text-[11px] border-r border-white/10">
        {displayIndex ?? originalIndex + 1}
      </td>

      {/* Row Actions (Moved to Left Side of Table) - Auto-hidden after 5s or visible when rows checked */}
      {isActionsVisible && (
        <td className="py-2 px-2 text-center whitespace-nowrap border-r border-white/10 animate-in fade-in duration-200">
          <div className="flex items-center justify-center gap-1">
            {/* 1-Click Printable Slip / Receipt Button */}
            <button
              onClick={onPrintSlip}
              title="1-Click Print Receipt / Slip / Badge"
              className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/15 rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            {/* Direct WhatsApp Share Button */}
            {onWhatsAppShare && (
              <button
                onClick={onWhatsAppShare}
                title="Direct Share this record via WhatsApp"
                className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/15 rounded-lg transition-all active:scale-95 cursor-pointer"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-400" />
              </button>
            )}
            <button
              onClick={onEdit}
              title="Edit Record"
              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/15 rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDuplicate}
              title="Duplicate Record"
              className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-blue-500/15 rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              title="Delete Record"
              className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 rounded-lg transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      )}

      {/* Dynamic Column Cells */}
      {columns.map((col) => {
        const val = getRowCellValue(row, col, columns);
        const isEditingThisCell = editingCell?.rowIndex === originalIndex && editingCell?.colId === col.id;
        const isNumeric = col.type === 'number' || col.type === 'currency' || col.type === 'formula';
        const evaluated = evaluateCellFormatting(row, col, val, conditionalRules, columnStatsMap, columns);

        return (
          <td
            key={col.id}
            onDoubleClick={() => onStartCellEdit(originalIndex, col, val)}
            style={evaluated.style}
            className={`py-2 px-3 border-r border-white/10 relative group cursor-pointer overflow-hidden ${
              isNumeric ? 'text-right font-mono tabular-nums text-zinc-200' : 'text-left text-zinc-200'
            } ${isEditingThisCell ? 'bg-blue-500/20 ring-2 ring-blue-500 ring-inset' : ''}`}
          >
            {/* Excel Data Bar background progress fill if present */}
            {evaluated.dataBar && (
              <div
                className="absolute left-0 top-0 bottom-0 opacity-35 transition-all rounded-xs pointer-events-none"
                style={{
                  width: `${evaluated.dataBar.percentage}%`,
                  backgroundColor: evaluated.dataBar.color,
                }}
              />
            )}

            {isEditingThisCell ? (
              <div className="flex items-center gap-1">
                {col.type === 'select' ? (
                  <select
                    value={cellDraftValue}
                    onChange={(e) => onDraftChange(e.target.value)}
                    autoFocus
                    onBlur={onSaveCellEdit}
                    className="w-full text-xs p-1 bg-[#2c2c2e] text-white border border-blue-400 rounded-lg focus:outline-none"
                  >
                    {col.options?.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#2c2c2e] text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : col.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={!!cellDraftValue}
                    onChange={(e) => onDraftChange(e.target.checked)}
                    autoFocus
                    onBlur={onSaveCellEdit}
                    className="rounded accent-[#0a84ff]"
                  />
                ) : (
                  <input
                    type={col.type === 'number' || col.type === 'currency' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                    value={cellDraftValue}
                    onChange={(e) => onDraftChange(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveCellEdit();
                      if (e.key === 'Escape') onCancelCellEdit();
                    }}
                    onBlur={onSaveCellEdit}
                    className="w-full text-xs px-2 py-0.5 bg-[#2c2c2e] text-white border border-blue-400 rounded-lg focus:outline-none"
                  />
                )}
                <button onClick={onSaveCellEdit} className="text-emerald-400 hover:text-emerald-300 p-0.5">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={onCancelCellEdit} className="text-zinc-500 hover:text-zinc-300 p-0.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative z-10 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {evaluated.icon && (
                    <span className="text-xs shrink-0 select-none">{evaluated.icon}</span>
                  )}
                  <span className="truncate">
                    {formatCellValue(val, col)}
                  </span>
                </div>
                {col.type !== 'formula' && (
                  <Edit3 className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                )}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
};

// Formatter for values (with signature / image attachment thumbnail support)
function formatCellValue(val: any, col: ColumnDef): React.ReactNode {
  if (val === null || val === undefined || val === '') {
    return <span className="text-zinc-500">—</span>;
  }

  // Handle data URL images (digital signatures or photo attachments)
  if (typeof val === 'string' && val.startsWith('data:image')) {
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        <img
          src={val}
          alt="Attachment"
          className="h-5 max-w-16 object-contain bg-white rounded border border-white/20"
        />
        <span className="text-[10px] text-zinc-400 font-mono">Attachment</span>
      </div>
    );
  }

  if (col.type === 'checkbox') {
    return val ? (
      <span className="text-emerald-400 font-medium">Yes</span>
    ) : (
      <span className="text-zinc-500">No</span>
    );
  }

  if (col.type === 'rating') {
    const stars = Math.min(5, Math.max(0, Number(val) || 0));
    return (
      <span className="text-amber-400 font-medium" title={`${stars} / 5`}>
        {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      </span>
    );
  }

  if (col.type === 'currency') {
    const num = parseNumeric(val);
    return `${col.unit || '₹'} ${num.toLocaleString()}`;
  }

  if (col.type === 'number' || col.type === 'formula') {
    const num = parseNumeric(val);
    return `${num.toLocaleString()}${col.unit ? ` ${col.unit}` : ''}`;
  }

  return String(val);
}
