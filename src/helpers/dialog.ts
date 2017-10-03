/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

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
  /**
   * Width in pixels
   */
  width: number;

  /**
   * Width in percentage
   */
  width$: number;

  /**
   * Height in pixels
   */
  height: number;

  /**
   * Height in percentage
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
    width: number = 1024,
    height: number = 768,
    public useTeamsDialog: boolean = false
  ) {
    if (!(/^https/.test(url))) {
      throw new DialogError('URL has to be loaded over HTTPS.');
    }

    this.size = this._optimizeSize(width, height);
  }

  private _result: Promise<T>;
  get result(): Promise<T> {
    if (this._result == null) {
      if (this.useTeamsDialog) {
        this._result = this._teamsDialog();
      } else if (Utilities.isAddin) {
        this._result = this._addinDialog();
      } else {
        this._result = this._webDialog();
      }
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
      try {
        microsoftTeams.initialize();
      }
      catch (e) {

      }
      microsoftTeams.authentication.authenticate({
        url: this.url,
        width: this.size.width,
        height: this.size.height,
        failureCallback: exception => reject(new DialogError('Error while launching dialog', exception as any)),
        successCallback: message => resolve(message as any)
      });
    });
  }

  private _webDialog(): Promise<T> {
    return new Promise((resolve, reject) => {
      try {
        let windowFeatures = `width=${this.size.width},height=${this.size.height},menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no`;
        window.open(this.url, this.url, windowFeatures);
        const handler = event => {
          if (event.origin === location.origin) {
            window.removeEventListener('message', handler);
            resolve(event.data);
          }
        };
        window.addEventListener('message', handler);
      } catch (exception) {
        return reject(new DialogError('Unexpected error occured while creating popup', exception));
      }
    });
  }

  /**
   * Close any open dialog by providing an optional message.
   * If more than one dialogs are attempted to be opened
   * an expcetion will be created.
   */
  static close(message?: any, useTeamsDialog: boolean = false) {
    let parse = false;
    let value = message;

    if ((!(value == null)) && typeof value === 'object') {
      parse = true;
      value = JSON.stringify(value);
    }
    else if (typeof message === 'function') {
      throw new DialogError('Invalid message. Cannot pass functions as arguments');
    }

    try {
      if (useTeamsDialog) {
        try {
          microsoftTeams.initialize();
        }
        catch (e) {

        }
        microsoftTeams.authentication.notifySuccess(JSON.stringify(<DialogResult>{ parse, value }));
      }
      else if (Utilities.isAddin) {
        Office.context.ui.messageParent(JSON.stringify(<DialogResult>{ parse, value }));
      }
      else {
        window.postMessage(location.href, location.origin);
      }
    }
    catch (error) {
      throw new DialogError('Cannot close dialog', error);
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
  }

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
