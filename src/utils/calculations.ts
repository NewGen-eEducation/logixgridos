import { ColumnDef, RowData, AggregationType, NumericColumnStats, PivotConfig } from '../types/register';
import { evaluateCellFormula, FormulaEvaluator } from './googleSheetFormulaEngine';

/**
 * Safely parse a value as float or 0
 */
export function parseNumeric(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Evaluate formula column for a given row or expression
 * e.g., formula = "[price] * [quantity]" or "=SUM(A1:A10)" or "=IF([marks]>50, 'Pass', 'Fail')"
 */
export function evaluateFormula(
  formula: string, 
  row: RowData, 
  columns: ColumnDef[], 
  rows?: RowData[], 
  rowIndex?: number, 
  colIndex?: number
): any {
  if (!formula) return 0;
  
  const allRows = rows || [row];
  const currentRowIndex = rowIndex !== undefined ? rowIndex : Math.max(0, allRows.indexOf(row));
  const currentColIndex = colIndex !== undefined ? colIndex : 0;

  // Use the advanced Google Sheets formula evaluator
  const evalExpr = formula.trim().startsWith('=') ? formula : `=${formula}`;
  const evaluator = new FormulaEvaluator(evalExpr, {
    rowIndex: currentRowIndex,
    colIndex: currentColIndex,
    rows: allRows,
    columns,
  });

  const result = evaluator.evaluate();
  return result;
}

/**
 * Compute row cell value taking both column-level and cell-level formulas into account
 */
export function getRowCellValue(
  row: RowData, 
  column: ColumnDef, 
  columns: ColumnDef[], 
  rows?: RowData[], 
  rowIndex?: number
): any {
  if (!row) return '';
  const colIdx = columns.findIndex(c => c.id === column.id);
  const rawVal = row[column.id];

  // If the cell itself contains a Google Sheets formula like "=SUM(A1:B1)" or "=A1*2"
  if (typeof rawVal === 'string' && rawVal.trim().startsWith('=')) {
    const allRows = rows || [row];
    const currentRowIndex = rowIndex !== undefined ? rowIndex : Math.max(0, allRows.indexOf(row));
    return evaluateCellFormula(rawVal, currentRowIndex, colIdx >= 0 ? colIdx : 0, allRows, columns);
  }

  // If column itself is defined as a calculated formula column
  if (column.type === 'formula' && column.formula) {
    return evaluateFormula(column.formula, row, columns, rows, rowIndex, colIdx >= 0 ? colIdx : 0);
  }

  return rawVal;
}

/**
 * Calculate statistical distribution for a numeric column
 */
export function calculateNumericStats(
  rows: RowData[],
  column: ColumnDef,
  columns: ColumnDef[]
): NumericColumnStats | null {
  if (rows.length === 0) return null;

  const values: number[] = [];
  rows.forEach((row, idx) => {
    const raw = getRowCellValue(row, column, columns, rows, idx);
    const num = parseNumeric(raw);
    if (!isNaN(num)) {
      values.push(num);
    }
  });

  if (values.length === 0) return null;

  const count = values.length;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;

  // Sorted values for quantiles and median
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  // Median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Q1 and Q3 (using Tukey's method)
  const lowerHalf = sorted.slice(0, mid);
  const upperHalf = sorted.length % 2 !== 0 ? sorted.slice(mid + 1) : sorted.slice(mid);
  
  const getMedianOfArray = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const m = Math.floor(arr.length / 2);
    return arr.length % 2 !== 0 ? arr[m] : (arr[m - 1] + arr[m]) / 2;
  };

  const q1 = lowerHalf.length > 0 ? getMedianOfArray(lowerHalf) : min;
  const q3 = upperHalf.length > 0 ? getMedianOfArray(upperHalf) : max;
  const iqr = q3 - q1;

  // Variance & Standard Deviation
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  // Outliers: < Q1 - 1.5 * IQR or > Q3 + 1.5 * IQR
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers: { rowIndex: number; value: number }[] = [];

  rows.forEach((row, idx) => {
    const val = parseNumeric(getRowCellValue(row, column, columns));
    if (val < lowerFence || val > upperFence) {
      outliers.push({ rowIndex: idx, value: val });
    }
  });

  return {
    columnId: column.id,
    columnName: column.name,
    count,
    validCount: values.length,
    sum: Math.round(sum * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min,
    max,
    range: Math.round(range * 100) / 100,
    q1: Math.round(q1 * 100) / 100,
    q3: Math.round(q3 * 100) / 100,
    iqr: Math.round(iqr * 100) / 100,
    outliers,
  };
}

/**
 * Perform aggregation over a list of numeric values
 */
export function aggregateValues(values: number[], method: AggregationType): number {
  if (values.length === 0) return 0;
  switch (method) {
    case 'count':
      return values.length;
    case 'sum':
      return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
    case 'avg':
      return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    case 'min':
      return Math.min(...values);
    case 'max':
      return Math.max(...values);
    case 'median': {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
    }
    default:
      return 0;
  }
}

/**
 * Generate a dynamic pivot table structure
 */
export function generatePivotTable(
  rows: RowData[],
  columns: ColumnDef[],
  config: PivotConfig
) {
  const { rowField, columnField, valueField, aggregation } = config;
  const valueCol = columns.find(c => c.id === valueField) || columns[0];

  // Distinct row values & column values
  const rowKeysSet = new Set<string>();
  const colKeysSet = new Set<string>();

  rows.forEach(r => {
    const rKey = String(r[rowField] ?? 'Unspecified');
    const cKey = String(r[columnField] ?? 'Unspecified');
    rowKeysSet.add(rKey);
    colKeysSet.add(cKey);
  });

  const rowKeys = Array.from(rowKeysSet).sort();
  const colKeys = Array.from(colKeysSet).sort();

  // Matrix of raw values: rowKey -> colKey -> number[]
  const grid: Record<string, Record<string, number[]>> = {};
  const allRowValues: Record<string, number[]> = {};
  const allColValues: Record<string, number[]> = {};
  const grandValues: number[] = [];

  rowKeys.forEach(r => {
    grid[r] = {};
    allRowValues[r] = [];
    colKeys.forEach(c => {
      grid[r][c] = [];
    });
  });

  colKeys.forEach(c => {
    allColValues[c] = [];
  });

  rows.forEach((r, idx) => {
    const rKey = String(r[rowField] ?? 'Unspecified');
    const cKey = String(r[columnField] ?? 'Unspecified');
    const cellVal = parseNumeric(getRowCellValue(r, valueCol, columns, rows, idx));

    if (grid[rKey] && grid[rKey][cKey]) {
      grid[rKey][cKey].push(cellVal);
    }
    if (allRowValues[rKey]) allRowValues[rKey].push(cellVal);
    if (allColValues[cKey]) allColValues[cKey].push(cellVal);
    grandValues.push(cellVal);
  });

  // Build finalized aggregate grid
  const matrix: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};

  rowKeys.forEach(r => {
    matrix[r] = {};
    colKeys.forEach(c => {
      matrix[r][c] = aggregateValues(grid[r][c], aggregation);
    });
    rowTotals[r] = aggregateValues(allRowValues[r], aggregation);
  });

  colKeys.forEach(c => {
    colTotals[c] = aggregateValues(allColValues[c], aggregation);
  });

  const grandTotal = aggregateValues(grandValues, aggregation);

  return {
    rowKeys,
    colKeys,
    matrix,
    rowTotals,
    colTotals,
    grandTotal,
  };
}

/**
 * Export rows to CSV string with UTF-8 BOM
 */
export function exportToCSV(register: { columns: ColumnDef[]; rows: RowData[]; title: string }): void {
  const { columns, rows, title } = register;
  
  // Headers
  const headers = columns.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',');

  // Rows
  const csvRows = rows.map((row, rIdx) => {
    return columns.map(col => {
      const val = getRowCellValue(row, col, columns, rows, rIdx);
      const strVal = val === null || val === undefined ? '' : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = '\uFEFF' + [headers, ...csvRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeFilename = title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'register_data';
  link.setAttribute('download', `${safeFilename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse CSV text into column headers and rows
 */
export function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.trim().split(/\r\n|\n|\r/);
  if (lines.length < 2) return { headers: [], rows: [] };

  // Parse header
  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"' || char === "'") {
        if (inQuotes && text[i + 1] === char) {
          cur += char;
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^["']|["']$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] ? values[index].replace(/^["']|["']$/g, '') : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}
