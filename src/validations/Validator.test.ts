/**
 * Tests for Validator class
 */

import { describe, it, beforeEach, expect } from 'bun:test';
import { Validator } from './Validator';
import { ValidationRules, CustomValidationFunction } from './types';

// Mock model for testing
class MockModel {
  [key: string]: any;
  isNewRecord() {
    return true;
  }
}

describe('Validator', () => {
  let mockModel: MockModel;
  let validator: Validator;
  let rules: ValidationRules;

  beforeEach(() => {
    mockModel = new MockModel();
    rules = {};
    validator = new Validator(mockModel, rules);
  });

  describe('constructor', () => {
    it('should initialize with model and rules', () => {
      expect(validator).toBeInstanceOf(Validator);
      expect(validator.getErrors()).toEqual({});
      expect(validator.hasErrors()).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return true for valid model with no rules', async () => {
      const isValid = await validator.validate();
      expect(isValid).toBe(true);
      expect(validator.hasErrors()).toBe(false);
    });

    it('should return true for valid model with passing validations', async () => {
      mockModel.name = 'John Doe';
      mockModel.email = 'john@example.com';
      mockModel.age = 25;

      rules = {
        name: { presence: true },
        email: {
          presence: true,
          format: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        },
        age: {
          presence: true,
          numericality: { greaterThanOrEqualTo: 0 },
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(true);
      expect(validator.hasErrors()).toBe(false);
    });

    it('should return false for invalid model', async () => {
      mockModel.name = '';
      mockModel.email = 'invalid-email';
      mockModel.age = -5;

      rules = {
        name: { presence: true },
        email: {
          presence: true,
          format: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        },
        age: {
          numericality: { greaterThanOrEqualTo: 0 },
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.hasErrors()).toBe(true);
    });

    it('should collect multiple errors per field', async () => {
      mockModel.email = 'invalid-email';

      rules = {
        email: {
          presence: true,
          format: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
          length: { min: 10 },
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      const errors = validator.getFieldErrors('email');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle presence validation', async () => {
      rules = {
        name: { presence: true },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('name')).toContain("name can't be blank");
    });

    it('should handle length validation', async () => {
      mockModel.name = 'Jo'; // Too short

      rules = {
        name: {
          presence: true,
          length: { min: 3, max: 50 },
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('name')).toContain(
        'name is too short (minimum is 3 characters)'
      );
    });

    it('should handle format validation', async () => {
      mockModel.email = 'invalid-email';

      rules = {
        email: {
          presence: true,
          format: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('email')).toContain('email is invalid');
    });

    it('should handle numericality validation', async () => {
      mockModel.age = 'not-a-number';

      rules = {
        age: {
          numericality: true,
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('age')).toContain('age is not a number');
    });

    it('should handle inclusion validation', async () => {
      mockModel.status = 'invalid';

      rules = {
        status: {
          inclusion: { in: ['active', 'inactive'] },
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('status')).toContain('status is not included in the list');
    });

    it('should handle exclusion validation', async () => {
      mockModel.username = 'admin';

      rules = {
        username: {
          exclusion: { in: ['admin', 'root'] },
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('username')).toContain('username is reserved');
    });

    it('should handle confirmation validation', async () => {
      mockModel.password = 'secret123';
      mockModel.password_confirmation = 'different';

      rules = {
        password: {
          confirmation: true,
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('password')).toContain("password doesn't match confirmation");
    });

    it('should handle custom validation with function', async () => {
      mockModel.value = 'invalid';

      const customValidator: CustomValidationFunction = value => {
        return value === 'valid';
      };

      rules = {
        value: {
          custom: customValidator,
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('value')).toContain('value is invalid');
    });

    it('should handle custom validation with options', async () => {
      mockModel.value = 'invalid';

      const customValidator: CustomValidationFunction = value => {
        return value === 'valid';
      };

      rules = {
        value: {
          custom: {
            validator: customValidator,
            message: 'Custom validation failed',
          },
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('value')).toContain('Custom validation failed');
    });

    it('should handle async custom validation', async () => {
      mockModel.value = 'invalid';

      const customValidator: CustomValidationFunction = async value => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 10));
        return value === 'valid';
      };

      rules = {
        value: {
          custom: customValidator,
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('value')).toContain('value is invalid');
    });

    it('should handle custom validation that throws', async () => {
      mockModel.value = 'invalid';

      const customValidator: CustomValidationFunction = () => {
        throw new Error('Validation error');
      };

      rules = {
        value: {
          custom: customValidator,
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('value')).toContain('value validation failed');
    });

    it('should reset errors on each validation', async () => {
      // First validation - should fail
      rules = { name: { presence: true } };
      validator = new Validator(mockModel, rules);
      await validator.validate();
      expect(validator.hasErrors()).toBe(true);

      // Fix the model and validate again
      mockModel.name = 'John';
      const isValid = await validator.validate();
      expect(isValid).toBe(true);
      expect(validator.hasErrors()).toBe(false);
    });
  });

  describe('error management', () => {
    beforeEach(() => {
      mockModel.name = '';
      rules = { name: { presence: true } };
      validator = new Validator(mockModel, rules);
    });

    it('should get all errors', async () => {
      await validator.validate();
      const errors = validator.getErrors();
      expect(errors).toHaveProperty('name');
      expect(Array.isArray(errors.name)).toBe(true);
    });

    it('should get field errors', async () => {
      await validator.validate();
      const fieldErrors = validator.getFieldErrors('name');
      expect(Array.isArray(fieldErrors)).toBe(true);
      expect(fieldErrors.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-existent field', async () => {
      await validator.validate();
      const fieldErrors = validator.getFieldErrors('nonexistent');
      expect(fieldErrors).toEqual([]);
    });

    it('should check if has errors', async () => {
      expect(validator.hasErrors()).toBe(false);
      await validator.validate();
      expect(validator.hasErrors()).toBe(true);
    });

    it('should get first error', async () => {
      await validator.validate();
      const firstError = validator.getFirstError();
      expect(firstError).toBe("name can't be blank");
    });

    it('should return null for first error when no errors', () => {
      const firstError = validator.getFirstError();
      expect(firstError).toBeNull();
    });

    it('should get all error messages', async () => {
      mockModel.name = '';
      mockModel.email = 'invalid';
      rules = {
        name: { presence: true },
        email: {
          presence: true,
          format: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        },
      };
      validator = new Validator(mockModel, rules);

      await validator.validate();
      const allMessages = validator.getAllErrorMessages();

      expect(Array.isArray(allMessages)).toBe(true);
      expect(allMessages.length).toBeGreaterThan(0);
      expect(allMessages).toContain("name can't be blank");
      expect(allMessages).toContain('email is invalid');
    });

    it('should handle multiple errors per field', async () => {
      mockModel.email = 'x'; // Invalid format and too short
      rules = {
        email: {
          presence: true,
          format: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
          length: { min: 5 },
        },
      };
      validator = new Validator(mockModel, rules);

      await validator.validate();
      const fieldErrors = validator.getFieldErrors('email');

      expect(fieldErrors.length).toBeGreaterThan(1);
    });
  });

  describe('complex validation scenarios', () => {
    it('should validate multiple fields with different rules', async () => {
      mockModel.name = 'John';
      mockModel.email = 'john@example.com';
      mockModel.age = 25;
      mockModel.status = 'active';
      mockModel.password = 'secret123';
      mockModel.password_confirmation = 'secret123';

      rules = {
        name: {
          presence: true,
          length: { min: 2, max: 50 },
        },
        email: {
          presence: true,
          format: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        },
        age: {
          numericality: {
            onlyInteger: true,
            greaterThanOrEqualTo: 0,
            lessThanOrEqualTo: 150,
          },
        },
        status: {
          inclusion: { in: ['active', 'inactive', 'pending'] },
        },
        password: {
          length: { min: 8 },
          confirmation: true,
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(true);
      expect(validator.hasErrors()).toBe(false);
    });

    it('should collect errors from multiple failed validations', async () => {
      mockModel.name = '';
      mockModel.email = 'invalid';
      mockModel.age = -5;
      mockModel.status = 'invalid';
      mockModel.password = '123';
      mockModel.password_confirmation = '456';

      rules = {
        name: { presence: true },
        email: {
          presence: true,
          format: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        },
        age: {
          numericality: { greaterThanOrEqualTo: 0 },
        },
        status: {
          inclusion: { in: ['active', 'inactive', 'pending'] },
        },
        password: {
          length: { min: 8 },
          confirmation: true,
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.hasErrors()).toBe(true);

      const allErrors = validator.getErrors();
      expect(Object.keys(allErrors)).toContain('name');
      expect(Object.keys(allErrors)).toContain('email');
      expect(Object.keys(allErrors)).toContain('age');
      expect(Object.keys(allErrors)).toContain('status');
      expect(Object.keys(allErrors)).toContain('password');
    });

    it('should handle validation with custom messages', async () => {
      mockModel.name = '';
      mockModel.email = 'invalid';

      rules = {
        name: {
          presence: {
            message: 'Name is required',
          },
        },
        email: {
          presence: true,
          format: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Must be a valid email address',
          },
        },
      };

      validator = new Validator(mockModel, rules);
      await validator.validate();

      expect(validator.getFieldErrors('name')).toContain('Name is required');
      expect(validator.getFieldErrors('email')).toContain('Must be a valid email address');
    });

    it('should handle conditional validation scenarios', async () => {
      mockModel.type = 'premium';
      mockModel.creditCard = '';

      rules = {
        type: {
          inclusion: { in: ['basic', 'premium'] },
        },
        creditCard: {
          presence: {
            message: 'Credit card is required for premium accounts',
          },
        },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('creditCard')).toContain(
        'Credit card is required for premium accounts'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty rules object', async () => {
      validator = new Validator(mockModel, {});
      const isValid = await validator.validate();
      expect(isValid).toBe(true);
    });

    it('should handle null and undefined values', async () => {
      mockModel.value = null;
      mockModel.otherValue = undefined;

      rules = {
        value: { presence: { allowNull: true } },
        otherValue: { presence: true },
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(false);
      expect(validator.getFieldErrors('otherValue')).toContain("otherValue can't be blank");
      expect(validator.getFieldErrors('value')).toEqual([]);
    });

    it('should handle validation with empty options', async () => {
      mockModel.name = 'John';

      rules = {
        name: { presence: {} }, // Empty options object
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(true);
    });

    it('should handle validation with boolean options', async () => {
      mockModel.name = 'John';
      mockModel.age = 25;

      rules = {
        name: { presence: true }, // Boolean true
        age: { numericality: true }, // Boolean true
      };

      validator = new Validator(mockModel, rules);
      const isValid = await validator.validate();

      expect(isValid).toBe(true);
    });
  });
});
