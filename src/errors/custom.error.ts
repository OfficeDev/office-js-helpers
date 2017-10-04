// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

/**
 * Custom error type
 */
export abstract class CustomError extends Error {
  constructor(public name: string, public message: string, public innerError?: Error) {
    super(message);
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
    else {
      let error = new Error();
      if (error.stack) {
        let last_part = error.stack.match(/[^\s]+$/);
        this.stack = `${this.name} at ${last_part}`;
      }
    }
  }
}
