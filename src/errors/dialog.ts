/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information. */

/**
 * Custom error type to handle Dialog specific errors.
 */

export class DialogError extends Error {
    /**
     * @constructor
     *
     * @param message Error message to be propagated.
     * @param state OAuth state if available.
    */
    constructor(message: string, public innerError?: Error | Office.AsyncResult) {
        super(message);
        this.name = 'DialogError';
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
