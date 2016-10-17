// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
"use strict";
var endpoint_manager_1 = require('../authentication/endpoint.manager');
var token_manager_1 = require('../authentication/token.manager');
/**
 * Helper for performing Implicit OAuth Authentication with registered endpoints.
 */
var Authenticator = (function () {
    /**
     * @constructor
     *
     * @param endpointManager Depends on an instance of EndpointManager.
     * @param TokenManager Depends on an instance of TokenManager.
    */
    function Authenticator(endpoints, tokens) {
        this.endpoints = endpoints;
        this.tokens = tokens;
        if (endpoints == null)
            this.endpoints = new endpoint_manager_1.EndpointManager();
        if (tokens == null)
            this.tokens = new token_manager_1.TokenManager();
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
    Authenticator.prototype.authenticate = function (provider, force) {
        if (force === void 0) { force = false; }
        var token = this.tokens.get(provider);
        if (token != null) {
            if (token.expires_at != null) {
                token.expires_at = token.expires_at instanceof Date ? token.expires_at : new Date(token.expires_at);
                if (token.expires_at.getTime() - new Date().getTime() < 0) {
                    console.warn("Token for provider: " + provider + " has expired. Re-authenticating...");
                    force = true;
                }
            }
            if (!force) {
                return Promise.resolve(token);
            }
        }
        var endpoint = this.endpoints.get(provider);
        if (endpoint == null) {
            return Promise.reject({ error: "No such registered endpoint: " + provider + " could be found." });
        }
        else {
            return (Authenticator.hasDialogAPI) ? this._openInDialog(endpoint) : this._openInWindowPopup(endpoint);
        }
    };
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
    Authenticator.prototype.exchangeCodeForToken = function (provider, data, headers) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var endpoint = _this.endpoints.get(provider);
            if (endpoint.tokenUrl == null) {
                console.warn("We couldn't exchange the received code for an access_token.\n                    The value returned is not an access_token.\n                    Please set the tokenUrl property or refer to our docs.");
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
            xhr.onload = function () {
                try {
                    if (xhr.status === 200) {
                        var json = JSON.parse(xhr.responseText);
                        if ('access_token' in json) {
                            _this.tokens.add(endpoint.provider, json);
                            resolve(json);
                        }
                        else {
                            reject(json);
                        }
                    }
                    else if (xhr.status !== 200) {
                        reject({ error: 'Request failed. ' + xhr.response });
                    }
                }
                catch (e) {
                    reject({ error: e });
                }
            };
            xhr.send(JSON.stringify(data));
        });
    };
    /**
     * Check if the currrent url is running inside of a Dialog that contains an access_token or code or error.
     * If true then it calls messageParent by extracting the token information, thereby closing the dialog.
     * Otherwise, the caller should proceed with normal initialization of their application.
     *
     * @return {boolean}
     * Returns false if the code is running inside of a dialog without the required information
     * or is not running inside of a dialog at all.
     */
    Authenticator.isAuthDialog = function () {
        if (!Authenticator.hasDialogAPI) {
            return false;
        }
        else {
            if (!Authenticator.isTokenUrl(location.href)) {
                return false;
            }
            Office.context.ui.messageParent(JSON.stringify(token_manager_1.TokenManager.getToken()));
            return true;
        }
    };
    /**
     * Check if the supplied url has either access_token or code or error.
     */
    Authenticator.isTokenUrl = function (url) {
        var regex = /(access_token|code|error)/gi;
        return regex.test(url);
    };
    Object.defineProperty(Authenticator, "hasDialogAPI", {
        get: function () {
            if (Authenticator._hasDialogAPI == null) {
                try {
                    Authenticator._hasDialogAPI =
                        window.hasOwnProperty('Office') &&
                            window.Office.context.requirements.isSetSupported('DialogAPI', '1.1');
                }
                catch (e) {
                    Authenticator._hasDialogAPI = false;
                }
            }
            return Authenticator._hasDialogAPI;
        },
        enumerable: true,
        configurable: true
    });
    Authenticator.prototype._openInWindowPopup = function (endpoint) {
        var _this = this;
        var params = endpoint_manager_1.EndpointManager.getLoginParams(endpoint);
        var windowSize = this._determineDialogSize().toPixels();
        var windowFeatures = "width=" + windowSize.width + ",height=" + windowSize.height + ",menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no";
        var popupWindow = window.open(params.url, endpoint.provider.toUpperCase(), windowFeatures);
        return new Promise(function (resolve, reject) {
            try {
                var POLL_INTERVAL = 400;
                var interval_1 = setInterval(function () {
                    try {
                        if (popupWindow.document.URL.indexOf(endpoint.redirectUrl) !== -1) {
                            clearInterval(interval_1);
                            popupWindow.close();
                            var result = token_manager_1.TokenManager.getToken(popupWindow.document.URL, endpoint.redirectUrl);
                            if (result == null) {
                                return reject({ error: 'No access_token or code could be parsed.' });
                            }
                            else if (+result.state !== params.state) {
                                return reject({ error: 'State couldn\'t be verified' });
                            }
                            else if ('code' in result) {
                                return resolve(_this.exchangeCodeForToken(endpoint.provider, result));
                            }
                            else if ('access_token' in result) {
                                _this.tokens.add(endpoint.provider, result);
                                return resolve(result);
                            }
                            else {
                                return reject(result);
                            }
                        }
                    }
                    catch (exception) {
                        if (!popupWindow) {
                            clearInterval(interval_1);
                            return reject({ error: exception });
                        }
                    }
                }, POLL_INTERVAL);
            }
            catch (exception) {
                popupWindow.close();
                return reject({ error: exception });
            }
        });
    };
    Authenticator.prototype._openInDialog = function (endpoint) {
        var _this = this;
        var params = endpoint_manager_1.EndpointManager.getLoginParams(endpoint);
        var windowSize = this._determineDialogSize();
        return new Promise(function (resolve, reject) {
            Office.context.ui.displayDialogAsync(params.url, windowSize, function (result) {
                var dialog = result.value;
                if (dialog == null) {
                    return reject({ error: result.error.message });
                }
                dialog.addEventHandler(Office.EventType.DialogMessageReceived, function (args) {
                    dialog.close();
                    try {
                        if (args.message == null || args.message === '') {
                            return reject({ error: 'No access_token or code could be parsed.' });
                        }
                        var json = JSON.parse(args.message);
                        if (+json.state !== params.state) {
                            return reject({ error: 'State couldn\'t be verified' });
                        }
                        else if ('code' in json) {
                            return resolve(_this.exchangeCodeForToken(endpoint.provider, json));
                        }
                        else if ('access_token' in json) {
                            _this.tokens.add(endpoint.provider, json);
                            return resolve(json);
                        }
                        else {
                            return reject(json);
                        }
                    }
                    catch (exception) {
                        return reject({ error: exception });
                    }
                });
            });
        });
    };
    Authenticator.prototype._determineDialogSize = function () {
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
    };
    Authenticator.prototype._createSizeObject = function (width, height, screenWidth, screenHeight) {
        var minOrDefault = function (value, isHorizontal) {
            var dimension = isHorizontal ? screenWidth : screenHeight;
            return value < dimension ? value : dimension - 30;
        };
        var percentage = function (value, isHorizontal) { return isHorizontal ? (value * 100 / screenWidth) : (value * 100 / screenHeight); };
        return {
            width: percentage(minOrDefault(width, true), true),
            height: percentage(minOrDefault(height, false), false),
            toPixels: function () {
                return {
                    width: minOrDefault(width, true),
                    height: minOrDefault(height, false)
                };
            }
        };
    };
    return Authenticator;
}());
exports.Authenticator = Authenticator;
//# sourceMappingURL=authenticator.js.map