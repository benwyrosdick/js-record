/**
 * Validation rule implementations
 */

import { Model } from '../core/Model';
import {
  PresenceOptions,
  LengthOptions,
  FormatOptions,
  NumericalityOptions,
  UniquenessOptions,
  InclusionOptions,
  ExclusionOptions,
  ConfirmationOptions,
  ValidationContext,
} from './types';

/**
 * Check if value is empty
 */
function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
}

/**
 * Presence validation
 * Validates that a value is present (not null, undefined, or empty)
 */
export function validatePresence(ctx: ValidationContext): string | null {
  const options: PresenceOptions = typeof ctx.options === 'boolean' ? {} : ctx.options;
  const { allowNull = false, allowEmpty = false, message } = options;

  if (ctx.value === null && !allowNull) {
    return message || `${ctx.field} can't be blank`;
  }

  if (ctx.value === undefined) {
    return message || `${ctx.field} can't be blank`;
  }

  if (!allowEmpty && isEmpty(ctx.value)) {
    return message || `${ctx.field} can't be blank`;
  }

  return null;
}

/**
 * Length validation
 * Validates the length of a string or array
 */
export function validateLength(ctx: ValidationContext): string | null {
  const options: LengthOptions = ctx.options;
  const value = ctx.value;

  if (isEmpty(value)) {
    return null; // Skip validation if empty (use presence validation for that)
  }

  const length = typeof value === 'string' || Array.isArray(value) ? value.length : 0;

  if (options.is !== undefined) {
    if (length !== options.is) {
      return (
        options.wrongLength ||
        options.message ||
        `${ctx.field} must be exactly ${options.is} characters`
      );
    }
  }

  if (options.min !== undefined && length < options.min) {
    return (
      options.tooShort ||
      options.message ||
      `${ctx.field} is too short (minimum is ${options.min} characters)`
    );
  }

  if (options.max !== undefined && length > options.max) {
    return (
      options.tooLong ||
      options.message ||
      `${ctx.field} is too long (maximum is ${options.max} characters)`
    );
  }

  return null;
}

/**
 * Format validation (regex)
 * Validates that a value matches a regular expression
 */
export function validateFormat(ctx: ValidationContext): string | null {
  const options: FormatOptions = ctx.options;
  const value = ctx.value;

  if (isEmpty(value)) {
    return null; // Skip validation if empty
  }

  if (typeof value !== 'string') {
    return options.message || `${ctx.field} must be a string`;
  }

  if (!options.pattern.test(value)) {
    return options.message || `${ctx.field} is invalid`;
  }

  return null;
}

/**
 * Numericality validation
 * Validates that a value is a number and meets specified conditions
 */
export function validateNumericality(ctx: ValidationContext): string | null {
  const options: NumericalityOptions = typeof ctx.options === 'boolean' ? {} : ctx.options;
  const value = ctx.value;

  if (isEmpty(value)) {
    return null; // Skip validation if empty
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num) || typeof num !== 'number') {
    return options.message || `${ctx.field} is not a number`;
  }

  if (options.onlyInteger && !Number.isInteger(num)) {
    return options.message || `${ctx.field} must be an integer`;
  }

  if (options.greaterThan !== undefined && num <= options.greaterThan) {
    return options.message || `${ctx.field} must be greater than ${options.greaterThan}`;
  }

  if (options.greaterThanOrEqualTo !== undefined && num < options.greaterThanOrEqualTo) {
    return (
      options.message ||
      `${ctx.field} must be greater than or equal to ${options.greaterThanOrEqualTo}`
    );
  }

  if (options.lessThan !== undefined && num >= options.lessThan) {
    return options.message || `${ctx.field} must be less than ${options.lessThan}`;
  }

  if (options.lessThanOrEqualTo !== undefined && num > options.lessThanOrEqualTo) {
    return (
      options.message || `${ctx.field} must be less than or equal to ${options.lessThanOrEqualTo}`
    );
  }

  if (options.equalTo !== undefined && num !== options.equalTo) {
    return options.message || `${ctx.field} must be equal to ${options.equalTo}`;
  }

  if (options.odd && num % 2 === 0) {
    return options.message || `${ctx.field} must be odd`;
  }

  if (options.even && num % 2 !== 0) {
    return options.message || `${ctx.field} must be even`;
  }

  return null;
}

/**
 * Uniqueness validation
 * Validates that a value is unique in the database
 */
export async function validateUniqueness(ctx: ValidationContext): Promise<string | null> {
  const options: UniquenessOptions = typeof ctx.options === 'boolean' ? {} : ctx.options;
  const { scope, caseSensitive = true, message } = options;
  const value = ctx.value;

  if (isEmpty(value)) {
    return null; // Skip validation if empty
  }

  const ModelClass = ctx.model.constructor as typeof Model;
  const adapter = ModelClass.getAdapter();
  const tableName = ModelClass.getTableName();
  const primaryKey = ModelClass.getPrimaryKey();

  // Build query conditions
  const conditions: Record<string, any> = {
    [ctx.field]: caseSensitive ? value : value.toString().toLowerCase(),
  };

  // Add scope conditions
  if (scope) {
    const scopeFields = Array.isArray(scope) ? scope : [scope];
    for (const scopeField of scopeFields) {
      conditions[scopeField] = (ctx.model as any)[scopeField];
    }
  }

  // Build SQL query
  let sql = `SELECT COUNT(*) as count FROM ${adapter.escapeIdentifier(tableName)} WHERE `;
  const params: any[] = [];
  const whereParts: string[] = [];

  for (const [key, val] of Object.entries(conditions)) {
    params.push(val);
    if (key === ctx.field && !caseSensitive) {
      whereParts.push(`LOWER(${adapter.escapeIdentifier(key)}) = LOWER($${params.length})`);
    } else {
      whereParts.push(`${adapter.escapeIdentifier(key)} = $${params.length}`);
    }
  }

  sql += whereParts.join(' AND ');

  // Exclude current record if updating
  if (!ctx.model.isNewRecord()) {
    const id = (ctx.model as any)[primaryKey];
    params.push(id);
    sql += ` AND ${adapter.escapeIdentifier(primaryKey)} != $${params.length}`;
  }

  const result = await adapter.query<{ count: string }>(sql, params);
  const count = parseInt(result.rows[0]?.count || '0', 10);

  if (count > 0) {
    return message || `${ctx.field} has already been taken`;
  }

  return null;
}

/**
 * Inclusion validation
 * Validates that a value is in a list
 */
export function validateInclusion(ctx: ValidationContext): string | null {
  const options: InclusionOptions = ctx.options;
  const value = ctx.value;

  if (isEmpty(value)) {
    return null; // Skip validation if empty
  }

  if (!options.in.includes(value)) {
    return options.message || `${ctx.field} is not included in the list`;
  }

  return null;
}

/**
 * Exclusion validation
 * Validates that a value is not in a list
 */
export function validateExclusion(ctx: ValidationContext): string | null {
  const options: ExclusionOptions = ctx.options;
  const value = ctx.value;

  if (isEmpty(value)) {
    return null; // Skip validation if empty
  }

  if (options.in.includes(value)) {
    return options.message || `${ctx.field} is reserved`;
  }

  return null;
}

/**
 * Confirmation validation
 * Validates that a field matches its confirmation field
 */
export function validateConfirmation(ctx: ValidationContext): string | null {
  const options: ConfirmationOptions = typeof ctx.options === 'boolean' ? {} : ctx.options;
  const value = ctx.value;
  const confirmationField = `${ctx.field}_confirmation`;
  const confirmationValue = (ctx.model as any)[confirmationField];

  if (isEmpty(value)) {
    return null; // Skip validation if empty
  }

  if (value !== confirmationValue) {
    return options.message || `${ctx.field} doesn't match confirmation`;
  }

  return null;
}
