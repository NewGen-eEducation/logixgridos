import React, { useState, useMemo, useRef } from 'react';
import { 
  Printer, 
  X, 
  Check, 
  FileText, 
  Settings2, 
  Maximize2, 
  Layout, 
  Columns, 
  Type, 
  Calendar, 
  Building2, 
  RotateCcw,
  Sliders,
  Sparkles,
  Info
} from 'lucide-react';
import { DepartmentProfile } from '../types/register';
import { Language } from '../utils/translations';

export interface PrintColumnItem {
  id: string;
  name: string;
  nameSecondary?: string;
  align?: 'left' | 'center' | 'right';
  type?: string;
}

export interface PrintRowItem {
  id?: string | number;
  cells: Record<string, any>;
  isTotalRow?: boolean;
}

interface TablePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  defaultSubtitle?: string;
  columns: PrintColumnItem[];
  rows: PrintRowItem[];
  deptProfile?: DepartmentProfile;
  lang?: Language;
  totalRecordsCount?: number;
  sourceDescription?: string;
}

type PaperSize = 'a4' | 'legal';
type Orientation = 'portrait' | 'landscape';
type FontSizeOption = 'auto' | 'small' | 'normal' | 'comfortable';

export const TablePrintModal: React.FC<TablePrintModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  defaultSubtitle,
  columns,
  rows,
  deptProfile,
  lang = 'en',
  totalRecordsCount,
  sourceDescription,
}) => {
  // Config state
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [title, setTitle] = useState<string>(documentTitle || 'AnalytixGrid Data Report');
  const [subtitle, setSubtitle] = useState<string>(defaultSubtitle || '');
  
  // Column Selection
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(() => columns.map(c => c.id));
  
  // Toggles
  const [autoFitColumns, setAutoFitColumns] = useState<boolean>(true);
  const [repeatHeaders, setRepeatHeaders] = useState<boolean>(true);
  const [showDeptHeader, setShowDeptHeader] = useState<boolean>(false);
  const [showTimestamp, setShowTimestamp] = useState<boolean>(true);
  const [showRecordCount, setShowRecordCount] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<FontSizeOption>('auto');
  const [showGridBorders, setShowGridBorders] = useState<boolean>(true);
  const [isZebraStriped, setIsZebraStriped] = useState<boolean>(true);

  // Sync title when documentTitle changes
  React.useEffect(() => {
    if (documentTitle) setTitle(documentTitle);
  }, [documentTitle]);

  React.useEffect(() => {
    if (defaultSubtitle !== undefined) setSubtitle(defaultSubtitle);
  }, [defaultSubtitle]);

  React.useEffect(() => {
    if (columns.length > 0) {
      setSelectedColumnIds(columns.map(c => c.id));
    }
  }, [columns]);

  // Active columns
  const activeColumns = useMemo(() => {
    return columns.filter(c => selectedColumnIds.includes(c.id));
  }, [columns, selectedColumnIds]);

  // Quick Select All / Clear All
  const handleSelectAllColumns = () => {
    setSelectedColumnIds(columns.map(c => c.id));
  };

  const handleClearAllColumns = () => {
    if (columns.length > 0) {
      setSelectedColumnIds([columns[0].id]); // keep at least 1
    }
  };

  const toggleColumn = (id: string) => {
    if (selectedColumnIds.includes(id)) {
      if (selectedColumnIds.length === 1) return; // avoid 0 columns
      setSelectedColumnIds(selectedColumnIds.filter(colId => colId !== id));
    } else {
      setSelectedColumnIds([...selectedColumnIds, id]);
    }
  };

  // Compute calculated font size
  const calculatedFontSizePt = useMemo(() => {
    if (fontSize === 'small') return '8pt';
    if (fontSize === 'normal') return '9.5pt';
    if (fontSize === 'comfortable') return '11pt';
    
    // Auto mode based on active column count & orientation
    const colCount = activeColumns.length;
    if (colCount > 10) return orientation === 'landscape' ? '7.5pt' : '6.5pt';
    if (colCount > 7) return orientation === 'landscape' ? '8.5pt' : '7.5pt';
    if (colCount > 4) return orientation === 'landscape' ? '9.5pt' : '8.5pt';
    return '10pt';
  }, [fontSize, activeColumns.length, orientation]);

  const calculatedCellPadding = useMemo(() => {
    if (activeColumns.length > 8) return '3px 4px';
    if (activeColumns.length > 5) return '4px 6px';
    return '6px 8px';
  }, [activeColumns.length]);

  // Execute Print via invisible iframe
  const handlePrint = () => {
    const printFrameId = 'analytixgrid-print-frame';
    let printFrame = document.getElementById(printFrameId) as HTMLIFrameElement | null;
    
    if (printFrame) {
      document.body.removeChild(printFrame);
    }

    printFrame = document.createElement('iframe');
    printFrame.id = printFrameId;
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    // Build Department Header HTML (disabled)
    let deptHeaderHtml = '';

    // Build metadata bar
    const nowStr = new Date().toLocaleString();
    const metaItems: string[] = [];
    if (showTimestamp) metaItems.push(`<span>Printed: <strong>${escapeHtml(nowStr)}</strong></span>`);
    if (showRecordCount) metaItems.push(`<span>Records: <strong>${rows.length}</strong></span>`);
    if (sourceDescription) metaItems.push(`<span>Source: <strong>${escapeHtml(sourceDescription)}</strong></span>`);
    metaItems.push(`<span>AnalytixGrid</span>`);

    const metaBarHtml = metaItems.length > 0 
      ? `<div class="meta-bar">${metaItems.join(' &nbsp;|&nbsp; ')}</div>` 
      : '';

    // Build Table Header Cells
    const theadThs = activeColumns.map(col => {
      const align = col.align || 'left';
      return `<th class="align-${align}">${escapeHtml(col.name)}</th>`;
    }).join('');

    // Build Table Body Rows
    const tbodyRows = rows.map((row, idx) => {
      const isTotal = row.isTotalRow;
      const rowClass = isTotal ? 'total-row' : (isZebraStriped && idx % 2 === 1 ? 'zebra' : '');
      const tds = activeColumns.map(col => {
        const align = col.align || 'left';
        const rawVal = row.cells[col.id];
        const valStr = rawVal === null || rawVal === undefined ? '' : String(rawVal);
        return `<td class="align-${align}">${escapeHtml(valStr)}</td>`;
      }).join('');
      return `<tr class="${rowClass}">${tds}</tr>`;
    }).join('');

    const pageDimensions = paperSize === 'legal'
      ? (orientation === 'landscape' ? 'size: 356mm 216mm;' : 'size: 216mm 356mm;')
      : (orientation === 'landscape' ? 'size: 297mm 210mm;' : 'size: 210mm 297mm;');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            ${pageDimensions}
            margin: 10mm 8mm 12mm 8mm;
          }
          
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: ${calculatedFontSizePt};
            line-height: 1.35;
          }

          .print-container {
            width: 100%;
          }

          .dept-header {
            text-align: center;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .dept-name {
            font-size: 13pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .dept-sub {
            font-size: 9pt;
            font-weight: 600;
            color: #334155;
            margin-top: 1px;
          }
          .dept-details {
            font-size: 7.5pt;
            color: #64748b;
            margin-top: 3px;
          }

          .doc-header {
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 4px;
          }
          .doc-title-block {
            flex: 1;
          }
          .doc-title {
            font-size: 12pt;
            font-weight: 700;
            color: #09090b;
            margin: 0;
          }
          .doc-subtitle {
            font-size: 8.5pt;
            color: #475569;
            margin-top: 2px;
          }

          .meta-bar {
            font-size: 7.5pt;
            color: #64748b;
            text-align: right;
            white-space: nowrap;
          }

          /* Critical for Repeating Headers */
          table {
            width: 100%;
            border-collapse: collapse;
            ${autoFitColumns ? 'table-layout: fixed;' : ''}
            page-break-inside: auto;
          }

          thead {
            display: ${repeatHeaders ? 'table-header-group' : 'table-row-group'};
          }

          tfoot {
            display: table-footer-group;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            font-size: ${calculatedFontSizePt};
            padding: ${calculatedCellPadding};
            border: ${showGridBorders ? '1px solid #94a3b8' : 'none'};
            border-top: 1.5px solid #475569;
            border-bottom: 1.5px solid #475569;
            text-align: left;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          td {
            padding: ${calculatedCellPadding};
            font-size: ${calculatedFontSizePt};
            border: ${showGridBorders ? '1px solid #cbd5e1' : 'none'};
            border-bottom: 1px solid #e2e8f0;
            word-wrap: break-word;
            overflow-wrap: break-word;
            color: #1e293b;
          }

          tr.zebra td {
            background-color: #f8fafc;
          }

          tr.total-row td {
            font-weight: 800;
            background-color: #e2e8f0;
            border-top: 2px solid #475569;
            border-bottom: 2px solid #475569;
            color: #0f172a;
          }

          .align-left { text-align: left; }
          .align-center { text-align: center; }
          .align-right { text-align: right; }

          .footer-note {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 7.5pt;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${deptHeaderHtml}
          
          <div class="doc-header">
            <div class="doc-title-block">
              <h1 class="doc-title">${escapeHtml(title)}</h1>
              ${subtitle ? `<div class="doc-subtitle">${escapeHtml(subtitle)}</div>` : ''}
            </div>
            ${metaBarHtml}
          </div>

          <table>
            <thead>
              <tr>${theadThs}</tr>
            </thead>
            <tbody>
              ${tbodyRows}
            </tbody>
          </table>

          <div class="footer-note">
            <span>Official Printout • Generated via AnalytixGrid</span>
            <span>Total Records: ${rows.length}</span>
          </div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Allow iframe resources to settle then trigger browser print
    setTimeout(() => {
      printFrame?.contentWindow?.focus();
      printFrame?.contentWindow?.print();
    }, 250);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#18181b] border border-white/15 w-full max-w-6xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#1f1f23]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Print Document Studio</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {paperSize.toUpperCase()} • {orientation}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Configure columns, paper sizing, orientation, auto-fit and repeating headers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Print Now</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Controls (1/3) + Right Live Sheet Preview (2/3) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0">
          
          {/* Controls Panel */}
          <div className="lg:col-span-5 p-4 sm:p-5 overflow-y-auto space-y-4 border-r border-white/10 bg-[#141416]">
            
            {/* 1. Document Title & Subtitle */}
            <div className="space-y-2 bg-[#1d1d21] p-3.5 rounded-xl border border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <Type className="w-3.5 h-3.5 text-blue-400" />
                <span>Document Header</span>
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Print Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document Title"
                  className="w-full text-xs px-3 py-1.5 rounded-lg bg-[#27272a] border border-white/10 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Subtitle / Purpose</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Official Record / Monthly Performance"
                  className="w-full text-xs px-3 py-1.5 rounded-lg bg-[#27272a] border border-white/10 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* 2. Page Setup: Paper Size & Orientation */}
            <div className="bg-[#1d1d21] p-3.5 rounded-xl border border-white/10 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <Layout className="w-3.5 h-3.5 text-blue-400" />
                <span>Paper & Page Format</span>
              </div>

              {/* Paper Size selector */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1.5">Paper Size</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaperSize('a4')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      paperSize === 'a4'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-xs'
                        : 'bg-[#27272a] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold">A4 Paper</span>
                    <span className="text-[10px] opacity-70">210 × 297 mm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('legal')}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      paperSize === 'legal'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-xs'
                        : 'bg-[#27272a] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold">Legal Paper</span>
                    <span className="text-[10px] opacity-70">8.5 × 14 in (356 mm)</span>
                  </button>
                </div>
              </div>

              {/* Orientation selector */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1.5">Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      orientation === 'portrait'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-xs'
                        : 'bg-[#27272a] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="w-3.5 h-4.5 border border-current rounded-xs" />
                    <span>Portrait</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      orientation === 'landscape'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-xs'
                        : 'bg-[#27272a] border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="w-4.5 h-3.5 border border-current rounded-xs" />
                    <span>Landscape</span>
                  </button>
                </div>
              </div>

              {/* Font Size scaling */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1.5">Font Density & Scale</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['auto', 'small', 'normal', 'comfortable'] as FontSizeOption[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setFontSize(opt)}
                      className={`py-1.5 text-[11px] font-medium rounded-lg border capitalize transition-all cursor-pointer ${
                        fontSize === opt
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-[#27272a] border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Column Selection to Print */}
            <div className="bg-[#1d1d21] p-3.5 rounded-xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                  <Columns className="w-3.5 h-3.5 text-blue-400" />
                  <span>Select Columns to Print</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-mono">
                    {activeColumns.length} of {columns.length}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllColumns}
                    className="text-blue-400 hover:underline cursor-pointer"
                  >
                    All
                  </button>
                  <span className="text-zinc-600">/</span>
                  <button
                    type="button"
                    onClick={handleClearAllColumns}
                    className="text-zinc-400 hover:underline cursor-pointer"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="max-h-40 overflow-y-auto pr-1 space-y-1">
                {columns.map((col) => {
                  const isSelected = selectedColumnIds.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => toggleColumn(col.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/40 text-blue-200'
                          : 'bg-[#27272a]/60 border-white/5 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span className="truncate max-w-[200px] text-left">{col.name}</span>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-zinc-600 bg-transparent'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Smart Print Rules & Layout Options */}
            <div className="bg-[#1d1d21] p-3.5 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Page Layout Rules</span>
              </div>

              {/* Auto Fit Columns */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-[#27272a] hover:bg-[#323236] transition-colors cursor-pointer text-xs">
                <div>
                  <div className="font-semibold text-zinc-200">Auto-fit column widths</div>
                  <div className="text-[10px] text-zinc-400">Scale column widths proportionally to fit page size</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoFitColumns}
                  onChange={(e) => setAutoFitColumns(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer accent-blue-600"
                />
              </label>

              {/* Repeat Table Headers */}
              <label className="flex items-center justify-between p-2 rounded-lg bg-[#27272a] hover:bg-[#323236] transition-colors cursor-pointer text-xs">
                <div>
                  <div className="font-semibold text-zinc-200">Repeat table headers on each page</div>
                  <div className="text-[10px] text-zinc-400">Prints table header at top of every continuous sheet</div>
                </div>
                <input
                  type="checkbox"
                  checked={repeatHeaders}
                  onChange={(e) => setRepeatHeaders(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer accent-blue-600"
                />
              </label>

              {/* Grid borders & Zebra stripes */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 p-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGridBorders}
                    onChange={(e) => setShowGridBorders(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>Grid lines</span>
                </label>
                <label className="flex items-center gap-2 p-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isZebraStriped}
                    onChange={(e) => setIsZebraStriped(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>Zebra shading</span>
                </label>
              </div>
            </div>

          </div>

          {/* Right Live Sheet Preview */}
          <div className="lg:col-span-7 bg-[#0f0f11] p-4 sm:p-6 overflow-y-auto flex flex-col items-center justify-start">
            <div className="w-full flex items-center justify-between mb-3 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Live Sheet Preview ({paperSize.toUpperCase()} • {orientation})</span>
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {rows.length} rows • {activeColumns.length} columns
              </span>
            </div>

            {/* Realistic Sheet Canvas with Paper Sizing */}
            <div
              className={`w-full max-w-2xl bg-white text-zinc-900 rounded-lg shadow-2xl p-6 transition-all duration-300 border border-zinc-200 flex flex-col justify-between ${
                orientation === 'landscape' ? 'aspect-[1.414/1]' : 'aspect-[1/1.414]'
              }`}
              style={{
                fontSize: calculatedFontSizePt,
                minHeight: orientation === 'portrait' ? '560px' : '440px',
              }}
            >
              <div>
                {/* Document Header in Preview */}
                <div className="border-b border-zinc-300 pb-2 mb-3 flex items-end justify-between">
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 leading-tight">
                      {title || 'Untitled Document'}
                    </h2>
                    {subtitle && (
                      <p className="text-xs text-zinc-600 mt-0.5">{subtitle}</p>
                    )}
                  </div>
                  <div className="text-right text-[10px] text-zinc-500 font-mono">
                    {showTimestamp && <div>{new Date().toLocaleDateString()}</div>}
                    {showRecordCount && <div>{rows.length} Records</div>}
                  </div>
                </div>

                {/* Table in Preview */}
                <div className="overflow-x-auto">
                  <table
                    className={`w-full border-collapse ${
                      autoFitColumns ? 'table-fixed' : ''
                    }`}
                  >
                    <thead>
                      <tr className="bg-slate-100 border-y border-slate-400">
                        {activeColumns.map((col) => (
                          <th
                            key={col.id}
                            className={`px-2 py-1.5 font-bold text-slate-800 text-[11px] ${
                              showGridBorders ? 'border border-slate-300' : ''
                            } ${
                              col.align === 'right'
                                ? 'text-right'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            <span className="truncate block">{col.name}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 15).map((row, rIdx) => {
                        const isTotal = row.isTotalRow;
                        return (
                          <tr
                            key={rIdx}
                            className={`${
                              isTotal
                                ? 'bg-slate-200 font-bold border-y-2 border-slate-600 text-slate-900'
                                : isZebraStriped && rIdx % 2 === 1
                                ? 'bg-slate-50'
                                : 'bg-white'
                            } border-b border-slate-200`}
                          >
                            {activeColumns.map((col) => {
                              const val = row.cells[col.id];
                              const displayVal = val === null || val === undefined ? '' : String(val);
                              return (
                                <td
                                  key={col.id}
                                  className={`px-2 py-1 text-slate-700 text-[10px] truncate ${
                                    showGridBorders ? 'border border-slate-200' : ''
                                  } ${
                                    col.align === 'right'
                                      ? 'text-right'
                                      : col.align === 'center'
                                      ? 'text-center'
                                      : 'text-left'
                                  }`}
                                >
                                  {displayVal}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {rows.length > 15 && (
                        <tr>
                          <td
                            colSpan={activeColumns.length}
                            className="text-center py-2 text-[10px] italic text-zinc-400 bg-slate-50 border-t border-dashed border-slate-300"
                          >
                            + {rows.length - 15} more rows will be printed across pages
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sheet Bottom Footer */}
              <div className="pt-3 border-t border-zinc-200 flex items-center justify-between text-[9px] text-zinc-500 mt-4">
                <span>Page 1 of {Math.max(1, Math.ceil(rows.length / 25))} • AnalytixGrid</span>
                <span>Official Printout</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Full document with all pages will be sent to your printer or PDF export.</span>
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between bg-[#19191c]">
          <div className="text-xs text-zinc-400">
            Selected: <span className="font-semibold text-white">{activeColumns.length}</span> columns •{' '}
            <span className="font-semibold text-white">{rows.length}</span> rows
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-95 rounded-xl shadow-md shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 stroke-[2.5]" />
              <span>Print Document</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// Helper HTML escaping for safe printing
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
