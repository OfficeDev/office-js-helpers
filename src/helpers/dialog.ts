/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information. */

export class DialogError extends Error {
    /**
     * @constructor
     *
     * @param message Error message to be propagated.
     * @param state OAuth state if available.
    */
    constructor(message: string, public code: number = 12006, public innerError?: Error) {
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

export class Dialog {
    private _dialog;

    /**
     * @constructor
     *
     * @param url Url to be opened in the dialog.
     * @param width Width of the dialog.
     * @param height Height of the dialog.
    */
    constructor(
        public url: string = location.origin,
        public width: 640,
        public height: 480
    ) {
        if (!(/^https/.test(url))) {
            throw new DialogError('URL has to be loaded over HTTPS.');
        }
        else {

        }
    }

    /**
     * Opens a new dialog and returns a promise.
     * The promise only resolves if the dialog was closed using the `close` function.
     * If the user dismisses the dialog, the promise rejects.
     */
    open(): Promise<string> {
        let windowSize = this._determineDialogSize();
        return new Promise<string>((resolve, reject) => {
            Office.context.ui.displayDialogAsync(this.url, windowSize, (result: Office.AsyncResult) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    throw new DialogError(result.error.message);
                }
                else {
                    this._dialog = result.value;
                    this._dialog.addEventHandler(Office.EventType.DialogMessageReceived, args => {
                        try {
                            return resolve(args.message);
                        }
                        catch (exception) {
                            return new DialogError('An unexpected error in the dialog has occured.', 12006, exception) as any;
                        }
                    });
                    this._dialog.addEventHandler(Office.EventType.DialogEventReceived, args => {
                        try {
                            let error = this._errorHandler(args.error);
                            if (!(error == null)) {
                                return reject(error);
                            }
                        }
                        catch (exception) {
                            return new DialogError('An unexpected error in the dialog has occured.', 12006, exception) as any;
                        }
                    });
                }
            });
        });
    }

    /**
     * Close any open dialog by providing an optional message.
     * The method is static as only one given dialog can be open at a time.
     * If more than one dialogs are attempted to be opened and expcetion will be created.
     */
    static close(message?: string) {
        Office.context.ui.messageParent(message);
    }

    private _errorHandler(code) {
        switch (code) {
            case 12000: return new DialogError('An invalid dialog width was provided.', code);
            case 12001: return new DialogError('An invalid dialog height was provided.', code);
            case 12002: return new DialogError('Cannot navigate to url, make sure the url is correct and the page exists.', code);
            case 12004: return new DialogError('The provided url is untrusted and needs to be listed in the AppDomains.', code);
            case 12003:
            case 12005: return new DialogError('The page has to be loaded over https.', code);
            case 12006: return new DialogError('Dialog was dismissed by the user.', code);
            case 12007: return new DialogError('An other dialog is already open. Please wait or dismiss the previous dialog first.', code);
            case 12008: return;
            case 12009: return new DialogError('The user did not permit the dialog to be opened.', code);
            case 12011: return new DialogError('The dialog cannot be communicated over CrossZones', code);
            default: return new DialogError('An unexpected error in the dialog has occured.', code);
        }
    }

    private _determineDialogSize() {
        let screenHeight = window.screen.height;
        let screenWidth = window.screen.width;

        if (screenWidth <= 640) {
            return this._scale(640, 480, screenWidth, screenHeight);
        }
        else if (screenWidth <= 1007) {
            return this._scale(1024, 768, screenWidth, screenHeight);
        }
        else {
            return this._scale(1024, 768, screenWidth, screenHeight);
        }
    }

    private _scale(width: number, height: number, screenWidth: number, screenHeight: number) {
        let minOrDefault = (value: number, isHorizontal: boolean) => {
            let dimension = isHorizontal ? screenWidth : screenHeight;
            return value < dimension ? value : dimension - 30;
        };

        let percentage = (value: number, isHorizontal: boolean) => isHorizontal ? (value * 100 / screenWidth) : (value * 100 / screenHeight);

        return {
            width: percentage(minOrDefault(width, true), true),
            height: percentage(minOrDefault(height, false), false),
            toPixels: () => {
                return {
                    width: minOrDefault(width, true),
                    height: minOrDefault(height, false)
                };
            }
        };
    }
}
