// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

import { EndpointManager, IEndpoint } from './endpoint.manager';
import { TokenManager, IToken, ICode, IError } from './token.manager';
import { Utilities } from '../helpers/utilities';
import { Dialog } from '../helpers/dialog';
import { Storage } from '../helpers/storage';
import { AuthError } from '../errors/auth';

/**
 * Helper for performing Implicit OAuth Authentication with registered endpoints.
 */
export class Authenticator {
    /**
     * @constructor
     *
     * @param endpointManager Depends on an instance of EndpointManager.
     * @param TokenManager Depends on an instance of TokenManager.
    */
    constructor(
        public endpoints?: EndpointManager,
        public tokens?: TokenManager
    ) {
        if (endpoints == null) {
            this.endpoints = new EndpointManager();
        }
        if (tokens == null) {
            this.tokens = new TokenManager();
        }
    }

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
    authenticate(
        provider: string,
        force: boolean = false,
        useMicrosoftTeams: boolean = false
    ): Promise<IToken> {
        let token = this.tokens.get(provider);
        let hasTokenExpired = TokenManager.hasExpired(token);

        if (!hasTokenExpired && !force) {
            return Promise.resolve(token);
        }

        if (useMicrosoftTeams) {
            return this._openAuthDialog(provider, true);
        }
        else if (Utilities.isAddin) {
            return this._openAuthDialog(provider, false);
        }
        // else {
        //     return this._openInWindowPopup(provider);
        // }
    }

    /**
     * Check if the currrent url is running inside of a Dialog that contains an access_token or code or error.
     * If true then it calls messageParent by extracting the token information, thereby closing the dialog.
     * Otherwise, the caller should proceed with normal initialization of their application.
     *
     * @return {boolean}
     * Returns false if the code is running inside of a dialog without the required information
     * or is not running inside of a dialog at all.
     */
    static isAuthDialog(useMicrosoftTeams: boolean = false): boolean {
        if (!Utilities.isAddin) {
            return false;
        }
        else {
            if (!/(access_token|code|error)/gi.test(location.href)) {
                return false;
            }

            Dialog.close(location.href, useMicrosoftTeams);
            return true;
        }
    }

    private async _openAuthDialog(provider: string, useMicrosoftTeams: boolean): Promise<IToken> {
        /** Get the endpoint configuration for the given provider and verify that it exists. */
        let endpoint = this.endpoints.get(provider);
        if (endpoint == null) {
            return Promise.reject(new AuthError(`No such registered endpoint: ${provider} could be found.`)) as any;
        }

        /** Set the authentication state to redirect and begin the auth flow */
        let {state, url } = EndpointManager.getLoginParams(endpoint);

        /**
         * Launch the dialog and perform the OAuth flow. We Launch the dialog at the redirect
         * url where we expect the call to isAuthDialog to be available.
         */
        let redirectUrl = await new Dialog<string>(endpoint.redirectUrl, 1024, 768, useMicrosoftTeams).result;

        /** Try and extract the result and pass it along */
        return this._handleTokenResult(redirectUrl, endpoint, state);
    }

    private _openInWindowPopup(endpoint: IEndpoint): Promise<IToken> {
        let {state, url } = EndpointManager.getLoginParams(endpoint);
        let windowFeatures = `width=${1024},height=${768},menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no`;
        let popupWindow: Window = window.open(url, endpoint.provider.toUpperCase(), windowFeatures);

        return new Promise<IToken>((resolve, reject) => {
            try {
                const POLL_INTERVAL = 400;
                let interval = setInterval(() => {
                    try {
                        if (popupWindow.document.URL.indexOf(endpoint.redirectUrl) !== -1) {
                            clearInterval(interval);
                            popupWindow.close();
                            return resolve(this._handleTokenResult(popupWindow.document.URL, endpoint, state));
                        }
                    }
                    catch (exception) {
                        if (!popupWindow) {
                            clearInterval(interval);
                            return reject(new AuthError('Popup window was closed'));
                        }
                    }
                }, POLL_INTERVAL);
            }
            catch (exception) {
                popupWindow.close();
                return reject(new AuthError('Unexpected error occured while creating popup'));
            }
        });
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
     * @param {object} headers Headers to be sent to the tokenUrl.     *
     * @return {Promise<IToken>} Returns a promise of the token or error.
     */
    private _exchangeCodeForToken(endpoint: IEndpoint, data: any, headers?: any): Promise<IToken> {
        return new Promise((resolve, reject) => {
            if (endpoint.tokenUrl == null) {
                console.warn(
                    `We couldn\'t exchange the received code for an access_token.
                    The value returned is not an access_token.
                    Please set the tokenUrl property or refer to our docs.`
                );
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

            xhr.onerror = () => {
                return reject(new AuthError('Unable to send request due to a Network error'));
            };

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
                    return reject(new AuthError('An error occured while parsing the response'));
                }
            };

            xhr.send(JSON.stringify(data));
        });
    }

    /**
     * Extract the token from the URL
     *
     * @param {string} url The url to extract the token from.
     * @param {string} exclude Exclude a particlaur string from the url, such as a query param or specific substring.
     * @param {string} delimiter[optional] Delimiter used by OAuth provider to mark the beginning of token response. Defaults to #.
     * @return {object} Returns the extracted token.
     */
    private _getToken(url: string = location.href, exclude: string = location.origin, delimiter: string = '#'): ICode | IToken | IError {
        if (exclude) {
            url = url.replace(exclude, '');
        }

        let [left, right] = url.split(delimiter);
        let tokenString = right == null ? left : right;

        if (tokenString.indexOf('?') !== -1) {
            let [ignore, queryPart] = tokenString.split('?');
            tokenString = queryPart;
        }

        return this._extractParams(tokenString);
    }

    private _extractParams(segment: string): any {
        if (segment == null || segment.trim() == '') {
            return null;
        }

        let params: any = {},
            regex = /([^&=]+)=([^&]*)/g,
            matches;

        while ((matches = regex.exec(segment)) !== null) {
            params[decodeURIComponent(matches[1])] = decodeURIComponent(matches[2]);
        }

        return params;
    }

    private _handleTokenResult(redirectUrl: string, endpoint: IEndpoint, state: number) {
        let result = this._getToken(redirectUrl, endpoint.redirectUrl);
        if (result == null) {
            throw new AuthError('No access_token or code could be parsed.');
        }
        else if (endpoint.state && +result.state !== state) {
            throw new AuthError('State couldn\'t be verified');
        }
        else if ('code' in result) {
            return this._exchangeCodeForToken(endpoint, (<ICode>result));
        }
        else if ('access_token' in result) {
            return this.tokens.add(endpoint.provider, result as IToken);
        }
        else {
            throw new AuthError((result as IError).error, result.state);
        }
    }
}
