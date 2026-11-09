/**
 * Conditional Formatting Engine for Dynamic Register
 * Implements complete Google Sheets & Microsoft Excel conditional formatting specifications:
 * - Single Color Cell Rules (Text, Number, Dates, Top/Bottom N, Above/Below Avg, Duplicates)
 * - Color Scales (2-Color & 3-Color Gradients with Min, Midpoint, Max)
 * - Data Bars (Gradient horizontal cell fill proportional to value)
 * - Icon Sets (Traffic lights, Arrows, Status symbols, Flags)
 */

import { 
  ColumnDef, 
  RowData, 
  ConditionalFormattingRule, 
  ConditionalFormatStyle 
} from '../types/register';
import { getRowCellValue, parseNumeric } from './calculations';

export interface EvaluatedCellStyle {
  style?: React.CSSProperties;
  dataBar?: {
    percentage: number;
    color: string;
  };
  icon?: string;
  matchedRuleId?: string;
}

export interface ColumnStatistics {
  min: number;
  max: number;
  avg: number;
  count: number;
  numbers: number[];
  duplicateValues: Set<string>;
  topNValues: Set<number>;
  bottomNValues: Set<number>;
}

/**
 * Pre-computes statistical metrics for each column to support Top/Bottom N, Above/Below Avg,
 * Duplicates, Color Scales, and Data Bars efficiently.
 */
export function computeColumnStatistics(
  rows: RowData[],
  columns: ColumnDef[],
  rules: ConditionalFormattingRule[]
): Record<string, ColumnStatistics> {
  const stats: Record<string, ColumnStatistics> = {};

  columns.forEach((col) => {
    const rawValues: any[] = [];
    const numbers: number[] = [];
    const valCounts = new Map<string, number>();

    rows.forEach((r) => {
      const v = getRowCellValue(r, col, columns);
      rawValues.push(v);
      const str = String(v ?? '').trim();
      if (str !== '') {
        valCounts.set(str, (valCounts.get(str) || 0) + 1);
      }
      const num = parseNumeric(v);
      if (!isNaN(num)) {
        numbers.push(num);
      }
    });

    const duplicateValues = new Set<string>();
    valCounts.forEach((count, val) => {
      if (count > 1) duplicateValues.add(val);
    });

    numbers.sort((a, b) => a - b);
    const min = numbers.length > 0 ? numbers[0] : 0;
    const max = numbers.length > 0 ? numbers[numbers.length - 1] : 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = numbers.length > 0 ? sum / numbers.length : 0;

    // Precalculate Top N & Bottom N for any rule referencing this column
    const topNValues = new Set<number>();
    const bottomNValues = new Set<number>();

    rules
      .filter((rule) => rule.columnId === col.id || rule.columnId === 'ALL_COLUMNS')
      .forEach((rule) => {
        if (rule.condition === 'top_n') {
          const n = Number(rule.value) || 10;
          const topSlice = numbers.slice(-Math.min(n, numbers.length));
          topSlice.forEach((v) => topNValues.add(v));
        } else if (rule.condition === 'bottom_n') {
          const n = Number(rule.value) || 10;
          const botSlice = numbers.slice(0, Math.min(n, numbers.length));
          botSlice.forEach((v) => bottomNValues.add(v));
        }
      });

    stats[col.id] = {
      min,
      max,
      avg,
      count: numbers.length,
      numbers,
      duplicateValues,
      topNValues,
      bottomNValues,
    };
  });

  return stats;
}

/**
 * Color Interpolator for 2-Color and 3-Color scales (Google Sheets / Excel)
 */
function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function interpolateRgb(rgb1: [number, number, number], rgb2: [number, number, number], factor: number): string {
  const f = Math.max(0, Math.min(1, factor));
  const r = Math.round(rgb1[0] + (rgb2[0] - rgb1[0]) * f);
  const g = Math.round(rgb1[1] + (rgb2[1] - rgb1[1]) * f);
  const b = Math.round(rgb1[2] + (rgb2[2] - rgb1[2]) * f);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getColorScaleColor(
  val: number,
  minVal: number,
  maxVal: number,
  minColor: string,
  maxColor: string,
  midColor?: string,
  hasMidpoint: boolean = false
): string {
  if (minVal === maxVal) return minColor;
  const pct = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));

  const rgbMin = hexToRgb(minColor);
  const rgbMax = hexToRgb(maxColor);

  if (hasMidpoint && midColor) {
    const rgbMid = hexToRgb(midColor);
    if (pct < 0.5) {
      return interpolateRgb(rgbMin, rgbMid, pct * 2);
    } else {
      return interpolateRgb(rgbMid, rgbMax, (pct - 0.5) * 2);
    }
  }

  return interpolateRgb(rgbMin, rgbMax, pct);
}

/**
 * Evaluates whether a cell value satisfies a CellValueCondition
 */
export function checkCellValueCondition(
  val: any,
  condition: string,
  targetValue: any,
  secondValue: any,
  colStats?: ColumnStatistics
): boolean {
  const strVal = String(val ?? '').trim();
  const numVal = parseNumeric(val);
  const isNum = !isNaN(numVal);

  const targetStr = String(targetValue ?? '').trim();
  const targetNum = parseNumeric(targetValue);
  const secondNum = parseNumeric(secondValue);

  switch (condition) {
    case 'empty':
      return val === null || val === undefined || strVal === '';

    case 'not_empty':
      return val !== null && val !== undefined && strVal !== '';

    case 'text_contains':
      return strVal.toLowerCase().includes(targetStr.toLowerCase());

    case 'text_not_contains':
      return !strVal.toLowerCase().includes(targetStr.toLowerCase());

    case 'text_starts_with':
      return strVal.toLowerCase().startsWith(targetStr.toLowerCase());

    case 'text_ends_with':
      return strVal.toLowerCase().endsWith(targetStr.toLowerCase());

    case 'text_exact':
      return strVal.toLowerCase() === targetStr.toLowerCase();

    case 'greater_than':
      return isNum && !isNaN(targetNum) && numVal > targetNum;

    case 'greater_than_or_equal':
      return isNum && !isNaN(targetNum) && numVal >= targetNum;

    case 'less_than':
      return isNum && !isNaN(targetNum) && numVal < targetNum;

    case 'less_than_or_equal':
      return isNum && !isNaN(targetNum) && numVal <= targetNum;

    case 'equal_to':
      if (isNum && !isNaN(targetNum)) return numVal === targetNum;
      return strVal.toLowerCase() === targetStr.toLowerCase();

    case 'not_equal_to':
      if (isNum && !isNaN(targetNum)) return numVal !== targetNum;
      return strVal.toLowerCase() !== targetStr.toLowerCase();

    case 'between':
      return (
        isNum &&
        !isNaN(targetNum) &&
        !isNaN(secondNum) &&
        numVal >= Math.min(targetNum, secondNum) &&
        numVal <= Math.max(targetNum, secondNum)
      );

    case 'not_between':
      return (
        isNum &&
        !isNaN(targetNum) &&
        !isNaN(secondNum) &&
        (numVal < Math.min(targetNum, secondNum) || numVal > Math.max(targetNum, secondNum))
      );

    case 'above_average':
      return isNum && !!colStats && numVal > colStats.avg;

    case 'below_average':
      return isNum && !!colStats && numVal < colStats.avg;

    case 'top_n':
      return isNum && !!colStats && colStats.topNValues.has(numVal);

    case 'bottom_n':
      return isNum && !!colStats && colStats.bottomNValues.has(numVal);

    case 'duplicate':
      return !!colStats && strVal !== '' && colStats.duplicateValues.has(strVal);

    case 'unique':
      return !!colStats && strVal !== '' && !colStats.duplicateValues.has(strVal);

    default:
      return false;
  }
}

/**
 * Main Evaluator: computes the complete styling, data bars, and icon sets
 * for a cell given the active conditional formatting rules.
 */
export function evaluateCellFormatting(
  row: RowData,
  col: ColumnDef,
  val: any,
  rules: ConditionalFormattingRule[] = [],
  columnStatsMap: Record<string, ColumnStatistics> = {},
  allColumns: ColumnDef[] = []
): EvaluatedCellStyle {
  const result: EvaluatedCellStyle = {};
  const activeRules = rules.filter((r) => r.enabled);
  if (activeRules.length === 0) return result;

  const colStats = columnStatsMap[col.id];
  const numVal = parseNumeric(val);
  const isNum = !isNaN(numVal);

  for (const rule of activeRules) {
    const isTargetColumn = rule.columnId === 'ALL_COLUMNS' || rule.columnId === col.id;
    const isRowRule = rule.applyToRow === true;

    // Check row-level formatting trigger
    let isRowMatch = false;
    if (isRowRule && rule.columnId !== 'ALL_COLUMNS') {
      const triggerCol = allColumns.find((c) => c.id === rule.columnId);
      if (triggerCol) {
        const triggerVal = getRowCellValue(row, triggerCol, allColumns);
        const triggerStats = columnStatsMap[triggerCol.id];
        isRowMatch = checkCellValueCondition(
          triggerVal,
          rule.condition || 'not_empty',
          rule.value,
          rule.secondValue,
          triggerStats
        );
      }
    }

    if (!isTargetColumn && !isRowMatch) continue;

    // 1. Single Color / Cell Value Rule
    if (rule.ruleType === 'cell_value') {
      const matches = isRowMatch || checkCellValueCondition(
        val,
        rule.condition || 'not_empty',
        rule.value,
        rule.secondValue,
        colStats
      );

      if (matches && rule.style) {
        result.matchedRuleId = rule.id;
        const cssStyle: React.CSSProperties = {};

        if (rule.style.backgroundColor) {
          cssStyle.backgroundColor = rule.style.backgroundColor;
        }
        if (rule.style.textColor) {
          cssStyle.color = rule.style.textColor;
        }
        if (rule.style.bold) {
          cssStyle.fontWeight = '700';
        }
        if (rule.style.italic) {
          cssStyle.fontStyle = 'italic';
        }
        if (rule.style.underline && rule.style.strikethrough) {
          cssStyle.textDecoration = 'underline line-through';
        } else if (rule.style.underline) {
          cssStyle.textDecoration = 'underline';
        } else if (rule.style.strikethrough) {
          cssStyle.textDecoration = 'line-through';
        }

        result.style = { ...result.style, ...cssStyle };

        if (rule.stopIfTrue) break;
      }
    }

    // 2. Color Scales (2-Color & 3-Color Gradients)
    else if (rule.ruleType === 'color_scale' && isNum && colStats && colStats.count > 0) {
      const scale = rule.colorScale || {
        minColor: '#ef4444',
        midColor: '#eab308',
        maxColor: '#22c55e',
        hasMidpoint: true,
      };

      const bg = getColorScaleColor(
        numVal,
        colStats.min,
        colStats.max,
        scale.minColor,
        scale.maxColor,
        scale.midColor,
        scale.hasMidpoint
      );

      result.matchedRuleId = rule.id;
      result.style = {
        ...result.style,
        backgroundColor: bg,
        color: '#ffffff',
        textShadow: '0 1px 2px rgba(0,0,0,0.6)',
      };

      if (rule.stopIfTrue) break;
    }

    // 3. Data Bars (Excel Style)
    else if (rule.ruleType === 'data_bar' && isNum && colStats && colStats.max > colStats.min) {
      const min = rule.dataBar?.minVal !== undefined ? rule.dataBar.minVal : Math.min(0, colStats.min);
      const max = rule.dataBar?.maxVal !== undefined ? rule.dataBar.maxVal : colStats.max;
      const range = max - min;
      const pct = range > 0 ? Math.max(2, Math.min(100, Math.round(((numVal - min) / range) * 100))) : 0;

      result.matchedRuleId = rule.id;
      result.dataBar = {
        percentage: pct,
        color: rule.dataBar?.barColor || '#3b82f6',
      };

      if (rule.stopIfTrue) break;
    }

    // 4. Icon Sets (Excel 3-tier Icons)
    else if (rule.ruleType === 'icon_set' && isNum && colStats && colStats.max > colStats.min) {
      const min = colStats.min;
      const max = colStats.max;
      const pct = (numVal - min) / (max - min);

      const type = rule.iconSet?.iconType || 'traffic_lights';
      const reverse = rule.iconSet?.reverseOrder || false;

      let tier: 'high' | 'mid' | 'low' = 'mid';
      if (pct >= 0.67) tier = reverse ? 'low' : 'high';
      else if (pct <= 0.33) tier = reverse ? 'high' : 'low';
      else tier = 'mid';

      let icon = '';
      if (type === 'traffic_lights') {
        icon = tier === 'high' ? '🟢' : tier === 'mid' ? '🟡' : '🔴';
      } else if (type === 'arrows') {
        icon = tier === 'high' ? '⬆️' : tier === 'mid' ? '➡️' : '⬇️';
      } else if (type === 'symbols') {
        icon = tier === 'high' ? '✅' : tier === 'mid' ? '⚠️' : '❌';
      } else if (type === 'flags') {
        icon = tier === 'high' ? '🚩' : tier === 'mid' ? '🏳️' : '🏴';
      }

      result.matchedRuleId = rule.id;
      result.icon = icon;

      if (rule.stopIfTrue) break;
    }
  }

  return result;
}

/**
 * Built-in Quick Rule Presets (like Google Sheets & Excel Quick Formatting)
 */
export function createPresetRule(
  presetType: 'pass' | 'fail' | 'top10' | 'duplicates' | 'color_scale' | 'data_bar' | 'above_avg',
  columnId: string,
  colName?: string
): ConditionalFormattingRule {
  const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  switch (presetType) {
    case 'pass':
      return {
        id,
        name: `Pass (>= 35) in Green`,
        enabled: true,
        columnId,
        ruleType: 'cell_value',
        condition: 'greater_than_or_equal',
        value: 35,
        style: {
          backgroundColor: '#14532d',
          textColor: '#86efac',
          bold: true,
        },
      };

    case 'fail':
      return {
        id,
        name: `Fail (< 35) in Red`,
        enabled: true,
        columnId,
        ruleType: 'cell_value',
        condition: 'less_than',
        value: 35,
        style: {
          backgroundColor: '#7f1d1d',
          textColor: '#fca5a5',
          bold: true,
        },
      };

    case 'top10':
      return {
        id,
        name: `Top 5 Performers`,
        enabled: true,
        columnId,
        ruleType: 'cell_value',
        condition: 'top_n',
        value: 5,
        style: {
          backgroundColor: '#78350f',
          textColor: '#fde68a',
          bold: true,
        },
      };

    case 'duplicates':
      return {
        id,
        name: `Highlight Duplicate Values`,
        enabled: true,
        columnId,
        ruleType: 'cell_value',
        condition: 'duplicate',
        style: {
          backgroundColor: '#701a75',
          textColor: '#f5d0fe',
        },
      };

    case 'above_avg':
      return {
        id,
        name: `Above Average`,
        enabled: true,
        columnId,
        ruleType: 'cell_value',
        condition: 'above_average',
        style: {
          backgroundColor: '#064e3b',
          textColor: '#6ee7b7',
          bold: true,
        },
      };

    case 'color_scale':
      return {
        id,
        name: `Color Scale: Red - Yellow - Green`,
        enabled: true,
        columnId,
        ruleType: 'color_scale',
        colorScale: {
          minColor: '#ef4444',
          midColor: '#eab308',
          maxColor: '#22c55e',
          hasMidpoint: true,
        },
      };

    case 'data_bar':
      return {
        id,
        name: `Data Bars (Gradient Blue)`,
        enabled: true,
        columnId,
        ruleType: 'data_bar',
        dataBar: {
          barColor: '#3b82f6',
          showValue: true,
        },
      };
  }
}
