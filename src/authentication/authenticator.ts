// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

import { EndpointManager, IEndpoint } from '../authentication/endpoint.manager';
import { TokenManager, IToken, ICode, IError } from '../authentication/token.manager';

/**
 * Custom error type to handle OAuth specific errors.
 */

export class OAuthError extends Error {
    /**
     * @constructor
     *
     * @param message Error message to be propagated.
     * @param state OAuth state if available.
    */
    constructor(message: string, public state?: string) {
        super(message);
        this.name = "OAuthError";
        this.message = message;
        if ((Error as any).captureStackTrace) {
            (Error as any).captureStackTrace(this, this.constructor);
        }
        else {
            var error = new Error();
            if (error.stack) {
                var last_part = error.stack.match(/[^\s]+$/);
                this.stack = this.name + " at " + last_part;
            }
        }
    }
}

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
        if (endpoints == null) this.endpoints = new EndpointManager();
        if (tokens == null) this.tokens = new TokenManager();
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
    authenticate(provider: string, force: boolean = false): Promise<IToken> {
        let token = this.tokens.get(provider);

        if (token != null) {
            if (token.expires_at != null) {
                token.expires_at = token.expires_at instanceof Date ? token.expires_at : new Date(token.expires_at as any);
                if (token.expires_at.getTime() - new Date().getTime() < 0) {
                    console.warn(`Token for provider: ${provider} has expired. Re-authenticating...`);
                    force = true;
                }
            }

            if (!force) {
                return Promise.resolve(token);
            }
        }

        let endpoint = this.endpoints.get(provider);
        if (endpoint == null) {
            return Promise.reject(new OAuthError(`No such registered endpoint: ${provider} could be found.`)) as any;
        }
        else {
            return (Authenticator.hasDialogAPI) ? this._openInDialog(endpoint) : this._openInWindowPopup(endpoint);
        }
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
    exchangeCodeForToken(endpoint: IEndpoint, data: any, headers?: any): Promise<IToken> {
        return new Promise((resolve, reject) => {
            if (endpoint.tokenUrl == null) {
                console.warn(
                    `We couldn\'t exchange the received code for an access_token.
                    The value returned is not an access_token.
                    Please set the tokenUrl property or refer to our docs.`
                );
                return resolve(data);
            }

            var xhr = new XMLHttpRequest();
            xhr.open('POST', endpoint.tokenUrl);

            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('Content-Type', 'application/json');

            for (var header in headers) {
                if (header === 'Accept' || header === 'Content-Type') {
                    continue;
                }

                xhr.setRequestHeader(header, headers[header]);
            }

            xhr.onerror = () => {
                return reject(new OAuthError('Unable to send request due to a Network error'));
            }

            xhr.onload = () => {
                try {
                    if (xhr.status === 200) {
                        var json = JSON.parse(xhr.responseText);
                        if (json == null) {
                            return reject(new OAuthError('No access_token or code could be parsed.'));
                        }
                        else if ('access_token' in json) {
                            this.tokens.add(endpoint.provider, json)
                            return resolve(json as IToken);
                        }
                        else {
                            return reject(new OAuthError(json.error, json.state));
                        }
                    }
                    else if (xhr.status !== 200) {
                        return reject(new OAuthError('Request failed. ' + xhr.response));
                    }
                }
                catch (e) {
                    return reject(new OAuthError('An error occured while parsing the response'));
                }
            };

            xhr.send(JSON.stringify(data));
        });
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
    static isAuthDialog(): boolean {
        if (!Authenticator.hasDialogAPI) {
            return false;
        }
        else {
            if (!Authenticator.isTokenUrl(location.href)) {
                return false;
            }

            Office.context.ui.messageParent(JSON.stringify(TokenManager.getToken()));
            return true;
        }
    }

    /**
     * Check if the supplied url has either access_token or code or error.
     */
    static isTokenUrl(url: string) {
        var regex = /(access_token|code|error)/gi;
        return regex.test(url);
    }

    /**
     * Check if the code is running inside of an Addin versus a Web Context.
     * The checks for Office and Word, Excel or OneNote objects.
     */
    private static _hasDialogAPI: boolean;
    static get hasDialogAPI() {
        if (Authenticator._hasDialogAPI == null) {
            try {
                Authenticator._hasDialogAPI =
                    window.hasOwnProperty('Office') &&
                    (
                        (
                            (<any>window).Office.context.requirements &&
                            (<any>window).Office.context.requirements.isSetSupported('DialogAPI', '1.1')
                        ) ||
                        window.hasOwnProperty('Excel') ||
                        window.hasOwnProperty('Word') ||
                        window.hasOwnProperty('OneNote')
                    )
            }
            catch (e) {
                Authenticator._hasDialogAPI = false;
            }
        }

        return Authenticator._hasDialogAPI;
    }

    private _openInWindowPopup(endpoint: IEndpoint): Promise<IToken> {
        let params = EndpointManager.getLoginParams(endpoint);
        let windowSize = this._determineDialogSize().toPixels();
        let windowFeatures = `width=${windowSize.width},height=${windowSize.height},menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no`;
        let popupWindow: Window = window.open(params.url, endpoint.provider.toUpperCase(), windowFeatures);

        return new Promise<IToken>((resolve, reject) => {
            try {
                const POLL_INTERVAL = 400;
                let interval = setInterval(() => {
                    try {
                        if (popupWindow.document.URL.indexOf(endpoint.redirectUrl) !== -1) {
                            clearInterval(interval);
                            popupWindow.close();

                            let result = TokenManager.getToken(popupWindow.document.URL, endpoint.redirectUrl);
                            if (result == null) {
                                return reject(new OAuthError('No access_token or code could be parsed.'));
                            }
                            else if (endpoint.state && +result.state !== params.state) {
                                return reject(new OAuthError('State couldn\'t be verified'));
                            }
                            else if ('code' in result) {
                                return resolve(this.exchangeCodeForToken(endpoint, (<ICode>result)));
                            }
                            else if ('access_token' in result) {
                                this.tokens.add(endpoint.provider, result as IToken);
                                return resolve(result as IToken);
                            }
                            else {
                                return reject(new OAuthError((result as IError).error, result.state));
                            }
                        }
                    }
                    catch (exception) {
                        if (!popupWindow) {
                            clearInterval(interval);
                            return reject(new OAuthError('Popup window was closed'));
                        }
                    }
                }, POLL_INTERVAL);
            }
            catch (exception) {
                popupWindow.close();
                return reject(new OAuthError('Unexpected error occured while creating popup'));
            }
        });
    }

    private _openInDialog(endpoint: IEndpoint): Promise<IToken> {
        let params = EndpointManager.getLoginParams(endpoint);
        let windowSize = this._determineDialogSize();

        return new Promise<IToken>((resolve, reject) => {
            Office.context.ui.displayDialogAsync(params.url, windowSize, result => {
                var dialog = result.value;
                if (dialog == null) {
                    return reject(new OAuthError(result.error.message));
                }
                dialog.addEventHandler((<any>Office).EventType.DialogMessageReceived, args => {
                    dialog.close();
                    try {
                        if (args.message == null || args.message === '') {
                            return reject(new OAuthError('No access_token or code could be parsed.'));
                        }

                        var json = JSON.parse(args.message);
                        if (endpoint.state && +json.state !== params.state) {
                            return reject(new OAuthError('State couldn\'t be verified'));
                        }
                        else if ('code' in json) {
                            return resolve(this.exchangeCodeForToken(endpoint, (<ICode>json)));
                        }
                        else if ('access_token' in json) {
                            this.tokens.add(endpoint.provider, json as IToken);
                            return resolve(json as IToken);
                        }
                        else {
                            return reject(new OAuthError((json as IError).error, json.state));
                        }
                    }
                    catch (exception) {
                        return reject(new OAuthError('Error while parsing response: ' + JSON.stringify(exception)));
                    }
                });
            });
        });
    }

    private _determineDialogSize() {
        var screenHeight = window.screen.height;
        var screenWidth = window.screen.width;

        if (screenWidth <= 640) {
            return this._createSizeObject(640, 480, screenWidth, screenHeight);
        }
        else if (screenWidth <= 1007) {
            return this._createSizeObject(1024, 768, screenWidth, screenHeight);
        }
        else {
            return this._createSizeObject(1024, 768, screenWidth, screenHeight);
        }
    }

    private _createSizeObject(width: number, height: number, screenWidth: number, screenHeight: number) {
        var minOrDefault = (value: number, isHorizontal: boolean) => {
            var dimension = isHorizontal ? screenWidth : screenHeight;
            return value < dimension ? value : dimension - 30;
        }

        var percentage = (value: number, isHorizontal: boolean) => isHorizontal ? (value * 100 / screenWidth) : (value * 100 / screenHeight);

        return {
            width: percentage(minOrDefault(width, true), true),
            height: percentage(minOrDefault(height, false), false),
            toPixels: () => {
                return {
                    width: minOrDefault(width, true),
                    height: minOrDefault(height, false)
                }
            }
        }
    }
}