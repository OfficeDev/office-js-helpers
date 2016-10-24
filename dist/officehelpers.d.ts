
import OfficeHelpers = officehelpers;

declare module 'officehelpers' {
  export = officehelpers;
}

declare namespace officehelpers {
  
  /**
   * Helper for performing Implicit OAuth Authentication with registered endpoints.
   */
  export class Authenticator {
      endpoints: EndpointManager;
      tokens: TokenManager;
      /**
       * @constructor
       *
       * @param endpointManager Depends on an instance of EndpointManager.
       * @param TokenManager Depends on an instance of TokenManager.
      */
      constructor(endpoints?: EndpointManager, tokens?: TokenManager);
      /**
       * Authenticate based on the given provider.
       * Either uses DialogAPI or Window Popups based on where its being called from either Add-in or Web.
       * If the token was cached, the it retrieves the cached token.
       * If the cached token has expired then the authentication dialog is displayed.
       *
       * NOTE: you have to manually check the expires_in or expires_at property to determine
       * if the token has expired. Not all OAuth providers support refresh token flows.
       *
       * @param {string} provider Link to the provider.
       * @param {boolean} force Force re-authentication.
       * @return {Promise<IToken|ICode>} Returns a promise of the token or code or error.
       */
      authenticate(provider: string, force?: boolean): Promise<IToken>;
      /**
       * Helper for exchanging the code with a registered Endpoint.
       * The helper sends a POST request to the given Endpoint's tokenUrl.
       *
       * The Endpoint must accept the data JSON input and return an 'access_token'
       * in the JSON output.
       *
       * @param {string} provider Name of the provider.
       * @param {object} data Data to be sent to the tokenUrl.
       * @param {object} headers Headers to be sent to the tokenUrl.     *
       * @return {Promise<IToken>} Returns a promise of the token or error.
       */
      exchangeCodeForToken(endpoint: IEndpoint, data: any, headers?: any): Promise<IToken>;
      /**
       * Check if the currrent url is running inside of a Dialog that contains an access_token or code or error.
       * If true then it calls messageParent by extracting the token information, thereby closing the dialog.
       * Otherwise, the caller should proceed with normal initialization of their application.
       *
       * @return {boolean}
       * Returns false if the code is running inside of a dialog without the required information
       * or is not running inside of a dialog at all.
       */
      static isAuthDialog(): boolean;
      /**
       * Check if the supplied url has either access_token or code or error.
       */
      static isTokenUrl(url: string): boolean;
      /**
       * Check if the code is running inside of an Addin versus a Web Context.
       * The checks for Office and Word, Excel or OneNote objects.
       */
      private static _hasDialogAPI;
      static readonly hasDialogAPI: boolean;
      private _openInWindowPopup(endpoint);
      private _openInDialog(endpoint);
      private _determineDialogSize();
      private _createSizeObject(width, height, screenWidth, screenHeight);
  }
  export const DefaultEndpoints: {
      Google: string;
      Microsoft: string;
      Facebook: string;
      AzureAD: string;
  };
  export interface IEndpoint {
      /**
       * Unique name for the Endpoint
       */
      provider?: string;
      /**
       * Registered OAuth ClientID
       */
      clientId?: string;
      /**
       * Base URL of the endpoint
       */
      baseUrl?: string;
      /**
       * URL segment for OAuth authorize endpoint.
       * The final authorize url is constructed as (baseUrl + '/' + authorizeUrl).
       */
      authorizeUrl?: string;
      /**
       * Registered OAuth redirect url.
       * Defaults to window.location.origin
       */
      redirectUrl?: string;
      /**
       * Optional token url to exchange a code with.
       * Not recommended if OAuth provider supports implicit flow.
       */
      tokenUrl?: string;
      /**
       * Registered OAuth scope.
       */
      scope?: string;
      /**
       * Resource paramater for the OAuth provider.
       */
      resource?: string;
      /**
       * Automatically generate a state? defaults to false.
       */
      state?: boolean;
      /**
       * Automatically generate a nonce? defaults to false.
       */
      nonce?: boolean;
      /**
       * OAuth responseType.
       */
      responseType?: string;
      /**
       * Additional '&' separated query parameters.
       */
      extraQueryParameters?: string;
  }
  /**
   * Helper for creating and registering OAuth Endpoints.
   */
  export class EndpointManager extends Storage<IEndpoint> {
      /**
       * @constructor
      */
      constructor();
      private _currentHost;
      /**
       * Gets the current url to be specified as the default redirect url.
       */
      readonly currentHost: string;
      /**
       * Extends Storage's default add method.
       * Registers a new OAuth Endpoint.
       *
       * @param {string} provider Unique name for the registered OAuth Endpoint.
       * @param {object} config Valid Endpoint configuration.
       * @see {@link IEndpoint}.
       * @return {object} Returns the added endpoint.
       */
      add(provider: string, config: IEndpoint): IEndpoint;
      /**
       * Register Google Implicit OAuth.
       * If overrides is left empty, the default scope is limited to basic profile information.
       *
       * @param {string} clientId ClientID for the Google App.
       * @param {object} config Valid Endpoint configuration to override the defaults.
       * @return {object} Returns the added endpoint.
       */
      registerGoogleAuth(clientId: string, overrides?: IEndpoint): IEndpoint;
      /**
       * Register Microsoft Implicit OAuth.
       * If overrides is left empty, the default scope is limited to basic profile information.
       *
       * @param {string} clientId ClientID for the Microsoft App.
       * @param {object} config Valid Endpoint configuration to override the defaults.
       * @return {object} Returns the added endpoint.
       */
      registerMicrosoftAuth(clientId: string, overrides?: IEndpoint): void;
      /**
       * Register Facebook Implicit OAuth.
       * If overrides is left empty, the default scope is limited to basic profile information.
       *
       * @param {string} clientId ClientID for the Facebook App.
       * @param {object} config Valid Endpoint configuration to override the defaults.
       * @return {object} Returns the added endpoint.
       */
      registerFacebookAuth(clientId: string, overrides?: IEndpoint): void;
      /**
       * Register AzureAD Implicit OAuth.
       * If overrides is left empty, the default scope is limited to basic profile information.
       *
       * @param {string} clientId ClientID for the AzureAD App.
       * @param {string} tenant Tenant for the AzureAD App.
       * @param {object} config Valid Endpoint configuration to override the defaults.
       * @return {object} Returns the added endpoint.
       */
      registerAzureADAuth(clientId: string, tenant: string, overrides?: IEndpoint): void;
      /**
       * Helper to generate the OAuth login url.
       *
       * @param {object} config Valid Endpoint configuration.
       * @return {object} Returns the added endpoint.
       */
      static getLoginParams(endpointConfig: IEndpoint): {
          url: string;
          state: number;
      };
      private static _generateCryptoSafeRandom();
  }
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
  export class TokenManager extends Storage<IToken> {
      /**
       * @constructor
      */
      constructor();
      /**
       * Compute the expiration date based on the expires_in field in a OAuth token.
       */
      setExpiry(token: IToken): void;
      /**
       * Extends Storage's default add method
       * Adds a new OAuth Token after settings its expiry
       *
       * @param {string} provider Unique name of the corresponding OAuth Endpoint.
       * @param {object} config valid Token
       * @see {@link IEndpoint}.
       * @return {object} Returns the added endpoint.
       */
      add(provider: string, value: IToken): IToken;
      /**
       * Extract the token from the URL
       *
       * @param {string} url The url to extract the token from.
       * @param {string} exclude Exclude a particlaur string from the url, such as a query param or specific substring.
       * @param {string} delimiter[optional] Delimiter used by OAuth provider to mark the beginning of token response. Defaults to #.
       * @return {object} Returns the extracted token.
       */
      static getToken(url?: string, exclude?: string, delimiter?: string): ICode | IToken | IError;
      private static _extractParams(segment);
  }
  
  /**
   * Helper for creating and querying Dictionaries.
   * A rudimentary alternative to ES6 Maps.
   */
  export class Dictionary<T> {
      protected items: {
          [index: string]: T;
      };
      /**
       * @constructor
       * @param {object} items Initial seed of items.
      */
      constructor(items?: {
          [index: string]: T;
      });
      /**
       * Gets an item from the dictionary.
       *
       * @param {string} key The key of the item.
       * @return {object} Returns an item if found, else returns null.
       */
      get(key: string): T;
      /**
       * Adds an item into the dictionary.
       * If the key already exists, then it will throw.
       *
       * @param {string} key The key of the item.
       * @param {object} value The item to be added.
       * @return {object} Returns the added item.
       */
      add(key: string, value: T): T;
      /**
       * Inserts an item into the dictionary.
       * If an item already exists with the same key, it will be overridden by the new value.
       *
       * @param {string} key The key of the item.
       * @param {object} value The item to be added.
       * @return {object} Returns the added item.
       */
      insert(key: string, value: T): T;
      /**
       * Removes an item from the dictionary.
       * Will throw if the key doesn't exist.
       *
       * @param {string} key The key of the item.
       * @return {object} Returns the deleted item.
       */
      remove(key: string): T;
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
      contains(key: string): boolean;
      /**
       * Lists all the keys in the dictionary.
       *
       * @return {array} Returns all the keys.
       */
      keys(): string[];
      /**
       * Lists all the values in the dictionary.
       *
       * @return {array} Returns all the values.
       */
      values(): T[];
      /**
       * Get the dictionary.
       *
       * @return {object} Returns the dictionary if it contains data, null otherwise.
       */
      lookup(): {
          [key: string]: T;
      };
      /**
       * Number of items in the dictionary.
       *
       * @return {number} Returns the number of items in the dictionary.
       */
      readonly count: number;
  }
  export enum StorageType {
      LocalStorage = 0,
      SessionStorage = 1,
  }
  /**
   * Helper for creating and querying Local Storage or Session Storage.
   * @see Uses {@link Dictionary} to create an in-memory copy of
   * the storage for faster reads. Writes update the actual storage.
   */
  export class Storage<T> extends Dictionary<T> {
      private _container;
      private _storage;
      /**
       * @constructor
       * @param {string} container Container name to be created in the LocalStorage.
       * @param {StorageType} type[optional] Storage Type to be used, defaults to Local Storage.
      */
      constructor(_container: string, type?: StorageType);
      /**
       * Switch the storage type.
       * Switches the storage type and then reloads the in-memory collection.
       *
       * @type {StorageType} type The desired storage to be used.
       */
      switchStorage(type: StorageType): void;
      /**
       * Add an item.
       * Extends Dictionary's implementation of add, with a save to the storage.
       */
      add(item: string, value: T): T;
      /**
       * Add or Update an item.
       * Extends Dictionary's implementation of insert, with a save to the storage.
       */
      insert(item: string, value: T): T;
      /**
       * Remove an item.
       * Extends Dictionary's implementation with a save to the storage.
       */
      remove(item: string): T;
      /**
       * Clear the storage.
       * Extends Dictionary's implementation with a save to the storage.
       */
      clear(): void;
      /**
       * Clear all storages
       * Completely clears both the localStorage and sessionStorage.
       */
      static clearAll(): void;
      /**
       * Saves the current state to the storage.
       */
      save(): void;
      /**
       * Refreshes the storage with the current localStorage values.
       */
      load(): {
          [index: string]: T;
      };
  }
  
}