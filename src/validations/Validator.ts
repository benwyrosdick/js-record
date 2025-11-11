/**
 * Validator class
 * Main validation orchestrator
 */

import { Model } from '../core/Model';
import { ValidationRules, ValidationErrors, CustomValidationOptions } from './types';
import {
  validatePresence,
  validateLength,
  validateFormat,
  validateNumericality,
  validateUniqueness,
  validateInclusion,
  validateExclusion,
  validateConfirmation,
} from './rules';

export class Validator {
  private model: Model;
  private rules: ValidationRules;
  private errors: ValidationErrors = {};

  constructor(model: Model, rules: ValidationRules) {
    this.model = model;
    this.rules = rules;
  }

  /**
   * Validate the model
   * Returns true if valid, false if invalid
   */
  async validate(): Promise<boolean> {
    this.errors = {};

    for (const [field, fieldRules] of Object.entries(this.rules)) {
      const value = (this.model as any)[field];

      // Presence validation
      if (fieldRules.presence) {
        const error = validatePresence({
          model: this.model,
          field,
          value,
          options: fieldRules.presence,
        });
        if (error) {
          this.addError(field, error);
        }
      }

      // Length validation
      if (fieldRules.length) {
        const error = validateLength({
          model: this.model,
          field,
          value,
          options: fieldRules.length,
        });
        if (error) {
          this.addError(field, error);
        }
      }

      // Format validation
      if (fieldRules.format) {
        const error = validateFormat({
          model: this.model,
          field,
          value,
          options: fieldRules.format,
        });
        if (error) {
          this.addError(field, error);
        }
      }

      // Numericality validation
      if (fieldRules.numericality) {
        const error = validateNumericality({
          model: this.model,
          field,
          value,
          options: fieldRules.numericality,
        });
        if (error) {
          this.addError(field, error);
        }
      }

      // Uniqueness validation (async)
      if (fieldRules.uniqueness) {
        const error = await validateUniqueness({
          model: this.model,
          field,
          value,
          options: fieldRules.uniqueness,
        });
        if (error) {
          this.addError(field, error);
        }
      }

      // Inclusion validation
      if (fieldRules.inclusion) {
        const error = validateInclusion({
          model: this.model,
          field,
          value,
          options: fieldRules.inclusion,
        });
        if (error) {
          this.addError(field, error);
        }
      }

      // Exclusion validation
      if (fieldRules.exclusion) {
        const error = validateExclusion({
          model: this.model,
          field,
          value,
          options: fieldRules.exclusion,
        });
        if (error) {
          this.addError(field, error);
        }
      }

      // Confirmation validation
      if (fieldRules.confirmation) {
        const error = validateConfirmation({
          model: this.model,
          field,
          value,
          options: fieldRules.confirmation,
        });
        if (error) {
          this.addError(field, error);
        }
      }

      // Custom validation
      if (fieldRules.custom) {
        const error = await this.validateCustom(field, value, fieldRules.custom);
        if (error) {
          this.addError(field, error);
        }
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  /**
   * Run custom validation
   */
  private async validateCustom(field: string, value: any, options: any): Promise<string | null> {
    let validator: any;
    let message: string | undefined;

    if (typeof options === 'function') {
      validator = options;
    } else {
      const customOptions = options as CustomValidationOptions;
      validator = customOptions.validator;
      message = customOptions.message;
    }

    try {
      const result = await validator(value, this.model);
      if (!result) {
        return message || `${field} is invalid`;
      }
    } catch (error) {
      return message || `${field} validation failed`;
    }

    return null;
  }

  /**
   * Add an error for a field
   */
  private addError(field: string, message: string): void {
    if (!this.errors[field]) {
      this.errors[field] = [];
    }
    this.errors[field].push(message);
  }

  /**
   * Get all validation errors
   */
  getErrors(): ValidationErrors {
    return this.errors;
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(field: string): string[] {
    return this.errors[field] || [];
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  /**
   * Get the first error message
   */
  getFirstError(): string | null {
    const fields = Object.keys(this.errors);
    if (fields.length === 0) {
      return null;
    }
    const firstField = fields[0];
    if (!firstField) {
      return null;
    }
    const fieldErrors = this.errors[firstField];
    const firstError = fieldErrors && fieldErrors.length > 0 ? fieldErrors[0] : undefined;
    return firstError || null;
  }

  /**
   * Get all error messages as a flat array
   */
  getAllErrorMessages(): string[] {
    const messages: string[] = [];
    for (const field in this.errors) {
      if (this.errors[field]) {
        messages.push(...this.errors[field]);
      }
    }
    return messages;
  }
}
