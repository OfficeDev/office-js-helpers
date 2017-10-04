// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

import { CustomError } from './custom.error';

/**
 * Custom error type to handle API specific errors.
 */
export class APIError extends CustomError {
  /**
   * @constructor
   *
   * @param message: Error message to be propagated.
   * @param innerError: Inner error if any
  */
  constructor(message: string, public innerError?: Error) {
    super('APIError', message, innerError);
  }
}
