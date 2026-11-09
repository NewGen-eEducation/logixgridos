import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ColumnDef, RowData } from '../types/register';
import { getRowCellValue } from '../utils/calculations';
import { 
  X, 
  Download, 
  Copy, 
  Check, 
  Search, 
  Table as TableIcon, 
  Filter, 
  Hash, 
  Layers,
  ArrowUpDown,
  ExternalLink,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ExportDropdown } from './ExportDropdown';
import { triggerFileDownload } from '../utils/exportUtils';

interface PivotSummaryListModalProps {
  title: string;
  subtitle?: string;
  summaryValueDisplay?: string;
  summaryMethod?: string;
  rows: RowData[];
  columns: ColumnDef[];
  onClose: () => void;
}

const escapeHtml = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export const PivotSummaryListModal: React.FC<PivotSummaryListModalProps> = ({
  title,
  subtitle,
  summaryValueDisplay,
  summaryMethod,
  rows,
  columns,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [sortColId, setSortColId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filtered rows
  const filteredRows = useMemo(() => {
    let result = [...rows];
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      result = result.filter((row) => {
        return columns.some((col) => {
          const val = getRowCellValue(row, col, columns);
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        });
      });
    }

    if (sortColId) {
      const col = columns.find((c) => c.id === sortColId);
      result.sort((a, b) => {
        const valA = col ? getRowCellValue(a, col, columns) : a[sortColId];
        const valB = col ? getRowCellValue(b, col, columns) : b[sortColId];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return sortDirection === 'asc'
          ? String(valA ?? '').localeCompare(String(valB ?? ''))
          : String(valB ?? '').localeCompare(String(valA ?? ''));
      });
    }

    return result;
  }, [rows, columns, searchQuery, sortColId, sortDirection]);

  // Handle Sort
  const handleSort = (colId: string) => {
    if (sortColId === colId) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColId(null);
        setSortDirection('asc');
      }
    } else {
      setSortColId(colId);
      setSortDirection('asc');
    }
  };

  // Copy as TSV (for Excel paste)
  const handleCopyTSV = async () => {
    const headers = columns.map((c) => c.name).join('\t');
    const dataLines = filteredRows.map((r) =>
      columns.map((c) => String(getRowCellValue(r, c, columns) ?? '')).join('\t')
    );
    const text = [headers, ...dataLines].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Export as Excel Workbook (.xlsx)
  const handleExportXLSX = () => {
    const headers = columns.map((c) => c.name);
    const dataAOA: any[][] = [
      [`Summary List: ${title}`],
      [subtitle || ''],
      [],
      headers
    ];

    filteredRows.forEach((r) => {
      dataAOA.push(columns.map((c) => {
        const val = getRowCellValue(r, c, columns);
        return val === null || val === undefined ? '' : val;
      }));
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataAOA);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Summary Records');
    const outBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerFileDownload(blob, `excel_summary_list_${Date.now()}.xlsx`);
  };

  // Export as CSV
  const handleExportCSV = () => {
    const headers = columns.map((c) => `"${c.name.replace(/"/g, '""')}"`).join(',');
    const dataLines = filteredRows.map((r) =>
      columns.map((c) => {
        const v = String(getRowCellValue(r, c, columns) ?? '');
        return `"${v.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = '\uFEFF' + [headers, ...dataLines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerFileDownload(blob, `excel_summary_list_${Date.now()}.csv`);
  };

  // Pristine Isolated Print Function (Guarantees zero background elements or sidebar bleed)
  const handlePrint = useCallback(() => {
    const printFrameId = 'analytixgrid-pivot-summary-frame';
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

    const isLandscape = columns.length > 5;
    const pageOrientation = isLandscape ? 'landscape' : 'portrait';

    const thsHtml = [
      `<th style="width: 45px; text-align: center;">#</th>`,
      ...columns.map((c) => {
        const isNum = c.type === 'number' || c.type === 'currency' || c.type === 'formula';
        return `<th style="text-align: ${isNum ? 'right' : 'left'};">${escapeHtml(c.name)}</th>`;
      })
    ].join('');

    const trsHtml = filteredRows.map((row, idx) => {
      const tds = [
        `<td style="text-align: center; font-family: monospace; font-weight: bold; color: #475569;">${idx + 1}</td>`,
        ...columns.map((col) => {
          const val = getRowCellValue(row, col, columns);
          const isNum = col.type === 'number' || col.type === 'currency' || col.type === 'formula';
          const display = val !== null && val !== undefined && val !== '' ? String(val) : '-';
          const unitPrefix = col.unit && isNum && display !== '-' ? `${escapeHtml(col.unit)} ` : '';
          return `<td style="text-align: ${isNum ? 'right' : 'left'}; ${isNum ? 'font-family: monospace;' : ''}">${unitPrefix}${escapeHtml(display)}</td>`;
        })
      ].join('');
      const zebra = idx % 2 === 1 ? 'style="background-color: #f8fafc;"' : '';
      return `<tr ${zebra}>${tds}</tr>`;
    }).join('');

    const currentDate = new Date().toLocaleString();
    const countBadge = summaryValueDisplay 
      ? `<span class="metric-badge">${summaryMethod ? `${escapeHtml(summaryMethod)}: ` : ''}<strong>${escapeHtml(summaryValueDisplay)}</strong></span>` 
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)} - Summary Records List</title>
        <style>
          @page {
            size: ${pageOrientation};
            margin: 10mm 10mm 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: ${columns.length > 8 ? '8pt' : columns.length > 5 ? '9pt' : '10pt'};
            line-height: 1.35;
          }
          .header-box {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }
          .title-text {
            font-size: 15pt;
            font-weight: 800;
            color: #0f172a;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .badge {
            font-size: 8pt;
            font-weight: 700;
            background: #e2e8f0;
            color: #1e293b;
            padding: 2px 8px;
            border-radius: 9999px;
            border: 1px solid #cbd5e1;
            text-transform: uppercase;
          }
          .metric-badge {
            font-size: 9pt;
            font-family: monospace;
            background: #f1f5f9;
            color: #047857;
            padding: 4px 10px;
            border-radius: 6px;
            border: 1px solid #a7f3d0;
          }
          .subtitle-text {
            font-size: 9pt;
            color: #475569;
            margin-top: 4px;
            margin-bottom: 0;
          }
          .meta-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8pt;
            color: #64748b;
            margin-top: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            table-layout: auto;
            margin-top: 4px;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            padding: ${columns.length > 8 ? '4px 6px' : '6px 8px'};
            border: 1px solid #94a3b8;
            border-top: 1.5px solid #334155;
            border-bottom: 1.5px solid #334155;
            word-wrap: break-word;
          }
          td {
            padding: ${columns.length > 8 ? '4px 6px' : '5px 8px'};
            border: 1px solid #cbd5e1;
            word-wrap: break-word;
            color: #1e293b;
          }
          .footer-box {
            margin-top: 14px;
            padding-top: 6px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 7.5pt;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div class="title-row">
            <h1 class="title-text">
              <span>${escapeHtml(title)}</span>
              <span class="badge">Summary Records List</span>
            </h1>
            ${countBadge}
          </div>
          <p class="subtitle-text">${escapeHtml(subtitle || `${rows.length} underlying records contributing to this summary value`)}</p>
          <div class="meta-info">
            <span>Total Filtered Records: <strong>${filteredRows.length}</strong> (of ${rows.length})</span>
            <span>Printed on: <strong>${escapeHtml(currentDate)}</strong></span>
          </div>
        </div>

        <table>
          <thead>
            <tr>${thsHtml}</tr>
          </thead>
          <tbody>
            ${trsHtml}
          </tbody>
        </table>

        <div class="footer-box">
          <span>Official Summary Records Report • AnalytixGrid Pivot Studio</span>
          <span>Records Count: ${filteredRows.length}</span>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      printFrame?.contentWindow?.focus();
      printFrame?.contentWindow?.print();
    }, 250);
  }, [columns, filteredRows, rows.length, subtitle, summaryMethod, summaryValueDisplay, title]);

  // Activate body class and keyboard shortcut listener when modal is open
  useEffect(() => {
    document.body.classList.add('pivot-summary-modal-active');

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handlePrint();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('pivot-summary-modal-active');
      window.removeEventListener('keydown', handleKeyDown);
      const printFrame = document.getElementById('analytixgrid-pivot-summary-frame');
      if (printFrame) {
        document.body.removeChild(printFrame);
      }
    };
  }, [onClose, handlePrint]);

  return (
    <div 
      id="pivot-summary-modal-root"
      className="pivot-summary-modal-root fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 print:static print:inset-auto print:bg-white print:p-0 print:m-0 print:block"
    >
      <div 
        id="pivot-summary-modal-content"
        className="bg-[#1c1c1e] text-white border border-white/15 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:max-h-none print:bg-white print:text-black print:overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Excel Dark Theme on Screen, Clean Institutional on Print) */}
        <div className="bg-[#161618] border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3 print:bg-white print:text-black print:border-b-2 print:border-slate-800 print:px-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs print:hidden">
              <TableIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white print:text-slate-900 truncate">
                  {title}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 print:border-slate-400 print:text-slate-700 print:bg-slate-100">
                  Summary Records List
                </span>
              </div>
              <p className="text-xs text-zinc-400 print:text-slate-600 truncate">
                {subtitle || `${rows.length} underlying records contributing to this summary value`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {summaryValueDisplay && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#28282b] border border-white/10 rounded-xl font-mono print:bg-slate-100 print:border-slate-300 print:text-slate-900">
                {summaryMethod && (
                  <span className="text-[10px] text-zinc-400 print:text-slate-600 uppercase font-bold">{summaryMethod}:</span>
                )}
                <span className="text-xs font-bold text-emerald-400 print:text-slate-900">{summaryValueDisplay}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="no-print p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Bar (Hidden when printing) */}
        <div className="no-print bg-[#202023] border-b border-white/10 px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter summary records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161618] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">
              <span className="font-bold text-white">{filteredRows.length}</span> of {rows.length} rows
            </span>

            <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

            <button
              onClick={handleCopyTSV}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-all cursor-pointer active:scale-95"
              title="Copy rows in Excel TSV format"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <ExportDropdown
              label="Excel / CSV"
              variant="compact"
              title="Export summary records to Excel (.xlsx) or CSV"
              onExportXLSX={handleExportXLSX}
              onExportCSV={handleExportCSV}
            />

            {/* Print Summary List Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-white bg-[#0a84ff] hover:bg-[#0071e3] active:scale-95 rounded-lg transition-all cursor-pointer shadow-xs"
              title="Print Summary Records List (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print List</span>
            </button>
          </div>
        </div>

        {/* Records Table View */}
        <div className="flex-1 overflow-auto bg-[#161618] p-3 sm:p-4 print:bg-white print:p-0 print:overflow-visible">
          <div className="border border-white/10 rounded-xl overflow-hidden shadow-md bg-[#1c1c1e] print:border print:border-slate-300 print:shadow-none print:bg-white">
            <table className="w-full text-left border-collapse text-xs print:text-black">
              <thead className="bg-[#242426] border-b border-white/10 text-zinc-400 font-semibold sticky top-0 z-10 print:static print:bg-slate-100 print:text-slate-900 print:border-b-2 print:border-slate-800">
                <tr>
                  <th className="py-2 px-2.5 w-12 text-center font-mono border-r border-white/10 text-zinc-500">
                    #
                  </th>
                  {columns.map((col) => {
                    const isSorted = sortColId === col.id;
                    const isNum = col.type === 'number' || col.type === 'currency' || col.type === 'formula';
                    return (
                      <th
                        key={col.id}
                        onClick={() => handleSort(col.id)}
                        className={`py-2 px-3 border-r border-white/10 cursor-pointer hover:bg-white/5 transition-colors select-none ${
                          isNum ? 'text-right' : 'text-left'
                        }`}
                      >
                        <div className={`flex items-center gap-1.5 ${isNum ? 'justify-end' : 'justify-between'}`}>
                          <span className="truncate text-zinc-200">{col.name}</span>
                          <ArrowUpDown className={`w-3 h-3 ${isSorted ? 'text-[#0a84ff]' : 'text-zinc-600'}`} />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 text-zinc-300 font-sans">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="py-12 text-center text-zinc-500">
                      <p className="text-sm font-medium">No records match the filter query</p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.04] transition-colors">
                      <td className="py-1.5 px-2.5 text-center font-mono text-[11px] text-zinc-500 border-r border-white/10 bg-[#1e1e20]">
                        {idx + 1}
                      </td>
                      {columns.map((col) => {
                        const val = getRowCellValue(row, col, columns);
                        const isNum = col.type === 'number' || col.type === 'currency' || col.type === 'formula';
                        const display = val !== null && val !== undefined && val !== '' ? String(val) : '-';

                        return (
                          <td
                            key={col.id}
                            className={`py-1.5 px-3 border-r border-white/10 ${
                              isNum ? 'text-right font-mono tabular-nums text-emerald-400' : 'text-left'
                            }`}
                          >
                            <span className="truncate block max-w-[240px]">
                              {col.unit && isNum && display !== '-' ? `${col.unit} ` : ''}
                              {display}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer (Hidden when printing) */}
        <div className="no-print bg-[#161618] border-t border-white/10 px-4 py-2.5 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Excel Drill-down Mode Active</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2c2c2e] hover:bg-[#3a3a3c] text-white font-medium rounded-xl border border-white/10 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
