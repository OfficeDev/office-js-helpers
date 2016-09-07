(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", '../authentication'], factory);
    }
})(function (require, exports) {
    "use strict";
    var authentication_1 = require('../authentication');
    /**
     * Enumeration for the supported modes of Authentication.
     * Either dialog or redirection.
     */
    (function (AuthenticationMode) {
        /**
         * Opens a the authorize url inside of a dialog.
         */
        AuthenticationMode[AuthenticationMode["Dialog"] = 0] = "Dialog";
        /**
         * Redirects the current window to the authorize url.
         */
        AuthenticationMode[AuthenticationMode["Redirect"] = 1] = "Redirect";
    })(exports.AuthenticationMode || (exports.AuthenticationMode = {}));
    var AuthenticationMode = exports.AuthenticationMode;
    /**
     * Helper for performing Implicit OAuth Authentication with registered endpoints.
     */
    var Authenticator = (function () {
        /**
         * @constructor
         *
         * @param endpointManager Depends on an instance of EndpointManager
         * @param TokenManager Depends on an instance of TokenManager
        */
        function Authenticator(_endpointManager, _tokenManager) {
            this._endpointManager = _endpointManager;
            this._tokenManager = _tokenManager;
            if (_endpointManager == null)
                throw 'Please pass an instance of EndpointManager.';
            if (_tokenManager == null)
                throw 'Please pass an instance of TokenManager.';
            if (_endpointManager.count == 0)
                throw 'No registered Endpoints could be found. Either use the default endpoint registrations or add one manually';
        }
        /**
         * Authenticate based on the given provider
         * Either uses DialogAPI or Window Popups based on where its being called from
         * viz. Add-in or Web.
         * If the token was cached, the it retrieves the cached token.
         *
         * WARNING: you have to manually check the expires_in or expires_at property to determine
         * if the token has expired. Not all OAuth providers support refresh token flows.
         *
         * @param {string} provider Link to the provider.
         * @param {boolean} force Force re-authentication.
         * @return {Promise<IToken|ICode|IError>} Returns a promise of the token or code or error.
         */
        Authenticator.prototype.authenticate = function (provider, force) {
            if (force === void 0) { force = false; }
            var token = this._tokenManager.get(provider);
            if (token != null && !force)
                return Promise.resolve(token);
            var endpoint = this._endpointManager.get(provider);
            if (Authenticator.mode == AuthenticationMode.Redirect) {
                var url = authentication_1.EndpointManager.getLoginUrl(endpoint);
                location.replace(url);
                return Promise.reject('AUTH_REDIRECT');
            }
            else {
                var auth;
                if (Authenticator.isAddin)
                    auth = this._openInDialog(endpoint);
                else
                    auth = this._openInWindowPopup(endpoint);
                return auth.catch(function (error) { return console.error(error); });
            }
        };
        /**
         * POST Helper for exchanging the code with a given url.
         *
         * @return {Promise<IToken|IError>} Returns a promise of the token or error.
         */
        Authenticator.prototype.exchangeCodeForToken = function (url, data, headers) {
            return new Promise(function (resolve, reject) {
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
        Object.defineProperty(Authenticator, "isAuthDialog", {
            /**
             * Check if the currrent url is running inside of a Dialog that contains an access_token or code or error.
             * If true then it calls messageParent by extracting the token information.
             *
             * @return {boolean}
             * Returns false if the code is running inside of a dialog without the requried information
             * or is not running inside of a dialog at all.
             */
            get: function () {
                if (!Authenticator.isAddin)
                    return false;
                else {
                    if (!authentication_1.TokenManager.isTokenUrl(location.href))
                        return false;
                    var token = authentication_1.TokenManager.getToken(location.href, location.origin);
                    Office.context.ui.messageParent(JSON.stringify(token));
                    return true;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Authenticator, "isAddin", {
            get: function () {
                if (Authenticator._isAddin == null) {
                    Authenticator._isAddin =
                        window.hasOwnProperty('Office') &&
                            (window.hasOwnProperty('Word') ||
                                window.hasOwnProperty('Excel') ||
                                window.hasOwnProperty('OneNote'));
                }
                return Authenticator._isAddin;
            },
            set: function (value) {
                Authenticator._isAddin = value;
            },
            enumerable: true,
            configurable: true
        });
        Authenticator.prototype._openInWindowPopup = function (endpoint) {
            var _this = this;
            var url = authentication_1.EndpointManager.getLoginUrl(endpoint);
            var windowSize = endpoint.windowSize || "width=400,height=600";
            var windowFeatures = windowSize + ",menubar=no,toolbar=no,location=no,resizable=no,scrollbars=yes,status=no";
            var popupWindow = window.open(url, endpoint.provider.toUpperCase(), windowFeatures);
            return new Promise(function (resolve, reject) {
                try {
                    var interval_1 = setInterval(function () {
                        try {
                            if (popupWindow.document.URL.indexOf(endpoint.redirectUrl) !== -1) {
                                clearInterval(interval_1);
                                var result = authentication_1.TokenManager.getToken(popupWindow.document.URL, endpoint.redirectUrl);
                                if (result == null)
                                    reject('No access_token or code could be parsed.');
                                else if ('code' in result) {
                                    popupWindow.close();
                                    if (endpoint.tokenUrl != '') {
                                        resolve(_this.exchangeCodeForToken(endpoint.tokenUrl, result.code));
                                    }
                                    resolve(result);
                                }
                                else if ('access_token' in result) {
                                    _this._tokenManager.add(endpoint.provider, result);
                                    popupWindow.close();
                                    resolve(result);
                                }
                                else {
                                    reject(result);
                                }
                            }
                        }
                        catch (exception) {
                            if (!popupWindow) {
                                clearInterval(interval_1);
                                reject(exception);
                            }
                        }
                    }, 400);
                }
                catch (exception) {
                    popupWindow.close();
                    reject(exception);
                }
            });
        };
        Authenticator.prototype._openInDialog = function (endpoint) {
            var _this = this;
            var url = authentication_1.EndpointManager.getLoginUrl(endpoint);
            var options = {
                height: 35,
                width: 35
            };
            return new Promise(function (resolve, reject) {
                Office.context.ui.displayDialogAsync(url, options, function (result) {
                    var dialog = result.value;
                    dialog.addEventHandler(Office.EventType.DialogMessageReceived, function (args) {
                        dialog.close();
                        try {
                            if (args.message == null || args.message === '')
                                reject('No access_token or code could be parsed.');
                            var json = JSON.parse(args.message);
                            if ('code' in json) {
                                if (endpoint.tokenUrl != '') {
                                    resolve(_this.exchangeCodeForToken(endpoint.tokenUrl, json.code));
                                }
                                resolve(json);
                            }
                            else if ('access_token' in json) {
                                _this._tokenManager.add(endpoint.provider, json);
                                resolve(json);
                            }
                            else {
                                reject(json);
                            }
                        }
                        catch (exception) {
                            reject(exception);
                        }
                    });
                });
            });
        };
        /**
         * Controls the way the authentication should take place.
         * Either by using dialog or by redirecting the current window.
         * Defaults to the dialog flow.
         */
        Authenticator.mode = AuthenticationMode.Dialog;
        return Authenticator;
    }());
    exports.Authenticator = Authenticator;
});
//# sourceMappingURL=authenticator.js.map