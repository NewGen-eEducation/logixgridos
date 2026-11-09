export type CellFormat = 'general' | 'number' | 'currency' | 'percent' | 'date';
export type CellAlign = 'left' | 'center' | 'right';
export type CellVAlign = 'top' | 'middle' | 'bottom';
export type CellWrap = 'overflow' | 'wrap' | 'clip';

export interface CellBorderConfig {
  top?: boolean;
  bottom?: boolean;
  left?: boolean;
  right?: boolean;
  color?: string;
  style?: 'solid' | 'dashed' | 'double';
}

export interface SheetCell {
  raw: string | number | boolean;
  computed?: any;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: CellAlign;
  valign?: CellVAlign;
  wrap?: CellWrap;
  fontSize?: number;
  fontFamily?: string;
  format?: CellFormat;
  border?: CellBorderConfig;
  validationType?: 'checkbox' | 'dropdown';
  validationOptions?: string[]; // for dropdown
  isMerged?: boolean;
  mergeColSpan?: number;
  mergeRowSpan?: number;
  hiddenByMerge?: boolean;
}

export interface FloatingChart {
  id: string;
  type: 'bar' | 'grouped_bar' | 'line' | 'pie' | 'donut';
  title: string;
  dataRange: string; // e.g. "A4:B9"
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpreadsheetTab {
  id: string;
  name: string;
  color?: string;
  cells: Record<string, SheetCell>; // key: "R{row}C{col}" e.g. "R0C0"
  rowCount: number;
  colCount: number;
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
  frozenRows?: number;
  frozenCols?: number;
  charts?: FloatingChart[];
}

export interface SpreadsheetWorkbook {
  id: string;
  title: string;
  activeSheetId: string;
  sheets: SpreadsheetTab[];
  updatedAt: string;
}

export interface LookupWizardConfig {
  sourceRegisterId: string;
  functionType: 'XLOOKUP' | 'VLOOKUP' | 'HLOOKUP' | 'TABLE_LOOKUP';
  lookupKeyCell: string; // e.g. "A2"
  lookupColumnId: string; // column in source
  returnColumnId: string; // column in source to return
  fallbackValue: string; // e.g. "Not Found"
  applyToColumnRange: boolean; // apply down to row N
}
