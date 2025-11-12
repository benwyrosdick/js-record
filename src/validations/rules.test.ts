/**
 * Tests for validation rules
 */

import { describe, it, beforeEach, expect } from 'bun:test';
import {
  validatePresence,
  validateLength,
  validateFormat,
  validateNumericality,
  validateInclusion,
  validateExclusion,
  validateConfirmation,
} from './rules';
import { ValidationContext } from './types';

// Mock model for testing
class MockModel {
  [key: string]: any;
  isNewRecord() {
    return true;
  }
}

describe('Validation Rules', () => {
  let mockModel: MockModel;

  beforeEach(() => {
    mockModel = new MockModel();
  });

  describe('validatePresence', () => {
    it('should pass when value is present', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'John',
        options: true,
      };

      const result = validatePresence(ctx);
      expect(result).toBeNull();
    });

    it('should fail when value is undefined', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: undefined,
        options: true,
      };

      const result = validatePresence(ctx);
      expect(result).toBe("name can't be blank");
    });

    it('should fail when value is null', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: null,
        options: true,
      };

      const result = validatePresence(ctx);
      expect(result).toBe("name can't be blank");
    });

    it('should fail when value is empty string', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: '',
        options: true,
      };

      const result = validatePresence(ctx);
      expect(result).toBe("name can't be blank");
    });

    it('should fail when value is whitespace only', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: '   ',
        options: true,
      };

      const result = validatePresence(ctx);
      expect(result).toBe("name can't be blank");
    });

    it('should fail when value is empty array', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'tags',
        value: [],
        options: true,
      };

      const result = validatePresence(ctx);
      expect(result).toBe("tags can't be blank");
    });

    it('should allow null when allowNull is true', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: null,
        options: { allowNull: true },
      };

      const result = validatePresence(ctx);
      expect(result).toBeNull();
    });

    it('should allow empty string when allowEmpty is true', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: '',
        options: { allowEmpty: true },
      };

      const result = validatePresence(ctx);
      expect(result).toBeNull();
    });

    it('should use custom message', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: null,
        options: { message: 'Name is required' },
      };

      const result = validatePresence(ctx);
      expect(result).toBe('Name is required');
    });

    it('should pass with zero value', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'count',
        value: 0,
        options: true,
      };

      const result = validatePresence(ctx);
      expect(result).toBeNull();
    });

    it('should pass with false value', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'active',
        value: false,
        options: true,
      };

      const result = validatePresence(ctx);
      expect(result).toBeNull();
    });
  });

  describe('validateLength', () => {
    it('should pass when length is exactly as specified', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'John',
        options: { is: 4 },
      };

      const result = validateLength(ctx);
      expect(result).toBeNull();
    });

    it('should fail when length is not exactly as specified', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'John',
        options: { is: 5 },
      };

      const result = validateLength(ctx);
      expect(result).toBe('name must be exactly 5 characters');
    });

    it('should pass when length meets minimum requirement', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'John',
        options: { min: 3 },
      };

      const result = validateLength(ctx);
      expect(result).toBeNull();
    });

    it('should fail when length is below minimum', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'Jo',
        options: { min: 3 },
      };

      const result = validateLength(ctx);
      expect(result).toBe('name is too short (minimum is 3 characters)');
    });

    it('should pass when length meets maximum requirement', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'John',
        options: { max: 10 },
      };

      const result = validateLength(ctx);
      expect(result).toBeNull();
    });

    it('should fail when length exceeds maximum', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'Very Long Name',
        options: { max: 10 },
      };

      const result = validateLength(ctx);
      expect(result).toBe('name is too long (maximum is 10 characters)');
    });

    it('should pass when length is within range', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'John',
        options: { min: 3, max: 10 },
      };

      const result = validateLength(ctx);
      expect(result).toBeNull();
    });

    it('should work with arrays', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'tags',
        value: ['tag1', 'tag2', 'tag3'],
        options: { min: 2, max: 5 },
      };

      const result = validateLength(ctx);
      expect(result).toBeNull();
    });

    it('should skip validation for empty values', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: '',
        options: { min: 3 },
      };

      const result = validateLength(ctx);
      expect(result).toBeNull();
    });

    it('should use custom messages', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'Jo',
        options: {
          min: 3,
          tooShort: 'Too short!',
          message: 'Invalid length',
        },
      };

      const result = validateLength(ctx);
      expect(result).toBe('Too short!');
    });

    it('should use wrongLength message for exact length mismatch', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'name',
        value: 'John',
        options: {
          is: 5,
          wrongLength: 'Wrong length!',
        },
      };

      const result = validateLength(ctx);
      expect(result).toBe('Wrong length!');
    });

    it('should handle non-string/non-array values', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 25,
        options: { min: 1 },
      };

      const result = validateLength(ctx);
      expect(result).toBe('age is too short (minimum is 1 characters)');
    });
  });

  describe('validateFormat', () => {
    it('should pass when value matches pattern', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'email',
        value: 'test@example.com',
        options: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      };

      const result = validateFormat(ctx);
      expect(result).toBeNull();
    });

    it('should fail when value does not match pattern', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'email',
        value: 'invalid-email',
        options: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      };

      const result = validateFormat(ctx);
      expect(result).toBe('email is invalid');
    });

    it('should skip validation for empty values', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'email',
        value: '',
        options: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      };

      const result = validateFormat(ctx);
      expect(result).toBeNull();
    });

    it('should fail for non-string values', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'email',
        value: 123,
        options: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      };

      const result = validateFormat(ctx);
      expect(result).toBe('email must be a string');
    });

    it('should use custom message', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'email',
        value: 'invalid',
        options: {
          pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          message: 'Must be a valid email',
        },
      };

      const result = validateFormat(ctx);
      expect(result).toBe('Must be a valid email');
    });

    it('should work with complex regex patterns', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'phone',
        value: '123-456-7890',
        options: { pattern: /^\d{3}-\d{3}-\d{4}$/ },
      };

      const result = validateFormat(ctx);
      expect(result).toBeNull();
    });
  });

  describe('validateNumericality', () => {
    it('should pass for valid numbers', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 25,
        options: true,
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should pass for numeric strings', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: '25',
        options: true,
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should fail for non-numeric values', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 'abc',
        options: true,
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('age is not a number');
    });

    it('should fail for NaN', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: NaN,
        options: true,
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('age is not a number');
    });

    it('should skip validation for empty values', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: '',
        options: true,
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should pass for integers when onlyInteger is true', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 25,
        options: { onlyInteger: true },
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should fail for floats when onlyInteger is true', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 25.5,
        options: { onlyInteger: true },
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('age must be an integer');
    });

    it('should pass when greaterThan condition is met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 25,
        options: { greaterThan: 18 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should fail when greaterThan condition is not met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 15,
        options: { greaterThan: 18 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('age must be greater than 18');
    });

    it('should pass when greaterThanOrEqualTo condition is met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 18,
        options: { greaterThanOrEqualTo: 18 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should fail when greaterThanOrEqualTo condition is not met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 17,
        options: { greaterThanOrEqualTo: 18 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('age must be greater than or equal to 18');
    });

    it('should pass when lessThan condition is met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 25,
        options: { lessThan: 30 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should fail when lessThan condition is not met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 35,
        options: { lessThan: 30 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('age must be less than 30');
    });

    it('should pass when lessThanOrEqualTo condition is met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 30,
        options: { lessThanOrEqualTo: 30 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should fail when lessThanOrEqualTo condition is not met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 35,
        options: { lessThanOrEqualTo: 30 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('age must be less than or equal to 30');
    });

    it('should pass when equalTo condition is met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 25,
        options: { equalTo: 25 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should fail when equalTo condition is not met', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 30,
        options: { equalTo: 25 },
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('age must be equal to 25');
    });

    it('should pass for odd numbers when odd is true', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'count',
        value: 3,
        options: { odd: true },
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should fail for even numbers when odd is true', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'count',
        value: 4,
        options: { odd: true },
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('count must be odd');
    });

    it('should pass for even numbers when even is true', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'count',
        value: 4,
        options: { even: true },
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });

    it('should fail for odd numbers when even is true', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'count',
        value: 3,
        options: { even: true },
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('count must be even');
    });

    it('should use custom message', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 'abc',
        options: { message: 'Must be a number' },
      };

      const result = validateNumericality(ctx);
      expect(result).toBe('Must be a number');
    });

    it('should handle multiple conditions', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'age',
        value: 25,
        options: {
          onlyInteger: true,
          greaterThanOrEqualTo: 18,
          lessThanOrEqualTo: 65,
        },
      };

      const result = validateNumericality(ctx);
      expect(result).toBeNull();
    });
  });

  describe('validateInclusion', () => {
    it('should pass when value is included in list', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'status',
        value: 'active',
        options: { in: ['active', 'inactive', 'pending'] },
      };

      const result = validateInclusion(ctx);
      expect(result).toBeNull();
    });

    it('should fail when value is not included in list', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'status',
        value: 'invalid',
        options: { in: ['active', 'inactive', 'pending'] },
      };

      const result = validateInclusion(ctx);
      expect(result).toBe('status is not included in the list');
    });

    it('should skip validation for empty values', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'status',
        value: '',
        options: { in: ['active', 'inactive', 'pending'] },
      };

      const result = validateInclusion(ctx);
      expect(result).toBeNull();
    });

    it('should work with numbers', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'priority',
        value: 2,
        options: { in: [1, 2, 3] },
      };

      const result = validateInclusion(ctx);
      expect(result).toBeNull();
    });

    it('should use custom message', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'status',
        value: 'invalid',
        options: {
          in: ['active', 'inactive', 'pending'],
          message: 'Invalid status',
        },
      };

      const result = validateInclusion(ctx);
      expect(result).toBe('Invalid status');
    });

    it('should handle mixed type arrays', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'value',
        value: 'test',
        options: { in: [1, 'test', true, null] },
      };

      const result = validateInclusion(ctx);
      expect(result).toBeNull();
    });
  });

  describe('validateExclusion', () => {
    it('should pass when value is not excluded from list', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'username',
        value: 'john',
        options: { in: ['admin', 'root', 'system'] },
      };

      const result = validateExclusion(ctx);
      expect(result).toBeNull();
    });

    it('should fail when value is excluded from list', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'username',
        value: 'admin',
        options: { in: ['admin', 'root', 'system'] },
      };

      const result = validateExclusion(ctx);
      expect(result).toBe('username is reserved');
    });

    it('should skip validation for empty values', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'username',
        value: '',
        options: { in: ['admin', 'root', 'system'] },
      };

      const result = validateExclusion(ctx);
      expect(result).toBeNull();
    });

    it('should work with numbers', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'id',
        value: 999,
        options: { in: [0, 999, -1] },
      };

      const result = validateExclusion(ctx);
      expect(result).toBe('id is reserved');
    });

    it('should use custom message', () => {
      const ctx: ValidationContext = {
        model: mockModel,
        field: 'username',
        value: 'admin',
        options: {
          in: ['admin', 'root', 'system'],
          message: 'Username is not allowed',
        },
      };

      const result = validateExclusion(ctx);
      expect(result).toBe('Username is not allowed');
    });
  });

  describe('validateConfirmation', () => {
    it('should pass when confirmation matches', () => {
      mockModel.password = 'secret123';
      mockModel.password_confirmation = 'secret123';

      const ctx: ValidationContext = {
        model: mockModel,
        field: 'password',
        value: 'secret123',
        options: true,
      };

      const result = validateConfirmation(ctx);
      expect(result).toBeNull();
    });

    it('should fail when confirmation does not match', () => {
      mockModel.password = 'secret123';
      mockModel.password_confirmation = 'different';

      const ctx: ValidationContext = {
        model: mockModel,
        field: 'password',
        value: 'secret123',
        options: true,
      };

      const result = validateConfirmation(ctx);
      expect(result).toBe("password doesn't match confirmation");
    });

    it('should fail when confirmation field is missing', () => {
      mockModel.password = 'secret123';
      // password_confirmation not set

      const ctx: ValidationContext = {
        model: mockModel,
        field: 'password',
        value: 'secret123',
        options: true,
      };

      const result = validateConfirmation(ctx);
      expect(result).toBe("password doesn't match confirmation");
    });

    it('should skip validation for empty values', () => {
      mockModel.password = '';
      mockModel.password_confirmation = '';

      const ctx: ValidationContext = {
        model: mockModel,
        field: 'password',
        value: '',
        options: true,
      };

      const result = validateConfirmation(ctx);
      expect(result).toBeNull();
    });

    it('should use custom message', () => {
      mockModel.password = 'secret123';
      mockModel.password_confirmation = 'different';

      const ctx: ValidationContext = {
        model: mockModel,
        field: 'password',
        value: 'secret123',
        options: { message: 'Passwords do not match' },
      };

      const result = validateConfirmation(ctx);
      expect(result).toBe('Passwords do not match');
    });

    it('should work with different field names', () => {
      mockModel.email = 'test@example.com';
      mockModel.email_confirmation = 'test@example.com';

      const ctx: ValidationContext = {
        model: mockModel,
        field: 'email',
        value: 'test@example.com',
        options: true,
      };

      const result = validateConfirmation(ctx);
      expect(result).toBeNull();
    });
  });
});
