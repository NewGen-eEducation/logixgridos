export type ColumnType = 
  | 'text' 
  | 'paragraph'
  | 'number' 
  | 'currency' 
  | 'date' 
  | 'select' 
  | 'multiple_choice'
  | 'checkboxes'
  | 'checkbox' 
  | 'linear_scale'
  | 'rating' 
  | 'formula';

export type ValidationCategory = 'number' | 'text' | 'length' | 'checkbox' | 'regex';

export type NumberValidationOperator = 
  | 'greater_than' 
  | 'greater_than_or_equal' 
  | 'less_than' 
  | 'less_than_or_equal' 
  | 'equal_to' 
  | 'not_equal_to' 
  | 'between' 
  | 'not_between' 
  | 'is_number' 
  | 'whole_number';

export type TextValidationOperator = 
  | 'contains' 
  | 'does_not_contain' 
  | 'email' 
  | 'url';

export type LengthValidationOperator = 
  | 'max_char_count' 
  | 'min_char_count';

export type CheckboxValidationOperator = 
  | 'select_at_least' 
  | 'select_at_most' 
  | 'select_exactly';

export type RegexValidationOperator = 
  | 'contains' 
  | 'does_not_contain' 
  | 'matches' 
  | 'does_not_match';

export type ValidationOperator = 
  | NumberValidationOperator 
  | TextValidationOperator 
  | LengthValidationOperator 
  | CheckboxValidationOperator 
  | RegexValidationOperator;

export interface ResponseValidation {
  enabled: boolean;
  category: ValidationCategory;
  operator: ValidationOperator;
  value?: any;
  secondValue?: any;
  customErrorMessage: string;
}

export interface ColumnDef {
  id: string;
  name: string;
  nameTe?: string; // Telugu translation
  type: ColumnType;
  description?: string; // Question helper text
  options?: string[]; // for select, multiple_choice, checkboxes
  optionsTe?: string[];
  unit?: string; // prefix or suffix, e.g., ₹, %, kg
  formula?: string; // formula e.g., "[col_a] * [col_b]"
  required?: boolean;
  validation?: ResponseValidation; // Google Forms response validation
  scaleMin?: number; // for linear_scale (e.g. 1)
  scaleMax?: number; // for linear_scale (e.g. 5 or 10)
  scaleMinLabel?: string; // for linear_scale
  scaleMaxLabel?: string; // for linear_scale
  width?: number; // min width in px
}

export type RowData = Record<string, any>;

export type ConditionalRuleType = 
  | 'cell_value' 
  | 'color_scale' 
  | 'data_bar' 
  | 'icon_set';

export type CellValueCondition =
  | 'empty'
  | 'not_empty'
  | 'text_contains'
  | 'text_not_contains'
  | 'text_starts_with'
  | 'text_ends_with'
  | 'text_exact'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'equal_to'
  | 'not_equal_to'
  | 'between'
  | 'not_between'
  | 'top_n'
  | 'bottom_n'
  | 'above_average'
  | 'below_average'
  | 'duplicate'
  | 'unique';

export interface ConditionalFormatStyle {
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

export interface ColorScaleConfig {
  minColor: string; // e.g. '#f87171' (red)
  midColor?: string; // e.g. '#fde047' (yellow)
  maxColor: string; // e.g. '#4ade80' (green)
  hasMidpoint: boolean;
}

export interface DataBarConfig {
  barColor: string; // e.g. '#3b82f6'
  showValue: boolean;
  minVal?: number;
  maxVal?: number;
}

export interface IconSetConfig {
  iconType: 'traffic_lights' | 'arrows' | 'symbols' | 'flags';
  reverseOrder?: boolean;
}

export interface ConditionalFormattingRule {
  id: string;
  name?: string;
  enabled: boolean;
  columnId: string; // specific columnId or 'ALL_COLUMNS' or 'ENTIRE_ROW'
  applyToRow?: boolean; // highlight entire row if condition is met in column
  ruleType: ConditionalRuleType;
  // For cell_value
  condition?: CellValueCondition;
  value?: string | number;
  secondValue?: string | number;
  style?: ConditionalFormatStyle;
  // For color_scale
  colorScale?: ColorScaleConfig;
  // For data_bar
  dataBar?: DataBarConfig;
  // For icon_set
  iconSet?: IconSetConfig;
  stopIfTrue?: boolean;
}

export interface Register {
  id: string;
  title: string;
  titleTe?: string;
  description: string;
  descriptionTe?: string;
  category: 'education' | 'finance' | 'inventory' | 'attendance' | 'custom';
  columns: ColumnDef[];
  rows: RowData[];
  createdAt: string;
  updatedAt: string;
  themeColor?: string; // Google Forms theme color (e.g. '#673ab7', '#3f51b5', '#009688', etc.)
  pivotTables?: SavedPivotTable[];
  conditionalRules?: ConditionalFormattingRule[];
  sourceFileName?: string;
  sheetName?: string;
  isExcelUpload?: boolean;
}

export interface SavedPivotTable {
  id: string;
  name: string;
  config: GoogleSheetsPivotConfig;
  formatMode?: 'default' | 'currency' | 'percent';
  createdAt?: string;
  updatedAt?: string;
}

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'median';

export interface FilterCondition {
  id: string;
  columnId: string;
  operator: 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'between' | 'in';
  value: any;
  secondValue?: any;
}

export interface SortConfig {
  columnId: string;
  direction: 'asc' | 'desc';
}

export type GoogleSheetsAggregation = 
  | 'SUM' 
  | 'COUNTA' 
  | 'COUNT' 
  | 'COUNTUNIQUE' 
  | 'AVERAGE' 
  | 'MAX' 
  | 'MIN' 
  | 'MEDIAN' 
  | 'PRODUCT' 
  | 'STDEV' 
  | 'VAR';

export type PivotShowAs = 'DEFAULT' | 'PERCENT_OF_ROW' | 'PERCENT_OF_COLUMN' | 'PERCENT_OF_GRAND_TOTAL';

export interface PivotRowConfig {
  id: string; // field id
  order: 'asc' | 'desc';
  sortBy: 'self' | string; // 'self' or value field ID
  showTotals: boolean;
  repeatRowLabels?: boolean;
}

export interface PivotColumnConfig {
  id: string; // field id
  order: 'asc' | 'desc';
  sortBy: 'self' | string;
  showTotals: boolean;
}

export interface PivotValueConfig {
  id: string; // field id
  summarizeBy: GoogleSheetsAggregation;
  showAs: PivotShowAs;
  customName?: string;
}

export interface PivotFilterConfig {
  id: string; // field id
  selectedValues: string[]; // values included
  showingAll: boolean;
}

export interface GoogleSheetsPivotConfig {
  rows: PivotRowConfig[];
  columns: PivotColumnConfig[];
  values: PivotValueConfig[];
  filters: PivotFilterConfig[];
  layoutValuesAs?: 'COLUMNS' | 'ROWS';
}

export interface PivotConfig {
  rowField: string;
  columnField: string;
  valueField: string;
  aggregation: AggregationType;
}

export interface NumericColumnStats {
  columnId: string;
  columnName: string;
  count: number;
  validCount: number;
  sum: number;
  mean: number;
  median: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  outliers: { rowIndex: number; value: number }[];
}

export type ActiveTab = 'register' | 'form_builder' | 'fill_form' | 'pivot' | 'lookup_studio' | 'explorer' | 'about' | 'settings';

export interface DepartmentProfile {
  departmentName: string;
  departmentNameTe?: string;
  subDepartment?: string;
  addressLine1: string;
  addressLine2?: string;
  cityStatePincode?: string;
  contactNumber?: string;
  email?: string;
  officeCode?: string;
  showOnAppHeader?: boolean;
  showOnPrintHeader?: boolean;
}
