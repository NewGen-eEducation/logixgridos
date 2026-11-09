import * as XLSX from 'xlsx';
import { Register, ColumnDef, RowData, NumericColumnStats, DepartmentProfile, GoogleSheetsPivotConfig } from '../types/register';
import { getRowCellValue, parseNumeric } from './calculations';

/**
 * Universal browser file downloader
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Clean filename helper
 */
export function getSafeFilename(title: string, suffix: string, ext: 'xlsx' | 'csv'): string {
  const cleanTitle = (title || 'register')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const dateStr = new Date().toISOString().split('T')[0];
  return `${cleanTitle}_${suffix}_${dateStr}.${ext}`;
}

/**
 * 1. EXPORT REGISTER DATA (ALL ROWS OR FILTERED ROWS)
 */
export function exportRegisterToExcelOrCSV(options: {
  register: Register;
  rows?: RowData[];
  format: 'xlsx' | 'csv';
  filename?: string;
  deptProfile?: DepartmentProfile;
  includeSummaryRow?: boolean;
}): void {
  const { register, format, deptProfile, includeSummaryRow = true } = options;
  const targetRows = options.rows || register.rows;
  const columns = register.columns;

  // Header row
  const headers = columns.map((c) => c.name + (c.unit ? ` (${c.unit})` : ''));

  // Data rows
  const dataAOA: any[][] = [];

  // Column header row
  dataAOA.push(headers);

  // Row records
  targetRows.forEach((row, rIdx) => {
    const rowVals = columns.map((col) => {
      const val = getRowCellValue(row, col, columns, targetRows, rIdx);
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      if (Array.isArray(val)) return val.join(', ');
      if (col.type === 'number' || col.type === 'currency') {
        const num = parseNumeric(val);
        return isNaN(num) ? val : num;
      }
      return val;
    });
    dataAOA.push(rowVals);
  });

  // Calculate totals for numeric columns
  if (includeSummaryRow) {
    const totalsRow: any[] = columns.map((col, cIdx) => {
      if (cIdx === 0) return 'TOTAL / SUMMARY';
      if (col.type === 'number' || col.type === 'currency' || col.type === 'formula') {
        let sum = 0;
        let count = 0;
        targetRows.forEach((r, rIdx) => {
          const v = parseNumeric(getRowCellValue(r, col, columns, targetRows, rIdx));
          if (!isNaN(v)) {
            sum += v;
            count++;
          }
        });
        return Math.round(sum * 100) / 100;
      }
      return '';
    });
    dataAOA.push(totalsRow);
  }

  const safeName = options.filename || getSafeFilename(register.title, 'data', format);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dataAOA);

    // Auto-calculate column widths
    const colWidths = headers.map((h, i) => {
      let maxLen = h.length;
      dataAOA.forEach((row) => {
        const cell = row[i];
        if (cell !== undefined && cell !== null) {
          maxLen = Math.max(maxLen, String(cell).length);
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 50) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Register Data');
    const outBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerFileDownload(blob, safeName);
  } else {
    // CSV with UTF-8 BOM for full Excel unicode compatibility
    const csvContent = '\uFEFF' + dataAOA.map((row) =>
      row.map((cell) => {
        const str = cell === null || cell === undefined ? '' : String(cell);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerFileDownload(blob, safeName);
  }
}

/**
 * 2. EXPORT FORM BUILDER SCHEMA / QUESTIONS TO EXCEL OR CSV
 */
export function exportFormBuilderToExcelOrCSV(options: {
  register: Register;
  format: 'xlsx' | 'csv';
  filename?: string;
}): void {
  const { register, format } = options;
  const questionsAOA: any[][] = [
    [
      'Question #',
      'Question Title',
      'Question (Telugu)',
      'Field Type',
      'Required',
      'Description / Help Text',
      'Options / Choices',
      'Unit / Prefix',
      'Formula Expression',
      'Validation Category',
      'Validation Operator',
      'Validation Value'
    ]
  ];

  register.columns.forEach((col, idx) => {
    questionsAOA.push([
      `Q${idx + 1}`,
      col.name,
      col.nameTe || '',
      col.type,
      col.required ? 'Yes' : 'No',
      col.description || '',
      col.options ? col.options.join(' | ') : '',
      col.unit || '',
      col.formula || '',
      col.validation?.enabled ? col.validation.category : 'None',
      col.validation?.enabled ? col.validation.operator : '',
      col.validation?.enabled ? (col.validation.value ?? '') : ''
    ]);
  });

  const safeName = options.filename || getSafeFilename(register.title, 'form_questions', format);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const wsQuestions = XLSX.utils.aoa_to_sheet(questionsAOA);
    wsQuestions['!cols'] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 25 },
      { wch: 16 },
      { wch: 10 },
      { wch: 30 },
      { wch: 30 },
      { wch: 12 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, wsQuestions, 'Form Schema');

    // Also include a second sheet with all existing responses if present!
    if (register.rows.length > 0) {
      const respHeaders = ['Response #', ...register.columns.map((c) => c.name)];
      const respAOA: any[][] = [respHeaders];
      register.rows.forEach((row, rIdx) => {
        respAOA.push([
          `#${rIdx + 1}`,
          ...register.columns.map((c) => {
            const v = getRowCellValue(row, c, register.columns, register.rows, rIdx);
            return v === null || v === undefined ? '' : String(v);
          })
        ]);
      });
      const wsResp = XLSX.utils.aoa_to_sheet(respAOA);
      XLSX.utils.book_append_sheet(wb, wsResp, 'Responses');
    }

    const outBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerFileDownload(blob, safeName);
  } else {
    const csvContent = '\uFEFF' + questionsAOA.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerFileDownload(blob, safeName);
  }
}

/**
 * 3. EXPORT FORM SUBMISSIONS / RESPONSES
 */
export function exportResponsesToExcelOrCSV(options: {
  register: Register;
  format: 'xlsx' | 'csv';
  filename?: string;
}): void {
  const { register, format } = options;
  const safeName = options.filename || getSafeFilename(register.title, 'responses', format);
  exportRegisterToExcelOrCSV({
    register,
    rows: register.rows,
    format,
    filename: safeName,
    includeSummaryRow: false
  });
}

/**
 * 4. EXPORT STATISTICAL ANALYSIS & DISTRIBUTIONS TO EXCEL OR CSV
 */
export function exportAnalysisToExcelOrCSV(options: {
  register: Register;
  stats: NumericColumnStats[];
  categoryChartData?: { label: string; value: number }[];
  activeCategoryName?: string;
  activeMetricName?: string;
  format: 'xlsx' | 'csv';
  filename?: string;
}): void {
  const { register, stats, categoryChartData, activeCategoryName, activeMetricName, format } = options;
  
  // Statistical summary table
  const statsAOA: any[][] = [
    [
      'Metric / Column',
      'Total Count',
      'Valid Count',
      'Sum / Total',
      'Mean / Average',
      'Median',
      'Minimum',
      'Maximum',
      'Range',
      'Std Dev (σ)',
      'Variance (σ²)',
      'Q1 (25th %)',
      'Q3 (75th %)',
      'IQR',
      'Outliers Count'
    ]
  ];

  stats.forEach((s) => {
    statsAOA.push([
      s.columnName,
      s.count,
      s.validCount,
      s.sum,
      Math.round(s.mean * 100) / 100,
      s.median,
      s.min,
      s.max,
      s.range,
      Math.round(s.stdDev * 100) / 100,
      Math.round(s.variance * 100) / 100,
      s.q1,
      s.q3,
      s.iqr,
      s.outliers.length
    ]);
  });

  const safeName = options.filename || getSafeFilename(register.title, 'statistical_analysis', format);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const wsStats = XLSX.utils.aoa_to_sheet(statsAOA);
    wsStats['!cols'] = [
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsStats, 'Statistical Summary');

    // Categorical breakdown sheet if data exists
    if (categoryChartData && categoryChartData.length > 0) {
      const catAOA: any[][] = [
        [activeCategoryName || 'Category / Group', activeMetricName ? `Sum / Value (${activeMetricName})` : 'Frequency / Count']
      ];
      categoryChartData.forEach((item) => {
        catAOA.push([item.label, item.value]);
      });
      const wsCat = XLSX.utils.aoa_to_sheet(catAOA);
      wsCat['!cols'] = [{ wch: 28 }, { wch: 22 }];
      XLSX.utils.book_append_sheet(wb, wsCat, 'Category Breakdown');
    }

    const outBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerFileDownload(blob, safeName);
  } else {
    // In CSV format, combine stats and category breakdown cleanly
    let lines = statsAOA.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    );

    if (categoryChartData && categoryChartData.length > 0) {
      lines.push('');
      lines.push(`"--- CATEGORICAL BREAKDOWN: ${activeCategoryName || 'Grouping'} ---"`);
      lines.push(`"${activeCategoryName || 'Category'}","${activeMetricName || 'Count'}"`);
      categoryChartData.forEach((item) => {
        lines.push(`"${String(item.label).replace(/"/g, '""')}","${item.value}"`);
      });
    }

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerFileDownload(blob, safeName);
  }
}

/**
 * 5. EXPORT PIVOT TABLE CROSS-TABULATION MATRIX TO EXCEL OR CSV
 */
export function exportPivotTableToExcelOrCSV(options: {
  register: Register;
  pivotResult: any;
  pivotConfig: GoogleSheetsPivotConfig;
  pivotName?: string;
  format: 'xlsx' | 'csv';
  filename?: string;
}): void {
  const { register, pivotResult, pivotConfig, pivotName = 'Pivot Table', format } = options;
  const { rowKeys, colKeys, matrix, rowTotals, colTotals, grandTotals } = pivotResult;
  const vConfigs = pivotConfig.values.length > 0 ? pivotConfig.values : [{ id: '', summarizeBy: 'COUNTA' as const, showAs: 'DEFAULT' as const }];

  const activeRowFields = (pivotConfig.rows || [])
    .map((r) => register.columns.find((c) => c.id === r.id))
    .filter(Boolean);
  const activeColFields = (pivotConfig.columns || [])
    .map((c) => register.columns.find((col) => col.id === c.id))
    .filter(Boolean);

  const rowHead = activeRowFields.length > 0
    ? activeRowFields.map((f) => f!.name).join(' › ')
    : 'Row';
  const colHead = activeColFields.length > 0
    ? activeColFields.map((c) => c!.name).join(' › ')
    : 'Column';

  const isMultiRow = activeRowFields.length > 1;
  const gridAOA: any[][] = [];

  // Title row
  gridAOA.push([`${register.title} - ${pivotName}`]);
  gridAOA.push([`Rows: ${rowHead || 'All'} | Columns: ${colHead || 'All'}`]);
  gridAOA.push([]);

  // Header Row
  const headerCols: any[] = isMultiRow
    ? activeRowFields.map((f) => f!.name)
    : [rowHead || 'Row'];

  colKeys.forEach((cKey: string) => {
    vConfigs.forEach((v) => {
      const vCol = register.columns.find((c) => c.id === v.id);
      headerCols.push(`${cKey}${vConfigs.length > 1 ? ` (${v.summarizeBy} ${vCol?.name || ''})` : ''}`);
    });
  });
  if (pivotConfig.rows[0]?.showTotals) {
    vConfigs.forEach((v) => {
      const vCol = register.columns.find((c) => c.id === v.id);
      headerCols.push(`Grand Total${vConfigs.length > 1 ? ` (${v.summarizeBy} ${vCol?.name || ''})` : ''}`);
    });
  }
  gridAOA.push(headerCols);

  // Data rows
  rowKeys.forEach((rKey: string) => {
    const rParts = isMultiRow ? rKey.split(' › ') : [rKey];
    const rowLine: any[] = [...rParts];
    colKeys.forEach((cKey: string) => {
      vConfigs.forEach((v) => {
        const cell = matrix[rKey]?.[cKey]?.[v.id];
        rowLine.push(cell?.raw !== undefined ? cell.raw : (cell?.formatted || 0));
      });
    });
    if (pivotConfig.rows[0]?.showTotals) {
      vConfigs.forEach((v) => {
        const tot = rowTotals[rKey]?.[v.id];
        rowLine.push(tot?.raw !== undefined ? tot.raw : (tot?.formatted || 0));
      });
    }
    gridAOA.push(rowLine);
  });

  // Column totals row
  if (pivotConfig.columns[0]?.showTotals) {
    const totLine: any[] = isMultiRow
      ? ['Grand Total', ...Array(activeRowFields.length - 1).fill('')]
      : ['Grand Total'];
    colKeys.forEach((cKey: string) => {
      vConfigs.forEach((v) => {
        const cTot = colTotals[cKey]?.[v.id];
        totLine.push(cTot?.raw !== undefined ? cTot.raw : (cTot?.formatted || 0));
      });
    });
    if (pivotConfig.rows[0]?.showTotals) {
      vConfigs.forEach((v) => {
        const gTot = grandTotals[v.id];
        totLine.push(gTot?.raw !== undefined ? gTot.raw : (gTot?.formatted || 0));
      });
    }
    gridAOA.push(totLine);
  }

  const safeName = options.filename || getSafeFilename(register.title, `pivot_${pivotName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`, format);

  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(gridAOA);
    ws['!cols'] = headerCols.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Pivot Table');
    const outBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([outBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    triggerFileDownload(blob, safeName);
  } else {
    const csvContent = '\uFEFF' + gridAOA.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    triggerFileDownload(blob, safeName);
  }
}

/**
 * 6. EXPORT INSTITUTIONAL REPORT / LEDGER TO EXCEL OR CSV
 */
export function exportReportToExcelOrCSV(options: {
  register: Register;
  deptProfile?: DepartmentProfile;
  format: 'xlsx' | 'csv';
  filename?: string;
}): void {
  const { register, deptProfile, format } = options;
  const safeName = options.filename || getSafeFilename(register.title, 'official_ledger_report', format);
  exportRegisterToExcelOrCSV({
    register,
    format,
    deptProfile,
    filename: safeName,
    includeSummaryRow: true
  });
}
