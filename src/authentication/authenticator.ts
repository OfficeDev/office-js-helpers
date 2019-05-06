// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

import { EndpointStorage, IEndpointConfiguration } from './endpoint.manager';
import { TokenStorage, IToken, ICode, IError } from './token.manager';
import { Dialog } from '../helpers/dialog';
import { CustomError } from '../errors/custom.error';

/**
 * Custom error type to handle OAuth specific errors.
 */
export class AuthError extends CustomError {
  /**
   * @constructor
   *
   * @param message Error message to be propagated.
   * @param state OAuth state if available.
  */
  constructor(message: string, public innerError?: Error) {
    super('AuthError', message, innerError);
  }
}

/**
 * Helper for performing Implicit OAuth Authentication with registered endpoints.
 */
export class Authenticator {
  /**
   * @constructor
   *
   * @param endpoints Depends on an instance of EndpointStorage.
   * @param tokens Depends on an instance of TokenStorage.
  */
  constructor(
    public endpoints?: EndpointStorage,
    public tokens?: TokenStorage
  ) {
    if (endpoints == null) {
      this.endpoints = new EndpointStorage();
    }
    if (tokens == null) {
      this.tokens = new TokenStorage();
    }
  }

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
  authenticate(
    provider: string,
    force: boolean = false,
    useMicrosoftTeams: boolean = false
  ): Promise<IToken> {
    let token = this.tokens.get(provider);
    let hasTokenExpired = TokenStorage.hasExpired(token);

    if (!hasTokenExpired && !force) {
      return Promise.resolve(token);
    }

    if (token && hasTokenExpired) {
      this.tokens.delete(provider);
    }

    return this._openAuthDialog(provider, useMicrosoftTeams);
  }

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
  static isAuthDialog(useMicrosoftTeams: boolean = false): boolean {
    // If the url doesn't contain an access_token, code, or error then return false.
    // This is in scenarios where we don't want to automatically control what happens to the dialog.
    if (!/(access_token|code|error|state)/gi.test(location.href)) {
      return false;
    }

    Dialog.close(location.href, useMicrosoftTeams);
    return true;
  }

  /**
   * Extract the token from the URL
   *
   * @param {string} url The url to extract the token from.
   * @param {string} exclude Exclude a particular string from the url, such as a query param or specific substring.
   * @param {string} delimiter[optional] Delimiter used by OAuth provider to mark the beginning of token response. Defaults to #.
   * @return {object} Returns the extracted token.
   */
  static getUrlParams(url: string = location.href, exclude: string = location.origin, delimiter: string = '#'): ICode | IToken | IError {
    if (exclude) {
      url = url.replace(exclude, '');
    }

    let [left, right] = url.split(delimiter);
    let tokenString = right == null ? left : right;

    if (tokenString.indexOf('?') !== -1) {
      tokenString = tokenString.split('?')[1];
    }

    return Authenticator.extractParams(tokenString);
  }

  static extractParams(segment: string): any {
    if (segment == null || segment.trim() === '') {
      return null;
    }

    let params: any = {};
    let regex = /([^&=]+)=([^&]*)/g;
    let matchParts;

    while ((matchParts = regex.exec(segment)) !== null) {
      // Fixes bugs when the state parameters contains a / before them
      if (matchParts[1] === '/state') {
        matchParts[1] = matchParts[1].replace('/', '');
      }
      params[decodeURIComponent(matchParts[1])] = decodeURIComponent(matchParts[2]);
    }

    return params;
  }

  private async _openAuthDialog(provider: string, useMicrosoftTeams: boolean): Promise<IToken> {
    // Get the endpoint configuration for the given provider and verify that it exists.
    let endpoint = this.endpoints.get(provider);
    if (endpoint == null) {
      return Promise.reject(new AuthError(`No such registered endpoint: ${provider} could be found.`)) as any;
    }

    // Set the authentication state to redirect and begin the auth flow.
    let { state, url } = EndpointStorage.getLoginParams(endpoint);

    // Launch the dialog and perform the OAuth flow. We launch the dialog at the redirect
    // url where we expect the call to isAuthDialog to be available.
    let redirectUrl = await new Dialog<string>(url, 1024, 768, useMicrosoftTeams).result;

    // Try and extract the result and pass it along.
    return this._handleTokenResult(redirectUrl, endpoint, state);
  }

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
  private _exchangeCodeForToken(endpoint: IEndpointConfiguration, data: any, headers?: any): Promise<IToken> {
    return new Promise((resolve, reject) => {
      if (endpoint.tokenUrl == null) {
        console.warn('We couldn\'t exchange the received code for an access_token. The value returned is not an access_token. Please set the tokenUrl property or refer to our docs.');
        return resolve(data);
      }

      let xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint.tokenUrl);

      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('Content-Type', 'application/json');

      for (let header in headers) {
        if (header === 'Accept' || header === 'Content-Type') {
          continue;
        }

        xhr.setRequestHeader(header, headers[header]);
      }

      xhr.onerror = () => reject(new AuthError('Unable to send request due to a Network error'));

      xhr.onload = () => {
        try {
          if (xhr.status === 200) {
            let json = JSON.parse(xhr.responseText);
            if (json == null) {
              return reject(new AuthError('No access_token or code could be parsed.'));
            }
            else if ('access_token' in json) {
              this.tokens.add(endpoint.provider, json);
              return resolve(json as IToken);
            }
            else {
              return reject(new AuthError(json.error, json.state));
            }
          }
          else if (xhr.status !== 200) {
            return reject(new AuthError('Request failed. ' + xhr.response));
          }
        }
        catch (e) {
          return reject(new AuthError('An error occurred while parsing the response'));
        }
      };

      xhr.send(JSON.stringify(data));
    });
  }

  private _handleTokenResult(redirectUrl: string, endpoint: IEndpointConfiguration, state: number) {
    let result = Authenticator.getUrlParams(redirectUrl, endpoint.redirectUrl);
    if (result == null) {
      throw new AuthError('No access_token or code could be parsed.');
    }
    else if (endpoint.state && +result.state !== state) {
      throw new AuthError('State couldn\'t be verified');
    }
    else if ('code' in result) {
      return this._exchangeCodeForToken(endpoint, result as ICode);
    }
    else if ('access_token' in result) {
      return this.tokens.add(endpoint.provider, result as IToken);
    }
    else {
      throw new AuthError((result as IError).error);
    }
  }
}
