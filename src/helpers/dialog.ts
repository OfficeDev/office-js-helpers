/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. See LICENSE in the project root for license information. */

import { Utilities } from './utilities';
import { DialogError } from '../errors/dialog';
declare var microsoftTeams: any;

interface DialogResult {
    parse: boolean,
    value: any
}

/**
 * An optimized size object computed based on Screen Height & Screen Width
 */
export interface IDialogSize {
    /**
     * Max available width in pixels
     */
    width: number;

    /**
     * Max available width in percentage
     */
    width$: number;

    /**
     * Max available height in pixels
     */
    height: number;

    /**
     * Max available height in percentage
     */
    height$: number;
}

export class Dialog<T> {
    /**
     * @constructor
     *
     * @param url Url to be opened in the dialog.
     * @param width Width of the dialog.
     * @param height Height of the dialog.
    */
    constructor(
        public url: string = location.origin,
        private width: number = 1024,
        private height: number = 768,
        public useTeamsDialog: boolean = false
    ) {
        if (!Utilities.isAddin) {
            throw new DialogError('This API cannot be used outside of Office.js');
        }

        if (!(/^https/.test(url))) {
            throw new DialogError('URL has to be loaded over HTTPS.');
        }

        this.size = this._optimizeSize(width, height);
    }

    private _result: Promise<T>;
    get result(): Promise<T> {
        if (this._result == null) {
            this._result = this.useTeamsDialog ? this._teamsDialog() : this._addinDialog();
        }

        return this._result;
    }

    size: IDialogSize;

    private _addinDialog(): Promise<T> {
        return new Promise((resolve, reject) => {
            Office.context.ui.displayDialogAsync(this.url, { width: this.size.width$, height: this.size.height$ }, (result: Office.AsyncResult) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    throw new DialogError(result.error.message);
                }
                else {
                    let dialog = result.value as Office.DialogHandler;
                    dialog.addEventHandler(Office.EventType.DialogMessageReceived, args => {
                        try {
                            let result = this._safeParse(args.message) as DialogResult;
                            if (result.parse) {
                                resolve(this._safeParse(result.value));
                            }
                            else {
                                resolve(result.value);
                            }
                        }
                        catch (exception) {
                            reject(new DialogError('An unexpected error in the dialog has occured.', exception));
                        }
                        finally {
                            dialog.close();
                        }
                    });

                    dialog.addEventHandler(Office.EventType.DialogEventReceived, args => {
                        try {
                            reject(new DialogError(args.message, args.error));
                        }
                        catch (exception) {
                            reject(new DialogError('An unexpected error in the dialog has occured.', exception));
                        }
                        finally {
                            dialog.close();
                        }
                    });
                }
            });
        });
    }

    private _teamsDialog(): Promise<T> {
        return new Promise((resolve, reject) => {
            microsoftTeams.authentication.authenticate({
                url: this.url,
                width: this.size.width,
                height: this.size.height,
                failureCallback: exception => reject(new DialogError('Error while launching dialog', exception)),
                successCallback: message => resolve(message)
            });
        });
    }

    /**
     * Close any open dialog by providing an optional message.
     * If more than one dialogs are attempted to be opened
     * an expcetion will be created.
     */
    static close(message?: any, useTeamsDialog: boolean = false) {
        if (!Utilities.isAddin) {
            throw new DialogError('This API cannot be used outside of Office.js');
        }

        let parse = false;
        let value = message;

        if ((!(value == null)) && typeof value === 'object') {
            parse = true;
            value = JSON.stringify(value);
        }
        else if (typeof message === 'function') {
            throw new DialogError('Invalid message. Canno\'t pass functions as arguments');
        }

        try {
            if (useTeamsDialog) {
                microsoftTeams.authentication.notifySuccess(JSON.stringify(<DialogResult>{ parse, value }));
            }
            else {
                Office.context.ui.messageParent(JSON.stringify(<DialogResult>{ parse, value }));
            }
        }
        catch (error) {
            throw new DialogError('Canno\'t close dialog', error);
        }
    }

    private _getSize(width: number, height: number) {
        let screenWidth = window.screen.width;

        if (width && height) {
            return this._optimizeSize(width, height);
        }
        else if (screenWidth <= 640) {
            return this._optimizeSize(640, 480);
        }
        else if (screenWidth <= 1366) {
            return this._optimizeSize(1024, 768);
        }
        else if (screenWidth <= 1920) {
            return this._optimizeSize(1600, 900);
        }
    }

    private _optimizeSize(width: number, height: number): IDialogSize {
        let screenWidth = window.screen.width;
        let screenHeight = window.screen.height;

        let optimizedWidth = this._maxSize(width, screenWidth);
        let optimizedHeight = this._maxSize(height, screenHeight);

        return {
            width$: this._percentage(optimizedWidth, screenWidth),
            height$: this._percentage(optimizedHeight, screenHeight),
            width: optimizedWidth,
            height: optimizedHeight
        };
    }

    private _maxSize(value: number, max: number) {
        return value < (max - 30) ? value : max - 30;
    };

    private _percentage(value: number, max: number) {
        return (value * 100 / max);
    }

    private _safeParse(data: string) {
        try {
            let result = JSON.parse(data);
            return result;
        }
        catch (e) {
            return data;
        }
    }
}
