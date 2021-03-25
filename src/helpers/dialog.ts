// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

import { Utilities } from './utilities';
import { CustomError } from '../errors/custom.error';

interface DialogResult {
  parse: boolean,
  value: any
}

/**
 * Custom error type to handle API specific errors.
 */
export class DialogError extends CustomError {
  /**
   * @constructor
   *
   * @param message Error message to be propagated.
   * @param state OAuth state if available.
  */
  constructor(message: string, public innerError?: Error) {
    super('DialogError', message, innerError);
  }
}


/**
 * An optimized size object computed based on Screen Height & Screen Width
 */
export interface IDialogSize {
  // Width in pixels
  width: number;

  // Width in percentage
  width$: number;

  // Height in pixels
  height: number;

  // Height in percentage
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
    width: number = 1024,
    height: number = 768,
    public useTeamsDialog: boolean = false
  ) {
    if (!(/^https/.test(url))) {
      throw new DialogError('URL has to be loaded over HTTPS.');
    }

    this.size = this._optimizeSize(width, height);
  }

  private readonly _windowFeatures = ',menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no';
  private static readonly key = 'VGVtcG9yYXJ5S2V5Rm9yT0pIQXV0aA==';

  private _result: Promise<T>;
  get result(): Promise<T> {
    if (this._result == null) {
      if (this.useTeamsDialog) {
        this._result = this._teamsDialog();
      }
      else if (Utilities.isAddin) {
        this._result = this._addinDialog();
      }
      else if (Utilities.isEdge) {
        this._result = this._edgeDialog();
      }
      else {
        this._result = this._webDialog();
      }
    }
    return this._result;
  }

  size: IDialogSize;

  private _addinDialog<T>(): Promise<T> {
    return new Promise((resolve, reject) => {
      Office.context.ui.displayDialogAsync(this.url, { width: this.size.width$, height: this.size.height$ }, (result: Office.AsyncResult) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          reject(new DialogError(result.error.message, result.error));
        }
        else {
          let dialog = result.value as Office.DialogHandler;
          dialog.addEventHandler(Office.EventType.DialogMessageReceived, args => {
            let result = this._safeParse(args.message) as T;
            resolve(result);
            dialog.close();
          });

          dialog.addEventHandler(Office.EventType.DialogEventReceived, args => {
            reject(new DialogError(args.message, args.error));
            dialog.close();
          });
        }
      });
    });
  }

  private _teamsDialog(): Promise<T> {
    return new Promise((resolve, reject) => {
      microsoftTeams.initialize();
      microsoftTeams.authentication.authenticate({
        url: this.url,
        width: this.size.width,
        height: this.size.height,
        failureCallback: exception => reject(new DialogError('Error while launching dialog', exception as any)),
        successCallback: message => resolve(this._safeParse(message))
      });
    });
  }

  private _webDialog(): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        const options = 'width=' + this.size.width + ',height=' + this.size.height + this._windowFeatures;
        window.open(this.url, this.url, options);
        if (Utilities.isIE) {
          this._pollLocalStorageForToken(resolve, reject);
        }
        else {
          const handler = event => {
            if (event.origin === location.origin) {
              window.removeEventListener('message', handler, false);
              resolve(this._safeParse(event.data));
            }
          };
          window.addEventListener('message', handler);
        }
      }
      catch (exception) {
        return reject(new DialogError('Unexpected error occurred while creating popup', exception));
      }
    });
  }

  private _edgeDialog(): Promise<T> {
    return new Promise((resolve, reject) => {
      Office.context.ui.displayDialogAsync(this.url, { width: this.size.width$, height: this.size.height$ }, (result: Office.AsyncResult) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          reject(new DialogError(result.error.message, result.error));
        }
        else {
          const dialog = result.value as Office.DialogHandler;

          dialog.addEventHandler(Office.EventType.DialogMessageReceived, args => {
            let result = this._safeParse(args.message) as T;
            resolve(result);
            dialog.close();
          });

          dialog.addEventHandler(Office.EventType.DialogEventReceived, args => {
            reject(new DialogError(args.message, args.error));
            dialog.close();
          });
        }
      });
    });
  }

  private _pollLocalStorageForToken(resolve: (value: T) => void, reject: (reason: DialogError) => void) {
    localStorage.removeItem(Dialog.key);
    const POLL_INTERVAL = 400;
    let interval = setInterval(() => {
      try {
        const data = localStorage.getItem(Dialog.key);
        if (!(data == null)) {
          clearInterval(interval);
          localStorage.removeItem(Dialog.key);
          return resolve(this._safeParse(data));
        }
      }
      catch (exception) {
        clearInterval(interval);
        localStorage.removeItem(Dialog.key);
        return reject(new DialogError('Unexpected error occurred in the dialog', exception));
      }
    }, POLL_INTERVAL);
  }

  /**
   * Close any open dialog by providing an optional message.
   * If more than one dialogs are attempted to be opened
   * an exception will be created.
   */
  static close(message?: any, useTeamsDialog: boolean = false) {
    let parse = false;
    let value = message;

    if (typeof message === 'function') {
      throw new DialogError('Invalid message. Cannot pass functions as arguments');
    }
    else if ((!(value == null)) && typeof value === 'object') {
      parse = true;
      value = JSON.stringify(value);
    }

    try {
      if (useTeamsDialog) {
        microsoftTeams.initialize();
        microsoftTeams.authentication.notifySuccess(JSON.stringify(<DialogResult>{ parse, value }));
      }
      else if (Utilities.isAddin || Utilities.isEdge) {
        Office.context.ui.messageParent(JSON.stringify(<DialogResult>{ parse, value }));
      }
      else {
        if (Utilities.isIE) {
          localStorage.setItem(Dialog.key, JSON.stringify(<DialogResult>{ parse, value }));
        }
        else if (window.opener) {
          window.opener.postMessage(JSON.stringify(<DialogResult>{ parse, value }), location.origin);
        }
        window.close();
      }
    }
    catch (error) {
      throw new DialogError('Cannot close dialog', error);
    }
  }

  private _optimizeSize(desiredWidth: number, desiredHeight: number): IDialogSize {
    const { width: screenWidth, height: screenHeight } = window.screen;

    const width = this._maxSize(desiredWidth, screenWidth);
    const height = this._maxSize(desiredHeight, screenHeight);
    const width$ = this._percentage(width, screenWidth);
    const height$ = this._percentage(height, screenHeight);

    return { width$, height$, width, height };
  }

  private _maxSize(value: number, max: number) {
    return value < (max - 30) ? value : max - 30;
  }

  private _percentage(value: number, max: number) {
    return (value * 100 / max);
  }

  private _safeParse(data: string) {
    try {
      let result = JSON.parse(data) as DialogResult;
      if (result.parse === true) {
        return this._safeParse(result.value);
      }
      return result.value;
    }
    catch (_e) {
      return data;
    }
  }
}
