import * as XLSX from 'xlsx';
import { ColumnDef, ColumnType, Register, RowData } from '../types/register';

export interface ParsedSpreadsheet {
  fileName: string;
  sheetNames: string[];
  activeSheetName: string;
  columns: ColumnDef[];
  rows: RowData[];
  totalRowCount: number;
}

/**
 * Infer column type from an array of sample cell values
 */
export function inferColumnType(values: any[]): { type: ColumnType; options?: string[]; unit?: string } {
  const nonEmpties = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '');
  if (nonEmpties.length === 0) return { type: 'text' };

  // Check currency
  const hasCurrencySymbol = nonEmpties.some((v) => {
    const s = String(v).trim();
    return s.startsWith('₹') || s.startsWith('$') || s.startsWith('€') || s.startsWith('£');
  });

  if (hasCurrencySymbol) {
    const symbol = String(nonEmpties[0]).trim()[0];
    return { type: 'currency', unit: symbol };
  }

  // Check Boolean / Yes/No
  const isBoolean = nonEmpties.every((v) => {
    const s = String(v).trim().toLowerCase();
    return s === 'true' || s === 'false' || s === 'yes' || s === 'no' || s === 'y' || s === 'n';
  });

  if (isBoolean) {
    return { type: 'checkbox' };
  }

  // Check Number
  const isNumber = nonEmpties.every((v) => {
    if (typeof v === 'number') return true;
    const s = String(v).trim().replace(/,/g, '');
    return !isNaN(Number(s)) && s !== '';
  });

  if (isNumber) {
    // Check if percentage
    const hasPercent = nonEmpties.some((v) => String(v).includes('%'));
    return { type: 'number', unit: hasPercent ? '%' : undefined };
  }

  // Check Date (ISO or date string)
  const isDate = nonEmpties.every((v) => {
    if (v instanceof Date) return true;
    const s = String(v).trim();
    // Match common date patterns e.g. YYYY-MM-DD or MM/DD/YYYY or DD-MM-YYYY
    const isIsoOrSlash = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s) || /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(s);
    if (!isIsoOrSlash) return false;
    const parsed = Date.parse(s);
    return !isNaN(parsed);
  });

  if (isDate) {
    return { type: 'date' };
  }

  // Check Categorical (few unique values)
  const uniqueValues = Array.from(new Set(nonEmpties.map((v) => String(v).trim())));
  if (uniqueValues.length >= 2 && uniqueValues.length <= 12 && nonEmpties.length >= 4) {
    return { type: 'select', options: uniqueValues };
  }

  return { type: 'text' };
}

/**
 * Format raw cell value according to inferred type
 */
function normalizeCellValue(val: any, type: ColumnType): any {
  if (val === null || val === undefined || val === '') return '';

  if (type === 'checkbox') {
    const s = String(val).trim().toLowerCase();
    return s === 'true' || s === 'yes' || s === 'y' || s === '1';
  }

  if (type === 'number' || type === 'currency') {
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  if (type === 'date') {
    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }
    const s = String(val).trim();
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return s;
  }

  return String(val).trim();
}

/**
 * Dynamically detects the true table header row in an uploaded spreadsheet sheet,
 * intelligently skipping any merged title rows, metadata banners, subtitles, or empty rows.
 */
export function detectHeaderRowIndex(rawData: any[][], worksheet?: XLSX.WorkSheet): number {
  if (!rawData || rawData.length === 0) return 0;
  if (rawData.length === 1) return 0;

  // 1. Identify rows that have horizontal merged ranges (banner title rows)
  const mergedBannerRows = new Set<number>();
  if (worksheet && worksheet['!merges']) {
    for (const m of worksheet['!merges']) {
      // If a merge spans 2 or more columns and starts in top rows
      if (m.s.r <= 15 && (m.e.c - m.s.c >= 1)) {
        for (let r = m.s.r; r <= m.e.r; r++) {
          mergedBannerRows.add(r);
        }
      }
    }
  }

  // 2. Find maximum number of populated cells in any row across top 30 rows
  const inspectLimit = Math.min(30, rawData.length);
  let maxPopulatedCols = 0;
  for (let r = 0; r < inspectLimit; r++) {
    const row = rawData[r] || [];
    const count = row.filter((c: any) => c !== null && c !== undefined && String(c).trim() !== '').length;
    if (count > maxPopulatedCols) {
      maxPopulatedCols = count;
    }
  }

  if (maxPopulatedCols <= 1) {
    for (let r = 0; r < inspectLimit; r++) {
      const row = rawData[r];
      if (row && row.some((c: any) => c !== null && c !== undefined && String(c).trim() !== '')) {
        return r;
      }
    }
    return 0;
  }

  // Common column header keywords across business, education, inventory, finance
  const commonHeaderKeywords = [
    'id', 'no', 'num', 'number', 'code', 'sno', 'slno', 'sl.no', 's.no',
    'name', 'title', 'first', 'last', 'full', 'student', 'employee', 'customer', 'item', 'product',
    'date', 'time', 'year', 'month', 'day', 'timestamp', 'dob',
    'email', 'mail', 'phone', 'mobile', 'contact', 'address', 'city', 'state', 'zip', 'pin',
    'category', 'type', 'status', 'department', 'dept', 'role', 'designation', 'section', 'class',
    'qty', 'quantity', 'units', 'amount', 'price', 'total', 'cost', 'fee', 'debit', 'credit', 'balance', 'salary',
    'rate', 'percentage', 'percent', 'marks', 'score', 'grade', 'result', 'rating',
    'remarks', 'note', 'notes', 'description', 'particulars', 'comments', 'gender', 'age', 'action'
  ];

  let bestRowIndex = 0;
  let bestScore = -9999;

  for (let r = 0; r < Math.min(15, rawData.length); r++) {
    const row = rawData[r];
    if (!row) continue;

    const populated = row.map((cell: any) => ({
      val: cell,
      str: cell !== null && cell !== undefined ? String(cell).trim() : '',
    })).filter((c) => c.str !== '');

    const count = populated.length;
    if (count === 0) continue;

    // Merged title banner check: 1 cell populated while sheet has >= 3 columns
    if (count === 1 && maxPopulatedCols >= 3) {
      continue;
    }

    // 2 cells populated while sheet has >= 5 columns (likely title + subtitle/metadata)
    if (count <= 2 && maxPopulatedCols >= 5) {
      continue;
    }

    // Merged banner row with few columns
    if (mergedBannerRows.has(r) && count < Math.max(3, Math.floor(maxPopulatedCols * 0.75))) {
      continue;
    }

    let stringCount = 0;
    let numberCount = 0;
    let keywordMatches = 0;

    for (const cell of populated) {
      const s = cell.str.toLowerCase();
      const isNum = !isNaN(Number(s.replace(/,/g, ''))) && s !== '';
      if (isNum) {
        numberCount++;
      } else {
        stringCount++;
      }

      if (commonHeaderKeywords.some((kw) => s === kw || s.includes(kw))) {
        keywordMatches++;
      }
    }

    // Check if next row has data
    const nextRow = rawData[r + 1];
    const nextCount = nextRow ? nextRow.filter((c: any) => c !== null && c !== undefined && String(c).trim() !== '').length : 0;
    const hasFollowingData = nextCount >= Math.min(count, Math.max(2, Math.floor(maxPopulatedCols * 0.5)));

    // Score formulation
    let score = (count / maxPopulatedCols) * 50;
    score += (stringCount / count) * 40;
    score -= (numberCount / count) * 40;
    score += keywordMatches * 15;
    if (hasFollowingData) score += 25;
    if (mergedBannerRows.has(r)) score -= 30;

    if (score > bestScore) {
      bestScore = score;
      bestRowIndex = r;
    }
  }

  return bestRowIndex;
}

/**
 * Parse an Excel (.xlsx / .xls) or CSV / TSV file from ArrayBuffer
 */
export async function parseExcelFile(
  file: File,
  targetSheetName?: string
): Promise<ParsedSpreadsheet> {
  const data = await file.arrayBuffer();
  // Read workbook using SheetJS
  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: true,
    dateNF: 'yyyy-mm-dd',
  });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('Workbook contains no sheets.');
  }

  const activeSheetName = targetSheetName && sheetNames.includes(targetSheetName)
    ? targetSheetName
    : sheetNames[0];

  const worksheet = workbook.Sheets[activeSheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${activeSheetName}" could not be read.`);
  }

  // Convert worksheet to 2D array of raw values
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawData.length === 0) {
    throw new Error('The spreadsheet sheet is empty.');
  }

  // Dynamically detect true table header row (skipping merged title rows/metadata)
  const headerRowIndex = detectHeaderRowIndex(rawData, worksheet);

  const rawHeaders = rawData[headerRowIndex] || [];
  const rawRows = rawData.slice(headerRowIndex + 1);

  // Build unique column definitions
  const columns: ColumnDef[] = [];
  const usedIds = new Set<string>();

  rawHeaders.forEach((h: any, colIdx: number) => {
    let name = String(h ?? '').trim();
    if (!name) name = `Column ${colIdx + 1}`;

    let id = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    if (!id || id === '_') id = `col_${colIdx + 1}`;
    if (usedIds.has(id)) {
      id = `${id}_${colIdx + 1}`;
    }
    usedIds.add(id);

    // Sample column values to infer type
    const colSamples = rawRows.slice(0, 50).map((r) => r[colIdx]);
    const { type, options, unit } = inferColumnType(colSamples);

    columns.push({
      id,
      name,
      type,
      options,
      unit,
      required: false,
      width: Math.max(140, Math.min(320, name.length * 10 + 40)),
    });
  });

  // Build row records
  const rows: RowData[] = [];

  rawRows.forEach((r) => {
    // Skip completely empty rows
    const hasData = r.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasData) return;

    const rowObj: RowData = {};
    columns.forEach((col, colIdx) => {
      const rawVal = r[colIdx];
      rowObj[col.id] = normalizeCellValue(rawVal, col.type);
    });

    rows.push(rowObj);
  });

  // Clean filename without extension
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

  return {
    fileName: cleanTitle,
    sheetNames,
    activeSheetName,
    columns,
    rows,
    totalRowCount: rows.length,
  };
}

/**
 * Parse ALL sheets from an Excel (.xlsx / .xls) workbook or CSV file
 */
export async function parseAllExcelSheets(file: File): Promise<ParsedSpreadsheet[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: true,
    dateNF: 'yyyy-mm-dd',
  });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('Workbook contains no readable sheets.');
  }

  const cleanFileName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  const results: ParsedSpreadsheet[] = [];

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawData.length === 0) continue;

    // Dynamically detect true table header row (skipping merged title rows/metadata)
    const headerRowIndex = detectHeaderRowIndex(rawData, worksheet);

    const rawHeaders = rawData[headerRowIndex] || [];
    const rawRows = rawData.slice(headerRowIndex + 1);

    const columns: ColumnDef[] = [];
    const usedIds = new Set<string>();

    rawHeaders.forEach((h: any, colIdx: number) => {
      let name = String(h ?? '').trim();
      if (!name) name = `Column ${colIdx + 1}`;

      let id = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
      if (!id || id === '_') id = `col_${colIdx + 1}`;
      if (usedIds.has(id)) {
        id = `${id}_${colIdx + 1}`;
      }
      usedIds.add(id);

      const colSamples = rawRows.slice(0, 50).map((r) => r[colIdx]);
      const { type, options, unit } = inferColumnType(colSamples);

      columns.push({
        id,
        name,
        type,
        options,
        unit,
        required: false,
        width: Math.max(140, Math.min(320, name.length * 10 + 40)),
      });
    });

    const rows: RowData[] = [];
    rawRows.forEach((r) => {
      const hasData = r.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
      if (!hasData) return;

      const rowObj: RowData = {};
      columns.forEach((col, colIdx) => {
        const rawVal = r[colIdx];
        rowObj[col.id] = normalizeCellValue(rawVal, col.type);
      });
      rows.push(rowObj);
    });

    results.push({
      fileName: cleanFileName,
      sheetNames,
      activeSheetName: sheetName,
      columns,
      rows,
      totalRowCount: rows.length,
    });
  }

  if (results.length === 0) {
    throw new Error('No data found in any sheet.');
  }

  return results;
}
