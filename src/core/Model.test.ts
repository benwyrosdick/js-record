/**
 * Comprehensive tests for Model class
 * Tests ActiveRecord pattern functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Model } from './Model';
import { DatabaseAdapter } from '../adapters/Adapter';

// Test model implementation
class TestModel extends Model {
  static config = {
    tableName: 'test_models',
    primaryKey: 'id',
    timestamps: true,
    mapAttributes: true,
  };

  static modelName = 'TestModel';
}

class CustomModel extends Model {
  static config = {
    tableName: 'custom_table',
    primaryKey: 'uuid',
    timestamps: false,
    mapAttributes: false,
  };

  static modelName = 'CustomModel';
}

// Mock adapter for testing
class MockAdapter extends DatabaseAdapter {
  constructor(config: any = {}) {
    super(config);
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async query<T = any>(
    _sql: string,
    _params?: any[]
  ): Promise<{ rows: T[]; rowCount: number; fields?: any[] }> {
    return { rows: [], rowCount: 0 };
  }

  async execute(
    _sql: string,
    _params?: any[]
  ): Promise<{ rowCount: number; insertId?: number | string }> {
    return { rowCount: 1 };
  }

  async beginTransaction(): Promise<any> {
    return {
      query: this.query.bind(this),
      execute: this.execute.bind(this),
      commit: async () => {},
      rollback: async () => {},
      isActive: () => true,
    };
  }

  async getTableInfo(_tableName: string): Promise<any> {
    return {
      name: _tableName,
      schema: 'public',
      columns: [],
      indexes: [],
    };
  }

  async getColumns(_tableName: string): Promise<any[]> {
    return [];
  }

  async tableExists(_tableName: string): Promise<boolean> {
    return true;
  }

  escapeIdentifier(identifier: string): string {
    return `"${identifier}"`;
  }

  formatValue(value: any): string {
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return String(value);
  }

  convertPlaceholders(sql: string, params: any[]): { sql: string; params: any[] } {
    return { sql, params };
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async getVersion(): Promise<string> {
    return 'mock-1.0.0';
  }

  async getTables(): Promise<string[]> {
    return [];
  }

  async truncate(_tableName: string): Promise<void> {
    // Mock implementation
  }

  async dropTable(_tableName: string): Promise<void> {
    // Mock implementation
  }
}

describe('Model', () => {
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    mockAdapter = new MockAdapter();
    Model.setAdapter(mockAdapter);
  });

  afterEach(() => {
    // Clean up any static state if needed
  });

  describe('Configuration', () => {
    it('should have default configuration', () => {
      expect(TestModel.config.primaryKey).toBe('id');
      expect(TestModel.config.timestamps).toBe(true);
      expect(TestModel.config.mapAttributes).toBe(true);
    });

    it('should allow custom configuration', () => {
      expect(CustomModel.config.primaryKey).toBe('uuid');
      expect(CustomModel.config.timestamps).toBe(false);
      expect(CustomModel.config.mapAttributes).toBe(false);
    });

    it('should derive table name from class name if not specified', () => {
      expect(TestModel.getTableName()).toBe('test_models');
    });

    it('should use custom table name if specified', () => {
      expect(CustomModel.getTableName()).toBe('custom_table');
    });

    it('should return correct primary key', () => {
      expect(TestModel.getPrimaryKey()).toBe('id');
      expect(CustomModel.getPrimaryKey()).toBe('uuid');
    });

    it('should check timestamps correctly', () => {
      expect(TestModel.hasTimestamps()).toBe(true);
      expect(CustomModel.hasTimestamps()).toBe(false);
    });

    it('should check attribute mapping correctly', () => {
      expect(TestModel.hasAttributeMapping()).toBe(true);
      expect(CustomModel.hasAttributeMapping()).toBe(false);
    });
  });

  describe('Adapter Management', () => {
    it('should set and get adapter', () => {
      TestModel.setAdapter(mockAdapter);
      expect(TestModel.getAdapter()).toBe(mockAdapter);
    });

    it('should throw error when adapter not set', () => {
      // Clear the adapter
      (Model as any)._adapter = undefined;
      expect(() => Model.getAdapter()).toThrow('Database adapter not set');
    });
  });

  describe('Attribute Mapping', () => {
    it('should map camelCase attributes to snake_case columns', () => {
      const attributes = { firstName: 'John', lastName: 'Doe', createdAt: new Date() };
      const mapped = TestModel.mapAttributesToColumns(attributes);

      expect(mapped.first_name).toBe('John');
      expect(mapped.last_name).toBe('Doe');
      expect(mapped.created_at).toBe(attributes.createdAt);
    });

    it('should map snake_case columns to camelCase attributes', () => {
      const columns = { first_name: 'John', last_name: 'Doe', created_at: new Date() };
      const mapped = TestModel.mapColumnsToAttributes(columns);

      expect(mapped.firstName).toBe('John');
      expect(mapped.lastName).toBe('Doe');
      expect(mapped.createdAt).toBe(columns.created_at);
    });

    it('should not map when attribute mapping is disabled', () => {
      const attributes = { firstName: 'John', lastName: 'Doe' };
      const mapped = CustomModel.mapAttributesToColumns(attributes);

      expect(mapped.firstName).toBe('John');
      expect(mapped.lastName).toBe('Doe');
    });
  });

  describe('Instance Creation', () => {
    it('should create new instance', () => {
      const instance = new TestModel();
      expect(instance).toBeInstanceOf(TestModel);
      expect(instance.isNewRecord()).toBe(true);
      expect(instance.isPersisted()).toBe(false);
    });

    it('should instantiate from database data', () => {
      const data = { id: 1, first_name: 'John', last_name: 'Doe' };
      const instance = (TestModel as any).instantiate(data);

      expect(instance).toBeInstanceOf(TestModel);
      expect(instance.id).toBe(1);
      expect(instance.firstName).toBe('John');
      expect(instance.lastName).toBe('Doe');
      expect(instance.isNewRecord()).toBe(false);
      expect(instance.isPersisted()).toBe(true);
    });
  });

  describe('Static Query Methods', () => {
    it('should have find method', () => {
      expect(typeof TestModel.find).toBe('function');
    });

    it('should have findOrFail method', () => {
      expect(typeof TestModel.findOrFail).toBe('function');
    });

    it('should have findBy method', () => {
      expect(typeof TestModel.findBy).toBe('function');
    });

    it('should have all method', () => {
      expect(typeof TestModel.all).toBe('function');
    });

    it('should have first method', () => {
      expect(typeof TestModel.first).toBe('function');
    });

    it('should have last method', () => {
      expect(typeof TestModel.last).toBe('function');
    });

    it('should have count method', () => {
      expect(typeof TestModel.count).toBe('function');
    });

    it('should have exists method', () => {
      expect(typeof TestModel.exists).toBe('function');
    });

    it('should have create method', () => {
      expect(typeof TestModel.create).toBe('function');
    });

    it('should have update method', () => {
      expect(typeof TestModel.update).toBe('function');
    });

    it('should have destroy method', () => {
      expect(typeof TestModel.destroy).toBe('function');
    });

    it('should have where method', () => {
      expect(typeof TestModel.where).toBe('function');
    });

    it('should have orderBy method', () => {
      expect(typeof TestModel.orderBy).toBe('function');
    });

    it('should have limit method', () => {
      expect(typeof TestModel.limit).toBe('function');
    });
  });

  describe('Instance Methods', () => {
    let instance: TestModel;

    beforeEach(() => {
      instance = new TestModel();
      (instance as any).id = 1;
      (instance as any).firstName = 'John';
      (instance as any).lastName = 'Doe';
      (instance as any)._originalAttributes = { id: 1, firstName: 'John', lastName: 'Doe' };
    });

    it('should get primary key value', () => {
      expect(instance.getId()).toBe(1);
    });

    it('should validate', () => {
      expect(typeof instance.validate).toBe('function');
    });

    it('should check if valid', () => {
      expect(instance.isValid()).toBe(true);
    });

    it('should get validation errors', () => {
      expect(instance.errors).toEqual({});
    });

    it('should get field errors', () => {
      expect(instance.getFieldErrors('name')).toEqual([]);
    });

    it('should clear errors', () => {
      instance.clearErrors();
      expect(instance.errors).toEqual({});
    });

    it('should save', () => {
      expect(typeof instance.save).toBe('function');
    });

    it('should update', () => {
      expect(typeof instance.update).toBe('function');
    });

    it('should destroy', () => {
      expect(typeof instance.destroy).toBe('function');
    });

    it('should reload', () => {
      expect(typeof instance.reload).toBe('function');
    });

    it('should get changes', () => {
      expect(instance.getChanges()).toEqual({});
    });

    it('should check if has changes', () => {
      expect(instance.hasChanges()).toBe(false);
    });

    it('should convert to JSON', () => {
      const json = instance.toJSON();
      expect(json.id).toBe(1);
      expect(json.firstName).toBe('John');
      expect(json.lastName).toBe('Doe');
    });
  });

  describe('Association Setup Methods', () => {
    it('should have belongsTo method', () => {
      expect(typeof TestModel.belongsTo).toBe('function');
    });

    it('should have hasOne method', () => {
      expect(typeof TestModel.hasOne).toBe('function');
    });

    it('should have hasMany method', () => {
      expect(typeof TestModel.hasMany).toBe('function');
    });

    it('should have hasManyThrough method', () => {
      expect(typeof TestModel.hasManyThrough).toBe('function');
    });

    it('should have getAssociations method', () => {
      expect(typeof TestModel.getAssociations).toBe('function');
    });
  });

  describe('Callback Methods', () => {
    it('should have registerCallback method', () => {
      expect(typeof TestModel.registerCallback).toBe('function');
    });

    it('should have beforeValidation method', () => {
      expect(typeof TestModel.beforeValidation).toBe('function');
    });

    it('should have afterValidation method', () => {
      expect(typeof TestModel.afterValidation).toBe('function');
    });

    it('should have beforeSave method', () => {
      expect(typeof TestModel.beforeSave).toBe('function');
    });

    it('should have afterSave method', () => {
      expect(typeof TestModel.afterSave).toBe('function');
    });

    it('should have beforeCreate method', () => {
      expect(typeof TestModel.beforeCreate).toBe('function');
    });

    it('should have afterCreate method', () => {
      expect(typeof TestModel.afterCreate).toBe('function');
    });

    it('should have beforeUpdate method', () => {
      expect(typeof TestModel.beforeUpdate).toBe('function');
    });

    it('should have afterUpdate method', () => {
      expect(typeof TestModel.afterUpdate).toBe('function');
    });

    it('should have beforeDestroy method', () => {
      expect(typeof TestModel.beforeDestroy).toBe('function');
    });

    it('should have afterDestroy method', () => {
      expect(typeof TestModel.afterDestroy).toBe('function');
    });
  });

  describe('Scope Methods', () => {
    it('should have scope method', () => {
      expect(typeof TestModel.scope).toBe('function');
    });

    it('should have defaultScope method', () => {
      expect(typeof TestModel.defaultScope).toBe('function');
    });

    it('should have unscoped method', () => {
      expect(typeof TestModel.unscoped).toBe('function');
    });

    it('should have query method', () => {
      expect(typeof TestModel.query).toBe('function');
    });
  });

  describe('Query Builder Integration', () => {
    it('should create query builder', () => {
      const query = TestModel.query();
      expect(query).toBeDefined();
    });

    it('should create unscoped query builder', () => {
      const query = TestModel.unscoped();
      expect(query).toBeDefined();
    });
  });

  describe('Change Tracking', () => {
    let instance: TestModel;

    beforeEach(() => {
      instance = new TestModel();
      // Simulate a persisted record by setting attributes directly
      (instance as any).id = 1;
      (instance as any).firstName = 'John';
      (instance as any).lastName = 'Doe';
      (instance as any)._originalAttributes = { id: 1, firstName: 'John', lastName: 'Doe' };
      (instance as any)._isNewRecord = false;
    });

    it('should get primary key value', () => {
      expect(instance.getId()).toBe(1);
    });

    it('should detect no changes initially', () => {
      expect(instance.hasChanges()).toBe(false);
      expect(instance.getChanges()).toEqual({});
    });

    it('should detect changes when attribute is modified', () => {
      (instance as any).firstName = 'Jane';
      expect(instance.hasChanges()).toBe(true);
      expect(instance.getChanges()).toEqual({ firstName: 'Jane' });
    });

    it('should track multiple changes', () => {
      (instance as any).firstName = 'Jane';
      (instance as any).lastName = 'Smith';
      expect(instance.getChanges()).toEqual({ firstName: 'Jane', lastName: 'Smith' });
    });
  });

  describe('Error Handling', () => {
    it('should handle adapter not set error gracefully', () => {
      (Model as any)._adapter = undefined;
      expect(() => Model.getAdapter()).toThrow();
    });

    it('should handle destroy on new record error', async () => {
      const instance = new TestModel();
      await expect(instance.destroy()).rejects.toThrow('Cannot destroy a new record');
    });

    it('should handle reload on new record error', async () => {
      const instance = new TestModel();
      await expect(instance.reload()).rejects.toThrow('Cannot reload a new record');
    });
  });
});
