// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

import { EndpointManager, IEndpoint } from './endpoint.manager';
import { TokenManager, IToken, ICode, IError } from './token.manager';
import { Utilities } from '../helpers/utilities';
import { Dialog } from '../helpers/dialog';
import { Storage } from '../helpers/storage';
import { AuthError } from '../errors/auth';

export interface IAuthState {
    context: 'WEB' | 'OFFICE' | 'TEAMS',
    mode: 'REDIRECT' | 'TOKEN' | 'COMPLETE',
    endpoint: IEndpoint,
    url: string,
    state: number
}

/**
 * Helper for performing Implicit OAuth Authentication with registered endpoints.
 */
export class Authenticator {
    private _state = new Storage<IAuthState>('oh_auth_session');
    private _id = EndpointManager.generateCryptoSafeRandom().toString();

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

    get current(): IAuthState {
        let state = this._state.get(this._id);
        return state;
    }

    set current(value: IAuthState) {
        if (value == null) {
            this._state.clear();
        }
        this._state.insert(this._id, value);
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
        else {
            return this._redirect(provider);
        }
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
    isAuthDialog(): boolean {
        let state = this.current;
        if (state.mode === 'REDIRECT') {
            this.current.mode = 'TOKEN';
            window.location.replace(state.url);
            return true;
        }
        else if (state.mode === 'TOKEN') {
            this.current.mode = 'COMPLETE';
            if (!/(access_token|code|error)/gi.test(location.href)) {
                return false;
            }
            else {
                switch (this.current.context) {
                    case 'OFFICE':
                        Dialog.close(location.href);
                        return true;

                    case 'TEAMS':
                        Dialog.close(location.href, true);
                        return true;

                    case 'WEB':
                        this._handleTokenResult(location.href, this.current.endpoint, this.current.state);
                        return true;

                    default: throw new AuthError(`Cannot determine current authentication context.`);
                }
            }
        }
    }

    private async _openAuthDialog(provider: string, useMicrosoftTeams: boolean): Promise<IToken> {
        /** Get the endpoint configuration for the given provider and verify that it exists. */
        let endpoint = this.endpoints.get(provider);
        if (endpoint == null) {
            return Promise.reject(new AuthError(`No such registered endpoint: ${provider} could be found.`)) as any;
        }

        /** Set the authentication state to redirect and begin the auth flow */
        let {state, url} = EndpointManager.getLoginParams(endpoint);
        this.current = {
            endpoint,
            state,
            url,
            mode: 'REDIRECT',
            context: useMicrosoftTeams ? 'TEAMS' : 'OFFICE'
        };

        /**
         * Launch the dialog and perform the OAuth flow. We Launch the dialog at the redirect
         * url where we expect the call to isAuthDialog to be available.
         */
        let redirectUrl = await new Dialog<string>(endpoint.redirectUrl, 1024, 768, useMicrosoftTeams).result;

        let {mode} = this._state.get('current');
        if (mode !== 'COMPLETE') {
            throw new AuthError('Invalid authentication state. Please retry again.');
        }

        /** Clear the state as we are done with the authentication */
        this.current = null;

        /** Try and extract the result and pass it along */
        return this._handleTokenResult(redirectUrl, endpoint, state);
    }

    private _redirect(provider: string) {
        let endpoint = this.endpoints.get(provider);
        if (endpoint == null) {
            return Promise.reject(new AuthError(`No such registered endpoint: ${provider} could be found.`)) as any;
        }

        /** Set the authentication state to redirect and begin the auth flow */
        let {state, url} = EndpointManager.getLoginParams(endpoint);
        this.current = {
            endpoint,
            state,
            url,
            mode: 'TOKEN',
            context: 'WEB'
        };

        window.location.replace(url);
        return Promise.reject(new AuthError('Redirecting to provider'));
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
    _getToken(url: string = location.href, exclude: string = location.origin, delimiter: string = '#'): ICode | IToken | IError {
        if (exclude) {
            url = url.replace(exclude, '');
        }

        let parts = url.split(delimiter);
        if (parts.length <= 0) {
            return;
        }

        let rightPart = parts.length >= 2 ? parts[1] : parts[0];
        rightPart = rightPart.replace('/', '');

        if (rightPart.indexOf('?') !== -1) {
            let queryPart = rightPart.split('?');
            if (!queryPart || queryPart.length <= 0) {
                return;
            }
            rightPart = queryPart[1];
        }

        return this._extractParams(rightPart);
    }

    _extractParams(segment: string): any {
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
