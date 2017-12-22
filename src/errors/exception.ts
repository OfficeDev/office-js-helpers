import { CustomError } from './custom.error';

/**
 * Error type to handle general errors.
 */
export class Exception extends CustomError {
  /**
   * @constructor
   *
   * @param message: Error message to be propagated.
   * @param innerError: Inner error if any
  */
  constructor(message: string, public innerError?: Error) {
    super('Exception', message, innerError);
  }
}

