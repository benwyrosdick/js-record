/**
 * Validation types and interfaces
 */

import { Model } from '../core/Model';

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validation errors grouped by field
 */
export type ValidationErrors = Record<string, string[]>;

/**
 * Custom validation function
 */
export type CustomValidationFunction = (value: any, model: Model) => boolean | Promise<boolean>;

/**
 * Presence validation options
 */
export interface PresenceOptions {
  message?: string;
  allowNull?: boolean;
  allowEmpty?: boolean;
}

/**
 * Length validation options
 */
export interface LengthOptions {
  min?: number;
  max?: number;
  is?: number;
  message?: string;
  tooShort?: string;
  tooLong?: string;
  wrongLength?: string;
}

/**
 * Format validation options (regex)
 */
export interface FormatOptions {
  pattern: RegExp;
  message?: string;
}

/**
 * Numericality validation options
 */
export interface NumericalityOptions {
  onlyInteger?: boolean;
  greaterThan?: number;
  greaterThanOrEqualTo?: number;
  lessThan?: number;
  lessThanOrEqualTo?: number;
  equalTo?: number;
  odd?: boolean;
  even?: boolean;
  message?: string;
}

/**
 * Uniqueness validation options
 */
export interface UniquenessOptions {
  scope?: string | string[];
  caseSensitive?: boolean;
  message?: string;
}

/**
 * Inclusion validation options
 */
export interface InclusionOptions {
  in: any[];
  message?: string;
}

/**
 * Exclusion validation options
 */
export interface ExclusionOptions {
  in: any[];
  message?: string;
}

/**
 * Confirmation validation options (e.g., password confirmation)
 */
export interface ConfirmationOptions {
  message?: string;
}

/**
 * Custom validation options
 */
export interface CustomValidationOptions {
  validator: CustomValidationFunction;
  message?: string;
}

/**
 * All validation rule options
 */
export interface ValidationRuleOptions {
  presence?: boolean | PresenceOptions;
  length?: LengthOptions;
  format?: FormatOptions;
  numericality?: boolean | NumericalityOptions;
  uniqueness?: boolean | UniquenessOptions;
  inclusion?: InclusionOptions;
  exclusion?: ExclusionOptions;
  confirmation?: boolean | ConfirmationOptions;
  custom?: CustomValidationFunction | CustomValidationOptions;
}

/**
 * Validation rules for a model
 */
export type ValidationRules = Record<string, ValidationRuleOptions>;

/**
 * Validation context
 */
export interface ValidationContext {
  model: Model;
  field: string;
  value: any;
  options: any;
}
