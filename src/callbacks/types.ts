/**
 * Callback types and interfaces
 */

import { Model } from '../core/Model';

/**
 * Callback function signature
 * Returns false or throws error to halt the callback chain
 */
export type CallbackFunction = (model: Model) => void | boolean | Promise<void | boolean>;

/**
 * Available callback hooks in model lifecycle
 */
export type CallbackType =
  | 'beforeValidation'
  | 'afterValidation'
  | 'beforeSave'
  | 'afterSave'
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDestroy'
  | 'afterDestroy';

/**
 * Callback registration information
 */
export interface CallbackRegistration {
  type: CallbackType;
  method: string | CallbackFunction;
  options?: CallbackOptions;
}

/**
 * Options for callback registration
 */
export interface CallbackOptions {
  if?: (model: Model) => boolean | Promise<boolean>;
  unless?: (model: Model) => boolean | Promise<boolean>;
  prepend?: boolean; // Add to beginning instead of end
}

/**
 * Result from running a callback
 */
export interface CallbackResult {
  success: boolean;
  halted: boolean;
  error?: Error;
}
