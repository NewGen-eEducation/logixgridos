import { ColumnDef, ResponseValidation } from '../types/register';

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

/**
 * Validates a single question/column value according to Google Forms validation rules
 */
export function validateFormField(
  value: any,
  column: ColumnDef
): ValidationResult {
  const isRequired = column.required;

  // 1. Required Check
  const isEmpty = 
    value === null || 
    value === undefined || 
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0);

  if (isRequired && isEmpty) {
    return {
      isValid: false,
      error: 'This is a required question',
    };
  }

  // If value is empty and not required, pass
  if (isEmpty) {
    return { isValid: true, error: null };
  }

  const rule = column.validation;
  if (!rule || !rule.enabled) {
    return { isValid: true, error: null };
  }

  const customError = rule.customErrorMessage?.trim();

  // 2. Number Validations
  if (rule.category === 'number') {
    const num = Number(value);
    const targetVal = Number(rule.value);
    const secondVal = Number(rule.secondValue);

    if (isNaN(num)) {
      return {
        isValid: false,
        error: customError || 'Must be a number',
      };
    }

    switch (rule.operator) {
      case 'greater_than':
        if (num <= targetVal) {
          return { isValid: false, error: customError || `Must be greater than ${targetVal}` };
        }
        break;
      case 'greater_than_or_equal':
        if (num < targetVal) {
          return { isValid: false, error: customError || `Must be greater than or equal to ${targetVal}` };
        }
        break;
      case 'less_than':
        if (num >= targetVal) {
          return { isValid: false, error: customError || `Must be less than ${targetVal}` };
        }
        break;
      case 'less_than_or_equal':
        if (num > targetVal) {
          return { isValid: false, error: customError || `Must be less than or equal to ${targetVal}` };
        }
        break;
      case 'equal_to':
        if (num !== targetVal) {
          return { isValid: false, error: customError || `Must be equal to ${targetVal}` };
        }
        break;
      case 'not_equal_to':
        if (num === targetVal) {
          return { isValid: false, error: customError || `Must not be equal to ${targetVal}` };
        }
        break;
      case 'between':
        if (num < Math.min(targetVal, secondVal) || num > Math.max(targetVal, secondVal)) {
          return { isValid: false, error: customError || `Must be between ${targetVal} and ${secondVal}` };
        }
        break;
      case 'not_between':
        if (num >= Math.min(targetVal, secondVal) && num <= Math.max(targetVal, secondVal)) {
          return { isValid: false, error: customError || `Must not be between ${targetVal} and ${secondVal}` };
        }
        break;
      case 'is_number':
        // already checked !isNaN
        break;
      case 'whole_number':
        if (!Number.isInteger(num)) {
          return { isValid: false, error: customError || 'Must be a whole number (integer)' };
        }
        break;
    }
  }

  // 3. Text Validations
  if (rule.category === 'text') {
    const textStr = String(value);

    switch (rule.operator) {
      case 'contains':
        if (!textStr.includes(String(rule.value || ''))) {
          return { isValid: false, error: customError || `Must contain "${rule.value}"` };
        }
        break;
      case 'does_not_contain':
        if (textStr.includes(String(rule.value || ''))) {
          return { isValid: false, error: customError || `Must not contain "${rule.value}"` };
        }
        break;
      case 'email':
        if (!EMAIL_REGEX.test(textStr.trim())) {
          return { isValid: false, error: customError || 'Must be a valid email address' };
        }
        break;
      case 'url':
        if (!URL_REGEX.test(textStr.trim())) {
          return { isValid: false, error: customError || 'Must be a valid URL' };
        }
        break;
    }
  }

  // 4. Length Validations
  if (rule.category === 'length') {
    const len = String(value).length;
    const limit = Number(rule.value) || 0;

    switch (rule.operator) {
      case 'max_char_count':
        if (len > limit) {
          return { isValid: false, error: customError || `Maximum character count is ${limit}` };
        }
        break;
      case 'min_char_count':
        if (len < limit) {
          return { isValid: false, error: customError || `Minimum character count is ${limit}` };
        }
        break;
    }
  }

  // 5. Checkbox Validations (for multi-select checkboxes)
  if (rule.category === 'checkbox') {
    let selectedCount = 0;
    if (Array.isArray(value)) {
      selectedCount = value.length;
    } else if (typeof value === 'object' && value !== null) {
      selectedCount = Object.values(value).filter(Boolean).length;
    } else if (typeof value === 'string' && value.trim()) {
      selectedCount = value.split(',').filter(Boolean).length;
    }
    const targetCount = Number(rule.value) || 0;

    switch (rule.operator) {
      case 'select_at_least':
        if (selectedCount < targetCount) {
          return { isValid: false, error: customError || `Select at least ${targetCount} options` };
        }
        break;
      case 'select_at_most':
        if (selectedCount > targetCount) {
          return { isValid: false, error: customError || `Select at most ${targetCount} options` };
        }
        break;
      case 'select_exactly':
        if (selectedCount !== targetCount) {
          return { isValid: false, error: customError || `Select exactly ${targetCount} options` };
        }
        break;
    }
  }

  // 6. Regular Expression Validations
  if (rule.category === 'regex') {
    const textStr = String(value);
    const patternStr = String(rule.value || '');
    try {
      const reg = new RegExp(patternStr);
      switch (rule.operator) {
        case 'contains':
          if (!reg.test(textStr)) {
            return { isValid: false, error: customError || `Pattern mismatch` };
          }
          break;
        case 'does_not_contain':
          if (reg.test(textStr)) {
            return { isValid: false, error: customError || `Must not match pattern` };
          }
          break;
        case 'matches': {
          const matchReg = new RegExp(`^${patternStr}$`);
          if (!matchReg.test(textStr)) {
            return { isValid: false, error: customError || `Must fully match pattern` };
          }
          break;
        }
        case 'does_not_match': {
          const matchReg = new RegExp(`^${patternStr}$`);
          if (matchReg.test(textStr)) {
            return { isValid: false, error: customError || `Must not match pattern` };
          }
          break;
        }
      }
    } catch {
      // Invalid regex pattern configuration
    }
  }

  return { isValid: true, error: null };
}

/**
 * Validates an entire response record against all form columns
 */
export function validateFormResponse(
  formData: Record<string, any>,
  columns: ColumnDef[]
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  let isValid = true;

  columns.forEach((col) => {
    if (col.type === 'formula') return; // formulas computed automatically
    const result = validateFormField(formData[col.id], col);
    if (!result.isValid && result.error) {
      errors[col.id] = result.error;
      isValid = false;
    }
  });

  return { isValid, errors };
}
