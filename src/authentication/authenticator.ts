import {EndpointManager, TokenManager, IEndpoint, IToken, ICode, IError} from '../authentication';

/**
 * Helper for performing Implicit OAuth Authentication with registered endpoints.
 */
export class Authenticator {
    /**
     * @constructor
     *
     * @param endpointManager Depends on an instance of EndpointManager
     * @param TokenManager Depends on an instance of TokenManager
    */
    constructor(
        public endpoints?: EndpointManager,
        public tokens?: TokenManager
    ) {
        if (endpoints == null) this.endpoints = new EndpointManager();
        if (tokens == null) this.tokens = new TokenManager();
    }

    /**
     * Authenticate based on the given provider
     * Either uses DialogAPI or Window Popups based on where its being called from viz. Add-in or Web.
     * If the token was cached, the it retrieves the cached token.
     *
     * WARNING: you have to manually check the expires_in or expires_at property to determine
     * if the token has expired. Not all OAuth providers support refresh token flows.
     *
     * @param {string} provider Link to the provider.
     * @param {boolean} force Force re-authentication.
     * @return {Promise<IToken|ICode>} Returns a promise of the token or code or error.
     */
    authenticate(provider: string, force: boolean = false): Promise<IToken | ICode> {
        let token = this.tokens.get(provider);
        if (token != null && !force) {
            return Promise.resolve(token);
        }

        let endpoint = this.endpoints.get(provider);
        if (endpoint == null) {
            return Promise.reject(<IError>{ error: `No such registered endpoint: ${provider} could be found.` }) as any;
        }

        var auth = Authenticator.isAddin ? this._openInDialog(endpoint) : this._openInWindowPopup(endpoint);
        return auth.catch(error => console.error(error));
    }

    /**
     * POST Helper for exchanging the code with a given url.
     *
     * @return {Promise<IToken>} Returns a promise of the token or error.
     */
    exchangeCodeForToken(url: string, data: any, headers?: any): Promise<IToken> {
        return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url);

            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('Content-Type', 'application/json');

            for (var header in headers) {
                if (header === 'Accept' || header === 'Content-Type') {
                    continue;
                }

                xhr.setRequestHeader(header, headers[header]);
            }

            xhr.onload = function () {
                try {
                    if (xhr.status === 200) {
                        var json = JSON.parse(xhr.responseText);
                        if ('access_token' in json) {
                            resolve(json as IToken);
                        }
                        else {
                            reject(json as IError);
                        }
                    }
                    else if (xhr.status !== 200) {
                        reject(<IError>{ error: 'Request failed. ' + xhr.response });
                    }
                }
                catch (e) {
                    reject(<IError>{ error: e });
                }
            };

            xhr.send(JSON.stringify(data));
        });
    }

    /**
     * Check if the currrent url is running inside of a Dialog that contains an access_token or code or error.
     * If true then it calls messageParent by extracting the token information.
     *
     * @return {boolean}
     * Returns false if the code is running inside of a dialog without the required information
     * or is not running inside of a dialog at all.
     */
    static closeDialog(): boolean {
        if (!Authenticator.isAddin) {
            return false;
        }
        else {
            if (!Authenticator.isTokenUrl(location.href)) {
                return false;
            }

            var token = TokenManager.getToken(location.href, location.origin);
            Office.context.ui.messageParent(JSON.stringify(token));
            return true;
        }
    }

    /**
     * Check if the supplied url has either access_token or code or error
     */
    static isTokenUrl(url: string) {
        var regex = /(access_token|code|error)/gi;
        return regex.test(url);
    }

    /**
     * Check if the code is running inside of an Addin versus a Web Context.
     * The checks for Office and Word, Excel or OneNote objects.
     */
    private static _isAddin: boolean;
    static get isAddin() {
        if (Authenticator._isAddin == null) {
            Authenticator._isAddin =
                window.hasOwnProperty('Office') &&
                (
                    window.hasOwnProperty('Word') ||
                    window.hasOwnProperty('Excel') ||
                    window.hasOwnProperty('OneNote')
                );
        }

        return Authenticator._isAddin;
    }

    static set isAddin(value: boolean) {
        Authenticator._isAddin = value;
    }

    private _openInWindowPopup(endpoint: IEndpoint): Promise<IToken | ICode> {
        let url = EndpointManager.getLoginUrl(endpoint);
        let windowSize = endpoint.windowSize || "width=400,height=600";
        let windowFeatures = windowSize + ",menubar=no,toolbar=no,location=no,resizable=no,scrollbars=yes,status=no";
        let popupWindow: Window = window.open(url, endpoint.provider.toUpperCase(), windowFeatures);

        return new Promise<IToken | ICode>((resolve, reject) => {
            try {
                let interval = setInterval(() => {
                    try {
                        if (popupWindow.document.URL.indexOf(endpoint.redirectUrl) !== -1) {
                            clearInterval(interval);
                            let result = TokenManager.getToken(popupWindow.document.URL, endpoint.redirectUrl);
                            if (result == null) return reject(<IError>{ error: 'No access_token or code could be parsed.' });
                            else if ('code' in result) {
                                popupWindow.close();
                                if (endpoint.tokenUrl != '') {
                                    return resolve(this.exchangeCodeForToken(endpoint.tokenUrl, (<ICode>result).code));
                                }
                                return resolve(result as ICode);
                            }
                            else if ('access_token' in result) {
                                this.tokens.add(endpoint.provider, result as IToken);
                                popupWindow.close();
                                return resolve(result as IToken);
                            }
                            else {
                                return reject(result as IError);
                            }
                        }
                    }
                    catch (exception) {
                        if (!popupWindow) {
                            clearInterval(interval);
                            return reject(<IError>{ error: exception });
                        }
                    }
                }, 400);
            }
            catch (exception) {
                popupWindow.close();
                return reject(<IError>{ error: exception });
            }
        });
    }

    private _openInDialog(endpoint: IEndpoint): Promise<IToken | ICode> {
        let url = EndpointManager.getLoginUrl(endpoint);

        var options: Office.DialogOptions = {
            height: 35,
            width: 35
        };

        return new Promise<IToken | ICode>((resolve, reject) => {
            Office.context.ui.displayDialogAsync(url, options, result => {
                var dialog = result.value;
                dialog.addEventHandler((<any>Office).EventType.DialogMessageReceived, args => {
                    dialog.close();
                    try {
                        if (args.message == null || args.message === '') {
                            return reject(<IError>{ error: 'No access_token or code could be parsed.' });
                        }

                        var json = JSON.parse(args.message);

                        if ('code' in json) {
                            if (endpoint.tokenUrl != '') {
                                return resolve(this.exchangeCodeForToken(endpoint.tokenUrl, (<ICode>json).code));
                            }
                            return resolve(json as ICode);
                        }
                        else if ('access_token' in json) {
                            this.tokens.add(endpoint.provider, json as IToken);
                            return resolve(json as IToken);
                        }
                        else {
                            return reject(json as IError);
                        }
                    }
                    catch (exception) {
                        return reject(<IError>{ error: exception });
                    }
                });
            });
        });
    }
}