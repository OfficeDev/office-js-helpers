/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

/**
 * Custom error type to handle API specific errors.
 */

export class APIError extends Error {
    /**
     * @constructor
     *
     * @param message Error message to be propagated.
     * @param state OAuth state if available.
    */
    constructor(message: string, public innerError?: Error | any) {
        super(message);
        this.name = 'APIError';
        this.message = message;
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
