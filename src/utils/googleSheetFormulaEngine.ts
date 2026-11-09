// Comprehensive Google Sheets Formula Engine
// Supports standard functions, cell references (A1, B2), column references ([col_name], Column),
// math operators (+, -, *, /, %, ^), comparisons (=, ==, <>, !=, <, >, <=, >=), string concatenation (&),
// and nested function calls.

export interface SheetDataSource {
  id?: string;
  name: string;
  title?: string;
  rows: Record<string, any>[];
  columns: { id: string; name: string; type?: string; [key: string]: any }[];
}

export interface FormulaContext {
  rowIndex: number;
  colIndex: number;
  rows: Record<string, any>[];
  columns: { id: string; name: string; type?: string; [key: string]: any }[];
  visited?: Set<string>; // For circular reference detection: e.g. "R0C2"
  sheets?: Record<string, SheetDataSource>; // Dictionary of all sheets and registers
}

export interface SheetFunctionDoc {
  name: string;
  syntax: string;
  category: 'Math' | 'Statistical' | 'Logical' | 'Text' | 'Date & Time' | 'Lookup' | 'Engineering' | 'Financial';
  description: string;
  example: string;
}

// Convert column index (0-indexed) to letter(s): 0 -> A, 1 -> B, 25 -> Z, 26 -> AA
export function colIndexToLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Convert column letter(s) to 0-indexed index: A -> 0, B -> 1, Z -> 25, AA -> 26
export function letterToColIndex(letter: string): number {
  const upper = letter.toUpperCase();
  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

// Parse Cell reference string like "A1", "$B$5", "C12"
// Row in A1 notation is 1-indexed (A1 -> col 0, row 0)
export function parseCellReference(ref: string): { col: number; row: number } | null {
  const match = ref.trim().match(/^\$?([A-Za-z]+)\$?([0-9]+)$/);
  if (!match) return null;
  const colLetter = match[1].toUpperCase();
  const rowNum = parseInt(match[2], 10);
  if (isNaN(rowNum) || rowNum < 1) return null;
  return {
    col: letterToColIndex(colLetter),
    row: rowNum - 1, // 0-indexed
  };
}

// Parse Range reference like "A1:B10" or "A:A" or "1:1"
export function parseRangeReference(rangeStr: string): { startCol: number; startRow: number; endCol: number; endRow: number } | null {
  const parts = rangeStr.split(':').map(s => s.trim());
  if (parts.length !== 2) return null;

  const startCell = parseCellReference(parts[0]);
  const endCell = parseCellReference(parts[1]);

  if (startCell && endCell) {
    return {
      startCol: Math.min(startCell.col, endCell.col),
      startRow: Math.min(startCell.row, endCell.row),
      endCol: Math.max(startCell.col, endCell.col),
      endRow: Math.max(startCell.row, endCell.row),
    };
  }

  // Check column-only range: e.g. "A:B" or "C:C"
  const colMatch1 = parts[0].match(/^\$?([A-Za-z]+)$/);
  const colMatch2 = parts[1].match(/^\$?([A-Za-z]+)$/);
  if (colMatch1 && colMatch2) {
    const c1 = letterToColIndex(colMatch1[1]);
    const c2 = letterToColIndex(colMatch2[1]);
    return {
      startCol: Math.min(c1, c2),
      startRow: 0,
      endCol: Math.max(c1, c2),
      endRow: 99999,
    };
  }

  return null;
}

// Convert any value to a number safely
export function toNumeric(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (val instanceof Date) return val.getTime();
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Check if value is truthy according to Google Sheets logic
export function toBoolean(val: any): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toUpperCase();
    if (s === 'TRUE') return true;
    if (s === 'FALSE') return false;
    return s.length > 0 && s !== '0';
  }
  return Boolean(val);
}

// Format error values
export const SHEET_ERRORS = {
  DIV_ZERO: '#DIV/0!',
  NAME: '#NAME?',
  VALUE: '#VALUE!',
  REF: '#REF!',
  NUM: '#NUM!',
  N_A: '#N/A',
  ERROR: '#ERROR!',
  CIRCULAR: '#CIRCULAR!',
};

// Flatten arguments: if an argument is an array or 2D array, unnest it into a flat array of values
export function flattenArgs(args: any[]): any[] {
  const flat: any[] = [];
  for (const item of args) {
    if (Array.isArray(item)) {
      flat.push(...flattenArgs(item));
    } else {
      flat.push(item);
    }
  }
  return flat;
}

// Extract only numeric items from flat array
export function filterNumbers(args: any[]): number[] {
  return flattenArgs(args)
    .map(v => toNumeric(v))
    .filter(n => !isNaN(n) && isFinite(n));
}

// Helper: normal standard distribution CDF
function normDist(x: number, mean = 0, sd = 1, cumulative = true): number {
  if (sd <= 0) return NaN;
  if (!cumulative) {
    return (1 / (sd * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / sd, 2));
  }
  // Error function approximation
  const z = (x - mean) / sd;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

// ============================================================================
// Google Sheets Function Implementations Dictionary
// ============================================================================
export const SHEET_FUNCTIONS: Record<string, (args: any[], ctx?: FormulaContext) => any> = {
  // ---------------------------------------------------------
  // Math & Arithmetic
  // ---------------------------------------------------------
  SUM: (args) => {
    const nums = filterNumbers(args);
    return nums.reduce((a, b) => a + b, 0);
  },

  SUMIF: (args, ctx) => {
    // SUMIF(range, criterion, [sum_range])
    const range = Array.isArray(args[0]) ? flattenArgs([args[0]]) : [args[0]];
    const criterion = args[1];
    const sumRange = args[2] !== undefined ? (Array.isArray(args[2]) ? flattenArgs([args[2]]) : [args[2]]) : range;
    let sum = 0;
    for (let i = 0; i < range.length; i++) {
      if (matchesCriterion(range[i], criterion)) {
        sum += toNumeric(sumRange[i] ?? 0);
      }
    }
    return sum;
  },

  SUMIFS: (args) => {
    // SUMIFS(sum_range, criteria_range1, criterion1, [criteria_range2, criterion2, ...])
    const sumRange = flattenArgs([args[0]]);
    const criteriaPairs: { range: any[]; criterion: any }[] = [];
    for (let i = 1; i < args.length; i += 2) {
      if (i + 1 < args.length) {
        criteriaPairs.push({
          range: flattenArgs([args[i]]),
          criterion: args[i + 1],
        });
      }
    }
    let sum = 0;
    for (let i = 0; i < sumRange.length; i++) {
      const allMatch = criteriaPairs.every(p => matchesCriterion(p.range[i], p.criterion));
      if (allMatch) {
        sum += toNumeric(sumRange[i] ?? 0);
      }
    }
    return sum;
  },

  PRODUCT: (args) => {
    const nums = filterNumbers(args);
    if (nums.length === 0) return 0;
    return nums.reduce((a, b) => a * b, 1);
  },

  QUOTIENT: (args) => {
    const num = toNumeric(args[0]);
    const den = toNumeric(args[1]);
    if (den === 0) return SHEET_ERRORS.DIV_ZERO;
    return Math.trunc(num / den);
  },

  MOD: (args) => {
    const num = toNumeric(args[0]);
    const div = toNumeric(args[1]);
    if (div === 0) return SHEET_ERRORS.DIV_ZERO;
    return ((num % div) + div) % div;
  },

  ABS: (args) => Math.abs(toNumeric(args[0])),
  SIGN: (args) => Math.sign(toNumeric(args[0])),
  SQRT: (args) => {
    const n = toNumeric(args[0]);
    if (n < 0) return SHEET_ERRORS.NUM;
    return Math.sqrt(n);
  },
  SQRTPI: (args) => {
    const n = toNumeric(args[0]);
    if (n < 0) return SHEET_ERRORS.NUM;
    return Math.sqrt(n * Math.PI);
  },
  POWER: (args) => Math.pow(toNumeric(args[0]), toNumeric(args[1])),

  ROUND: (args) => {
    const num = toNumeric(args[0]);
    const digits = args[1] !== undefined ? Math.trunc(toNumeric(args[1])) : 0;
    const factor = Math.pow(10, digits);
    return Math.round(num * factor) / factor;
  },
  ROUNDUP: (args) => {
    const num = toNumeric(args[0]);
    const digits = args[1] !== undefined ? Math.trunc(toNumeric(args[1])) : 0;
    const factor = Math.pow(10, digits);
    return Math.ceil(num * factor) / factor;
  },
  ROUNDDOWN: (args) => {
    const num = toNumeric(args[0]);
    const digits = args[1] !== undefined ? Math.trunc(toNumeric(args[1])) : 0;
    const factor = Math.pow(10, digits);
    return Math.floor(num * factor) / factor;
  },
  INT: (args) => Math.floor(toNumeric(args[0])),
  TRUNC: (args) => {
    const num = toNumeric(args[0]);
    const digits = args[1] !== undefined ? Math.trunc(toNumeric(args[1])) : 0;
    const factor = Math.pow(10, digits);
    return Math.trunc(num * factor) / factor;
  },
  CEILING: (args) => {
    const num = toNumeric(args[0]);
    const factor = args[1] !== undefined ? toNumeric(args[1]) : 1;
    if (factor === 0) return 0;
    return Math.ceil(num / factor) * factor;
  },
  FLOOR: (args) => {
    const num = toNumeric(args[0]);
    const factor = args[1] !== undefined ? toNumeric(args[1]) : 1;
    if (factor === 0) return 0;
    return Math.floor(num / factor) * factor;
  },
  MROUND: (args) => {
    const num = toNumeric(args[0]);
    const factor = toNumeric(args[1]);
    if (factor === 0) return 0;
    if (num * factor < 0) return SHEET_ERRORS.NUM;
    return Math.round(num / factor) * factor;
  },

  EXP: (args) => Math.exp(toNumeric(args[0])),
  LN: (args) => {
    const n = toNumeric(args[0]);
    return n <= 0 ? SHEET_ERRORS.NUM : Math.log(n);
  },
  LOG: (args) => {
    const n = toNumeric(args[0]);
    const base = args[1] !== undefined ? toNumeric(args[1]) : 10;
    if (n <= 0 || base <= 0 || base === 1) return SHEET_ERRORS.NUM;
    return Math.log(n) / Math.log(base);
  },
  LOG10: (args) => {
    const n = toNumeric(args[0]);
    return n <= 0 ? SHEET_ERRORS.NUM : Math.log10(n);
  },
  PI: () => Math.PI,

  // Trigonometry
  SIN: (args) => Math.sin(toNumeric(args[0])),
  COS: (args) => Math.cos(toNumeric(args[0])),
  TAN: (args) => Math.tan(toNumeric(args[0])),
  ASIN: (args) => Math.asin(toNumeric(args[0])),
  ACOS: (args) => Math.acos(toNumeric(args[0])),
  ATAN: (args) => Math.atan(toNumeric(args[0])),
  ATAN2: (args) => Math.atan2(toNumeric(args[1]), toNumeric(args[0])),
  DEGREES: (args) => (toNumeric(args[0]) * 180) / Math.PI,
  RADIANS: (args) => (toNumeric(args[0]) * Math.PI) / 180,

  // Combinatorics
  FACT: (args) => {
    const n = Math.floor(toNumeric(args[0]));
    if (n < 0) return SHEET_ERRORS.NUM;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  },
  COMBIN: (args) => {
    const n = Math.floor(toNumeric(args[0]));
    const k = Math.floor(toNumeric(args[1]));
    if (n < 0 || k < 0 || k > n) return SHEET_ERRORS.NUM;
    let res = 1;
    for (let i = 1; i <= k; i++) {
      res = (res * (n - i + 1)) / i;
    }
    return res;
  },
  RAND: () => Math.random(),
  RANDBETWEEN: (args) => {
    const min = Math.ceil(toNumeric(args[0]));
    const max = Math.floor(toNumeric(args[1]));
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // ---------------------------------------------------------
  // Statistical Functions
  // ---------------------------------------------------------
  AVERAGE: (args) => {
    const nums = filterNumbers(args);
    if (nums.length === 0) return SHEET_ERRORS.DIV_ZERO;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  },

  AVERAGEA: (args) => {
    const flat = flattenArgs(args);
    if (flat.length === 0) return SHEET_ERRORS.DIV_ZERO;
    const nums = flat.map(v => (typeof v === 'string' ? 0 : toNumeric(v)));
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  },

  AVERAGEIF: (args) => {
    const range = flattenArgs([args[0]]);
    const criterion = args[1];
    const avgRange = args[2] !== undefined ? flattenArgs([args[2]]) : range;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < range.length; i++) {
      if (matchesCriterion(range[i], criterion)) {
        sum += toNumeric(avgRange[i] ?? 0);
        count++;
      }
    }
    return count === 0 ? SHEET_ERRORS.DIV_ZERO : sum / count;
  },

  COUNT: (args) => {
    const flat = flattenArgs(args);
    return flat.filter(v => typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')).length;
  },

  COUNTA: (args) => {
    const flat = flattenArgs(args);
    return flat.filter(v => v !== null && v !== undefined && String(v).trim() !== '').length;
  },

  COUNTBLANK: (args) => {
    const flat = flattenArgs(args);
    return flat.filter(v => v === null || v === undefined || String(v).trim() === '').length;
  },

  COUNTIF: (args) => {
    const range = flattenArgs([args[0]]);
    const criterion = args[1];
    return range.filter(item => matchesCriterion(item, criterion)).length;
  },

  COUNTIFS: (args) => {
    const criteriaPairs: { range: any[]; criterion: any }[] = [];
    for (let i = 0; i < args.length; i += 2) {
      if (i + 1 < args.length) {
        criteriaPairs.push({
          range: flattenArgs([args[i]]),
          criterion: args[i + 1],
        });
      }
    }
    if (criteriaPairs.length === 0) return 0;
    const len = criteriaPairs[0].range.length;
    let count = 0;
    for (let i = 0; i < len; i++) {
      const match = criteriaPairs.every(p => matchesCriterion(p.range[i], p.criterion));
      if (match) count++;
    }
    return count;
  },

  COUNTUNIQUE: (args) => {
    const flat = flattenArgs(args).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
    return new Set(flat.map(v => String(v))).size;
  },

  MAX: (args) => {
    const nums = filterNumbers(args);
    return nums.length === 0 ? 0 : Math.max(...nums);
  },

  MAXIFS: (args) => {
    const maxRange = flattenArgs([args[0]]);
    let max = -Infinity;
    let found = false;
    for (let i = 0; i < maxRange.length; i++) {
      let matches = true;
      for (let j = 1; j < args.length; j += 2) {
        const r = flattenArgs([args[j]]);
        const c = args[j + 1];
        if (!matchesCriterion(r[i], c)) {
          matches = false;
          break;
        }
      }
      if (matches) {
        const val = toNumeric(maxRange[i]);
        if (val > max) {
          max = val;
          found = true;
        }
      }
    }
    return found ? max : 0;
  },

  MIN: (args) => {
    const nums = filterNumbers(args);
    return nums.length === 0 ? 0 : Math.min(...nums);
  },

  MINIFS: (args) => {
    const minRange = flattenArgs([args[0]]);
    let min = Infinity;
    let found = false;
    for (let i = 0; i < minRange.length; i++) {
      let matches = true;
      for (let j = 1; j < args.length; j += 2) {
        const r = flattenArgs([args[j]]);
        const c = args[j + 1];
        if (!matchesCriterion(r[i], c)) {
          matches = false;
          break;
        }
      }
      if (matches) {
        const val = toNumeric(minRange[i]);
        if (val < min) {
          min = val;
          found = true;
        }
      }
    }
    return found ? min : 0;
  },

  MEDIAN: (args) => {
    const nums = filterNumbers(args).sort((a, b) => a - b);
    if (nums.length === 0) return SHEET_ERRORS.NUM;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  },

  MODE: (args) => {
    const nums = filterNumbers(args);
    if (nums.length === 0) return SHEET_ERRORS.N_A;
    const freq: Record<number, number> = {};
    let maxFreq = 0;
    let modeVal = nums[0];
    for (const n of nums) {
      freq[n] = (freq[n] || 0) + 1;
      if (freq[n] > maxFreq) {
        maxFreq = freq[n];
        modeVal = n;
      }
    }
    return maxFreq > 1 ? modeVal : SHEET_ERRORS.N_A;
  },

  STDEV: (args) => {
    const nums = filterNumbers(args);
    if (nums.length < 2) return SHEET_ERRORS.DIV_ZERO;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (nums.length - 1);
    return Math.sqrt(variance);
  },

  'STDEV.S': (args) => SHEET_FUNCTIONS['STDEV'](args),

  'STDEV.P': (args) => {
    const nums = filterNumbers(args);
    if (nums.length === 0) return SHEET_ERRORS.DIV_ZERO;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
    return Math.sqrt(variance);
  },

  STDEVP: (args) => SHEET_FUNCTIONS['STDEV.P'](args),

  VAR: (args) => {
    const nums = filterNumbers(args);
    if (nums.length < 2) return SHEET_ERRORS.DIV_ZERO;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (nums.length - 1);
  },

  VARP: (args) => {
    const nums = filterNumbers(args);
    if (nums.length === 0) return SHEET_ERRORS.DIV_ZERO;
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / nums.length;
  },

  PERCENTILE: (args) => {
    const nums = filterNumbers([args[0]]).sort((a, b) => a - b);
    const p = toNumeric(args[1]);
    if (nums.length === 0 || p < 0 || p > 1) return SHEET_ERRORS.NUM;
    const index = p * (nums.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return nums[lower] * (1 - weight) + nums[upper] * weight;
  },

  QUARTILE: (args) => {
    const q = Math.trunc(toNumeric(args[1]));
    if (q < 0 || q > 4) return SHEET_ERRORS.NUM;
    return SHEET_FUNCTIONS['PERCENTILE']([args[0], q * 0.25]);
  },

  LARGE: (args) => {
    const nums = filterNumbers([args[0]]).sort((a, b) => b - a);
    const k = Math.trunc(toNumeric(args[1]));
    if (k < 1 || k > nums.length) return SHEET_ERRORS.NUM;
    return nums[k - 1];
  },

  SMALL: (args) => {
    const nums = filterNumbers([args[0]]).sort((a, b) => a - b);
    const k = Math.trunc(toNumeric(args[1]));
    if (k < 1 || k > nums.length) return SHEET_ERRORS.NUM;
    return nums[k - 1];
  },

  RANK: (args) => {
    const val = toNumeric(args[0]);
    const nums = filterNumbers([args[1]]);
    const isAscending = args[2] !== undefined && toBoolean(args[2]);
    const sorted = [...nums].sort((a, b) => (isAscending ? a - b : b - a));
    const idx = sorted.indexOf(val);
    return idx === -1 ? SHEET_ERRORS.N_A : idx + 1;
  },

  NORMDIST: (args) => {
    const x = toNumeric(args[0]);
    const mean = toNumeric(args[1]);
    const sd = toNumeric(args[2]);
    const cumulative = args[3] !== undefined ? toBoolean(args[3]) : true;
    const res = normDist(x, mean, sd, cumulative);
    return isNaN(res) ? SHEET_ERRORS.NUM : res;
  },

  // ---------------------------------------------------------
  // Logical Functions
  // ---------------------------------------------------------
  IF: (args) => {
    const condition = toBoolean(args[0]);
    if (condition) {
      return args[1] !== undefined ? args[1] : true;
    } else {
      return args[2] !== undefined ? args[2] : false;
    }
  },

  IFS: (args) => {
    for (let i = 0; i < args.length; i += 2) {
      if (toBoolean(args[i])) {
        return args[i + 1] !== undefined ? args[i + 1] : true;
      }
    }
    return SHEET_ERRORS.N_A;
  },

  SWITCH: (args) => {
    if (args.length < 2) return SHEET_ERRORS.VALUE;
    const expression = args[0];
    for (let i = 1; i < args.length - 1; i += 2) {
      if (args[i] == expression) {
        return args[i + 1];
      }
    }
    // Default value if odd number of remaining arguments
    if ((args.length - 1) % 2 === 1) {
      return args[args.length - 1];
    }
    return SHEET_ERRORS.N_A;
  },

  AND: (args) => {
    const flat = flattenArgs(args);
    if (flat.length === 0) return true;
    return flat.every(v => toBoolean(v));
  },

  OR: (args) => {
    const flat = flattenArgs(args);
    if (flat.length === 0) return false;
    return flat.some(v => toBoolean(v));
  },

  NOT: (args) => !toBoolean(args[0]),

  XOR: (args) => {
    const flat = flattenArgs(args);
    const trues = flat.filter(v => toBoolean(v)).length;
    return trues % 2 !== 0;
  },

  IFERROR: (args) => {
    const val = args[0];
    const isErr = isSheetError(val);
    return isErr ? (args[1] !== undefined ? args[1] : '') : val;
  },

  IFNA: (args) => {
    const val = args[0];
    return val === SHEET_ERRORS.N_A ? (args[1] !== undefined ? args[1] : '') : val;
  },

  TRUE: () => true,
  FALSE: () => false,

  // ---------------------------------------------------------
  // Text & String Functions
  // ---------------------------------------------------------
  CONCATENATE: (args) => {
    const flat = flattenArgs(args);
    return flat.map(v => (v === null || v === undefined ? '' : String(v))).join('');
  },

  CONCAT: (args) => {
    return String(args[0] ?? '') + String(args[1] ?? '');
  },

  TEXTJOIN: (args) => {
    const delimiter = String(args[0] ?? '');
    const ignoreEmpty = toBoolean(args[1]);
    const items = flattenArgs(args.slice(2));
    const filtered = ignoreEmpty
      ? items.filter(v => v !== null && v !== undefined && String(v).trim() !== '')
      : items;
    return filtered.map(v => String(v ?? '')).join(delimiter);
  },

  LEFT: (args) => {
    const str = String(args[0] ?? '');
    const num = args[1] !== undefined ? Math.max(0, Math.trunc(toNumeric(args[1]))) : 1;
    return str.substring(0, num);
  },

  RIGHT: (args) => {
    const str = String(args[0] ?? '');
    const num = args[1] !== undefined ? Math.max(0, Math.trunc(toNumeric(args[1]))) : 1;
    return str.slice(-num);
  },

  MID: (args) => {
    const str = String(args[0] ?? '');
    const start = Math.max(1, Math.trunc(toNumeric(args[1])));
    const length = Math.max(0, Math.trunc(toNumeric(args[2])));
    return str.substr(start - 1, length);
  },

  LEN: (args) => String(args[0] ?? '').length,

  LOWER: (args) => String(args[0] ?? '').toLowerCase(),
  UPPER: (args) => String(args[0] ?? '').toUpperCase(),
  PROPER: (args) => {
    const str = String(args[0] ?? '');
    return str.replace(/\b\w/g, char => char.toUpperCase());
  },

  TRIM: (args) => String(args[0] ?? '').replace(/\s+/g, ' ').trim(),

  CLEAN: (args) => String(args[0] ?? '').replace(/[\x00-\x1F\x7F]/g, ''),

  REPT: (args) => {
    const str = String(args[0] ?? '');
    const count = Math.max(0, Math.trunc(toNumeric(args[1])));
    return str.repeat(count);
  },

  REPLACE: (args) => {
    const text = String(args[0] ?? '');
    const pos = Math.max(1, Math.trunc(toNumeric(args[1])));
    const len = Math.max(0, Math.trunc(toNumeric(args[2])));
    const newText = String(args[3] ?? '');
    return text.substring(0, pos - 1) + newText + text.substring(pos - 1 + len);
  },

  SUBSTITUTE: (args) => {
    const text = String(args[0] ?? '');
    const searchFor = String(args[1] ?? '');
    const replaceWith = String(args[2] ?? '');
    const occurrence = args[3] !== undefined ? Math.trunc(toNumeric(args[3])) : null;

    if (!searchFor) return text;
    if (occurrence === null) {
      return text.split(searchFor).join(replaceWith);
    }
    let count = 0;
    return text.replace(new RegExp(searchFor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (match) => {
      count++;
      return count === occurrence ? replaceWith : match;
    });
  },

  FIND: (args) => {
    const findText = String(args[0] ?? '');
    const withinText = String(args[1] ?? '');
    const startPos = args[2] !== undefined ? Math.max(1, Math.trunc(toNumeric(args[2]))) : 1;
    const idx = withinText.indexOf(findText, startPos - 1);
    return idx === -1 ? SHEET_ERRORS.VALUE : idx + 1;
  },

  SEARCH: (args) => {
    const findText = String(args[0] ?? '').toLowerCase();
    const withinText = String(args[1] ?? '').toLowerCase();
    const startPos = args[2] !== undefined ? Math.max(1, Math.trunc(toNumeric(args[2]))) : 1;
    const idx = withinText.indexOf(findText, startPos - 1);
    return idx === -1 ? SHEET_ERRORS.VALUE : idx + 1;
  },

  EXACT: (args) => String(args[0] ?? '') === String(args[1] ?? ''),

  TEXT: (args) => {
    const val = toNumeric(args[0]);
    const format = String(args[1] ?? '');
    if (format.includes('%')) {
      return `${(val * 100).toFixed(1)}%`;
    }
    if (format.includes('$') || format.includes('₹')) {
      const sym = format.includes('₹') ? '₹' : '$';
      return `${sym}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (format.includes('.')) {
      const dec = format.split('.')[1].length;
      return val.toFixed(dec);
    }
    return String(val);
  },

  VALUE: (args) => {
    const parsed = toNumeric(args[0]);
    return isNaN(parsed) ? SHEET_ERRORS.VALUE : parsed;
  },

  SPLIT: (args) => {
    const str = String(args[0] ?? '');
    const delimiter = String(args[1] ?? ' ');
    return str.split(delimiter);
  },

  JOIN: (args) => {
    const delimiter = String(args[0] ?? '');
    const items = flattenArgs(args.slice(1));
    return items.join(delimiter);
  },

  // ---------------------------------------------------------
  // Date & Time Functions
  // ---------------------------------------------------------
  TODAY: () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  },

  NOW: () => {
    return new Date().toLocaleString();
  },

  DATE: (args) => {
    const y = Math.trunc(toNumeric(args[0]));
    const m = Math.trunc(toNumeric(args[1])) - 1;
    const d = Math.trunc(toNumeric(args[2]));
    const date = new Date(y, m, d);
    return date.toISOString().split('T')[0];
  },

  YEAR: (args) => {
    const d = new Date(args[0]);
    return isNaN(d.getTime()) ? SHEET_ERRORS.VALUE : d.getFullYear();
  },

  MONTH: (args) => {
    const d = new Date(args[0]);
    return isNaN(d.getTime()) ? SHEET_ERRORS.VALUE : d.getMonth() + 1;
  },

  DAY: (args) => {
    const d = new Date(args[0]);
    return isNaN(d.getTime()) ? SHEET_ERRORS.VALUE : d.getDate();
  },

  HOUR: (args) => {
    const d = new Date(args[0]);
    return isNaN(d.getTime()) ? SHEET_ERRORS.VALUE : d.getHours();
  },

  MINUTE: (args) => {
    const d = new Date(args[0]);
    return isNaN(d.getTime()) ? SHEET_ERRORS.VALUE : d.getMinutes();
  },

  SECOND: (args) => {
    const d = new Date(args[0]);
    return isNaN(d.getTime()) ? SHEET_ERRORS.VALUE : d.getSeconds();
  },

  WEEKDAY: (args) => {
    const d = new Date(args[0]);
    if (isNaN(d.getTime())) return SHEET_ERRORS.VALUE;
    // Type 1: Sunday = 1, Saturday = 7 (default)
    return d.getDay() + 1;
  },

  DAYS: (args) => {
    const d1 = new Date(args[0]);
    const d2 = new Date(args[1]);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return SHEET_ERRORS.VALUE;
    const diffMs = d1.getTime() - d2.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  },

  DATEDIF: (args) => {
    const d1 = new Date(args[0]);
    const d2 = new Date(args[1]);
    const unit = String(args[2] ?? 'D').toUpperCase();
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return SHEET_ERRORS.VALUE;
    if (d1 > d2) return SHEET_ERRORS.NUM;

    const diffYears = d2.getFullYear() - d1.getFullYear();
    const diffMonths = diffYears * 12 + (d2.getMonth() - d1.getMonth());
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

    if (unit === 'Y') return diffYears;
    if (unit === 'M') return diffMonths;
    if (unit === 'D') return diffDays;
    return diffDays;
  },

  EDATE: (args) => {
    const d = new Date(args[0]);
    const months = Math.trunc(toNumeric(args[1]));
    if (isNaN(d.getTime())) return SHEET_ERRORS.VALUE;
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  },

  EOMONTH: (args) => {
    const d = new Date(args[0]);
    const months = Math.trunc(toNumeric(args[1]));
    if (isNaN(d.getTime())) return SHEET_ERRORS.VALUE;
    const result = new Date(d.getFullYear(), d.getMonth() + months + 1, 0);
    return result.toISOString().split('T')[0];
  },

  // ---------------------------------------------------------
  // Lookup & Reference Functions
  // ---------------------------------------------------------
  VLOOKUP: (args, ctx) => {
    // VLOOKUP(search_key, range, index, [is_sorted])
    const searchKey = args[0];
    const range = args[1]; // Expected to be 2D array or range reference
    const index = Math.trunc(toNumeric(args[2]));
    const isSorted = args[3] !== undefined ? toBoolean(args[3]) : false;

    if (!Array.isArray(range) || index < 1) return SHEET_ERRORS.REF;

    // range can be matrix of rows: Array<Array<any>>
    for (let r = 0; r < range.length; r++) {
      const rowItem = range[r];
      const lookupVal = Array.isArray(rowItem) ? rowItem[0] : rowItem;
      if (matchesEqual(lookupVal, searchKey)) {
        if (Array.isArray(rowItem)) {
          if (index > rowItem.length) return SHEET_ERRORS.REF;
          return rowItem[index - 1];
        }
        return lookupVal;
      }
    }
    return SHEET_ERRORS.N_A;
  },

  HLOOKUP: (args) => {
    // HLOOKUP(search_key, range, index, [is_sorted])
    const searchKey = args[0];
    const matrix = args[1];
    const index = Math.trunc(toNumeric(args[2]));
    if (!Array.isArray(matrix) || matrix.length < index || index < 1) return SHEET_ERRORS.REF;

    const firstRow = Array.isArray(matrix[0]) ? matrix[0] : [matrix[0]];
    for (let c = 0; c < firstRow.length; c++) {
      if (matchesEqual(firstRow[c], searchKey)) {
        const targetRow = matrix[index - 1];
        return Array.isArray(targetRow) ? targetRow[c] : targetRow;
      }
    }
    return SHEET_ERRORS.N_A;
  },

  INDEX: (args) => {
    // INDEX(reference, [row], [column])
    const ref = args[0];
    const row = args[1] !== undefined ? Math.trunc(toNumeric(args[1])) : 1;
    const col = args[2] !== undefined ? Math.trunc(toNumeric(args[2])) : 1;

    if (!Array.isArray(ref)) return ref;

    // If 1D array
    if (!Array.isArray(ref[0])) {
      const targetIdx = row > 0 ? row - 1 : col - 1;
      return ref[targetIdx] !== undefined ? ref[targetIdx] : SHEET_ERRORS.REF;
    }

    // 2D array
    const targetRow = ref[row - 1];
    if (!targetRow) return SHEET_ERRORS.REF;
    if (Array.isArray(targetRow)) {
      return targetRow[col - 1] !== undefined ? targetRow[col - 1] : SHEET_ERRORS.REF;
    }
    return targetRow;
  },

  MATCH: (args) => {
    // MATCH(search_key, range, [search_type])
    const searchKey = args[0];
    const range = flattenArgs([args[1]]);
    const searchType = args[2] !== undefined ? Math.trunc(toNumeric(args[2])) : 0; // 0 exact match

    for (let i = 0; i < range.length; i++) {
      if (searchType === 0) {
        if (matchesCriterion(range[i], searchKey)) {
          return i + 1; // 1-indexed
        }
      } else if (searchType === 1) {
        if (toNumeric(range[i]) <= toNumeric(searchKey)) {
          // Approximate match
          return i + 1;
        }
      }
    }
    return SHEET_ERRORS.N_A;
  },

  LOOKUP: (args) => {
    // LOOKUP(lookup_value, lookup_vector_or_array, [result_vector])
    const searchKey = args[0];
    const lookupArg = args[1];

    if (Array.isArray(lookupArg) && Array.isArray(lookupArg[0]) && args[2] === undefined) {
      const matrix = lookupArg as any[][];
      for (let r = matrix.length - 1; r >= 0; r--) {
        if (matchesEqual(matrix[r][0], searchKey) || toNumeric(matrix[r][0]) <= toNumeric(searchKey)) {
          const row = matrix[r];
          return row[row.length - 1];
        }
      }
      return SHEET_ERRORS.N_A;
    }

    const lookupVector = flattenArgs([args[1]]);
    const resultVector = args[2] !== undefined ? flattenArgs([args[2]]) : lookupVector;

    let matchedIdx = -1;
    for (let i = 0; i < lookupVector.length; i++) {
      if (matchesEqual(lookupVector[i], searchKey)) {
        matchedIdx = i;
        break;
      }
      if (toNumeric(lookupVector[i]) <= toNumeric(searchKey) && String(lookupVector[i] ?? '').trim() !== '') {
        matchedIdx = i;
      }
    }
    if (matchedIdx >= 0 && matchedIdx < resultVector.length) {
      return resultVector[matchedIdx];
    }
    return SHEET_ERRORS.N_A;
  },

  XLOOKUP: (args) => {
    // XLOOKUP(search_key, lookup_range, result_range, [missing_value], [match_mode], [search_mode])
    const searchKey = args[0];
    const lookupRange = flattenArgs([args[1]]);
    const resultRange = flattenArgs([args[2]]);
    const missingValue = args[3] !== undefined ? args[3] : SHEET_ERRORS.N_A;
    const matchMode = args[4] !== undefined ? Math.trunc(toNumeric(args[4])) : 0;
    const searchMode = args[5] !== undefined ? Math.trunc(toNumeric(args[5])) : 1; // 1 first to last, -1 last to first

    if (!lookupRange.length || !resultRange.length) return missingValue;

    const indices = searchMode === -1 
      ? Array.from({ length: lookupRange.length }, (_, k) => lookupRange.length - 1 - k)
      : Array.from({ length: lookupRange.length }, (_, k) => k);

    let matchedIdx = -1;
    for (const i of indices) {
      const item = lookupRange[i];
      if (matchMode === 0) {
        if (matchesEqual(item, searchKey)) {
          matchedIdx = i;
          break;
        }
      } else if (matchMode === 2) {
        if (matchesCriterion(item, searchKey)) {
          matchedIdx = i;
          break;
        }
      } else if (matchMode === -1) {
        if (toNumeric(item) <= toNumeric(searchKey)) {
          matchedIdx = i;
        }
      } else if (matchMode === 1) {
        if (toNumeric(item) >= toNumeric(searchKey)) {
          matchedIdx = i;
          break;
        }
      }
    }

    if (matchedIdx !== -1 && matchedIdx < resultRange.length) {
      return resultRange[matchedIdx] !== undefined ? resultRange[matchedIdx] : '';
    }
    return missingValue;
  },

  TABLE_LOOKUP: (args, ctx) => {
    // TABLE_LOOKUP(tableNameOrRegister, lookupColNameOrLetter, lookupValue, returnColNameOrLetter, [fallback])
    const tableName = String(args[0] || '').trim();
    const lookupCol = String(args[1] || '').trim();
    const lookupVal = args[2];
    const returnCol = String(args[3] || '').trim();
    const fallback = args[4] !== undefined ? args[4] : SHEET_ERRORS.N_A;

    const sheets = ctx?.sheets;
    if (!sheets) return fallback;

    const sheetKey = Object.keys(sheets).find(
      k => k.toLowerCase() === tableName.toLowerCase() ||
           sheets[k].name?.toLowerCase() === tableName.toLowerCase() ||
           sheets[k].title?.toLowerCase() === tableName.toLowerCase() ||
           sheets[k].id?.toLowerCase() === tableName.toLowerCase()
    );
    if (!sheetKey || !sheets[sheetKey]) return fallback;

    const sheet = sheets[sheetKey];
    
    // Resolve lookup column
    let lookupColId = '';
    const lColLetter = lookupCol.toUpperCase();
    if (/^[A-Z]+$/.test(lColLetter)) {
      const idx = letterToColIndex(lColLetter);
      lookupColId = sheet.columns[idx]?.id || '';
    }
    if (!lookupColId) {
      const found = sheet.columns.find(c => c.name.toLowerCase() === lookupCol.toLowerCase() || c.id.toLowerCase() === lookupCol.toLowerCase());
      lookupColId = found?.id || '';
    }

    // Resolve return column
    let returnColId = '';
    const rColLetter = returnCol.toUpperCase();
    if (/^[A-Z]+$/.test(rColLetter)) {
      const idx = letterToColIndex(rColLetter);
      returnColId = sheet.columns[idx]?.id || '';
    }
    if (!returnColId) {
      const found = sheet.columns.find(c => c.name.toLowerCase() === returnCol.toLowerCase() || c.id.toLowerCase() === returnCol.toLowerCase());
      returnColId = found?.id || '';
    }

    if (!lookupColId || !returnColId) return fallback;

    for (const row of sheet.rows) {
      const val = row[lookupColId];
      if (matchesEqual(val, lookupVal)) {
        return row[returnColId] !== undefined ? row[returnColId] : '';
      }
    }
    return fallback;
  },

  CHOOSE: (args) => {
    const index = Math.trunc(toNumeric(args[0]));
    if (index < 1 || index >= args.length) return SHEET_ERRORS.VALUE;
    return args[index];
  },

  COLUMN: (args, ctx) => {
    if (args.length === 0 && ctx) {
      return ctx.colIndex + 1;
    }
    if (args[0] && typeof args[0] === 'string') {
      const cell = parseCellReference(args[0]);
      if (cell) return cell.col + 1;
    }
    return 1;
  },

  ROW: (args, ctx) => {
    if (args.length === 0 && ctx) {
      return ctx.rowIndex + 1;
    }
    if (args[0] && typeof args[0] === 'string') {
      const cell = parseCellReference(args[0]);
      if (cell) return cell.row + 1;
    }
    return 1;
  },

  COLUMNS: (args) => {
    const ref = args[0];
    if (Array.isArray(ref) && Array.isArray(ref[0])) return ref[0].length;
    return 1;
  },

  ROWS: (args) => {
    const ref = args[0];
    if (Array.isArray(ref)) return ref.length;
    return 1;
  },

  // ---------------------------------------------------------
  // Financial Functions
  // ---------------------------------------------------------
  PMT: (args) => {
    // PMT(rate, number_of_periods, present_value, [future_value], [end_or_beginning])
    const rate = toNumeric(args[0]);
    const nper = toNumeric(args[1]);
    const pv = toNumeric(args[2]);
    const fv = args[3] !== undefined ? toNumeric(args[3]) : 0;
    const type = args[4] !== undefined ? toNumeric(args[4]) : 0;

    if (rate === 0) return -(pv + fv) / nper;
    const pvif = Math.pow(1 + rate, nper);
    let pmt = (rate / (pvif - 1)) * -(pv * pvif + fv);
    if (type === 1) pmt /= 1 + rate;
    return pmt;
  },

  FV: (args) => {
    // FV(rate, number_of_periods, payment_amount, [present_value], [end_or_beginning])
    const rate = toNumeric(args[0]);
    const nper = toNumeric(args[1]);
    const pmt = toNumeric(args[2]);
    const pv = args[3] !== undefined ? toNumeric(args[3]) : 0;
    const type = args[4] !== undefined ? toNumeric(args[4]) : 0;

    if (rate === 0) return -(pv + pmt * nper);
    const pvif = Math.pow(1 + rate, nper);
    let fv = -pv * pvif - (pmt * (1 + rate * type) * (pvif - 1)) / rate;
    return fv;
  },

  PV: (args) => {
    // PV(rate, number_of_periods, payment_amount, [future_value], [end_or_beginning])
    const rate = toNumeric(args[0]);
    const nper = toNumeric(args[1]);
    const pmt = toNumeric(args[2]);
    const fv = args[3] !== undefined ? toNumeric(args[3]) : 0;
    const type = args[4] !== undefined ? toNumeric(args[4]) : 0;

    if (rate === 0) return -fv - pmt * nper;
    const pvif = Math.pow(1 + rate, nper);
    return (-fv - (pmt * (1 + rate * type) * (pvif - 1)) / rate) / pvif;
  },

  NPV: (args) => {
    const rate = toNumeric(args[0]);
    const values = flattenArgs(args.slice(1)).map(toNumeric);
    let npv = 0;
    for (let i = 0; i < values.length; i++) {
      npv += values[i] / Math.pow(1 + rate, i + 1);
    }
    return npv;
  },

  // ---------------------------------------------------------
  // Information Functions
  // ---------------------------------------------------------
  ISBLANK: (args) => args[0] === null || args[0] === undefined || String(args[0]).trim() === '',
  ISNUMBER: (args) => typeof args[0] === 'number' || (!isNaN(Number(args[0])) && String(args[0]).trim() !== ''),
  ISTEXT: (args) => typeof args[0] === 'string' && isNaN(Number(args[0])),
  ISLOGICAL: (args) => typeof args[0] === 'boolean',
  ISERROR: (args) => isSheetError(args[0]),
  ISNA: (args) => args[0] === SHEET_ERRORS.N_A,
  TYPE: (args) => {
    const v = args[0];
    if (typeof v === 'number') return 1;
    if (typeof v === 'string') return 2;
    if (typeof v === 'boolean') return 4;
    if (isSheetError(v)) return 16;
    if (Array.isArray(v)) return 64;
    return 1;
  },
};

// Check if value is a sheet error
export function isSheetError(val: any): boolean {
  if (typeof val !== 'string') return false;
  return Object.values(SHEPHERD_ERRORS_MAP).includes(val) || val.startsWith('#') && val.endsWith('!');
}

const SHEPHERD_ERRORS_MAP = { ...SHEET_ERRORS };

// Match equality considering case insensitivity and numbers
function matchesEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a === null || a === undefined) a = '';
  if (b === null || b === undefined) b = '';
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

// Match criterion supporting >, <, >=, <=, <>, *, ?
function matchesCriterion(val: any, criterion: any): boolean {
  if (criterion === undefined || criterion === null) return val === criterion;
  const critStr = String(criterion).trim();
  const numVal = toNumeric(val);

  if (critStr.startsWith('>=')) {
    const target = toNumeric(critStr.slice(2));
    return numVal >= target;
  }
  if (critStr.startsWith('<=')) {
    const target = toNumeric(critStr.slice(2));
    return numVal <= target;
  }
  if (critStr.startsWith('<>')) {
    const target = critStr.slice(2).trim();
    return String(val).toLowerCase() !== target.toLowerCase();
  }
  if (critStr.startsWith('!=')) {
    const target = critStr.slice(2).trim();
    return String(val).toLowerCase() !== target.toLowerCase();
  }
  if (critStr.startsWith('>')) {
    const target = toNumeric(critStr.slice(1));
    return numVal > target;
  }
  if (critStr.startsWith('<')) {
    const target = toNumeric(critStr.slice(1));
    return numVal < target;
  }
  if (critStr.startsWith('=')) {
    return matchesEqual(val, critStr.slice(1));
  }

  // Wildcard match * or ?
  if (critStr.includes('*') || critStr.includes('?')) {
    const regexPattern = '^' + critStr.replace(/([.+^$[\]\\(){}|])/g, '\\$1').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
    return new RegExp(regexPattern, 'i').test(String(val ?? ''));
  }

  return matchesEqual(val, criterion);
}

// ============================================================================
// Google Sheets Formula Parser & Tokenizer
// ============================================================================

interface Token {
  type: 'NUMBER' | 'STRING' | 'BOOLEAN' | 'IDENTIFIER' | 'OPERATOR' | 'COMMA' | 'LPAREN' | 'RPAREN' | 'COLON' | 'RANGE' | 'EXCLAMATION';
  value: any;
}

export class FormulaEvaluator {
  private pos = 0;
  private tokens: Token[] = [];

  constructor(
    private formula: string,
    private context: FormulaContext
  ) {}

  public evaluate(): any {
    try {
      const cleanFormula = this.formula.trim().startsWith('=') ? this.formula.trim().slice(1) : this.formula.trim();
      if (!cleanFormula) return '';

      // Tokenize
      this.tokens = this.tokenize(cleanFormula);
      this.pos = 0;

      if (this.tokens.length === 0) return '';

      // Parse expression
      const result = this.parseExpression();
      return result;
    } catch (e: any) {
      if (e?.message?.includes('CIRCULAR')) return SHEET_ERRORS.CIRCULAR;
      return SHEET_ERRORS.ERROR;
    }
  }

  private tokenize(str: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < str.length) {
      const char = str[i];

      // Whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // String literal: "hello"
      if (char === '"' || char === "'") {
        const quote = char;
        let strVal = '';
        i++;
        while (i < str.length && str[i] !== quote) {
          if (str[i] === '\\' && i + 1 < str.length) {
            strVal += str[i + 1];
            i += 2;
          } else {
            strVal += str[i];
            i++;
          }
        }
        i++; // skip quote
        tokens.push({ type: 'STRING', value: strVal });
        continue;
      }

      // Column name enclosed in square brackets: [Price] or [col_id]
      if (char === '[') {
        let colRef = '';
        i++;
        while (i < str.length && str[i] !== ']') {
          colRef += str[i];
          i++;
        }
        i++; // skip ']'
        tokens.push({ type: 'IDENTIFIER', value: `[${colRef}]` });
        continue;
      }

      // Comma
      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',' });
        i++;
        continue;
      }

      // Colon (for ranges)
      if (char === ':') {
        tokens.push({ type: 'COLON', value: ':' });
        i++;
        continue;
      }

      // Exclamation (for sheet references: Sheet1!A1)
      if (char === '!') {
        tokens.push({ type: 'EXCLAMATION', value: '!' });
        i++;
        continue;
      }

      // Parentheses
      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        i++;
        continue;
      }
      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        i++;
        continue;
      }

      // Two-character operators: <=, >=, <>, !=, ==
      if (i + 1 < str.length) {
        const twoChar = str.substr(i, 2);
        if (['<=', '>=', '<>', '!=', '=='].includes(twoChar)) {
          tokens.push({ type: 'OPERATOR', value: twoChar });
          i += 2;
          continue;
        }
      }

      // Single-character operators: +, -, *, /, %, ^, &, =, <, >
      if (['+', '-', '*', '/', '%', '^', '&', '=', '<', '>'].includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char });
        i++;
        continue;
      }

      // Numbers
      if (/[0-9]/.test(char) || (char === '.' && i + 1 < str.length && /[0-9]/.test(str[i + 1]))) {
        let numStr = '';
        while (i < str.length && (/[0-9]/.test(str[i]) || str[i] === '.')) {
          numStr += str[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      // Identifiers: functions, cell refs (A1, B2:B10), TRUE, FALSE
      if (/[A-Za-z_$]/.test(char)) {
        let ident = '';
        while (i < str.length && /[A-Za-z0-9_$.]/.test(str[i])) {
          ident += str[i];
          i++;
        }

        const upper = ident.toUpperCase();
        if (upper === 'TRUE') {
          tokens.push({ type: 'BOOLEAN', value: true });
        } else if (upper === 'FALSE') {
          tokens.push({ type: 'BOOLEAN', value: false });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: ident });
        }
        continue;
      }

      // Fallback: advance
      i++;
    }

    return tokens;
  }

  // Precedence climbing parser
  private parseExpression(): any {
    return this.parseComparison();
  }

  // Comparison: =, ==, <>, !=, <, >, <=, >=
  private parseComparison(): any {
    let left = this.parseConcat();
    while (this.pos < this.tokens.length) {
      const tok = this.tokens[this.pos];
      if (tok.type === 'OPERATOR' && ['=', '==', '<>', '!=', '<', '>', '<=', '>='].includes(tok.value)) {
        this.pos++;
        const right = this.parseConcat();
        if (tok.value === '=' || tok.value === '==') {
          left = matchesEqual(left, right);
        } else if (tok.value === '<>' || tok.value === '!=') {
          left = !matchesEqual(left, right);
        } else if (tok.value === '<') {
          left = toNumeric(left) < toNumeric(right);
        } else if (tok.value === '>') {
          left = toNumeric(left) > toNumeric(right);
        } else if (tok.value === '<=') {
          left = toNumeric(left) <= toNumeric(right);
        } else if (tok.value === '>=') {
          left = toNumeric(left) >= toNumeric(right);
        }
      } else {
        break;
      }
    }
    return left;
  }

  // Concat: &
  private parseConcat(): any {
    let left = this.parseAddSub();
    while (this.pos < this.tokens.length) {
      const tok = this.tokens[this.pos];
      if (tok.type === 'OPERATOR' && tok.value === '&') {
        this.pos++;
        const right = this.parseAddSub();
        left = String(left ?? '') + String(right ?? '');
      } else {
        break;
      }
    }
    return left;
  }

  // Add / Sub
  private parseAddSub(): any {
    let left = this.parseMulDiv();
    while (this.pos < this.tokens.length) {
      const tok = this.tokens[this.pos];
      if (tok.type === 'OPERATOR' && (tok.value === '+' || tok.value === '-')) {
        this.pos++;
        const right = this.parseMulDiv();
        if (tok.value === '+') {
          left = toNumeric(left) + toNumeric(right);
        } else {
          left = toNumeric(left) - toNumeric(right);
        }
      } else {
        break;
      }
    }
    return left;
  }

  // Mul / Div / Mod
  private parseMulDiv(): any {
    let left = this.parsePower();
    while (this.pos < this.tokens.length) {
      const tok = this.tokens[this.pos];
      if (tok.type === 'OPERATOR' && (tok.value === '*' || tok.value === '/' || tok.value === '%')) {
        this.pos++;
        const right = this.parsePower();
        if (tok.value === '*') {
          left = toNumeric(left) * toNumeric(right);
        } else if (tok.value === '/') {
          const divisor = toNumeric(right);
          if (divisor === 0) return SHEET_ERRORS.DIV_ZERO;
          left = toNumeric(left) / divisor;
        } else if (tok.value === '%') {
          const divisor = toNumeric(right);
          if (divisor === 0) return SHEET_ERRORS.DIV_ZERO;
          left = toNumeric(left) % divisor;
        }
      } else {
        break;
      }
    }
    return left;
  }

  // Exponentiation: ^
  private parsePower(): any {
    let left = this.parseUnary();
    while (this.pos < this.tokens.length) {
      const tok = this.tokens[this.pos];
      if (tok.type === 'OPERATOR' && tok.value === '^') {
        this.pos++;
        const right = this.parseUnary();
        left = Math.pow(toNumeric(left), toNumeric(right));
      } else {
        break;
      }
    }
    return left;
  }

  // Unary: +, -
  private parseUnary(): any {
    if (this.pos < this.tokens.length) {
      const tok = this.tokens[this.pos];
      if (tok.type === 'OPERATOR' && (tok.value === '-' || tok.value === '+')) {
        this.pos++;
        const operand = this.parseUnary();
        return tok.value === '-' ? -toNumeric(operand) : toNumeric(operand);
      }
    }
    return this.parsePrimary();
  }

  // Primary: Number, String, Boolean, Function Call, Cell Reference, Range, Parentheses
  private parsePrimary(): any {
    if (this.pos >= this.tokens.length) return '';

    const tok = this.tokens[this.pos];

    // Sheet reference: Sheet1!A1 or 'My Sheet'!B2:B10 or 'Students Register'!Marks or 'Students Register'!A:A
    if ((tok.type === 'IDENTIFIER' || tok.type === 'STRING') && 
        this.pos + 1 < this.tokens.length && 
        this.tokens[this.pos + 1].type === 'EXCLAMATION') {
      const sheetName = tok.value;
      this.pos += 2; // skip sheetName and '!'
      
      if (this.pos < this.tokens.length && (this.tokens[this.pos].type === 'IDENTIFIER' || this.tokens[this.pos].type === 'STRING')) {
        const firstPart = this.tokens[this.pos].value;
        this.pos++;
        
        // Check if next is ':' -> range on that sheet (e.g. A1:B10 or A:A)
        if (this.pos < this.tokens.length && this.tokens[this.pos].type === 'COLON') {
          this.pos++; // skip ':'
          if (this.pos < this.tokens.length && (this.tokens[this.pos].type === 'IDENTIFIER' || this.tokens[this.pos].type === 'STRING')) {
            const secondPart = this.tokens[this.pos].value;
            this.pos++;
            return this.resolveSheetRef(sheetName, `${firstPart}:${secondPart}`);
          }
        }
        
        return this.resolveSheetRef(sheetName, firstPart);
      }
      return SHEET_ERRORS.REF;
    }

    // Numbers
    if (tok.type === 'NUMBER') {
      this.pos++;
      return tok.value;
    }

    // Strings
    if (tok.type === 'STRING') {
      this.pos++;
      return tok.value;
    }

    // Booleans
    if (tok.type === 'BOOLEAN') {
      this.pos++;
      return tok.value;
    }

    // Parentheses: (expr)
    if (tok.type === 'LPAREN') {
      this.pos++;
      const val = this.parseExpression();
      if (this.pos < this.tokens.length && this.tokens[this.pos].type === 'RPAREN') {
        this.pos++;
      }
      return val;
    }

    // Identifier: Function Call, Cell Reference, Range, or Column Header
    if (tok.type === 'IDENTIFIER') {
      const rawName = tok.value;
      this.pos++;

      // Check if next token is '(' -> Function Call
      if (this.pos < this.tokens.length && this.tokens[this.pos].type === 'LPAREN') {
        this.pos++; // skip '('
        const args: any[] = [];
        if (this.pos < this.tokens.length && this.tokens[this.pos].type !== 'RPAREN') {
          while (true) {
            args.push(this.parseExpression());
            if (this.pos < this.tokens.length && this.tokens[this.pos].type === 'COMMA') {
              this.pos++;
              continue;
            }
            break;
          }
        }
        if (this.pos < this.tokens.length && this.tokens[this.pos].type === 'RPAREN') {
          this.pos++;
        }

        const fnName = String(rawName).toUpperCase();
        const fn = SHEET_FUNCTIONS[fnName];
        if (!fn) {
          return SHEET_ERRORS.NAME;
        }
        return fn(args, this.context);
      }

      // Check if next token is ':' -> Range Reference like A1:B10
      if (this.pos < this.tokens.length && this.tokens[this.pos].type === 'COLON') {
        this.pos++; // skip ':'
        if (this.pos < this.tokens.length && this.tokens[this.pos].type === 'IDENTIFIER') {
          const secondIdent = this.tokens[this.pos].value;
          this.pos++;
          return this.resolveRangeValue(`${rawName}:${secondIdent}`);
        }
      }

      // Handle Bracketed Column Reference: [price] or [Price]
      if (rawName.startsWith('[') && rawName.endsWith(']')) {
        const colKey = rawName.slice(1, -1);
        return this.resolveColumnValue(colKey);
      }

      // Handle Cell Reference: A1, B2, etc.
      const cellRef = parseCellReference(rawName);
      if (cellRef) {
        return this.resolveCellReference(cellRef.row, cellRef.col);
      }

      // Check if rawName is a Column Name
      const colMatch = this.context.columns.find(
        c => c.name.toLowerCase() === rawName.toLowerCase() || c.id.toLowerCase() === rawName.toLowerCase()
      );
      if (colMatch) {
        const curRow = this.context.rows[this.context.rowIndex];
        if (curRow) {
          return curRow[colMatch.id];
        }
      }

      return SHEET_ERRORS.NAME;
    }

    return '';
  }

  // Resolve cross-sheet cell, range, or column reference
  private resolveSheetRef(sheetName: string, refStr: string): any {
    const sheets = this.context.sheets;
    if (!sheets) return SHEET_ERRORS.REF;

    const cleanSheet = String(sheetName).trim().replace(/^['"]|['"]$/g, '');
    const sheetKey = Object.keys(sheets).find(
      k => k.toLowerCase() === cleanSheet.toLowerCase() ||
           sheets[k].name?.toLowerCase() === cleanSheet.toLowerCase() ||
           sheets[k].title?.toLowerCase() === cleanSheet.toLowerCase() ||
           sheets[k].id?.toLowerCase() === cleanSheet.toLowerCase()
    );
    if (!sheetKey || !sheets[sheetKey]) return SHEET_ERRORS.REF;

    const targetSheet = sheets[sheetKey];
    const { rows, columns } = targetSheet;

    // Check if range like A1:B10 or A:A or 1:1
    if (refStr.includes(':')) {
      const parsed = parseRangeReference(refStr);
      if (parsed) {
        const { startCol, startRow, endCol, endRow } = parsed;
        const maxRow = Math.min(rows.length - 1, endRow);
        const maxCol = Math.min(columns.length - 1, endCol);

        const matrix: any[][] = [];
        for (let r = startRow; r <= maxRow; r++) {
          const rowVals: any[] = [];
          for (let c = startCol; c <= maxCol; c++) {
            const colId = columns[c]?.id;
            rowVals.push(colId && rows[r] ? rows[r][colId] : '');
          }
          matrix.push(rowVals);
        }

        if (startCol === maxCol) {
          return matrix.map(m => m[0]);
        }
        if (startRow === maxRow) {
          return matrix[0] || [];
        }
        return matrix;
      }
    }

    // Single cell reference: e.g. A1, B5
    const cellRef = parseCellReference(refStr);
    if (cellRef) {
      const colId = columns[cellRef.col]?.id;
      if (colId && rows[cellRef.row]) {
        return rows[cellRef.row][colId] ?? '';
      }
      return '';
    }

    // Column by name or bracket: e.g. [Marks] or Marks
    const cleanCol = refStr.replace(/^\[|\]$/g, '').toLowerCase();
    const colMatch = columns.find(
      c => c.name.toLowerCase() === cleanCol || c.id.toLowerCase() === cleanCol
    );
    if (colMatch) {
      return rows.map(r => r[colMatch.id] ?? '');
    }

    return SHEET_ERRORS.REF;
  }

  // Resolve single cell reference
  private resolveCellReference(rowIdx: number, colIdx: number): any {
    const key = `R${rowIdx}C${colIdx}`;
    const visited = this.context.visited || new Set<string>();

    if (visited.has(key)) {
      throw new Error('CIRCULAR');
    }

    if (rowIdx < 0 || rowIdx >= this.context.rows.length) {
      return '';
    }
    if (colIdx < 0 || colIdx >= this.context.columns.length) {
      return '';
    }

    const row = this.context.rows[rowIdx];
    const col = this.context.columns[colIdx];
    if (!row || !col) return '';

    const rawVal = row[col.id];

    // If cell contains another formula, evaluate it recursively
    if (typeof rawVal === 'string' && rawVal.trim().startsWith('=')) {
      const nextVisited = new Set(visited);
      nextVisited.add(key);
      const subContext: FormulaContext = {
        ...this.context,
        rowIndex: rowIdx,
        colIndex: colIdx,
        visited: nextVisited,
      };
      const subEval = new FormulaEvaluator(rawVal, subContext);
      return subEval.evaluate();
    }

    return rawVal;
  }

  // Resolve 2D or 1D Range like A1:B10
  private resolveRangeValue(rangeStr: string): any[] {
    const parsed = parseRangeReference(rangeStr);
    if (!parsed) return [];

    const { startCol, startRow, endCol, endRow } = parsed;
    const maxRow = Math.min(this.context.rows.length - 1, endRow);
    const maxCol = Math.min(this.context.columns.length - 1, endCol);

    const matrix: any[][] = [];
    for (let r = startRow; r <= maxRow; r++) {
      const rowVals: any[] = [];
      for (let c = startCol; c <= maxCol; c++) {
        rowVals.push(this.resolveCellReference(r, c));
      }
      matrix.push(rowVals);
    }

    // If single column, return 1D array of cell values
    if (startCol === maxCol) {
      return matrix.map(m => m[0]);
    }
    // If single row, return 1D array
    if (startRow === maxRow) {
      return matrix[0] || [];
    }

    return matrix;
  }

  // Resolve column header value in the active row
  private resolveColumnValue(colKey: string): any {
    const col = this.context.columns.find(
      c => c.id.toLowerCase() === colKey.toLowerCase() || c.name.toLowerCase() === colKey.toLowerCase()
    );
    if (!col) return 0;
    const curRow = this.context.rows[this.context.rowIndex];
    if (!curRow) return 0;
    return curRow[col.id];
  }
}

// ============================================================================
// Public Function Library for Autocomplete & Documentation
// ============================================================================
export const GOOGLE_SHEETS_FUNCTIONS_LIST: SheetFunctionDoc[] = [
  // Math
  { name: 'SUM', syntax: 'SUM(value1, [value2, ...])', category: 'Math', description: 'Returns the sum of a series of numbers and/or cells.', example: '=SUM(A1:A10)' },
  { name: 'SUMIF', syntax: 'SUMIF(range, criterion, [sum_range])', category: 'Math', description: 'Returns a conditional sum across a range.', example: '=SUMIF(B1:B10, ">50", C1:C10)' },
  { name: 'SUMIFS', syntax: 'SUMIFS(sum_range, criteria_range1, criterion1, ...)', category: 'Math', description: 'Returns the sum of a range depending on multiple criteria.', example: '=SUMIFS(D1:D10, A1:A10, "Yes", B1:B10, ">100")' },
  { name: 'PRODUCT', syntax: 'PRODUCT(factor1, [factor2, ...])', category: 'Math', description: 'Returns the result of multiplying a series of numbers together.', example: '=PRODUCT(A1:A5)' },
  { name: 'ROUND', syntax: 'ROUND(value, [places])', category: 'Math', description: 'Rounds a number to a certain number of decimal places.', example: '=ROUND(A1, 2)' },
  { name: 'ROUNDUP', syntax: 'ROUNDUP(value, [places])', category: 'Math', description: 'Rounds a number to a certain number of decimal places, always rounding up.', example: '=ROUNDUP(A1, 0)' },
  { name: 'ROUNDDOWN', syntax: 'ROUNDDOWN(value, [places])', category: 'Math', description: 'Rounds a number to a certain number of decimal places, always rounding down.', example: '=ROUNDDOWN(A1, 0)' },
  { name: 'INT', syntax: 'INT(value)', category: 'Math', description: 'Rounds a number down to the nearest integer.', example: '=INT(A1)' },
  { name: 'TRUNC', syntax: 'TRUNC(value, [places])', category: 'Math', description: 'Truncates a number to a certain number of significant digits.', example: '=TRUNC(A1, 1)' },
  { name: 'ABS', syntax: 'ABS(value)', category: 'Math', description: 'Returns the absolute value of a number.', example: '=ABS(-15)' },
  { name: 'SIGN', syntax: 'SIGN(value)', category: 'Math', description: 'Returns -1 if negative, 1 if positive, and 0 if zero.', example: '=SIGN(A1)' },
  { name: 'SQRT', syntax: 'SQRT(value)', category: 'Math', description: 'Returns the positive square root of a positive number.', example: '=SQRT(144)' },
  { name: 'POWER', syntax: 'POWER(base, exponent)', category: 'Math', description: 'Returns a number raised to a power.', example: '=POWER(2, 8)' },
  { name: 'MOD', syntax: 'MOD(dividend, divisor)', category: 'Math', description: 'Returns the result of the modulo operator, the remainder after division.', example: '=MOD(10, 3)' },
  { name: 'QUOTIENT', syntax: 'QUOTIENT(dividend, divisor)', category: 'Math', description: 'Returns one number divided by another, without the remainder.', example: '=QUOTIENT(10, 3)' },
  { name: 'EXP', syntax: 'EXP(exponent)', category: 'Math', description: 'Returns Euler\'s number, e (~2.718) raised to a power.', example: '=EXP(1)' },
  { name: 'LN', syntax: 'LN(value)', category: 'Math', description: 'Returns the logarithm of a number, base e (natural log).', example: '=LN(10)' },
  { name: 'LOG10', syntax: 'LOG10(value)', category: 'Math', description: 'Returns the logarithm of a number, base 10.', example: '=LOG10(100)' },
  { name: 'PI', syntax: 'PI()', category: 'Math', description: 'Returns the value of Pi to 14 decimal places.', example: '=PI()' },
  { name: 'RAND', syntax: 'RAND()', category: 'Math', description: 'Returns a random number between 0 inclusive and 1 exclusive.', example: '=RAND()' },
  { name: 'RANDBETWEEN', syntax: 'RANDBETWEEN(low, high)', category: 'Math', description: 'Returns an integer between two values, inclusive.', example: '=RANDBETWEEN(1, 100)' },

  // Statistical
  { name: 'AVERAGE', syntax: 'AVERAGE(value1, [value2, ...])', category: 'Statistical', description: 'Returns the numerical average value in a dataset.', example: '=AVERAGE(B1:B10)' },
  { name: 'AVERAGEIF', syntax: 'AVERAGEIF(criteria_range, criterion, [average_range])', category: 'Statistical', description: 'Returns the average of a range depending on criteria.', example: '=AVERAGEIF(A1:A10, ">0")' },
  { name: 'COUNT', syntax: 'COUNT(value1, [value2, ...])', category: 'Statistical', description: 'Returns the count of number values in a dataset.', example: '=COUNT(A1:A20)' },
  { name: 'COUNTA', syntax: 'COUNTA(value1, [value2, ...])', category: 'Statistical', description: 'Returns the count of values in a dataset.', example: '=COUNTA(A1:A20)' },
  { name: 'COUNTBLANK', syntax: 'COUNTBLANK(range)', category: 'Statistical', description: 'Returns the number of empty cells in a given range.', example: '=COUNTBLANK(A1:B10)' },
  { name: 'COUNTIF', syntax: 'COUNTIF(range, criterion)', category: 'Statistical', description: 'Returns a conditional count across a range.', example: '=COUNTIF(C1:C20, "Pass")' },
  { name: 'COUNTIFS', syntax: 'COUNTIFS(criteria_range1, criterion1, ...)', category: 'Statistical', description: 'Returns the count of a range depending on multiple criteria.', example: '=COUNTIFS(A1:A10, ">50", B1:B10, "Yes")' },
  { name: 'COUNTUNIQUE', syntax: 'COUNTUNIQUE(value1, [value2, ...])', category: 'Statistical', description: 'Counts the number of unique values in a list of specified values and ranges.', example: '=COUNTUNIQUE(A1:A100)' },
  { name: 'MAX', syntax: 'MAX(value1, [value2, ...])', category: 'Statistical', description: 'Returns the maximum value in a numeric dataset.', example: '=MAX(D1:D50)' },
  { name: 'MAXIFS', syntax: 'MAXIFS(range, criteria_range1, criterion1, ...)', category: 'Statistical', description: 'Returns the maximum value in a range of cells, filtered by criteria.', example: '=MAXIFS(C1:C10, A1:A10, "A")' },
  { name: 'MIN', syntax: 'MIN(value1, [value2, ...])', category: 'Statistical', description: 'Returns the minimum value in a numeric dataset.', example: '=MIN(D1:D50)' },
  { name: 'MINIFS', syntax: 'MINIFS(range, criteria_range1, criterion1, ...)', category: 'Statistical', description: 'Returns the minimum value in a range of cells, filtered by criteria.', example: '=MINIFS(C1:C10, A1:A10, "A")' },
  { name: 'MEDIAN', syntax: 'MEDIAN(value1, [value2, ...])', category: 'Statistical', description: 'Returns the median value in a numeric dataset.', example: '=MEDIAN(A1:A15)' },
  { name: 'MODE', syntax: 'MODE(value1, [value2, ...])', category: 'Statistical', description: 'Returns the most commonly occurring value in a dataset.', example: '=MODE(A1:A15)' },
  { name: 'STDEV', syntax: 'STDEV(value1, [value2, ...])', category: 'Statistical', description: 'Calculates the standard deviation based on a sample.', example: '=STDEV(A1:A30)' },
  { name: 'VAR', syntax: 'VAR(value1, [value2, ...])', category: 'Statistical', description: 'Calculates the variance based on a sample.', example: '=VAR(A1:A30)' },
  { name: 'PERCENTILE', syntax: 'PERCENTILE(data, percentile)', category: 'Statistical', description: 'Returns the value at a given percentile of a dataset.', example: '=PERCENTILE(A1:A50, 0.9)' },
  { name: 'LARGE', syntax: 'LARGE(data, n)', category: 'Statistical', description: 'Returns the nth largest element from a data set.', example: '=LARGE(A1:A20, 2)' },
  { name: 'SMALL', syntax: 'SMALL(data, n)', category: 'Statistical', description: 'Returns the nth smallest element from a data set.', example: '=SMALL(A1:A20, 1)' },
  { name: 'RANK', syntax: 'RANK(value, data, [is_ascending])', category: 'Statistical', description: 'Returns the rank of a specified value in a dataset.', example: '=RANK(A1, A1:A10)' },

  // Logical
  { name: 'IF', syntax: 'IF(logical_expression, value_if_true, [value_if_false])', category: 'Logical', description: 'Returns one value if a logical expression is `TRUE` and another if it is `FALSE`.', example: '=IF(A1 > 50, "Pass", "Fail")' },
  { name: 'IFS', syntax: 'IFS(condition1, value1, [condition2, value2, ...])', category: 'Logical', description: 'Evaluates multiple conditions and returns a value corresponding to the first true condition.', example: '=IFS(A1>=90, "A", A1>=80, "B", TRUE, "C")' },
  { name: 'SWITCH', syntax: 'SWITCH(expression, case1, value1, [default])', category: 'Logical', description: 'Tests an expression against a list of cases and returns the corresponding value.', example: '=SWITCH(A1, 1, "Sunday", 2, "Monday", "Other")' },
  { name: 'AND', syntax: 'AND(logical_expression1, [logical_expression2, ...])', category: 'Logical', description: 'Returns `TRUE` if all provided arguments are logically true.', example: '=AND(A1 > 0, B1 < 100)' },
  { name: 'OR', syntax: 'OR(logical_expression1, [logical_expression2, ...])', category: 'Logical', description: 'Returns `TRUE` if any of the provided arguments are logically true.', example: '=OR(A1 == "Yes", B1 == "Yes")' },
  { name: 'NOT', syntax: 'NOT(logical_expression)', category: 'Logical', description: 'Returns the opposite of a logical value — `NOT(TRUE)` returns `FALSE`.', example: '=NOT(A1 > 50)' },
  { name: 'XOR', syntax: 'XOR(logical_expression1, [logical_expression2, ...])', category: 'Logical', description: 'Returns `TRUE` if an odd number of arguments are true, and `FALSE` otherwise.', example: '=XOR(A1, B1)' },
  { name: 'IFERROR', syntax: 'IFERROR(value, [value_if_error])', category: 'Logical', description: 'Returns the first argument if it is not an error value, otherwise returns second argument.', example: '=IFERROR(A1 / B1, 0)' },
  { name: 'IFNA', syntax: 'IFNA(value, [value_if_na])', category: 'Logical', description: 'Evaluates a value and returns an alternate value if #N/A error occurs.', example: '=IFNA(VLOOKUP(A1, B1:C10, 2), "Not found")' },
  { name: 'TRUE', syntax: 'TRUE()', category: 'Logical', description: 'Returns the logical value `TRUE`.', example: '=TRUE()' },
  { name: 'FALSE', syntax: 'FALSE()', category: 'Logical', description: 'Returns the logical value `FALSE`.', example: '=FALSE()' },

  // Text
  { name: 'CONCATENATE', syntax: 'CONCATENATE(string1, [string2, ...])', category: 'Text', description: 'Appends strings to one another.', example: '=CONCATENATE("Grade: ", A1)' },
  { name: 'TEXTJOIN', syntax: 'TEXTJOIN(delimiter, ignore_empty, text1, [text2, ...])', category: 'Text', description: 'Combines the text from multiple strings and/or arrays using a delimiter.', example: '=TEXTJOIN(", ", TRUE, A1:A5)' },
  { name: 'LEFT', syntax: 'LEFT(string, [num_chars])', category: 'Text', description: 'Returns the substring from the beginning of a specified string.', example: '=LEFT(A1, 4)' },
  { name: 'RIGHT', syntax: 'RIGHT(string, [num_chars])', category: 'Text', description: 'Returns the substring from the end of a specified string.', example: '=RIGHT(A1, 3)' },
  { name: 'MID', syntax: 'MID(string, starting_at, extract_length)', category: 'Text', description: 'Returns a segment of a string starting at a specified character.', example: '=MID(A1, 2, 5)' },
  { name: 'LEN', syntax: 'LEN(text)', category: 'Text', description: 'Returns the length of a string.', example: '=LEN(A1)' },
  { name: 'LOWER', syntax: 'LOWER(text)', category: 'Text', description: 'Converts a specified string to lowercase.', example: '=LOWER("HELLO")' },
  { name: 'UPPER', syntax: 'UPPER(text)', category: 'Text', description: 'Converts a specified string to uppercase.', example: '=UPPER("world")' },
  { name: 'PROPER', syntax: 'PROPER(text)', category: 'Text', description: 'Capitalizes each word in specified string.', example: '=PROPER("aarav sharma")' },
  { name: 'TRIM', syntax: 'TRIM(text)', category: 'Text', description: 'Removes leading, trailing, and repeated spaces in text.', example: '=TRIM(A1)' },
  { name: 'SUBSTITUTE', syntax: 'SUBSTITUTE(text_to_search, search_for, replace_with, [occurrence])', category: 'Text', description: 'Replaces existing text with new text in a string.', example: '=SUBSTITUTE(A1, "-", "/")' },
  { name: 'REPLACE', syntax: 'REPLACE(text, position, length, new_text)', category: 'Text', description: 'Replaces part of a text string with a different text string.', example: '=REPLACE(A1, 1, 3, "2026")' },
  { name: 'FIND', syntax: 'FIND(search_for, text_to_search, [starting_at])', category: 'Text', description: 'Returns the position of a string within text, case-sensitive.', example: '=FIND("@", A1)' },
  { name: 'SEARCH', syntax: 'SEARCH(search_for, text_to_search, [starting_at])', category: 'Text', description: 'Returns position of string within text, ignoring case.', example: '=SEARCH("com", A1)' },
  { name: 'EXACT', syntax: 'EXACT(string1, string2)', category: 'Text', description: 'Tests whether two strings are identical.', example: '=EXACT(A1, B1)' },
  { name: 'REPT', syntax: 'REPT(text_to_repeat, number_of_times)', category: 'Text', description: 'Returns specified text repeated a number of times.', example: '=REPT("★", 5)' },
  { name: 'SPLIT', syntax: 'SPLIT(text, delimiter)', category: 'Text', description: 'Divides text around a specified character or string.', example: '=SPLIT(A1, ",")' },

  // Date & Time
  { name: 'TODAY', syntax: 'TODAY()', category: 'Date & Time', description: 'Returns the current date as a date value.', example: '=TODAY()' },
  { name: 'NOW', syntax: 'NOW()', category: 'Date & Time', description: 'Returns the current date and time as a date value.', example: '=NOW()' },
  { name: 'DATE', syntax: 'DATE(year, month, day)', category: 'Date & Time', description: 'Converts a year, month, and day into a date.', example: '=DATE(2026, 10, 10)' },
  { name: 'YEAR', syntax: 'YEAR(date)', category: 'Date & Time', description: 'Returns the year specified by a given date.', example: '=YEAR(A1)' },
  { name: 'MONTH', syntax: 'MONTH(date)', category: 'Date & Time', description: 'Returns the month of the year specified by a given date.', example: '=MONTH(A1)' },
  { name: 'DAY', syntax: 'DAY(date)', category: 'Date & Time', description: 'Returns the day of the month that a specific date falls on.', example: '=DAY(A1)' },
  { name: 'WEEKDAY', syntax: 'WEEKDAY(date, [type])', category: 'Date & Time', description: 'Returns a number representing the day of the week of the date provided.', example: '=WEEKDAY(TODAY())' },
  { name: 'DAYS', syntax: 'DAYS(end_date, start_date)', category: 'Date & Time', description: 'Returns the number of days between two dates.', example: '=DAYS(A1, B1)' },
  { name: 'DATEDIF', syntax: 'DATEDIF(start_date, end_date, unit)', category: 'Date & Time', description: 'Calculates the number of days, months, or years between two dates.', example: '=DATEDIF(A1, TODAY(), "Y")' },
  { name: 'EDATE', syntax: 'EDATE(start_date, months)', category: 'Date & Time', description: 'Returns a date a specified number of months before or after another date.', example: '=EDATE(A1, 3)' },
  { name: 'EOMONTH', syntax: 'EOMONTH(start_date, months)', category: 'Date & Time', description: 'Returns a date representing the last day of a month which falls a specified number of months before or after another date.', example: '=EOMONTH(TODAY(), 0)' },

  // Lookup & Reference
  { name: 'VLOOKUP', syntax: 'VLOOKUP(search_key, range, index, [is_sorted])', category: 'Lookup', description: 'Vertical lookup. Searches down the first column of a range for a key and returns the value of a specified cell in the row found.', example: '=VLOOKUP(A1, B1:D20, 3, FALSE)' },
  { name: 'HLOOKUP', syntax: 'HLOOKUP(search_key, range, index, [is_sorted])', category: 'Lookup', description: 'Horizontal lookup. Searches across the first row of a range for a key and returns value of specified cell.', example: '=HLOOKUP(A1, B1:Z5, 2, FALSE)' },
  { name: 'INDEX', syntax: 'INDEX(reference, [row], [column])', category: 'Lookup', description: 'Returns the content of a cell, specified by row and column offset.', example: '=INDEX(A1:C10, 2, 3)' },
  { name: 'MATCH', syntax: 'MATCH(search_key, range, [search_type])', category: 'Lookup', description: 'Returns the relative position of an item in a range that matches a specified value.', example: '=MATCH("Aarav", A1:A20, 0)' },
  { name: 'XLOOKUP', syntax: 'XLOOKUP(search_key, lookup_range, result_range, [missing_value], [match_mode], [search_mode])', category: 'Lookup', description: 'Modern lookup searching a range or array, and returning an item corresponding to the first match.', example: '=XLOOKUP(A1, B1:B10, C1:C10, "Not found")' },
  { name: 'LOOKUP', syntax: 'LOOKUP(lookup_value, lookup_vector, [result_vector])', category: 'Lookup', description: 'Looks up a value in a row or column and returns the corresponding value.', example: '=LOOKUP(A1, B1:B10, C1:C10)' },
  { name: 'TABLE_LOOKUP', syntax: 'TABLE_LOOKUP(table_name, lookup_col, lookup_val, return_col, [fallback])', category: 'Lookup', description: 'Direct lookup from any register table or uploaded file by column name or letter.', example: '=TABLE_LOOKUP("Students Register", "Roll No", A2, "Student Name")' },
  { name: 'CHOOSE', syntax: 'CHOOSE(index, choice1, [choice2, ...])', category: 'Lookup', description: 'Returns an element from a list of choices based on index.', example: '=CHOOSE(2, "Red", "Blue", "Green")' },
  { name: 'ROW', syntax: 'ROW([cell_reference])', category: 'Lookup', description: 'Returns the row number of a specified cell.', example: '=ROW()' },
  { name: 'COLUMN', syntax: 'COLUMN([cell_reference])', category: 'Lookup', description: 'Returns the column number of a specified cell.', example: '=COLUMN()' },
  { name: 'ROWS', syntax: 'ROWS(range)', category: 'Lookup', description: 'Returns the number of rows in a specified array or range.', example: '=ROWS(A1:B10)' },
  { name: 'COLUMNS', syntax: 'COLUMNS(range)', category: 'Lookup', description: 'Returns the number of columns in a specified array or range.', example: '=COLUMNS(A1:D10)' },

  // Financial
  { name: 'PMT', syntax: 'PMT(rate, number_of_periods, present_value, [future_value])', category: 'Financial', description: 'Calculates the periodic payment for an annuity investment based on constant-amount periodic payments and constant interest rate.', example: '=PMT(0.08/12, 360, -200000)' },
  { name: 'FV', syntax: 'FV(rate, number_of_periods, payment_amount, [present_value])', category: 'Financial', description: 'Calculates the future value of an annuity investment.', example: '=FV(0.05/12, 60, -100, 0)' },
  { name: 'PV', syntax: 'PV(rate, number_of_periods, payment_amount, [future_value])', category: 'Financial', description: 'Calculates the present value of an annuity investment based on constant-amount periodic payments and constant interest rate.', example: '=PV(0.08/12, 120, -500)' },
  { name: 'NPV', syntax: 'NPV(discount, value1, [value2, ...])', category: 'Financial', description: 'Calculates the net present value of an investment based on a series of periodic cash flows and discount rate.', example: '=NPV(0.1, -1000, 300, 400, 500)' },
];

// Helper to evaluate a cell value in a given row
export function evaluateCellFormula(
  cellVal: any,
  rowIndex: number,
  colIndex: number,
  rows: Record<string, any>[],
  columns: { id: string; name: string; type?: string; [key: string]: any }[],
  sheets?: Record<string, SheetDataSource>
): any {
  if (cellVal === null || cellVal === undefined) return '';
  if (typeof cellVal !== 'string') return cellVal;
  const trimmed = cellVal.trim();
  if (!trimmed.startsWith('=')) return cellVal;

  const evaluator = new FormulaEvaluator(trimmed, {
    rowIndex,
    colIndex,
    rows,
    columns,
    sheets,
  });

  return evaluator.evaluate();
}
