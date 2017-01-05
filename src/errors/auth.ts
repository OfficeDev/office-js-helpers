/**
 * Custom error type to handle OAuth specific errors.
 */

export class AuthError extends Error {
    /**
     * @constructor
     *
     * @param message Error message to be propagated.
     * @param state OAuth state if available.
    */
    constructor(message: string, public state?: string) {
        super(message);
        this.name = 'AuthError';
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
