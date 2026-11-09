import { 
  ColumnDef, 
  RowData, 
  GoogleSheetsPivotConfig, 
  GoogleSheetsAggregation, 
  PivotShowAs 
} from '../types/register';
import { getRowCellValue, parseNumeric } from './calculations';

export const PIVOT_KEY_DELIMITER = ' › ';

export interface PivotCalculatedCell {
  raw: number;
  formatted: string;
  count: number;
}

export interface PivotGridMatrix {
  rowKeys: string[];
  colKeys: string[];
  rowDimensionIds: string[];
  colDimensionIds: string[];
  // matrix[rowIndex][colIndex][valueIndex]
  matrix: Record<string, Record<string, Record<string, PivotCalculatedCell>>>;
  rowTotals: Record<string, Record<string, PivotCalculatedCell>>;
  colTotals: Record<string, Record<string, PivotCalculatedCell>>;
  grandTotals: Record<string, PivotCalculatedCell>;
  filteredRowCount: number;
  cellBuckets: Record<string, Record<string, RowData[]>>;
  rowBuckets: Record<string, RowData[]>;
  colBuckets: Record<string, RowData[]>;
  filteredRows: RowData[];
}

export function computeGoogleSheetsAggregation(
  rawValues: any[],
  method: GoogleSheetsAggregation
): number {
  if (rawValues.length === 0) return 0;

  switch (method) {
    case 'COUNTA':
      return rawValues.filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length;

    case 'COUNT':
      return rawValues.filter((v) => {
        const num = parseNumeric(v);
        return !isNaN(num) && v !== null && v !== undefined && String(v).trim() !== '';
      }).length;

    case 'COUNTUNIQUE': {
      const set = new Set(rawValues.map((v) => String(v ?? '').trim()).filter(Boolean));
      return set.size;
    }

    case 'SUM': {
      const numbers = rawValues.map(parseNumeric).filter((n) => !isNaN(n));
      const sum = numbers.reduce((a, b) => a + b, 0);
      return Math.round(sum * 100) / 100;
    }

    case 'AVERAGE': {
      const numbers = rawValues.map(parseNumeric).filter((n) => !isNaN(n));
      if (numbers.length === 0) return 0;
      const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      return Math.round(avg * 100) / 100;
    }

    case 'MAX': {
      const numbers = rawValues.map(parseNumeric).filter((n) => !isNaN(n));
      return numbers.length > 0 ? Math.max(...numbers) : 0;
    }

    case 'MIN': {
      const numbers = rawValues.map(parseNumeric).filter((n) => !isNaN(n));
      return numbers.length > 0 ? Math.min(...numbers) : 0;
    }

    case 'MEDIAN': {
      const numbers = rawValues.map(parseNumeric).filter((n) => !isNaN(n)).sort((a, b) => a - b);
      if (numbers.length === 0) return 0;
      const mid = Math.floor(numbers.length / 2);
      const med = numbers.length % 2 !== 0 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
      return Math.round(med * 100) / 100;
    }

    case 'PRODUCT': {
      const numbers = rawValues.map(parseNumeric).filter((n) => !isNaN(n));
      if (numbers.length === 0) return 0;
      const prod = numbers.reduce((a, b) => a * b, 1);
      return Math.round(prod * 100) / 100;
    }

    case 'VAR': {
      const numbers = rawValues.map(parseNumeric).filter((n) => !isNaN(n));
      if (numbers.length <= 1) return 0;
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const variance = numbers.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (numbers.length - 1);
      return Math.round(variance * 100) / 100;
    }

    case 'STDEV': {
      const numbers = rawValues.map(parseNumeric).filter((n) => !isNaN(n));
      if (numbers.length <= 1) return 0;
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const variance = numbers.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (numbers.length - 1);
      return Math.round(Math.sqrt(variance) * 100) / 100;
    }

    default:
      return 0;
  }
}

export function formatPivotValue(
  rawVal: number,
  showAs: PivotShowAs,
  refTotal?: number,
  unit?: string
): string {
  if (showAs !== 'DEFAULT' && refTotal !== undefined) {
    if (refTotal === 0) return '0.00%';
    const pct = (rawVal / refTotal) * 100;
    return `${pct.toFixed(2)}%`;
  }

  // Default number formatting
  const formattedNum = rawVal.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(rawVal) ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return unit ? `${unit} ${formattedNum}` : formattedNum;
}

export function getFieldDisplayValue(
  row: RowData,
  colDef: ColumnDef | undefined,
  columns: ColumnDef[],
  colIdFallback?: string
): string {
  if (!colDef) {
    if (colIdFallback) {
      const v = row[colIdFallback];
      if (v !== null && v !== undefined && String(v).trim() !== '') return String(v);
    }
    return '(Blank)';
  }
  const val = getRowCellValue(row, colDef, columns);
  if (val === null || val === undefined || String(val).trim() === '') {
    return '(Blank)';
  }
  return String(val);
}

export function buildPivotKey(
  row: RowData,
  dimensionConfigs: { id: string }[],
  columns: ColumnDef[]
): string {
  const active = dimensionConfigs.filter((c) => c && c.id);
  if (active.length === 0) return 'Total';
  return active
    .map((cfg) => {
      const colDef = columns.find((c) => c.id === cfg.id);
      return getFieldDisplayValue(row, colDef, columns, cfg.id);
    })
    .join(PIVOT_KEY_DELIMITER);
}

export function executeGoogleSheetsPivot(
  rows: RowData[],
  columns: ColumnDef[],
  config: GoogleSheetsPivotConfig
): PivotGridMatrix {
  // 1. Filter rows by active filters
  let filteredRows = [...rows];

  (config.filters || []).forEach((f) => {
    if (!f.showingAll) {
      const selectedSet = new Set(f.selectedValues || []);
      const colDef = columns.find((c) => c.id === f.id);
      filteredRows = filteredRows.filter((r) => {
        const valStr = getFieldDisplayValue(r, colDef, columns, f.id);
        const directVal = String(r[f.id] ?? '');
        return selectedSet.has(valStr) || (directVal && selectedSet.has(directVal));
      });
    }
  });

  const activeRowConfigs = (config.rows || []).filter((r) => r && r.id);
  const activeColConfigs = (config.columns || []).filter((c) => c && c.id);
  const valueConfigs = (config.values || []).filter((v) => v && v.id);

  // If no values configured, provide fallback COUNTA metric
  const effectiveValueConfigs = valueConfigs.length > 0
    ? valueConfigs
    : [{
        id: activeRowConfigs[0]?.id || activeColConfigs[0]?.id || columns[0]?.id || 'count',
        summarizeBy: 'COUNTA' as const,
        showAs: 'DEFAULT' as const
      }];

  // 2. Extract distinct Row & Column Keys across all configured fields
  const rawRowKeysSet = new Set<string>();
  const rawColKeysSet = new Set<string>();

  filteredRows.forEach((r) => {
    rawRowKeysSet.add(buildPivotKey(r, activeRowConfigs, columns));
    rawColKeysSet.add(buildPivotKey(r, activeColConfigs, columns));
  });

  let rowKeys = Array.from(rawRowKeysSet);
  let colKeys = Array.from(rawColKeysSet);

  if (rowKeys.length === 0) rowKeys = ['Total'];
  if (colKeys.length === 0) colKeys = ['Total'];

  // Group raw rows into matrix cells
  const cellBuckets: Record<string, Record<string, RowData[]>> = {};
  const rowBuckets: Record<string, RowData[]> = {};
  const colBuckets: Record<string, RowData[]> = {};

  rowKeys.forEach((r) => {
    cellBuckets[r] = {};
    rowBuckets[r] = [];
    colKeys.forEach((c) => {
      cellBuckets[r][c] = [];
    });
  });

  colKeys.forEach((c) => {
    colBuckets[c] = [];
  });

  filteredRows.forEach((r) => {
    const rKey = buildPivotKey(r, activeRowConfigs, columns);
    const cKey = buildPivotKey(r, activeColConfigs, columns);

    if (cellBuckets[rKey] && cellBuckets[rKey][cKey]) {
      cellBuckets[rKey][cKey].push(r);
    }
    if (rowBuckets[rKey]) rowBuckets[rKey].push(r);
    if (colBuckets[cKey]) colBuckets[cKey].push(r);
  });

  // Calculate Aggregations for each cell, row total, col total, and grand total
  const matrix: Record<string, Record<string, Record<string, PivotCalculatedCell>>> = {};
  const rowTotals: Record<string, Record<string, PivotCalculatedCell>> = {};
  const colTotals: Record<string, Record<string, PivotCalculatedCell>> = {};
  const grandTotals: Record<string, PivotCalculatedCell> = {};

  // First pass: compute raw aggregated values
  const rawMatrix: Record<string, Record<string, Record<string, number>>> = {};
  const rawRowTotals: Record<string, Record<string, number>> = {};
  const rawColTotals: Record<string, Record<string, number>> = {};
  const rawGrandTotals: Record<string, number> = {};

  effectiveValueConfigs.forEach((vConfig) => {
    const valColDef = columns.find((c) => c.id === vConfig.id);
    const vId = vConfig.id;

    // Grand total raw
    const grandVals = filteredRows.map((r) => valColDef ? getRowCellValue(r, valColDef, columns) : r[vId]);
    rawGrandTotals[vId] = computeGoogleSheetsAggregation(grandVals, vConfig.summarizeBy);

    // Row totals raw
    rowKeys.forEach((rKey) => {
      if (!rawRowTotals[rKey]) rawRowTotals[rKey] = {};
      const rRows = rowBuckets[rKey] || [];
      const rVals = rRows.map((r) => valColDef ? getRowCellValue(r, valColDef, columns) : r[vId]);
      rawRowTotals[rKey][vId] = computeGoogleSheetsAggregation(rVals, vConfig.summarizeBy);
    });

    // Col totals raw
    colKeys.forEach((cKey) => {
      if (!rawColTotals[cKey]) rawColTotals[cKey] = {};
      const cRows = colBuckets[cKey] || [];
      const cVals = cRows.map((r) => valColDef ? getRowCellValue(r, valColDef, columns) : r[vId]);
      rawColTotals[cKey][vId] = computeGoogleSheetsAggregation(cVals, vConfig.summarizeBy);
    });

    // Cells raw
    rowKeys.forEach((rKey) => {
      if (!rawMatrix[rKey]) rawMatrix[rKey] = {};
      colKeys.forEach((cKey) => {
        if (!rawMatrix[rKey][cKey]) rawMatrix[rKey][cKey] = {};
        const cellRows = cellBuckets[rKey]?.[cKey] || [];
        const cellVals = cellRows.map((r) => valColDef ? getRowCellValue(r, valColDef, columns) : r[vId]);
        rawMatrix[rKey][cKey][vId] = computeGoogleSheetsAggregation(cellVals, vConfig.summarizeBy);
      });
    });
  });

  // Second pass: apply `showAs` formatting (Default, % of row, % of col, % of grand total)
  effectiveValueConfigs.forEach((vConfig) => {
    const valColDef = columns.find((c) => c.id === vConfig.id);
    const vId = vConfig.id;
    const unit = valColDef?.unit;

    // Grand total
    const grandRaw = rawGrandTotals[vId] ?? 0;
    grandTotals[vId] = {
      raw: grandRaw,
      formatted: formatPivotValue(grandRaw, 'DEFAULT', grandRaw, unit),
      count: filteredRows.length,
    };

    // Row totals
    rowKeys.forEach((rKey) => {
      if (!rowTotals[rKey]) rowTotals[rKey] = {};
      const rRaw = rawRowTotals[rKey]?.[vId] ?? 0;
      let ref = grandRaw;
      if (vConfig.showAs === 'PERCENT_OF_GRAND_TOTAL') ref = grandRaw;
      rowTotals[rKey][vId] = {
        raw: rRaw,
        formatted: formatPivotValue(rRaw, vConfig.showAs === 'PERCENT_OF_GRAND_TOTAL' ? 'PERCENT_OF_GRAND_TOTAL' : 'DEFAULT', ref, unit),
        count: rowBuckets[rKey]?.length || 0,
      };
    });

    // Col totals
    colKeys.forEach((cKey) => {
      if (!colTotals[cKey]) colTotals[cKey] = {};
      const cRaw = rawColTotals[cKey]?.[vId] ?? 0;
      let ref = grandRaw;
      if (vConfig.showAs === 'PERCENT_OF_GRAND_TOTAL') ref = grandRaw;
      colTotals[cKey][vId] = {
        raw: cRaw,
        formatted: formatPivotValue(cRaw, vConfig.showAs === 'PERCENT_OF_GRAND_TOTAL' ? 'PERCENT_OF_GRAND_TOTAL' : 'DEFAULT', ref, unit),
        count: colBuckets[cKey]?.length || 0,
      };
    });

    // Cell values
    rowKeys.forEach((rKey) => {
      if (!matrix[rKey]) matrix[rKey] = {};
      colKeys.forEach((cKey) => {
        if (!matrix[rKey][cKey]) matrix[rKey][cKey] = {};
        const cellRaw = rawMatrix[rKey]?.[cKey]?.[vId] ?? 0;
        let refTotal = grandRaw;
        if (vConfig.showAs === 'PERCENT_OF_ROW') refTotal = rawRowTotals[rKey]?.[vId] ?? 0;
        if (vConfig.showAs === 'PERCENT_OF_COLUMN') refTotal = rawColTotals[cKey]?.[vId] ?? 0;
        if (vConfig.showAs === 'PERCENT_OF_GRAND_TOTAL') refTotal = grandRaw;

        matrix[rKey][cKey][vId] = {
          raw: cellRaw,
          formatted: formatPivotValue(cellRaw, vConfig.showAs, refTotal, unit),
          count: cellBuckets[rKey]?.[cKey]?.length || 0,
        };
      });
    });
  });

  // Multi-level sort for row keys
  if (activeRowConfigs.length > 0) {
    rowKeys.sort((a, b) => {
      const primaryRow = activeRowConfigs[0];
      if (primaryRow.sortBy && primaryRow.sortBy !== 'self' && rawRowTotals[a] && rawRowTotals[b]) {
        const valA = rawRowTotals[a]?.[primaryRow.sortBy] ?? 0;
        const valB = rawRowTotals[b]?.[primaryRow.sortBy] ?? 0;
        if (valA !== valB) {
          return primaryRow.order === 'asc' ? valA - valB : valB - valA;
        }
      }

      const aParts = a.split(PIVOT_KEY_DELIMITER);
      const bParts = b.split(PIVOT_KEY_DELIMITER);
      for (let i = 0; i < activeRowConfigs.length; i++) {
        const rCfg = activeRowConfigs[i];
        const partA = aParts[i] || '';
        const partB = bParts[i] || '';
        if (partA !== partB) {
          const cmp = partA.localeCompare(partB, undefined, { numeric: true });
          return rCfg.order === 'desc' ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  // Multi-level sort for col keys
  if (activeColConfigs.length > 0) {
    colKeys.sort((a, b) => {
      const primaryCol = activeColConfigs[0];
      if (primaryCol.sortBy && primaryCol.sortBy !== 'self' && rawColTotals[a] && rawColTotals[b]) {
        const valA = rawColTotals[a]?.[primaryCol.sortBy] ?? 0;
        const valB = rawColTotals[b]?.[primaryCol.sortBy] ?? 0;
        if (valA !== valB) {
          return primaryCol.order === 'asc' ? valA - valB : valB - valA;
        }
      }

      const aParts = a.split(PIVOT_KEY_DELIMITER);
      const bParts = b.split(PIVOT_KEY_DELIMITER);
      for (let i = 0; i < activeColConfigs.length; i++) {
        const cCfg = activeColConfigs[i];
        const partA = aParts[i] || '';
        const partB = bParts[i] || '';
        if (partA !== partB) {
          const cmp = partA.localeCompare(partB, undefined, { numeric: true });
          return cCfg.order === 'desc' ? -cmp : cmp;
        }
      }
      return 0;
    });
  }

  return {
    rowKeys,
    colKeys,
    rowDimensionIds: activeRowConfigs.map((r) => r.id),
    colDimensionIds: activeColConfigs.map((c) => c.id),
    matrix,
    rowTotals,
    colTotals,
    grandTotals,
    filteredRowCount: filteredRows.length,
    cellBuckets,
    rowBuckets,
    colBuckets,
    filteredRows,
  };
}
