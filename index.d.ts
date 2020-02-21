declare module '@microsoft/office-js-helpers/authentication/authenticator' {
  import { EndpointStorage } from '@microsoft/office-js-helpers/authentication/endpoint/index';
  import { TokenStorage, IToken, ICode, IError } from '@microsoft/office-js-helpers/authentication/token/index';
  import { CustomError } from '@microsoft/office-js-helpers/errors/custom/index';
  /**
   * Custom error type to handle OAuth specific errors.
   */
  export class AuthError extends CustomError {
      innerError?: Error;
      /**
       * @constructor
       *
       * @param message Error message to be propagated.
       * @param state OAuth state if available.
      */
      constructor(message: string, innerError?: Error);
  }
  /**
   * Helper for performing Implicit OAuth Authentication with registered endpoints.
   */
  export class Authenticator {
      endpoints?: EndpointStorage;
      tokens?: TokenStorage;
      /**
       * @constructor
       *
       * @param endpoints Depends on an instance of EndpointStorage.
       * @param tokens Depends on an instance of TokenStorage.
      */
      constructor(endpoints?: EndpointStorage, tokens?: TokenStorage);
      /**
       * Authenticate based on the given provider.
       * Either uses DialogAPI or Window Popups based on where it's being called from (either Add-in or Web).
       * If the token was cached, then it retrieves the cached token.
       * If the cached token has expired then the authentication dialog is displayed.
       *
       * NOTE: you have to manually check the expires_in or expires_at property to determine
       * if the token has expired.
       *
       * @param {string} provider Link to the provider.
       * @param {boolean} force Force re-authentication.
       * @return {Promise<IToken|ICode>} Returns a promise of the token, code, or error.
       */
      authenticate(provider: string, force?: boolean, useMicrosoftTeams?: boolean): Promise<IToken>;
      /**
       * Check if the current url is running inside of a Dialog that contains an access_token, code, or error.
       * If true then it calls messageParent by extracting the token information, thereby closing the dialog.
       * Otherwise, the caller should proceed with normal initialization of their application.
       *
       * This logic assumes that the redirect url is your application and hence when your code runs again in
       * the dialog, this logic takes over and closes it for you.
       *
       * @return {boolean}
       * Returns false if the code is running inside of a dialog without the required information
       * or is not running inside of a dialog at all.
       */
      static isAuthDialog(useMicrosoftTeams?: boolean): boolean;
      /**
       * Extract the token from the URL
       *
       * @param {string} url The url to extract the token from.
       * @param {string} exclude Exclude a particular string from the url, such as a query param or specific substring.
       * @param {string} delimiter[optional] Delimiter used by OAuth provider to mark the beginning of token response. Defaults to #.
       * @return {object} Returns the extracted token.
       */
      static getUrlParams(url?: string, exclude?: string, delimiter?: string): ICode | IToken | IError;
      static extractParams(segment: string): any;
      private _openAuthDialog;
      /**
       * Helper for exchanging the code with a registered Endpoint.
       * The helper sends a POST request to the given Endpoint's tokenUrl.
       *
       * The Endpoint must accept the data JSON input and return an 'access_token'
       * in the JSON output.
       *
       * @param {Endpoint} endpoint Endpoint configuration.
       * @param {object} data Data to be sent to the tokenUrl.
       * @param {object} headers Headers to be sent to the tokenUrl.
       * @return {Promise<IToken>} Returns a promise of the token or error.
       */
      private _exchangeCodeForToken;
      private _handleTokenResult;
  }

}
declare module '@microsoft/office-js-helpers/authentication/endpoint.manager' {
  import { Storage, StorageType } from '@microsoft/office-js-helpers/helpers/storage';
  export const DefaultEndpoints: {
      Google: string;
      Microsoft: string;
      Facebook: string;
      AzureAD: string;
      Dropbox: string;
  };
  export interface IEndpointConfiguration {
      provider?: string;
      clientId?: string;
      baseUrl?: string;
      authorizeUrl?: string;
      redirectUrl?: string;
      tokenUrl?: string;
      scope?: string;
      resource?: string;
      state?: boolean;
      nonce?: boolean;
      responseType?: string;
      extraQueryParameters?: {
          [index: string]: string;
      };
  }
  /**
   * Helper for creating and registering OAuth Endpoints.
   */
  export class EndpointStorage extends Storage<IEndpointConfiguration> {
      /**
       * @constructor
      */
      constructor(storageType?: StorageType);
      /**
       * Extends Storage's default add method.
       * Registers a new OAuth Endpoint.
       *
       * @param {string} provider Unique name for the registered OAuth Endpoint.
       * @param {object} config Valid Endpoint configuration.
       * @see {@link IEndpointConfiguration}.
       * @return {object} Returns the added endpoint.
       */
      add(provider: string, config: IEndpointConfiguration): IEndpointConfiguration;
      /**
       * Register Google Implicit OAuth.
       * If overrides is left empty, the default scope is limited to basic profile information.
       *
       * @param {string} clientId ClientID for the Google App.
       * @param {object} config Valid Endpoint configuration to override the defaults.
       * @return {object} Returns the added endpoint.
       */
      registerGoogleAuth(clientId: string, overrides?: IEndpointConfiguration): IEndpointConfiguration;
      /**
       * Register Microsoft Implicit OAuth.
       * If overrides is left empty, the default scope is limited to basic profile information.
       *
       * @param {string} clientId ClientID for the Microsoft App.
       * @param {object} config Valid Endpoint configuration to override the defaults.
       * @return {object} Returns the added endpoint.
       */
      registerMicrosoftAuth(clientId: string, overrides?: IEndpointConfiguration): void;
      /**
       * Register Facebook Implicit OAuth.
       * If overrides is left empty, the default scope is limited to basic profile information.
       *
       * @param {string} clientId ClientID for the Facebook App.
       * @param {object} config Valid Endpoint configuration to override the defaults.
       * @return {object} Returns the added endpoint.
       */
      registerFacebookAuth(clientId: string, overrides?: IEndpointConfiguration): void;
      /**
       * Register AzureAD Implicit OAuth.
       * If overrides is left empty, the default scope is limited to basic profile information.
       *
       * @param {string} clientId ClientID for the AzureAD App.
       * @param {string} tenant Tenant for the AzureAD App.
       * @param {object} config Valid Endpoint configuration to override the defaults.
       * @return {object} Returns the added endpoint.
       */
      registerAzureADAuth(clientId: string, tenant: string, overrides?: IEndpointConfiguration): void;
      /**
       * Register Dropbox Implicit OAuth.
       * If overrides is left empty, the default scope is limited to basic profile information.
       *
       * @param {string} clientId ClientID for the Dropbox App.
       * @param {object} config Valid Endpoint configuration to override the defaults.
       * @return {object} Returns the added endpoint.
       */
      registerDropboxAuth(clientId: string, overrides?: IEndpointConfiguration): void;
      /**
       * Helper to generate the OAuth login url.
       *
       * @param {object} config Valid Endpoint configuration.
       * @return {object} Returns the added endpoint.
       */
      static getLoginParams(endpointConfig: IEndpointConfiguration): {
          url: string;
          state: number;
      };
  }

}
declare module '@microsoft/office-js-helpers/authentication/token.manager' {
  import { Storage, StorageType } from '@microsoft/office-js-helpers/helpers/storage';
  export interface IToken {
      provider: string;
      id_token?: string;
      access_token?: string;
      token_type?: string;
      scope?: string;
      state?: string;
      expires_in?: string;
      expires_at?: Date;
  }
  export interface ICode {
      provider: string;
      code: string;
      scope?: string;
      state?: string;
  }
  export interface IError {
      error: string;
      state?: string;
  }
  /**
   * Helper for caching and managing OAuth Tokens.
   */
  export class TokenStorage extends Storage<IToken> {
      /**
       * @constructor
      */
      constructor(storageType?: StorageType);
      /**
       * Compute the expiration date based on the expires_in field in a OAuth token.
       */
      static setExpiry(token: IToken): void;
      /**
       * Check if an OAuth token has expired.
       */
      static hasExpired(token: IToken): boolean;
      /**
       * Extends Storage's default get method
       * Gets an OAuth Token after checking its expiry
       *
       * @param {string} provider Unique name of the corresponding OAuth Token.
       * @return {object} Returns the token or null if its either expired or doesn't exist.
       */
      get(provider: string): IToken;
      /**
       * Extends Storage's default add method
       * Adds a new OAuth Token after settings its expiry
       *
       * @param {string} provider Unique name of the corresponding OAuth Token.
       * @param {object} config valid Token
       * @see {@link IToken}.
       * @return {object} Returns the added token.
       */
      add(provider: string, value: IToken): IToken;
  }

}
declare module '@microsoft/office-js-helpers/errors/api.error' {
  import { CustomError } from '@microsoft/office-js-helpers/errors/custom/index';
  /**
   * Custom error type to handle API specific errors.
   */
  export class APIError extends CustomError {
      innerError?: Error;
      /**
       * @constructor
       *
       * @param message: Error message to be propagated.
       * @param innerError: Inner error if any
      */
      constructor(message: string, innerError?: Error);
  }

}
declare module '@microsoft/office-js-helpers/errors/custom.error' {
  /**
   * Custom error type
   */
  export abstract class CustomError extends Error {
      name: string;
      message: string;
      innerError?: Error;
      constructor(name: string, message: string, innerError?: Error);
  }

}
declare module '@microsoft/office-js-helpers/errors/exception' {
  import { CustomError } from '@microsoft/office-js-helpers/errors/custom/index';
  /**
   * Error type to handle general errors.
   */
  export class Exception extends CustomError {
      innerError?: Error;
      /**
       * @constructor
       *
       * @param message: Error message to be propagated.
       * @param innerError: Inner error if any
      */
      constructor(message: string, innerError?: Error);
  }

}
declare module '@microsoft/office-js-helpers/excel/utilities' {
  /// <reference types="office-js" />
  /**
   * Helper exposing useful Utilities for Excel Add-ins.
   */
  export class ExcelUtilities {
      /**
       * Utility to create (or re-create) a worksheet, even if it already exists.
       * @param workbook
       * @param sheetName
       * @param clearOnly If the sheet already exists, keep it as is, and only clear its grid.
       * This results in a faster operation, and avoid a screen-update flash
       * (and the re-setting of the current selection).
       * Note: Clearing the grid does not remove floating objects like charts.
       * @returns the new worksheet
       */
      static forceCreateSheet(workbook: Excel.Workbook, sheetName: string, clearOnly?: boolean): Promise<Excel.Worksheet>;
  }

}
declare module '@microsoft/office-js-helpers/helpers/dialog' {
  import { CustomError } from '@microsoft/office-js-helpers/errors/custom/index';
  /**
   * Custom error type to handle API specific errors.
   */
  export class DialogError extends CustomError {
      innerError?: Error;
      /**
       * @constructor
       *
       * @param message Error message to be propagated.
       * @param state OAuth state if available.
      */
      constructor(message: string, innerError?: Error);
  }
  /**
   * An optimized size object computed based on Screen Height & Screen Width
   */
  export interface IDialogSize {
      width: number;
      width$: number;
      height: number;
      height$: number;
  }
  export class Dialog<T> {
      url: string;
      useTeamsDialog: boolean;
      /**
       * @constructor
       *
       * @param url Url to be opened in the dialog.
       * @param width Width of the dialog.
       * @param height Height of the dialog.
      */
      constructor(url?: string, width?: number, height?: number, useTeamsDialog?: boolean);
      private readonly _windowFeatures;
      private static readonly key;
      private _result;
      get result(): Promise<T>;
      size: IDialogSize;
      private _addinDialog;
      private _teamsDialog;
      private _webDialog;
      private _pollLocalStorageForToken;
      /**
       * Close any open dialog by providing an optional message.
       * If more than one dialogs are attempted to be opened
       * an exception will be created.
       */
      static close(message?: any, useTeamsDialog?: boolean): void;
      private _optimizeSize;
      private _maxSize;
      private _percentage;
      private _safeParse;
  }

}
declare module '@microsoft/office-js-helpers/helpers/dictionary' {
  /**
   * Helper for creating and querying Dictionaries.
   * A wrapper around ES6 Maps.
   */
  export class Dictionary<T> {
      protected _items: Map<string, T>;
      /**
       * @constructor
       * @param {object} items Initial seed of items.
       */
      constructor(items?: {
          [index: string]: T;
      } | Array<[string, T]> | Map<string, T>);
      /**
       * Gets an item from the dictionary.
       *
       * @param {string} key The key of the item.
       * @return {object} Returns an item if found.
       */
      get(key: string): T;
      /**
       * Inserts an item into the dictionary.
       * If an item already exists with the same key, it will be overridden by the new value.
       *
       * @param {string} key The key of the item.
       * @param {object} value The item to be added.
       * @return {object} Returns the added item.
       */
      set(key: string, value: T): T;
      /**
       * Removes an item from the dictionary.
       * Will throw if the key doesn't exist.
       *
       * @param {string} key The key of the item.
       * @return {object} Returns the deleted item.
       */
      delete(key: string): T;
      /**
       * Clears the dictionary.
       */
      clear(): void;
      /**
       * Check if the dictionary contains the given key.
       *
       * @param {string} key The key of the item.
       * @return {boolean} Returns true if the key was found.
       */
      has(key: string): boolean;
      /**
       * Lists all the keys in the dictionary.
       *
       * @return {array} Returns all the keys.
       */
      keys(): Array<string>;
      /**
       * Lists all the values in the dictionary.
       *
       * @return {array} Returns all the values.
       */
      values(): Array<T>;
      /**
       * Get a shallow copy of the underlying map.
       *
       * @return {object} Returns the shallow copy of the map.
       */
      clone(): Map<string, T>;
      /**
       * Number of items in the dictionary.
       *
       * @return {number} Returns the number of items in the dictionary.
       */
      get count(): number;
      private _validateKey;
  }

}
declare module '@microsoft/office-js-helpers/helpers/dictionary.spec' {
  export {};

}
declare module '@microsoft/office-js-helpers/helpers/storage' {
  export enum StorageType {
      LocalStorage = 0,
      SessionStorage = 1,
      InMemoryStorage = 2
  }
  export interface Subscription {
      closed: boolean;
      unsubscribe(): void;
  }
  /**
   * Helper for creating and querying Local Storage or Session Storage.
   * Uses {@link Dictionary} so all the data is encapsulated in a single
   * storage namespace. Writes update the actual storage.
   */
  export class Storage<T> {
      container: string;
      private _type;
      private _storage;
      private _observable;
      private _containerRegex;
      /**
       * @constructor
       * @param {string} container Container name to be created in the LocalStorage.
       * @param {StorageType} type[optional] Storage Type to be used, defaults to Local Storage.
       */
      constructor(container: string, _type?: StorageType);
      /**
       * Switch the storage type.
       * Switches the storage type and then reloads the in-memory collection.
       *
       * @type {StorageType} type The desired storage to be used.
       */
      switchStorage(type: StorageType): void;
      /**
       * Gets an item from the storage.
       *
       * @param {string} key The key of the item.
       * @return {object} Returns an item if found.
       */
      get(key: string): T;
      /**
       * Inserts an item into the storage.
       * If an item already exists with the same key,
       * it will be overridden by the new value.
       *
       * @param {string} key The key of the item.
       * @param {object} value The item to be added.
       * @return {object} Returns the added item.
       */
      set(key: string, value: T): T;
      /**
       * Removes an item from the storage.
       * Will throw if the key doesn't exist.
       *
       * @param {string} key The key of the item.
       * @return {object} Returns the deleted item.
       */
      delete(key: string): T;
      /**
       * Clear the storage.
       */
      clear(): void;
      /**
       * Check if the storage contains the given key.
       *
       * @param {string} key The key of the item.
       * @return {boolean} Returns true if the key was found.
       */
      has(key: string): boolean;
      /**
       * Lists all the keys in the storage.
       *
       * @return {array} Returns all the keys.
       */
      keys(): Array<string>;
      /**
       * Lists all the values in the storage.
       *
       * @return {array} Returns all the values.
       */
      values(): Array<T>;
      /**
       * Number of items in the store.
       *
       * @return {number} Returns the number of items in the dictionary.
       */
      get count(): number;
      /**
       * Clear all storages.
       * Completely clears both the localStorage and sessionStorage.
       */
      static clearAll(): void;
      /**
       * Returns an observable that triggers every time there's a Storage Event
       * or if the collection is modified in a different tab.
       */
      notify(next: () => void, error?: (error: any) => void, complete?: () => void): Subscription;
      private _validateKey;
      /**
       * Determine if the value was a Date type and if so return a Date object instead.
       * https://blog.mariusschulz.com/2016/04/28/deserializing-json-strings-as-javascript-date-objects
       */
      private _reviver;
      /**
       * Scope the key to the container as @<container>/<key> so as to easily identify
       * the item in localStorage and reduce collisions
       * @param key key to be scoped
       */
      private _scope;
  }

}
declare module '@microsoft/office-js-helpers/helpers/storage.spec' {
  export {};

}
declare module '@microsoft/office-js-helpers/helpers/utilities' {
  import { CustomError } from '@microsoft/office-js-helpers/errors/custom/index';
  /**
   * Constant strings for the host types
   */
  export const HostType: {
      WEB: string;
      ACCESS: string;
      EXCEL: string;
      ONENOTE: string;
      OUTLOOK: string;
      POWERPOINT: string;
      PROJECT: string;
      WORD: string;
  };
  /**
   * Constant strings for the host platforms
   */
  export const PlatformType: {
      IOS: string;
      MAC: string;
      OFFICE_ONLINE: string;
      PC: string;
  };
  /**
   * Helper exposing useful Utilities for Office-Add-ins.
   */
  export class Utilities {
      /**
       * A promise based helper for Office initialize.
       * If Office.js was found, the 'initialize' event is waited for and
       * the promise is resolved with the right reason.
       *
       * Else the application starts as a web application.
       */
      static initialize(): Promise<string>;
      static get host(): string;
      static get platform(): string;
      /**
       * Utility to check if the code is running inside of an add-in.
       */
      static get isAddin(): boolean;
      /**
       * Utility to check if the browser is IE11 or Edge.
       */
      static get isIEOrEdge(): boolean;
      /**
       * Utility to generate crypto safe random numbers
       */
      static generateCryptoSafeRandom(): number;
      /**
       * Utility to print prettified errors.
       * If multiple parameters are sent then it just logs them instead.
       */
      static log(exception: Error | CustomError | string, extras?: any, ...args: any[]): void;
  }

}
declare module '@microsoft/office-js-helpers/index' {
  export * from '@microsoft/office-js-helpers/errors/custom/index';
  export * from '@microsoft/office-js-helpers/helpers/dialog';
  export * from '@microsoft/office-js-helpers/helpers/utilities';
  export * from '@microsoft/office-js-helpers/helpers/dictionary';
  export * from '@microsoft/office-js-helpers/helpers/storage';
  export * from '@microsoft/office-js-helpers/helpers/dialog';
  export * from '@microsoft/office-js-helpers/authentication/token/index';
  export * from '@microsoft/office-js-helpers/authentication/endpoint/index';
  export * from '@microsoft/office-js-helpers/authentication/authenticator';
  export * from '@microsoft/office-js-helpers/excel/utilities';
  export { UI } from '@microsoft/office-js-helpers/ui/ui';

}
declare module '@microsoft/office-js-helpers/ui/ui' {
  export interface IMessageBannerParams {
      title?: string;
      message?: string;
      type: 'default' | 'success' | 'error' | 'warning' | 'severe-warning';
      details?: string;
  }
  export class UI {
      /** Shows a basic notification at the top of the page
        * @param message - body of the notification
        */
      static notify(message: string): any;
      /** Shows a basic notification with a custom title at the top of the page
       * @param message - body of the notification
       * @param title - title of the notification
       */
      static notify(message: string, title: string): any;
      /** Shows a basic notification at the top of the page, with a background color set based on the type parameter
       * @param message - body of the notification
       * @param title - title of the notification
       * @param type - type of the notification - see https://dev.office.com/fabric-js/Components/MessageBar/MessageBar.html#Variants
       */
      static notify(message: string, title: string, type: 'default' | 'success' | 'error' | 'warning' | 'severe-warning'): any;
      /** Shows a basic error notification at the top of the page
       * @param error - Error object
       */
      static notify(error: Error): any;
      /** Shows a basic error notification with a custom title at the top of the page
       * @param title - Title, bolded
       * @param error - Error object
       */
      static notify(error: Error, title: string): any;
      /** Shows a basic notification at the top of the page
       * @param message - The body of the notification
       */
      static notify(message: any): any;
      /** Shows a basic notification with a custom title at the top of the page
       * @param message - body of the notification
       * @param title - title of the notification
       */
      static notify(message: any, title: string): any;
      /** Shows a basic notification at the top of the page, with a background color set based on the type parameter
       * @param message - body of the notification
       * @param title - title of the notification
       * @param type - type of the notification - see https://dev.office.com/fabric-js/Components/MessageBar/MessageBar.html#Variants
       */
      static notify(message: any, title: string, type: 'default' | 'success' | 'error' | 'warning' | 'severe-warning'): any;
  }
  export function _parseNotificationParams(params: any[]): IMessageBannerParams;

}
declare module '@microsoft/office-js-helpers/ui/ui.spec' {
  export {};

}
declare module '@microsoft/office-js-helpers/util/stringify' {
  export function stringify(value: any): string;

}
declare module '@microsoft/office-js-helpers' {
  import main = require('@microsoft/office-js-helpers/index');
  export = main;
}