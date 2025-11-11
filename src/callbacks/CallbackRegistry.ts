/**
 * CallbackRegistry
 * Manages and executes callbacks for model lifecycle events
 */

import { Model } from '../core/Model';
import {
  CallbackType,
  CallbackFunction,
  CallbackRegistration,
  CallbackOptions,
  CallbackResult,
} from './types';

export class CallbackRegistry {
  private callbacks: Map<CallbackType, CallbackRegistration[]> = new Map();

  /**
   * Register a callback
   */
  register(type: CallbackType, method: string | CallbackFunction, options?: CallbackOptions): void {
    if (!this.callbacks.has(type)) {
      this.callbacks.set(type, []);
    }

    const registration: CallbackRegistration = {
      type,
      method,
      options,
    };

    const callbacks = this.callbacks.get(type)!;

    if (options?.prepend) {
      callbacks.unshift(registration);
    } else {
      callbacks.push(registration);
    }
  }

  /**
   * Run all callbacks for a specific type
   * Returns false if any callback halts the chain
   */
  async run(type: CallbackType, model: Model): Promise<CallbackResult> {
    const callbacks = this.callbacks.get(type) || [];

    for (const registration of callbacks) {
      try {
        // Check conditional execution
        if (registration.options?.if) {
          const condition = await registration.options.if(model);
          if (!condition) {
            continue; // Skip this callback
          }
        }

        if (registration.options?.unless) {
          const condition = await registration.options.unless(model);
          if (condition) {
            continue; // Skip this callback
          }
        }

        // Execute the callback
        const result = await this.executeCallback(registration, model);

        // If callback returns false, halt the chain
        if (result === false) {
          return {
            success: false,
            halted: true,
          };
        }
      } catch (error) {
        return {
          success: false,
          halted: true,
          error: error as Error,
        };
      }
    }

    return {
      success: true,
      halted: false,
    };
  }

  /**
   * Execute a single callback
   */
  private async executeCallback(
    registration: CallbackRegistration,
    model: Model
  ): Promise<void | boolean> {
    if (typeof registration.method === 'string') {
      // Call instance method by name
      const method = (model as any)[registration.method];
      if (typeof method === 'function') {
        return await method.call(model);
      } else {
        throw new Error(`Callback method '${registration.method}' not found on model`);
      }
    } else {
      // Call function directly
      return await registration.method(model);
    }
  }

  /**
   * Check if any callbacks are registered for a type
   */
  has(type: CallbackType): boolean {
    const callbacks = this.callbacks.get(type);
    return callbacks !== undefined && callbacks.length > 0;
  }

  /**
   * Get all callbacks for a type
   */
  get(type: CallbackType): CallbackRegistration[] {
    return this.callbacks.get(type) || [];
  }

  /**
   * Clear all callbacks for a type
   */
  clear(type?: CallbackType): void {
    if (type) {
      this.callbacks.delete(type);
    } else {
      this.callbacks.clear();
    }
  }

  /**
   * Get all registered callback types
   */
  getTypes(): CallbackType[] {
    return Array.from(this.callbacks.keys());
  }
}
