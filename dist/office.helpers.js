(function(f) {
    if (typeof exports === "object" && typeof module !== "undefined") {
        module.exports = f()
    } else if (typeof define === "function" && define.amd) {
        define([], f)
    } else {
        var g;
        if (typeof window !== "undefined") {
            g = window
        } else if (typeof global !== "undefined") {
            g = global
        } else if (typeof self !== "undefined") {
            g = self
        } else {
            g = this
        }
        g.listComponent = f()
    }
})(function() {
        var define, module, exports;
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", '../authentication/endpoint.manager', '../authentication/token.manager'], factory);
    }
})(function (require, exports) {
    "use strict";
    var endpoint_manager_1 = require('../authentication/endpoint.manager');
    var token_manager_1 = require('../authentication/token.manager');
    /**
     * Custom error type to handle OAuth specific errors.
     */
    var OAuthError = (function (_super) {
        __extends(OAuthError, _super);
        /**
         * @constructor
         *
         * @param message Error message to be propagated.
         * @param state OAuth state if available.
        */
        function OAuthError(message, state) {
            _super.call(this, message);
            this.state = state;
            this.name = "OAuthError";
            this.message = message;
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, this.constructor);
            }
            else {
                var error = new Error();
                if (error.stack) {
                    var last_part = error.stack.match(/[^\s]+$/);
                    this.stack = this.name + " at " + last_part;
                }
            }
        }
        return OAuthError;
    }(Error));
    exports.OAuthError = OAuthError;
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
                return Promise.reject(new OAuthError("No such registered endpoint: " + provider + " could be found."));
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
         * @param {Endpoint} endpoint Endpoint configuration.
         * @param {object} data Data to be sent to the tokenUrl.
         * @param {object} headers Headers to be sent to the tokenUrl.     *
         * @return {Promise<IToken>} Returns a promise of the token or error.
         */
        Authenticator.prototype.exchangeCodeForToken = function (endpoint, data, headers) {
            var _this = this;
            return new Promise(function (resolve, reject) {
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
                xhr.onerror = function () {
                    return reject(new OAuthError('Unable to send request due to a Network error'));
                };
                xhr.onload = function () {
                    try {
                        if (xhr.status === 200) {
                            var json = JSON.parse(xhr.responseText);
                            if (json == null) {
                                return reject(new OAuthError('No access_token or code could be parsed.'));
                            }
                            else if ('access_token' in json) {
                                _this.tokens.add(endpoint.provider, json);
                                return resolve(json);
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
                                ((window.Office.context.requirements &&
                                    window.Office.context.requirements.isSetSupported('DialogAPI', '1.1')) ||
                                    window.hasOwnProperty('Excel') ||
                                    window.hasOwnProperty('Word') ||
                                    window.hasOwnProperty('OneNote'));
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
                                    return reject(new OAuthError('No access_token or code could be parsed.'));
                                }
                                else if (endpoint.state && +result.state !== params.state) {
                                    return reject(new OAuthError('State couldn\'t be verified'));
                                }
                                else if ('code' in result) {
                                    return resolve(_this.exchangeCodeForToken(endpoint, result));
                                }
                                else if ('access_token' in result) {
                                    _this.tokens.add(endpoint.provider, result);
                                    return resolve(result);
                                }
                                else {
                                    return reject(new OAuthError(result.error, result.state));
                                }
                            }
                        }
                        catch (exception) {
                            if (!popupWindow) {
                                clearInterval(interval_1);
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
        };
        Authenticator.prototype._openInDialog = function (endpoint) {
            var _this = this;
            var params = endpoint_manager_1.EndpointManager.getLoginParams(endpoint);
            var windowSize = this._determineDialogSize();
            return new Promise(function (resolve, reject) {
                Office.context.ui.displayDialogAsync(params.url, windowSize, function (result) {
                    var dialog = result.value;
                    if (dialog == null) {
                        return reject(new OAuthError(result.error.message));
                    }
                    dialog.addEventHandler(Office.EventType.DialogMessageReceived, function (args) {
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
                                return resolve(_this.exchangeCodeForToken(endpoint, json));
                            }
                            else if ('access_token' in json) {
                                _this.tokens.add(endpoint.provider, json);
                                return resolve(json);
                            }
                            else {
                                return reject(new OAuthError(json.error, json.state));
                            }
                        }
                        catch (exception) {
                            return reject(new OAuthError('Error while parsing response: ' + JSON.stringify(exception)));
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
});

},{"../authentication/endpoint.manager":2,"../authentication/token.manager":3}],2:[function(require,module,exports){
// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", '../helpers/storage'], factory);
    }
})(function (require, exports) {
    "use strict";
    var storage_1 = require('../helpers/storage');
    // Underscore.js implementation of extend.
    // https://github.com/jashkenas/underscore/blob/master/underscore.js
    var extend = function (obj) {
        var defaults = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            defaults[_i - 1] = arguments[_i];
        }
        var length = arguments.length;
        if (length < 2 || obj == null)
            return obj; // if there are no objects to extend then return the current object
        if (defaults)
            obj = Object(obj); // create a new object to extend if there are any extensions
        for (var index = 1; index < length; index++) {
            var source = arguments[index]; // foreach object
            if (source == null)
                continue; // move on if the object is null or undefined
            var keys = Object.keys(source), // get all the keys
            l = keys.length; // cache the length
            for (var i = 0; i < l; i++) {
                var key = keys[i]; // for each key
                if (!defaults || obj[key] === void 0)
                    obj[key] = source[key]; // replace values
            }
        }
        return obj;
    };
    exports.DefaultEndpoints = {
        Google: 'Google',
        Microsoft: 'Microsoft',
        Facebook: 'Facebook',
        AzureAD: 'AzureAD'
    };
    /**
     * Helper for creating and registering OAuth Endpoints.
     */
    var EndpointManager = (function (_super) {
        __extends(EndpointManager, _super);
        /**
         * @constructor
        */
        function EndpointManager() {
            _super.call(this, 'OAuth2Endpoints', storage_1.StorageType.LocalStorage);
        }
        Object.defineProperty(EndpointManager.prototype, "currentHost", {
            /**
             * Gets the current url to be specified as the default redirect url.
             */
            get: function () {
                if (this._currentHost == null) {
                    this._currentHost = window.location.protocol + "//" + window.location.host;
                }
                return this._currentHost;
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Extends Storage's default add method.
         * Registers a new OAuth Endpoint.
         *
         * @param {string} provider Unique name for the registered OAuth Endpoint.
         * @param {object} config Valid Endpoint configuration.
         * @see {@link IEndpoint}.
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.prototype.add = function (provider, config) {
            if (config.redirectUrl == null) {
                config.redirectUrl = this.currentHost;
            }
            config.provider = provider;
            return _super.prototype.insert.call(this, provider, config);
        };
        /**
         * Register Google Implicit OAuth.
         * If overrides is left empty, the default scope is limited to basic profile information.
         *
         * @param {string} clientId ClientID for the Google App.
         * @param {object} config Valid Endpoint configuration to override the defaults.
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.prototype.registerGoogleAuth = function (clientId, overrides) {
            var defaults = {
                clientId: clientId,
                baseUrl: 'https://accounts.google.com',
                authorizeUrl: '/o/oauth2/v2/auth',
                resource: 'https://www.googleapis.com',
                responseType: 'token',
                scope: 'https://www.googleapis.com/auth/plus.me',
                state: true
            };
            var config = extend({}, overrides, defaults);
            return this.add(exports.DefaultEndpoints.Google, config);
        };
        ;
        /**
         * Register Microsoft Implicit OAuth.
         * If overrides is left empty, the default scope is limited to basic profile information.
         *
         * @param {string} clientId ClientID for the Microsoft App.
         * @param {object} config Valid Endpoint configuration to override the defaults.
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.prototype.registerMicrosoftAuth = function (clientId, overrides) {
            var defaults = {
                clientId: clientId,
                baseUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0',
                authorizeUrl: '/authorize',
                responseType: 'token',
                scope: 'https://graph.microsoft.com/user.read',
                extraParameters: '&response_mode=fragment',
                nonce: true,
                state: true
            };
            var config = extend({}, overrides, defaults);
            this.add(exports.DefaultEndpoints.Microsoft, config);
        };
        ;
        /**
         * Register Facebook Implicit OAuth.
         * If overrides is left empty, the default scope is limited to basic profile information.
         *
         * @param {string} clientId ClientID for the Facebook App.
         * @param {object} config Valid Endpoint configuration to override the defaults.
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.prototype.registerFacebookAuth = function (clientId, overrides) {
            var defaults = {
                clientId: clientId,
                baseUrl: 'https://www.facebook.com',
                authorizeUrl: '/dialog/oauth',
                resource: 'https://graph.facebook.com',
                responseType: 'token',
                scope: 'public_profile',
                nonce: true,
                state: true
            };
            var config = extend({}, overrides, defaults);
            this.add(exports.DefaultEndpoints.Facebook, config);
        };
        ;
        /**
         * Register AzureAD Implicit OAuth.
         * If overrides is left empty, the default scope is limited to basic profile information.
         *
         * @param {string} clientId ClientID for the AzureAD App.
         * @param {string} tenant Tenant for the AzureAD App.
         * @param {object} config Valid Endpoint configuration to override the defaults.
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.prototype.registerAzureADAuth = function (clientId, tenant, overrides) {
            var defaults = {
                clientId: clientId,
                baseUrl: "https://login.windows.net/" + tenant,
                authorizeUrl: '/oauth2/authorize',
                resource: 'https://graph.microsoft.com',
                responseType: 'token',
                nonce: true,
                state: true
            };
            var config = extend({}, overrides, defaults);
            this.add(exports.DefaultEndpoints.AzureAD, config);
        };
        ;
        /**
         * Helper to generate the OAuth login url.
         *
         * @param {object} config Valid Endpoint configuration.
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.getLoginParams = function (endpointConfig) {
            var scope = (endpointConfig.scope) ? encodeURIComponent(endpointConfig.scope) : null;
            var resource = (endpointConfig.resource) ? encodeURIComponent(endpointConfig.resource) : null;
            var state = endpointConfig.state && EndpointManager._generateCryptoSafeRandom();
            var nonce = endpointConfig.nonce && EndpointManager._generateCryptoSafeRandom();
            var urlSegments = [
                'response_type=' + endpointConfig.responseType,
                'client_id=' + encodeURIComponent(endpointConfig.clientId),
                'redirect_uri=' + encodeURIComponent(endpointConfig.redirectUrl)
            ];
            if (scope) {
                urlSegments.push('scope=' + scope);
            }
            if (resource) {
                urlSegments.push('resource=' + resource);
            }
            if (state) {
                urlSegments.push('state=' + state);
            }
            if (nonce) {
                urlSegments.push('nonce=' + nonce);
            }
            if (endpointConfig.extraQueryParameters) {
                urlSegments.push(endpointConfig.extraQueryParameters);
            }
            return {
                url: endpointConfig.baseUrl + endpointConfig.authorizeUrl + '?' + urlSegments.join('&'),
                state: state
            };
        };
        EndpointManager._generateCryptoSafeRandom = function () {
            var random = new Uint32Array(1);
            if ('msCrypto' in window) {
                window.msCrypto.getRandomValues(random);
            }
            else if ('crypto' in window) {
                window.crypto.getRandomValues(random);
            }
            else {
                throw new Error('The platform doesn\'t support generation of Cryptographically Safe Randoms. Please disable the state flag and try again');
            }
            return random[0];
        };
        return EndpointManager;
    }(storage_1.Storage));
    exports.EndpointManager = EndpointManager;
});

},{"../helpers/storage":5}],3:[function(require,module,exports){
// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", '../helpers/storage'], factory);
    }
})(function (require, exports) {
    "use strict";
    var storage_1 = require('../helpers/storage');
    /**
     * Helper for caching and managing OAuth Tokens.
     */
    var TokenManager = (function (_super) {
        __extends(TokenManager, _super);
        /**
         * @constructor
        */
        function TokenManager() {
            _super.call(this, 'OAuth2Tokens', storage_1.StorageType.LocalStorage);
        }
        /**
         * Compute the expiration date based on the expires_in field in a OAuth token.
         */
        TokenManager.prototype.setExpiry = function (token) {
            var expire = function (seconds) { return seconds == null ? null : new Date(new Date().getTime() + ~~seconds * 1000); };
            if (!(token == null) && token.expires_at == null) {
                token.expires_at = expire(token.expires_in);
            }
        };
        /**
         * Extends Storage's default add method
         * Adds a new OAuth Token after settings its expiry
         *
         * @param {string} provider Unique name of the corresponding OAuth Endpoint.
         * @param {object} config valid Token
         * @see {@link IEndpoint}.
         * @return {object} Returns the added endpoint.
         */
        TokenManager.prototype.add = function (provider, value) {
            value.provider = provider;
            this.setExpiry(value);
            return _super.prototype.insert.call(this, provider, value);
        };
        /**
         * Extract the token from the URL
         *
         * @param {string} url The url to extract the token from.
         * @param {string} exclude Exclude a particlaur string from the url, such as a query param or specific substring.
         * @param {string} delimiter[optional] Delimiter used by OAuth provider to mark the beginning of token response. Defaults to #.
         * @return {object} Returns the extracted token.
         */
        TokenManager.getToken = function (url, exclude, delimiter) {
            if (url === void 0) { url = location.href; }
            if (exclude === void 0) { exclude = location.origin; }
            if (delimiter === void 0) { delimiter = '#'; }
            if (exclude)
                url = url.replace(exclude, '');
            var parts = url.split(delimiter);
            if (parts.length <= 0)
                return;
            var rightPart = parts.length >= 2 ? parts[1] : parts[0];
            rightPart = rightPart.replace('/', '');
            if (rightPart.indexOf("?") !== -1) {
                var queryPart = rightPart.split("?");
                if (!queryPart || queryPart.length <= 0)
                    return;
                rightPart = queryPart[1];
            }
            return this._extractParams(rightPart);
        };
        TokenManager._extractParams = function (segment) {
            var params = {}, regex = /([^&=]+)=([^&]*)/g, matches;
            while ((matches = regex.exec(segment)) !== null) {
                params[decodeURIComponent(matches[1])] = decodeURIComponent(matches[2]);
            }
            return params;
        };
        return TokenManager;
    }(storage_1.Storage));
    exports.TokenManager = TokenManager;
});

},{"../helpers/storage":5}],4:[function(require,module,exports){
// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    /**
     * Helper for creating and querying Dictionaries.
     * A rudimentary alternative to ES6 Maps.
     */
    var Dictionary = (function () {
        /**
         * @constructor
         * @param {object} items Initial seed of items.
        */
        function Dictionary(items) {
            this.items = items;
            if (!(this.items === new Object(this.items)) || Array.isArray(this.items)) {
                this.items = {};
            }
        }
        /**
         * Gets an item from the dictionary.
         *
         * @param {string} key The key of the item.
         * @return {object} Returns an item if found, else returns null.
         */
        Dictionary.prototype.get = function (key) {
            if (!this.contains(key)) {
                return null;
            }
            return this.items[key];
        };
        /**
         * Adds an item into the dictionary.
         * If the key already exists, then it will throw.
         *
         * @param {string} key The key of the item.
         * @param {object} value The item to be added.
         * @return {object} Returns the added item.
         */
        Dictionary.prototype.add = function (key, value) {
            if (this.contains(key)) {
                throw new Error("Key: " + key + " already exists.");
            }
            return this.insert(key, value);
        };
        ;
        /**
         * Inserts an item into the dictionary.
         * If an item already exists with the same key, it will be overridden by the new value.
         *
         * @param {string} key The key of the item.
         * @param {object} value The item to be added.
         * @return {object} Returns the added item.
         */
        Dictionary.prototype.insert = function (key, value) {
            if (key == null) {
                throw new Error('Key cannot be null or undefined');
            }
            this.items[key] = value;
            return value;
        };
        /**
         * Removes an item from the dictionary.
         * Will throw if the key doesn't exist.
         *
         * @param {string} key The key of the item.
         * @return {object} Returns the deleted item.
         */
        Dictionary.prototype.remove = function (key) {
            if (!this.contains(key)) {
                throw new Error("Key: " + key + " not found.");
            }
            var value = this.items[key];
            delete this.items[key];
            return value;
        };
        ;
        /**
         * Clears the dictionary.
         */
        Dictionary.prototype.clear = function () {
            this.items = {};
        };
        /**
         * Check if the dictionary contains the given key.
         *
         * @param {string} key The key of the item.
         * @return {boolean} Returns true if the key was found.
         */
        Dictionary.prototype.contains = function (key) {
            if (key == null) {
                throw new Error('Key cannot be null or undefined');
            }
            return this.items.hasOwnProperty(key);
        };
        /**
         * Lists all the keys in the dictionary.
         *
         * @return {array} Returns all the keys.
         */
        Dictionary.prototype.keys = function () {
            if (this.items == null)
                return [];
            return Object.keys(this.items);
        };
        /**
         * Lists all the values in the dictionary.
         *
         * @return {array} Returns all the values.
         */
        Dictionary.prototype.values = function () {
            var _this = this;
            return this.keys().map(function (key) { return _this.items[key]; });
        };
        /**
         * Get the dictionary.
         *
         * @return {object} Returns the dictionary if it contains data, null otherwise.
         */
        Dictionary.prototype.lookup = function () {
            return this.keys().length ? JSON.parse(JSON.stringify(this.items)) : null;
        };
        Object.defineProperty(Dictionary.prototype, "count", {
            /**
             * Number of items in the dictionary.
             *
             * @return {number} Returns the number of items in the dictionary.
             */
            get: function () {
                return this.keys().length;
            },
            enumerable: true,
            configurable: true
        });
        ;
        return Dictionary;
    }());
    exports.Dictionary = Dictionary;
});

},{}],5:[function(require,module,exports){
// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", './dictionary'], factory);
    }
})(function (require, exports) {
    "use strict";
    var dictionary_1 = require('./dictionary');
    (function (StorageType) {
        StorageType[StorageType["LocalStorage"] = 0] = "LocalStorage";
        StorageType[StorageType["SessionStorage"] = 1] = "SessionStorage";
    })(exports.StorageType || (exports.StorageType = {}));
    var StorageType = exports.StorageType;
    /**
     * Helper for creating and querying Local Storage or Session Storage.
     * @see Uses {@link Dictionary} to create an in-memory copy of
     * the storage for faster reads. Writes update the actual storage.
     */
    var Storage = (function (_super) {
        __extends(Storage, _super);
        /**
         * @constructor
         * @param {string} container Container name to be created in the LocalStorage.
         * @param {StorageType} type[optional] Storage Type to be used, defaults to Local Storage.
        */
        function Storage(_container, type) {
            _super.call(this);
            this._container = _container;
            this._storage = null;
            type = type || StorageType.LocalStorage;
            this.switchStorage(type);
        }
        /**
         * Switch the storage type.
         * Switches the storage type and then reloads the in-memory collection.
         *
         * @type {StorageType} type The desired storage to be used.
         */
        Storage.prototype.switchStorage = function (type) {
            this._storage = type === StorageType.LocalStorage ? localStorage : sessionStorage;
            if (!this._storage.hasOwnProperty(this._container)) {
                this._storage[this._container] = null;
            }
            this.load();
        };
        /**
         * Add an item.
         * Extends Dictionary's implementation of add, with a save to the storage.
         */
        Storage.prototype.add = function (item, value) {
            _super.prototype.add.call(this, item, value);
            this.save();
            return value;
        };
        /**
         * Add or Update an item.
         * Extends Dictionary's implementation of insert, with a save to the storage.
         */
        Storage.prototype.insert = function (item, value) {
            _super.prototype.insert.call(this, item, value);
            this.save();
            return value;
        };
        /**
         * Remove an item.
         * Extends Dictionary's implementation with a save to the storage.
         */
        Storage.prototype.remove = function (item) {
            var value = _super.prototype.remove.call(this, item);
            this.save();
            return value;
        };
        /**
         * Clear the storage.
         * Extends Dictionary's implementation with a save to the storage.
         */
        Storage.prototype.clear = function () {
            _super.prototype.clear.call(this);
            this._storage[this._container] = null;
        };
        /**
         * Clear all storages
         * Completely clears both the localStorage and sessionStorage.
         */
        Storage.clearAll = function () {
            window.localStorage.clear();
            window.sessionStorage.clear();
        };
        /**
         * Saves the current state to the storage.
         */
        Storage.prototype.save = function () {
            this._storage[this._container] = JSON.stringify(this.items);
        };
        /**
         * Refreshes the storage with the current localStorage values.
         */
        Storage.prototype.load = function () {
            _super.prototype.clear.call(this);
            this.items = JSON.parse(this._storage[this._container]);
            if (this.items == null)
                this.items = {};
            return this.items;
        };
        return Storage;
    }(dictionary_1.Dictionary));
    exports.Storage = Storage;
});

},{"./dictionary":4}],"office-js-helpers":[function(require,module,exports){
// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", './helpers/dictionary', './helpers/storage', './authentication/token.manager', './authentication/endpoint.manager', './authentication/authenticator'], factory);
    }
})(function (require, exports) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    __export(require('./helpers/dictionary'));
    __export(require('./helpers/storage'));
    __export(require('./authentication/token.manager'));
    __export(require('./authentication/endpoint.manager'));
    __export(require('./authentication/authenticator'));
});

},{"./authentication/authenticator":1,"./authentication/endpoint.manager":2,"./authentication/token.manager":3,"./helpers/dictionary":4,"./helpers/storage":5}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2F1dGhlbnRpY2F0aW9uL2F1dGhlbnRpY2F0b3IuanMiLCJkaXN0L2F1dGhlbnRpY2F0aW9uL2VuZHBvaW50Lm1hbmFnZXIuanMiLCJkaXN0L2F1dGhlbnRpY2F0aW9uL3Rva2VuLm1hbmFnZXIuanMiLCJkaXN0L2hlbHBlcnMvZGljdGlvbmFyeS5qcyIsImRpc3QvaGVscGVycy9zdG9yYWdlLmpzIiwiZGlzdC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cclxudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xyXG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XHJcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cclxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcclxufTtcclxuKGZ1bmN0aW9uIChmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciB2ID0gZmFjdG9yeShyZXF1aXJlLCBleHBvcnRzKTsgaWYgKHYgIT09IHVuZGVmaW5lZCkgbW9kdWxlLmV4cG9ydHMgPSB2O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKFtcInJlcXVpcmVcIiwgXCJleHBvcnRzXCIsICcuLi9hdXRoZW50aWNhdGlvbi9lbmRwb2ludC5tYW5hZ2VyJywgJy4uL2F1dGhlbnRpY2F0aW9uL3Rva2VuLm1hbmFnZXInXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIHZhciBlbmRwb2ludF9tYW5hZ2VyXzEgPSByZXF1aXJlKCcuLi9hdXRoZW50aWNhdGlvbi9lbmRwb2ludC5tYW5hZ2VyJyk7XHJcbiAgICB2YXIgdG9rZW5fbWFuYWdlcl8xID0gcmVxdWlyZSgnLi4vYXV0aGVudGljYXRpb24vdG9rZW4ubWFuYWdlcicpO1xyXG4gICAgLyoqXHJcbiAgICAgKiBDdXN0b20gZXJyb3IgdHlwZSB0byBoYW5kbGUgT0F1dGggc3BlY2lmaWMgZXJyb3JzLlxyXG4gICAgICovXHJcbiAgICB2YXIgT0F1dGhFcnJvciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XHJcbiAgICAgICAgX19leHRlbmRzKE9BdXRoRXJyb3IsIF9zdXBlcik7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0gbWVzc2FnZSBFcnJvciBtZXNzYWdlIHRvIGJlIHByb3BhZ2F0ZWQuXHJcbiAgICAgICAgICogQHBhcmFtIHN0YXRlIE9BdXRoIHN0YXRlIGlmIGF2YWlsYWJsZS5cclxuICAgICAgICAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIE9BdXRoRXJyb3IobWVzc2FnZSwgc3RhdGUpIHtcclxuICAgICAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGUgPSBzdGF0ZTtcclxuICAgICAgICAgICAgdGhpcy5uYW1lID0gXCJPQXV0aEVycm9yXCI7XHJcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XHJcbiAgICAgICAgICAgIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xyXG4gICAgICAgICAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgdGhpcy5jb25zdHJ1Y3Rvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IoKTtcclxuICAgICAgICAgICAgICAgIGlmIChlcnJvci5zdGFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBsYXN0X3BhcnQgPSBlcnJvci5zdGFjay5tYXRjaCgvW15cXHNdKyQvKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YWNrID0gdGhpcy5uYW1lICsgXCIgYXQgXCIgKyBsYXN0X3BhcnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIE9BdXRoRXJyb3I7XHJcbiAgICB9KEVycm9yKSk7XHJcbiAgICBleHBvcnRzLk9BdXRoRXJyb3IgPSBPQXV0aEVycm9yO1xyXG4gICAgLyoqXHJcbiAgICAgKiBIZWxwZXIgZm9yIHBlcmZvcm1pbmcgSW1wbGljaXQgT0F1dGggQXV0aGVudGljYXRpb24gd2l0aCByZWdpc3RlcmVkIGVuZHBvaW50cy5cclxuICAgICAqL1xyXG4gICAgdmFyIEF1dGhlbnRpY2F0b3IgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIGVuZHBvaW50TWFuYWdlciBEZXBlbmRzIG9uIGFuIGluc3RhbmNlIG9mIEVuZHBvaW50TWFuYWdlci5cclxuICAgICAgICAgKiBAcGFyYW0gVG9rZW5NYW5hZ2VyIERlcGVuZHMgb24gYW4gaW5zdGFuY2Ugb2YgVG9rZW5NYW5hZ2VyLlxyXG4gICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gQXV0aGVudGljYXRvcihlbmRwb2ludHMsIHRva2Vucykge1xyXG4gICAgICAgICAgICB0aGlzLmVuZHBvaW50cyA9IGVuZHBvaW50cztcclxuICAgICAgICAgICAgdGhpcy50b2tlbnMgPSB0b2tlbnM7XHJcbiAgICAgICAgICAgIGlmIChlbmRwb2ludHMgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRoaXMuZW5kcG9pbnRzID0gbmV3IGVuZHBvaW50X21hbmFnZXJfMS5FbmRwb2ludE1hbmFnZXIoKTtcclxuICAgICAgICAgICAgaWYgKHRva2VucyA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbnMgPSBuZXcgdG9rZW5fbWFuYWdlcl8xLlRva2VuTWFuYWdlcigpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBdXRoZW50aWNhdGUgYmFzZWQgb24gdGhlIGdpdmVuIHByb3ZpZGVyLlxyXG4gICAgICAgICAqIEVpdGhlciB1c2VzIERpYWxvZ0FQSSBvciBXaW5kb3cgUG9wdXBzIGJhc2VkIG9uIHdoZXJlIGl0cyBiZWluZyBjYWxsZWQgZnJvbSBlaXRoZXIgQWRkLWluIG9yIFdlYi5cclxuICAgICAgICAgKiBJZiB0aGUgdG9rZW4gd2FzIGNhY2hlZCwgdGhlIGl0IHJldHJpZXZlcyB0aGUgY2FjaGVkIHRva2VuLlxyXG4gICAgICAgICAqIElmIHRoZSBjYWNoZWQgdG9rZW4gaGFzIGV4cGlyZWQgdGhlbiB0aGUgYXV0aGVudGljYXRpb24gZGlhbG9nIGlzIGRpc3BsYXllZC5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIE5PVEU6IHlvdSBoYXZlIHRvIG1hbnVhbGx5IGNoZWNrIHRoZSBleHBpcmVzX2luIG9yIGV4cGlyZXNfYXQgcHJvcGVydHkgdG8gZGV0ZXJtaW5lXHJcbiAgICAgICAgICogaWYgdGhlIHRva2VuIGhhcyBleHBpcmVkLiBOb3QgYWxsIE9BdXRoIHByb3ZpZGVycyBzdXBwb3J0IHJlZnJlc2ggdG9rZW4gZmxvd3MuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgTGluayB0byB0aGUgcHJvdmlkZXIuXHJcbiAgICAgICAgICogQHBhcmFtIHtib29sZWFufSBmb3JjZSBGb3JjZSByZS1hdXRoZW50aWNhdGlvbi5cclxuICAgICAgICAgKiBAcmV0dXJuIHtQcm9taXNlPElUb2tlbnxJQ29kZT59IFJldHVybnMgYSBwcm9taXNlIG9mIHRoZSB0b2tlbiBvciBjb2RlIG9yIGVycm9yLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uIChwcm92aWRlciwgZm9yY2UpIHtcclxuICAgICAgICAgICAgaWYgKGZvcmNlID09PSB2b2lkIDApIHsgZm9yY2UgPSBmYWxzZTsgfVxyXG4gICAgICAgICAgICB2YXIgdG9rZW4gPSB0aGlzLnRva2Vucy5nZXQocHJvdmlkZXIpO1xyXG4gICAgICAgICAgICBpZiAodG9rZW4gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRva2VuLmV4cGlyZXNfYXQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRva2VuLmV4cGlyZXNfYXQgPSB0b2tlbi5leHBpcmVzX2F0IGluc3RhbmNlb2YgRGF0ZSA/IHRva2VuLmV4cGlyZXNfYXQgOiBuZXcgRGF0ZSh0b2tlbi5leHBpcmVzX2F0KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodG9rZW4uZXhwaXJlc19hdC5nZXRUaW1lKCkgLSBuZXcgRGF0ZSgpLmdldFRpbWUoKSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiVG9rZW4gZm9yIHByb3ZpZGVyOiBcIiArIHByb3ZpZGVyICsgXCIgaGFzIGV4cGlyZWQuIFJlLWF1dGhlbnRpY2F0aW5nLi4uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3JjZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCFmb3JjZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUodG9rZW4pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBlbmRwb2ludCA9IHRoaXMuZW5kcG9pbnRzLmdldChwcm92aWRlcik7XHJcbiAgICAgICAgICAgIGlmIChlbmRwb2ludCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IE9BdXRoRXJyb3IoXCJObyBzdWNoIHJlZ2lzdGVyZWQgZW5kcG9pbnQ6IFwiICsgcHJvdmlkZXIgKyBcIiBjb3VsZCBiZSBmb3VuZC5cIikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIChBdXRoZW50aWNhdG9yLmhhc0RpYWxvZ0FQSSkgPyB0aGlzLl9vcGVuSW5EaWFsb2coZW5kcG9pbnQpIDogdGhpcy5fb3BlbkluV2luZG93UG9wdXAoZW5kcG9pbnQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBIZWxwZXIgZm9yIGV4Y2hhbmdpbmcgdGhlIGNvZGUgd2l0aCBhIHJlZ2lzdGVyZWQgRW5kcG9pbnQuXHJcbiAgICAgICAgICogVGhlIGhlbHBlciBzZW5kcyBhIFBPU1QgcmVxdWVzdCB0byB0aGUgZ2l2ZW4gRW5kcG9pbnQncyB0b2tlblVybC5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIFRoZSBFbmRwb2ludCBtdXN0IGFjY2VwdCB0aGUgZGF0YSBKU09OIGlucHV0IGFuZCByZXR1cm4gYW4gJ2FjY2Vzc190b2tlbidcclxuICAgICAgICAgKiBpbiB0aGUgSlNPTiBvdXRwdXQuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge0VuZHBvaW50fSBlbmRwb2ludCBFbmRwb2ludCBjb25maWd1cmF0aW9uLlxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIERhdGEgdG8gYmUgc2VudCB0byB0aGUgdG9rZW5VcmwuXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGhlYWRlcnMgSGVhZGVycyB0byBiZSBzZW50IHRvIHRoZSB0b2tlblVybC4gICAgICpcclxuICAgICAgICAgKiBAcmV0dXJuIHtQcm9taXNlPElUb2tlbj59IFJldHVybnMgYSBwcm9taXNlIG9mIHRoZSB0b2tlbiBvciBlcnJvci5cclxuICAgICAgICAgKi9cclxuICAgICAgICBBdXRoZW50aWNhdG9yLnByb3RvdHlwZS5leGNoYW5nZUNvZGVGb3JUb2tlbiA9IGZ1bmN0aW9uIChlbmRwb2ludCwgZGF0YSwgaGVhZGVycykge1xyXG4gICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVuZHBvaW50LnRva2VuVXJsID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJXZSBjb3VsZG4ndCBleGNoYW5nZSB0aGUgcmVjZWl2ZWQgY29kZSBmb3IgYW4gYWNjZXNzX3Rva2VuLlxcbiAgICAgICAgICAgICAgICAgICAgVGhlIHZhbHVlIHJldHVybmVkIGlzIG5vdCBhbiBhY2Nlc3NfdG9rZW4uXFxuICAgICAgICAgICAgICAgICAgICBQbGVhc2Ugc2V0IHRoZSB0b2tlblVybCBwcm9wZXJ0eSBvciByZWZlciB0byBvdXIgZG9jcy5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICAgICAgICAgICAgICB4aHIub3BlbignUE9TVCcsIGVuZHBvaW50LnRva2VuVXJsKTtcclxuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdBY2NlcHQnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBoZWFkZXIgaW4gaGVhZGVycykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChoZWFkZXIgPT09ICdBY2NlcHQnIHx8IGhlYWRlciA9PT0gJ0NvbnRlbnQtVHlwZScpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGhlYWRlciwgaGVhZGVyc1toZWFkZXJdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHhoci5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE9BdXRoRXJyb3IoJ1VuYWJsZSB0byBzZW5kIHJlcXVlc3QgZHVlIHRvIGEgTmV0d29yayBlcnJvcicpKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqc29uID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqc29uID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBPQXV0aEVycm9yKCdObyBhY2Nlc3NfdG9rZW4gb3IgY29kZSBjb3VsZCBiZSBwYXJzZWQuJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoJ2FjY2Vzc190b2tlbicgaW4ganNvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLnRva2Vucy5hZGQoZW5kcG9pbnQucHJvdmlkZXIsIGpzb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKGpzb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgT0F1dGhFcnJvcihqc29uLmVycm9yLCBqc29uLnN0YXRlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoeGhyLnN0YXR1cyAhPT0gMjAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KG5ldyBPQXV0aEVycm9yKCdSZXF1ZXN0IGZhaWxlZC4gJyArIHhoci5yZXNwb25zZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE9BdXRoRXJyb3IoJ0FuIGVycm9yIG9jY3VyZWQgd2hpbGUgcGFyc2luZyB0aGUgcmVzcG9uc2UnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHhoci5zZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDaGVjayBpZiB0aGUgY3VycnJlbnQgdXJsIGlzIHJ1bm5pbmcgaW5zaWRlIG9mIGEgRGlhbG9nIHRoYXQgY29udGFpbnMgYW4gYWNjZXNzX3Rva2VuIG9yIGNvZGUgb3IgZXJyb3IuXHJcbiAgICAgICAgICogSWYgdHJ1ZSB0aGVuIGl0IGNhbGxzIG1lc3NhZ2VQYXJlbnQgYnkgZXh0cmFjdGluZyB0aGUgdG9rZW4gaW5mb3JtYXRpb24sIHRoZXJlYnkgY2xvc2luZyB0aGUgZGlhbG9nLlxyXG4gICAgICAgICAqIE90aGVyd2lzZSwgdGhlIGNhbGxlciBzaG91bGQgcHJvY2VlZCB3aXRoIG5vcm1hbCBpbml0aWFsaXphdGlvbiBvZiB0aGVpciBhcHBsaWNhdGlvbi5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59XHJcbiAgICAgICAgICogUmV0dXJucyBmYWxzZSBpZiB0aGUgY29kZSBpcyBydW5uaW5nIGluc2lkZSBvZiBhIGRpYWxvZyB3aXRob3V0IHRoZSByZXF1aXJlZCBpbmZvcm1hdGlvblxyXG4gICAgICAgICAqIG9yIGlzIG5vdCBydW5uaW5nIGluc2lkZSBvZiBhIGRpYWxvZyBhdCBhbGwuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgQXV0aGVudGljYXRvci5pc0F1dGhEaWFsb2cgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghQXV0aGVudGljYXRvci5oYXNEaWFsb2dBUEkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICghQXV0aGVudGljYXRvci5pc1Rva2VuVXJsKGxvY2F0aW9uLmhyZWYpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgT2ZmaWNlLmNvbnRleHQudWkubWVzc2FnZVBhcmVudChKU09OLnN0cmluZ2lmeSh0b2tlbl9tYW5hZ2VyXzEuVG9rZW5NYW5hZ2VyLmdldFRva2VuKCkpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDaGVjayBpZiB0aGUgc3VwcGxpZWQgdXJsIGhhcyBlaXRoZXIgYWNjZXNzX3Rva2VuIG9yIGNvZGUgb3IgZXJyb3IuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgQXV0aGVudGljYXRvci5pc1Rva2VuVXJsID0gZnVuY3Rpb24gKHVybCkge1xyXG4gICAgICAgICAgICB2YXIgcmVnZXggPSAvKGFjY2Vzc190b2tlbnxjb2RlfGVycm9yKS9naTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4LnRlc3QodXJsKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBdXRoZW50aWNhdG9yLCBcImhhc0RpYWxvZ0FQSVwiLCB7XHJcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKEF1dGhlbnRpY2F0b3IuX2hhc0RpYWxvZ0FQSSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgQXV0aGVudGljYXRvci5faGFzRGlhbG9nQVBJID1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5oYXNPd25Qcm9wZXJ0eSgnT2ZmaWNlJykgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoKHdpbmRvdy5PZmZpY2UuY29udGV4dC5yZXF1aXJlbWVudHMgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93Lk9mZmljZS5jb250ZXh0LnJlcXVpcmVtZW50cy5pc1NldFN1cHBvcnRlZCgnRGlhbG9nQVBJJywgJzEuMScpKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuaGFzT3duUHJvcGVydHkoJ0V4Y2VsJykgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93Lmhhc093blByb3BlcnR5KCdXb3JkJykgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2luZG93Lmhhc093blByb3BlcnR5KCdPbmVOb3RlJykpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBBdXRoZW50aWNhdG9yLl9oYXNEaWFsb2dBUEkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aGVudGljYXRvci5faGFzRGlhbG9nQVBJO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgICAgICBBdXRoZW50aWNhdG9yLnByb3RvdHlwZS5fb3BlbkluV2luZG93UG9wdXAgPSBmdW5jdGlvbiAoZW5kcG9pbnQpIHtcclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IGVuZHBvaW50X21hbmFnZXJfMS5FbmRwb2ludE1hbmFnZXIuZ2V0TG9naW5QYXJhbXMoZW5kcG9pbnQpO1xyXG4gICAgICAgICAgICB2YXIgd2luZG93U2l6ZSA9IHRoaXMuX2RldGVybWluZURpYWxvZ1NpemUoKS50b1BpeGVscygpO1xyXG4gICAgICAgICAgICB2YXIgd2luZG93RmVhdHVyZXMgPSBcIndpZHRoPVwiICsgd2luZG93U2l6ZS53aWR0aCArIFwiLGhlaWdodD1cIiArIHdpbmRvd1NpemUuaGVpZ2h0ICsgXCIsbWVudWJhcj1ubyx0b29sYmFyPW5vLGxvY2F0aW9uPW5vLHJlc2l6YWJsZT15ZXMsc2Nyb2xsYmFycz15ZXMsc3RhdHVzPW5vXCI7XHJcbiAgICAgICAgICAgIHZhciBwb3B1cFdpbmRvdyA9IHdpbmRvdy5vcGVuKHBhcmFtcy51cmwsIGVuZHBvaW50LnByb3ZpZGVyLnRvVXBwZXJDYXNlKCksIHdpbmRvd0ZlYXR1cmVzKTtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIFBPTExfSU5URVJWQUwgPSA0MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGludGVydmFsXzEgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocG9wdXBXaW5kb3cuZG9jdW1lbnQuVVJMLmluZGV4T2YoZW5kcG9pbnQucmVkaXJlY3RVcmwpICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxfMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9wdXBXaW5kb3cuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gdG9rZW5fbWFuYWdlcl8xLlRva2VuTWFuYWdlci5nZXRUb2tlbihwb3B1cFdpbmRvdy5kb2N1bWVudC5VUkwsIGVuZHBvaW50LnJlZGlyZWN0VXJsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgT0F1dGhFcnJvcignTm8gYWNjZXNzX3Rva2VuIG9yIGNvZGUgY291bGQgYmUgcGFyc2VkLicpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoZW5kcG9pbnQuc3RhdGUgJiYgK3Jlc3VsdC5zdGF0ZSAhPT0gcGFyYW1zLnN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE9BdXRoRXJyb3IoJ1N0YXRlIGNvdWxkblxcJ3QgYmUgdmVyaWZpZWQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCdjb2RlJyBpbiByZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoX3RoaXMuZXhjaGFuZ2VDb2RlRm9yVG9rZW4oZW5kcG9pbnQsIHJlc3VsdCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgnYWNjZXNzX3Rva2VuJyBpbiByZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMudG9rZW5zLmFkZChlbmRwb2ludC5wcm92aWRlciwgcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE9BdXRoRXJyb3IocmVzdWx0LmVycm9yLCByZXN1bHQuc3RhdGUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFwb3B1cFdpbmRvdykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxfMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgT0F1dGhFcnJvcignUG9wdXAgd2luZG93IHdhcyBjbG9zZWQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LCBQT0xMX0lOVEVSVkFMKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBwb3B1cFdpbmRvdy5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE9BdXRoRXJyb3IoJ1VuZXhwZWN0ZWQgZXJyb3Igb2NjdXJlZCB3aGlsZSBjcmVhdGluZyBwb3B1cCcpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBBdXRoZW50aWNhdG9yLnByb3RvdHlwZS5fb3BlbkluRGlhbG9nID0gZnVuY3Rpb24gKGVuZHBvaW50KSB7XHJcbiAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSBlbmRwb2ludF9tYW5hZ2VyXzEuRW5kcG9pbnRNYW5hZ2VyLmdldExvZ2luUGFyYW1zKGVuZHBvaW50KTtcclxuICAgICAgICAgICAgdmFyIHdpbmRvd1NpemUgPSB0aGlzLl9kZXRlcm1pbmVEaWFsb2dTaXplKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBPZmZpY2UuY29udGV4dC51aS5kaXNwbGF5RGlhbG9nQXN5bmMocGFyYW1zLnVybCwgd2luZG93U2l6ZSwgZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkaWFsb2cgPSByZXN1bHQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpYWxvZyA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE9BdXRoRXJyb3IocmVzdWx0LmVycm9yLm1lc3NhZ2UpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9nLmFkZEV2ZW50SGFuZGxlcihPZmZpY2UuRXZlbnRUeXBlLkRpYWxvZ01lc3NhZ2VSZWNlaXZlZCwgZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbG9nLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5tZXNzYWdlID09IG51bGwgfHwgYXJncy5tZXNzYWdlID09PSAnJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE9BdXRoRXJyb3IoJ05vIGFjY2Vzc190b2tlbiBvciBjb2RlIGNvdWxkIGJlIHBhcnNlZC4nKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIganNvbiA9IEpTT04ucGFyc2UoYXJncy5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmRwb2ludC5zdGF0ZSAmJiAranNvbi5zdGF0ZSAhPT0gcGFyYW1zLnN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgT0F1dGhFcnJvcignU3RhdGUgY291bGRuXFwndCBiZSB2ZXJpZmllZCcpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCdjb2RlJyBpbiBqc29uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc29sdmUoX3RoaXMuZXhjaGFuZ2VDb2RlRm9yVG9rZW4oZW5kcG9pbnQsIGpzb24pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCdhY2Nlc3NfdG9rZW4nIGluIGpzb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy50b2tlbnMuYWRkKGVuZHBvaW50LnByb3ZpZGVyLCBqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE9BdXRoRXJyb3IoanNvbi5lcnJvciwganNvbi5zdGF0ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiByZWplY3QobmV3IE9BdXRoRXJyb3IoJ0Vycm9yIHdoaWxlIHBhcnNpbmcgcmVzcG9uc2U6ICcgKyBKU09OLnN0cmluZ2lmeShleGNlcHRpb24pKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLl9kZXRlcm1pbmVEaWFsb2dTaXplID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgc2NyZWVuSGVpZ2h0ID0gd2luZG93LnNjcmVlbi5oZWlnaHQ7XHJcbiAgICAgICAgICAgIHZhciBzY3JlZW5XaWR0aCA9IHdpbmRvdy5zY3JlZW4ud2lkdGg7XHJcbiAgICAgICAgICAgIGlmIChzY3JlZW5XaWR0aCA8PSA2NDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jcmVhdGVTaXplT2JqZWN0KDY0MCwgNDgwLCBzY3JlZW5XaWR0aCwgc2NyZWVuSGVpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChzY3JlZW5XaWR0aCA8PSAxMDA3KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fY3JlYXRlU2l6ZU9iamVjdCgxMDI0LCA3NjgsIHNjcmVlbldpZHRoLCBzY3JlZW5IZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2NyZWF0ZVNpemVPYmplY3QoMTAyNCwgNzY4LCBzY3JlZW5XaWR0aCwgc2NyZWVuSGVpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgQXV0aGVudGljYXRvci5wcm90b3R5cGUuX2NyZWF0ZVNpemVPYmplY3QgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCwgc2NyZWVuV2lkdGgsIHNjcmVlbkhlaWdodCkge1xyXG4gICAgICAgICAgICB2YXIgbWluT3JEZWZhdWx0ID0gZnVuY3Rpb24gKHZhbHVlLCBpc0hvcml6b250YWwpIHtcclxuICAgICAgICAgICAgICAgIHZhciBkaW1lbnNpb24gPSBpc0hvcml6b250YWwgPyBzY3JlZW5XaWR0aCA6IHNjcmVlbkhlaWdodDtcclxuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSA8IGRpbWVuc2lvbiA/IHZhbHVlIDogZGltZW5zaW9uIC0gMzA7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHZhciBwZXJjZW50YWdlID0gZnVuY3Rpb24gKHZhbHVlLCBpc0hvcml6b250YWwpIHsgcmV0dXJuIGlzSG9yaXpvbnRhbCA/ICh2YWx1ZSAqIDEwMCAvIHNjcmVlbldpZHRoKSA6ICh2YWx1ZSAqIDEwMCAvIHNjcmVlbkhlaWdodCk7IH07XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB3aWR0aDogcGVyY2VudGFnZShtaW5PckRlZmF1bHQod2lkdGgsIHRydWUpLCB0cnVlKSxcclxuICAgICAgICAgICAgICAgIGhlaWdodDogcGVyY2VudGFnZShtaW5PckRlZmF1bHQoaGVpZ2h0LCBmYWxzZSksIGZhbHNlKSxcclxuICAgICAgICAgICAgICAgIHRvUGl4ZWxzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2lkdGg6IG1pbk9yRGVmYXVsdCh3aWR0aCwgdHJ1ZSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGhlaWdodDogbWluT3JEZWZhdWx0KGhlaWdodCwgZmFsc2UpXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBBdXRoZW50aWNhdG9yO1xyXG4gICAgfSgpKTtcclxuICAgIGV4cG9ydHMuQXV0aGVudGljYXRvciA9IEF1dGhlbnRpY2F0b3I7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hdXRoZW50aWNhdG9yLmpzLm1hcCIsIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0LiBBbGwgcmlnaHRzIHJlc2VydmVkLiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXHJcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcclxuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn07XHJcbihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgdiA9IGZhY3RvcnkocmVxdWlyZSwgZXhwb3J0cyk7IGlmICh2ICE9PSB1bmRlZmluZWQpIG1vZHVsZS5leHBvcnRzID0gdjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiZXhwb3J0c1wiLCAnLi4vaGVscGVycy9zdG9yYWdlJ10sIGZhY3RvcnkpO1xyXG4gICAgfVxyXG59KShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cykge1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICB2YXIgc3RvcmFnZV8xID0gcmVxdWlyZSgnLi4vaGVscGVycy9zdG9yYWdlJyk7XHJcbiAgICAvLyBVbmRlcnNjb3JlLmpzIGltcGxlbWVudGF0aW9uIG9mIGV4dGVuZC5cclxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9qYXNoa2VuYXMvdW5kZXJzY29yZS9ibG9iL21hc3Rlci91bmRlcnNjb3JlLmpzXHJcbiAgICB2YXIgZXh0ZW5kID0gZnVuY3Rpb24gKG9iaikge1xyXG4gICAgICAgIHZhciBkZWZhdWx0cyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIF9pID0gMTsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgIGRlZmF1bHRzW19pIC0gMV0gPSBhcmd1bWVudHNbX2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcclxuICAgICAgICBpZiAobGVuZ3RoIDwgMiB8fCBvYmogPT0gbnVsbClcclxuICAgICAgICAgICAgcmV0dXJuIG9iajsgLy8gaWYgdGhlcmUgYXJlIG5vIG9iamVjdHMgdG8gZXh0ZW5kIHRoZW4gcmV0dXJuIHRoZSBjdXJyZW50IG9iamVjdFxyXG4gICAgICAgIGlmIChkZWZhdWx0cylcclxuICAgICAgICAgICAgb2JqID0gT2JqZWN0KG9iaik7IC8vIGNyZWF0ZSBhIG5ldyBvYmplY3QgdG8gZXh0ZW5kIGlmIHRoZXJlIGFyZSBhbnkgZXh0ZW5zaW9uc1xyXG4gICAgICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBsZW5ndGg7IGluZGV4KyspIHtcclxuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF07IC8vIGZvcmVhY2ggb2JqZWN0XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2UgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvLyBtb3ZlIG9uIGlmIHRoZSBvYmplY3QgaXMgbnVsbCBvciB1bmRlZmluZWRcclxuICAgICAgICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzb3VyY2UpLCAvLyBnZXQgYWxsIHRoZSBrZXlzXHJcbiAgICAgICAgICAgIGwgPSBrZXlzLmxlbmd0aDsgLy8gY2FjaGUgdGhlIGxlbmd0aFxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFyIGtleSA9IGtleXNbaV07IC8vIGZvciBlYWNoIGtleVxyXG4gICAgICAgICAgICAgICAgaWYgKCFkZWZhdWx0cyB8fCBvYmpba2V5XSA9PT0gdm9pZCAwKVxyXG4gICAgICAgICAgICAgICAgICAgIG9ialtrZXldID0gc291cmNlW2tleV07IC8vIHJlcGxhY2UgdmFsdWVzXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH07XHJcbiAgICBleHBvcnRzLkRlZmF1bHRFbmRwb2ludHMgPSB7XHJcbiAgICAgICAgR29vZ2xlOiAnR29vZ2xlJyxcclxuICAgICAgICBNaWNyb3NvZnQ6ICdNaWNyb3NvZnQnLFxyXG4gICAgICAgIEZhY2Vib29rOiAnRmFjZWJvb2snLFxyXG4gICAgICAgIEF6dXJlQUQ6ICdBenVyZUFEJ1xyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIGZvciBjcmVhdGluZyBhbmQgcmVnaXN0ZXJpbmcgT0F1dGggRW5kcG9pbnRzLlxyXG4gICAgICovXHJcbiAgICB2YXIgRW5kcG9pbnRNYW5hZ2VyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcclxuICAgICAgICBfX2V4dGVuZHMoRW5kcG9pbnRNYW5hZ2VyLCBfc3VwZXIpO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gRW5kcG9pbnRNYW5hZ2VyKCkge1xyXG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCAnT0F1dGgyRW5kcG9pbnRzJywgc3RvcmFnZV8xLlN0b3JhZ2VUeXBlLkxvY2FsU3RvcmFnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbmRwb2ludE1hbmFnZXIucHJvdG90eXBlLCBcImN1cnJlbnRIb3N0XCIsIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEdldHMgdGhlIGN1cnJlbnQgdXJsIHRvIGJlIHNwZWNpZmllZCBhcyB0aGUgZGVmYXVsdCByZWRpcmVjdCB1cmwuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jdXJyZW50SG9zdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY3VycmVudEhvc3QgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50SG9zdDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRXh0ZW5kcyBTdG9yYWdlJ3MgZGVmYXVsdCBhZGQgbWV0aG9kLlxyXG4gICAgICAgICAqIFJlZ2lzdGVycyBhIG5ldyBPQXV0aCBFbmRwb2ludC5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciBVbmlxdWUgbmFtZSBmb3IgdGhlIHJlZ2lzdGVyZWQgT0F1dGggRW5kcG9pbnQuXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBWYWxpZCBFbmRwb2ludCBjb25maWd1cmF0aW9uLlxyXG4gICAgICAgICAqIEBzZWUge0BsaW5rIElFbmRwb2ludH0uXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBhZGRlZCBlbmRwb2ludC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBFbmRwb2ludE1hbmFnZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChwcm92aWRlciwgY29uZmlnKSB7XHJcbiAgICAgICAgICAgIGlmIChjb25maWcucmVkaXJlY3RVcmwgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLnJlZGlyZWN0VXJsID0gdGhpcy5jdXJyZW50SG9zdDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25maWcucHJvdmlkZXIgPSBwcm92aWRlcjtcclxuICAgICAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUuaW5zZXJ0LmNhbGwodGhpcywgcHJvdmlkZXIsIGNvbmZpZyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZWdpc3RlciBHb29nbGUgSW1wbGljaXQgT0F1dGguXHJcbiAgICAgICAgICogSWYgb3ZlcnJpZGVzIGlzIGxlZnQgZW1wdHksIHRoZSBkZWZhdWx0IHNjb3BlIGlzIGxpbWl0ZWQgdG8gYmFzaWMgcHJvZmlsZSBpbmZvcm1hdGlvbi5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjbGllbnRJZCBDbGllbnRJRCBmb3IgdGhlIEdvb2dsZSBBcHAuXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBWYWxpZCBFbmRwb2ludCBjb25maWd1cmF0aW9uIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0cy5cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGVuZHBvaW50LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEVuZHBvaW50TWFuYWdlci5wcm90b3R5cGUucmVnaXN0ZXJHb29nbGVBdXRoID0gZnVuY3Rpb24gKGNsaWVudElkLCBvdmVycmlkZXMpIHtcclxuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICAgICAgY2xpZW50SWQ6IGNsaWVudElkLFxyXG4gICAgICAgICAgICAgICAgYmFzZVVybDogJ2h0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbScsXHJcbiAgICAgICAgICAgICAgICBhdXRob3JpemVVcmw6ICcvby9vYXV0aDIvdjIvYXV0aCcsXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZTogJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tJyxcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlVHlwZTogJ3Rva2VuJyxcclxuICAgICAgICAgICAgICAgIHNjb3BlOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9wbHVzLm1lJyxcclxuICAgICAgICAgICAgICAgIHN0YXRlOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHZhciBjb25maWcgPSBleHRlbmQoe30sIG92ZXJyaWRlcywgZGVmYXVsdHMpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hZGQoZXhwb3J0cy5EZWZhdWx0RW5kcG9pbnRzLkdvb2dsZSwgY29uZmlnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZWdpc3RlciBNaWNyb3NvZnQgSW1wbGljaXQgT0F1dGguXHJcbiAgICAgICAgICogSWYgb3ZlcnJpZGVzIGlzIGxlZnQgZW1wdHksIHRoZSBkZWZhdWx0IHNjb3BlIGlzIGxpbWl0ZWQgdG8gYmFzaWMgcHJvZmlsZSBpbmZvcm1hdGlvbi5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjbGllbnRJZCBDbGllbnRJRCBmb3IgdGhlIE1pY3Jvc29mdCBBcHAuXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBWYWxpZCBFbmRwb2ludCBjb25maWd1cmF0aW9uIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0cy5cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGVuZHBvaW50LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEVuZHBvaW50TWFuYWdlci5wcm90b3R5cGUucmVnaXN0ZXJNaWNyb3NvZnRBdXRoID0gZnVuY3Rpb24gKGNsaWVudElkLCBvdmVycmlkZXMpIHtcclxuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICAgICAgY2xpZW50SWQ6IGNsaWVudElkLFxyXG4gICAgICAgICAgICAgICAgYmFzZVVybDogJ2h0dHBzOi8vbG9naW4ubWljcm9zb2Z0b25saW5lLmNvbS9jb21tb24vb2F1dGgyL3YyLjAnLFxyXG4gICAgICAgICAgICAgICAgYXV0aG9yaXplVXJsOiAnL2F1dGhvcml6ZScsXHJcbiAgICAgICAgICAgICAgICByZXNwb25zZVR5cGU6ICd0b2tlbicsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogJ2h0dHBzOi8vZ3JhcGgubWljcm9zb2Z0LmNvbS91c2VyLnJlYWQnLFxyXG4gICAgICAgICAgICAgICAgZXh0cmFQYXJhbWV0ZXJzOiAnJnJlc3BvbnNlX21vZGU9ZnJhZ21lbnQnLFxyXG4gICAgICAgICAgICAgICAgbm9uY2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzdGF0ZTogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgY29uZmlnID0gZXh0ZW5kKHt9LCBvdmVycmlkZXMsIGRlZmF1bHRzKTtcclxuICAgICAgICAgICAgdGhpcy5hZGQoZXhwb3J0cy5EZWZhdWx0RW5kcG9pbnRzLk1pY3Jvc29mdCwgY29uZmlnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZWdpc3RlciBGYWNlYm9vayBJbXBsaWNpdCBPQXV0aC5cclxuICAgICAgICAgKiBJZiBvdmVycmlkZXMgaXMgbGVmdCBlbXB0eSwgdGhlIGRlZmF1bHQgc2NvcGUgaXMgbGltaXRlZCB0byBiYXNpYyBwcm9maWxlIGluZm9ybWF0aW9uLlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGNsaWVudElkIENsaWVudElEIGZvciB0aGUgRmFjZWJvb2sgQXBwLlxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVmFsaWQgRW5kcG9pbnQgY29uZmlndXJhdGlvbiB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHMuXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBhZGRlZCBlbmRwb2ludC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBFbmRwb2ludE1hbmFnZXIucHJvdG90eXBlLnJlZ2lzdGVyRmFjZWJvb2tBdXRoID0gZnVuY3Rpb24gKGNsaWVudElkLCBvdmVycmlkZXMpIHtcclxuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICAgICAgY2xpZW50SWQ6IGNsaWVudElkLFxyXG4gICAgICAgICAgICAgICAgYmFzZVVybDogJ2h0dHBzOi8vd3d3LmZhY2Vib29rLmNvbScsXHJcbiAgICAgICAgICAgICAgICBhdXRob3JpemVVcmw6ICcvZGlhbG9nL29hdXRoJyxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlOiAnaHR0cHM6Ly9ncmFwaC5mYWNlYm9vay5jb20nLFxyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2VUeXBlOiAndG9rZW4nLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6ICdwdWJsaWNfcHJvZmlsZScsXHJcbiAgICAgICAgICAgICAgICBub25jZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHN0YXRlOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHZhciBjb25maWcgPSBleHRlbmQoe30sIG92ZXJyaWRlcywgZGVmYXVsdHMpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZChleHBvcnRzLkRlZmF1bHRFbmRwb2ludHMuRmFjZWJvb2ssIGNvbmZpZyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICA7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVnaXN0ZXIgQXp1cmVBRCBJbXBsaWNpdCBPQXV0aC5cclxuICAgICAgICAgKiBJZiBvdmVycmlkZXMgaXMgbGVmdCBlbXB0eSwgdGhlIGRlZmF1bHQgc2NvcGUgaXMgbGltaXRlZCB0byBiYXNpYyBwcm9maWxlIGluZm9ybWF0aW9uLlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGNsaWVudElkIENsaWVudElEIGZvciB0aGUgQXp1cmVBRCBBcHAuXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHRlbmFudCBUZW5hbnQgZm9yIHRoZSBBenVyZUFEIEFwcC5cclxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFZhbGlkIEVuZHBvaW50IGNvbmZpZ3VyYXRpb24gdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzLlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgYWRkZWQgZW5kcG9pbnQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRW5kcG9pbnRNYW5hZ2VyLnByb3RvdHlwZS5yZWdpc3RlckF6dXJlQURBdXRoID0gZnVuY3Rpb24gKGNsaWVudElkLCB0ZW5hbnQsIG92ZXJyaWRlcykge1xyXG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XHJcbiAgICAgICAgICAgICAgICBjbGllbnRJZDogY2xpZW50SWQsXHJcbiAgICAgICAgICAgICAgICBiYXNlVXJsOiBcImh0dHBzOi8vbG9naW4ud2luZG93cy5uZXQvXCIgKyB0ZW5hbnQsXHJcbiAgICAgICAgICAgICAgICBhdXRob3JpemVVcmw6ICcvb2F1dGgyL2F1dGhvcml6ZScsXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZTogJ2h0dHBzOi8vZ3JhcGgubWljcm9zb2Z0LmNvbScsXHJcbiAgICAgICAgICAgICAgICByZXNwb25zZVR5cGU6ICd0b2tlbicsXHJcbiAgICAgICAgICAgICAgICBub25jZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIHN0YXRlOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHZhciBjb25maWcgPSBleHRlbmQoe30sIG92ZXJyaWRlcywgZGVmYXVsdHMpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZChleHBvcnRzLkRlZmF1bHRFbmRwb2ludHMuQXp1cmVBRCwgY29uZmlnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBIZWxwZXIgdG8gZ2VuZXJhdGUgdGhlIE9BdXRoIGxvZ2luIHVybC5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVmFsaWQgRW5kcG9pbnQgY29uZmlndXJhdGlvbi5cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGVuZHBvaW50LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEVuZHBvaW50TWFuYWdlci5nZXRMb2dpblBhcmFtcyA9IGZ1bmN0aW9uIChlbmRwb2ludENvbmZpZykge1xyXG4gICAgICAgICAgICB2YXIgc2NvcGUgPSAoZW5kcG9pbnRDb25maWcuc2NvcGUpID8gZW5jb2RlVVJJQ29tcG9uZW50KGVuZHBvaW50Q29uZmlnLnNjb3BlKSA6IG51bGw7XHJcbiAgICAgICAgICAgIHZhciByZXNvdXJjZSA9IChlbmRwb2ludENvbmZpZy5yZXNvdXJjZSkgPyBlbmNvZGVVUklDb21wb25lbnQoZW5kcG9pbnRDb25maWcucmVzb3VyY2UpIDogbnVsbDtcclxuICAgICAgICAgICAgdmFyIHN0YXRlID0gZW5kcG9pbnRDb25maWcuc3RhdGUgJiYgRW5kcG9pbnRNYW5hZ2VyLl9nZW5lcmF0ZUNyeXB0b1NhZmVSYW5kb20oKTtcclxuICAgICAgICAgICAgdmFyIG5vbmNlID0gZW5kcG9pbnRDb25maWcubm9uY2UgJiYgRW5kcG9pbnRNYW5hZ2VyLl9nZW5lcmF0ZUNyeXB0b1NhZmVSYW5kb20oKTtcclxuICAgICAgICAgICAgdmFyIHVybFNlZ21lbnRzID0gW1xyXG4gICAgICAgICAgICAgICAgJ3Jlc3BvbnNlX3R5cGU9JyArIGVuZHBvaW50Q29uZmlnLnJlc3BvbnNlVHlwZSxcclxuICAgICAgICAgICAgICAgICdjbGllbnRfaWQ9JyArIGVuY29kZVVSSUNvbXBvbmVudChlbmRwb2ludENvbmZpZy5jbGllbnRJZCksXHJcbiAgICAgICAgICAgICAgICAncmVkaXJlY3RfdXJpPScgKyBlbmNvZGVVUklDb21wb25lbnQoZW5kcG9pbnRDb25maWcucmVkaXJlY3RVcmwpXHJcbiAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIGlmIChzY29wZSkge1xyXG4gICAgICAgICAgICAgICAgdXJsU2VnbWVudHMucHVzaCgnc2NvcGU9JyArIHNjb3BlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVzb3VyY2UpIHtcclxuICAgICAgICAgICAgICAgIHVybFNlZ21lbnRzLnB1c2goJ3Jlc291cmNlPScgKyByZXNvdXJjZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICB1cmxTZWdtZW50cy5wdXNoKCdzdGF0ZT0nICsgc3RhdGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChub25jZSkge1xyXG4gICAgICAgICAgICAgICAgdXJsU2VnbWVudHMucHVzaCgnbm9uY2U9JyArIG5vbmNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZW5kcG9pbnRDb25maWcuZXh0cmFRdWVyeVBhcmFtZXRlcnMpIHtcclxuICAgICAgICAgICAgICAgIHVybFNlZ21lbnRzLnB1c2goZW5kcG9pbnRDb25maWcuZXh0cmFRdWVyeVBhcmFtZXRlcnMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICB1cmw6IGVuZHBvaW50Q29uZmlnLmJhc2VVcmwgKyBlbmRwb2ludENvbmZpZy5hdXRob3JpemVVcmwgKyAnPycgKyB1cmxTZWdtZW50cy5qb2luKCcmJyksXHJcbiAgICAgICAgICAgICAgICBzdGF0ZTogc3RhdGVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIEVuZHBvaW50TWFuYWdlci5fZ2VuZXJhdGVDcnlwdG9TYWZlUmFuZG9tID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB2YXIgcmFuZG9tID0gbmV3IFVpbnQzMkFycmF5KDEpO1xyXG4gICAgICAgICAgICBpZiAoJ21zQ3J5cHRvJyBpbiB3aW5kb3cpIHtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5tc0NyeXB0by5nZXRSYW5kb21WYWx1ZXMocmFuZG9tKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICgnY3J5cHRvJyBpbiB3aW5kb3cpIHtcclxuICAgICAgICAgICAgICAgIHdpbmRvdy5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHJhbmRvbSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBwbGF0Zm9ybSBkb2VzblxcJ3Qgc3VwcG9ydCBnZW5lcmF0aW9uIG9mIENyeXB0b2dyYXBoaWNhbGx5IFNhZmUgUmFuZG9tcy4gUGxlYXNlIGRpc2FibGUgdGhlIHN0YXRlIGZsYWcgYW5kIHRyeSBhZ2FpbicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByYW5kb21bMF07XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gRW5kcG9pbnRNYW5hZ2VyO1xyXG4gICAgfShzdG9yYWdlXzEuU3RvcmFnZSkpO1xyXG4gICAgZXhwb3J0cy5FbmRwb2ludE1hbmFnZXIgPSBFbmRwb2ludE1hbmFnZXI7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1lbmRwb2ludC5tYW5hZ2VyLmpzLm1hcCIsIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0LiBBbGwgcmlnaHRzIHJlc2VydmVkLiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXHJcbnZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcclxuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn07XHJcbihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgdiA9IGZhY3RvcnkocmVxdWlyZSwgZXhwb3J0cyk7IGlmICh2ICE9PSB1bmRlZmluZWQpIG1vZHVsZS5leHBvcnRzID0gdjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiZXhwb3J0c1wiLCAnLi4vaGVscGVycy9zdG9yYWdlJ10sIGZhY3RvcnkpO1xyXG4gICAgfVxyXG59KShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cykge1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICB2YXIgc3RvcmFnZV8xID0gcmVxdWlyZSgnLi4vaGVscGVycy9zdG9yYWdlJyk7XHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBmb3IgY2FjaGluZyBhbmQgbWFuYWdpbmcgT0F1dGggVG9rZW5zLlxyXG4gICAgICovXHJcbiAgICB2YXIgVG9rZW5NYW5hZ2VyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcclxuICAgICAgICBfX2V4dGVuZHMoVG9rZW5NYW5hZ2VyLCBfc3VwZXIpO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gVG9rZW5NYW5hZ2VyKCkge1xyXG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCAnT0F1dGgyVG9rZW5zJywgc3RvcmFnZV8xLlN0b3JhZ2VUeXBlLkxvY2FsU3RvcmFnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbXB1dGUgdGhlIGV4cGlyYXRpb24gZGF0ZSBiYXNlZCBvbiB0aGUgZXhwaXJlc19pbiBmaWVsZCBpbiBhIE9BdXRoIHRva2VuLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIFRva2VuTWFuYWdlci5wcm90b3R5cGUuc2V0RXhwaXJ5ID0gZnVuY3Rpb24gKHRva2VuKSB7XHJcbiAgICAgICAgICAgIHZhciBleHBpcmUgPSBmdW5jdGlvbiAoc2Vjb25kcykgeyByZXR1cm4gc2Vjb25kcyA9PSBudWxsID8gbnVsbCA6IG5ldyBEYXRlKG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgfn5zZWNvbmRzICogMTAwMCk7IH07XHJcbiAgICAgICAgICAgIGlmICghKHRva2VuID09IG51bGwpICYmIHRva2VuLmV4cGlyZXNfYXQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdG9rZW4uZXhwaXJlc19hdCA9IGV4cGlyZSh0b2tlbi5leHBpcmVzX2luKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRXh0ZW5kcyBTdG9yYWdlJ3MgZGVmYXVsdCBhZGQgbWV0aG9kXHJcbiAgICAgICAgICogQWRkcyBhIG5ldyBPQXV0aCBUb2tlbiBhZnRlciBzZXR0aW5ncyBpdHMgZXhwaXJ5XHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgVW5pcXVlIG5hbWUgb2YgdGhlIGNvcnJlc3BvbmRpbmcgT0F1dGggRW5kcG9pbnQuXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyB2YWxpZCBUb2tlblxyXG4gICAgICAgICAqIEBzZWUge0BsaW5rIElFbmRwb2ludH0uXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBhZGRlZCBlbmRwb2ludC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBUb2tlbk1hbmFnZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChwcm92aWRlciwgdmFsdWUpIHtcclxuICAgICAgICAgICAgdmFsdWUucHJvdmlkZXIgPSBwcm92aWRlcjtcclxuICAgICAgICAgICAgdGhpcy5zZXRFeHBpcnkodmFsdWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gX3N1cGVyLnByb3RvdHlwZS5pbnNlcnQuY2FsbCh0aGlzLCBwcm92aWRlciwgdmFsdWUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRXh0cmFjdCB0aGUgdG9rZW4gZnJvbSB0aGUgVVJMXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXJsIFRoZSB1cmwgdG8gZXh0cmFjdCB0aGUgdG9rZW4gZnJvbS5cclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXhjbHVkZSBFeGNsdWRlIGEgcGFydGljbGF1ciBzdHJpbmcgZnJvbSB0aGUgdXJsLCBzdWNoIGFzIGEgcXVlcnkgcGFyYW0gb3Igc3BlY2lmaWMgc3Vic3RyaW5nLlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkZWxpbWl0ZXJbb3B0aW9uYWxdIERlbGltaXRlciB1c2VkIGJ5IE9BdXRoIHByb3ZpZGVyIHRvIG1hcmsgdGhlIGJlZ2lubmluZyBvZiB0b2tlbiByZXNwb25zZS4gRGVmYXVsdHMgdG8gIy5cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGV4dHJhY3RlZCB0b2tlbi5cclxuICAgICAgICAgKi9cclxuICAgICAgICBUb2tlbk1hbmFnZXIuZ2V0VG9rZW4gPSBmdW5jdGlvbiAodXJsLCBleGNsdWRlLCBkZWxpbWl0ZXIpIHtcclxuICAgICAgICAgICAgaWYgKHVybCA9PT0gdm9pZCAwKSB7IHVybCA9IGxvY2F0aW9uLmhyZWY7IH1cclxuICAgICAgICAgICAgaWYgKGV4Y2x1ZGUgPT09IHZvaWQgMCkgeyBleGNsdWRlID0gbG9jYXRpb24ub3JpZ2luOyB9XHJcbiAgICAgICAgICAgIGlmIChkZWxpbWl0ZXIgPT09IHZvaWQgMCkgeyBkZWxpbWl0ZXIgPSAnIyc7IH1cclxuICAgICAgICAgICAgaWYgKGV4Y2x1ZGUpXHJcbiAgICAgICAgICAgICAgICB1cmwgPSB1cmwucmVwbGFjZShleGNsdWRlLCAnJyk7XHJcbiAgICAgICAgICAgIHZhciBwYXJ0cyA9IHVybC5zcGxpdChkZWxpbWl0ZXIpO1xyXG4gICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoIDw9IDApXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIHZhciByaWdodFBhcnQgPSBwYXJ0cy5sZW5ndGggPj0gMiA/IHBhcnRzWzFdIDogcGFydHNbMF07XHJcbiAgICAgICAgICAgIHJpZ2h0UGFydCA9IHJpZ2h0UGFydC5yZXBsYWNlKCcvJywgJycpO1xyXG4gICAgICAgICAgICBpZiAocmlnaHRQYXJ0LmluZGV4T2YoXCI/XCIpICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHF1ZXJ5UGFydCA9IHJpZ2h0UGFydC5zcGxpdChcIj9cIik7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXF1ZXJ5UGFydCB8fCBxdWVyeVBhcnQubGVuZ3RoIDw9IDApXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgcmlnaHRQYXJ0ID0gcXVlcnlQYXJ0WzFdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9leHRyYWN0UGFyYW1zKHJpZ2h0UGFydCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBUb2tlbk1hbmFnZXIuX2V4dHJhY3RQYXJhbXMgPSBmdW5jdGlvbiAoc2VnbWVudCkge1xyXG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge30sIHJlZ2V4ID0gLyhbXiY9XSspPShbXiZdKikvZywgbWF0Y2hlcztcclxuICAgICAgICAgICAgd2hpbGUgKChtYXRjaGVzID0gcmVnZXguZXhlYyhzZWdtZW50KSkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtc1tkZWNvZGVVUklDb21wb25lbnQobWF0Y2hlc1sxXSldID0gZGVjb2RlVVJJQ29tcG9uZW50KG1hdGNoZXNbMl0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gVG9rZW5NYW5hZ2VyO1xyXG4gICAgfShzdG9yYWdlXzEuU3RvcmFnZSkpO1xyXG4gICAgZXhwb3J0cy5Ub2tlbk1hbmFnZXIgPSBUb2tlbk1hbmFnZXI7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD10b2tlbi5tYW5hZ2VyLmpzLm1hcCIsIi8vIENvcHlyaWdodCAoYykgTWljcm9zb2Z0LiBBbGwgcmlnaHRzIHJlc2VydmVkLiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXHJcbihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgdiA9IGZhY3RvcnkocmVxdWlyZSwgZXhwb3J0cyk7IGlmICh2ICE9PSB1bmRlZmluZWQpIG1vZHVsZS5leHBvcnRzID0gdjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiZXhwb3J0c1wiXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIGZvciBjcmVhdGluZyBhbmQgcXVlcnlpbmcgRGljdGlvbmFyaWVzLlxyXG4gICAgICogQSBydWRpbWVudGFyeSBhbHRlcm5hdGl2ZSB0byBFUzYgTWFwcy5cclxuICAgICAqL1xyXG4gICAgdmFyIERpY3Rpb25hcnkgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpdGVtcyBJbml0aWFsIHNlZWQgb2YgaXRlbXMuXHJcbiAgICAgICAgKi9cclxuICAgICAgICBmdW5jdGlvbiBEaWN0aW9uYXJ5KGl0ZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSBpdGVtcztcclxuICAgICAgICAgICAgaWYgKCEodGhpcy5pdGVtcyA9PT0gbmV3IE9iamVjdCh0aGlzLml0ZW1zKSkgfHwgQXJyYXkuaXNBcnJheSh0aGlzLml0ZW1zKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtcyA9IHt9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEdldHMgYW4gaXRlbSBmcm9tIHRoZSBkaWN0aW9uYXJ5LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBpdGVtLlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyBhbiBpdGVtIGlmIGZvdW5kLCBlbHNlIHJldHVybnMgbnVsbC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWlucyhrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtc1trZXldO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWRkcyBhbiBpdGVtIGludG8gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICogSWYgdGhlIGtleSBhbHJlYWR5IGV4aXN0cywgdGhlbiBpdCB3aWxsIHRocm93LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBpdGVtLlxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSB2YWx1ZSBUaGUgaXRlbSB0byBiZSBhZGRlZC5cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGl0ZW0uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29udGFpbnMoa2V5KSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiS2V5OiBcIiArIGtleSArIFwiIGFscmVhZHkgZXhpc3RzLlwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICA7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogSW5zZXJ0cyBhbiBpdGVtIGludG8gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICogSWYgYW4gaXRlbSBhbHJlYWR5IGV4aXN0cyB3aXRoIHRoZSBzYW1lIGtleSwgaXQgd2lsbCBiZSBvdmVycmlkZGVuIGJ5IHRoZSBuZXcgdmFsdWUuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGl0ZW0uXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHZhbHVlIFRoZSBpdGVtIHRvIGJlIGFkZGVkLlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgYWRkZWQgaXRlbS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAoa2V5ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignS2V5IGNhbm5vdCBiZSBudWxsIG9yIHVuZGVmaW5lZCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNba2V5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZW1vdmVzIGFuIGl0ZW0gZnJvbSB0aGUgZGljdGlvbmFyeS5cclxuICAgICAgICAgKiBXaWxsIHRocm93IGlmIHRoZSBrZXkgZG9lc24ndCBleGlzdC5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgaXRlbS5cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGRlbGV0ZWQgaXRlbS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWlucyhrZXkpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJLZXk6IFwiICsga2V5ICsgXCIgbm90IGZvdW5kLlwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLml0ZW1zW2tleV07XHJcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLml0ZW1zW2tleV07XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDbGVhcnMgdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSB7fTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENoZWNrIGlmIHRoZSBkaWN0aW9uYXJ5IGNvbnRhaW5zIHRoZSBnaXZlbiBrZXkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGl0ZW0uXHJcbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSBrZXkgd2FzIGZvdW5kLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIERpY3Rpb25hcnkucHJvdG90eXBlLmNvbnRhaW5zID0gZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICBpZiAoa2V5ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignS2V5IGNhbm5vdCBiZSBudWxsIG9yIHVuZGVmaW5lZCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zLmhhc093blByb3BlcnR5KGtleSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBMaXN0cyBhbGwgdGhlIGtleXMgaW4gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcmV0dXJuIHthcnJheX0gUmV0dXJucyBhbGwgdGhlIGtleXMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXMgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybiBbXTtcclxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuaXRlbXMpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogTGlzdHMgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcmV0dXJuIHthcnJheX0gUmV0dXJucyBhbGwgdGhlIHZhbHVlcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmtleXMoKS5tYXAoZnVuY3Rpb24gKGtleSkgeyByZXR1cm4gX3RoaXMuaXRlbXNba2V5XTsgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBHZXQgdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGRpY3Rpb25hcnkgaWYgaXQgY29udGFpbnMgZGF0YSwgbnVsbCBvdGhlcndpc2UuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUubG9va3VwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5rZXlzKCkubGVuZ3RoID8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh0aGlzLml0ZW1zKSkgOiBudWxsO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KERpY3Rpb25hcnkucHJvdG90eXBlLCBcImNvdW50XCIsIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIE51bWJlciBvZiBpdGVtcyBpbiB0aGUgZGljdGlvbmFyeS5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogQHJldHVybiB7bnVtYmVyfSBSZXR1cm5zIHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmtleXMoKS5sZW5ndGg7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIDtcclxuICAgICAgICByZXR1cm4gRGljdGlvbmFyeTtcclxuICAgIH0oKSk7XHJcbiAgICBleHBvcnRzLkRpY3Rpb25hcnkgPSBEaWN0aW9uYXJ5O1xyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGljdGlvbmFyeS5qcy5tYXAiLCIvLyBDb3B5cmlnaHQgKGMpIE1pY3Jvc29mdC4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxyXG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59O1xyXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIHYgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMpOyBpZiAodiAhPT0gdW5kZWZpbmVkKSBtb2R1bGUuZXhwb3J0cyA9IHY7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoW1wicmVxdWlyZVwiLCBcImV4cG9ydHNcIiwgJy4vZGljdGlvbmFyeSddLCBmYWN0b3J5KTtcclxuICAgIH1cclxufSkoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMpIHtcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgdmFyIGRpY3Rpb25hcnlfMSA9IHJlcXVpcmUoJy4vZGljdGlvbmFyeScpO1xyXG4gICAgKGZ1bmN0aW9uIChTdG9yYWdlVHlwZSkge1xyXG4gICAgICAgIFN0b3JhZ2VUeXBlW1N0b3JhZ2VUeXBlW1wiTG9jYWxTdG9yYWdlXCJdID0gMF0gPSBcIkxvY2FsU3RvcmFnZVwiO1xyXG4gICAgICAgIFN0b3JhZ2VUeXBlW1N0b3JhZ2VUeXBlW1wiU2Vzc2lvblN0b3JhZ2VcIl0gPSAxXSA9IFwiU2Vzc2lvblN0b3JhZ2VcIjtcclxuICAgIH0pKGV4cG9ydHMuU3RvcmFnZVR5cGUgfHwgKGV4cG9ydHMuU3RvcmFnZVR5cGUgPSB7fSkpO1xyXG4gICAgdmFyIFN0b3JhZ2VUeXBlID0gZXhwb3J0cy5TdG9yYWdlVHlwZTtcclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIGZvciBjcmVhdGluZyBhbmQgcXVlcnlpbmcgTG9jYWwgU3RvcmFnZSBvciBTZXNzaW9uIFN0b3JhZ2UuXHJcbiAgICAgKiBAc2VlIFVzZXMge0BsaW5rIERpY3Rpb25hcnl9IHRvIGNyZWF0ZSBhbiBpbi1tZW1vcnkgY29weSBvZlxyXG4gICAgICogdGhlIHN0b3JhZ2UgZm9yIGZhc3RlciByZWFkcy4gV3JpdGVzIHVwZGF0ZSB0aGUgYWN0dWFsIHN0b3JhZ2UuXHJcbiAgICAgKi9cclxuICAgIHZhciBTdG9yYWdlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcclxuICAgICAgICBfX2V4dGVuZHMoU3RvcmFnZSwgX3N1cGVyKTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGFpbmVyIENvbnRhaW5lciBuYW1lIHRvIGJlIGNyZWF0ZWQgaW4gdGhlIExvY2FsU3RvcmFnZS5cclxuICAgICAgICAgKiBAcGFyYW0ge1N0b3JhZ2VUeXBlfSB0eXBlW29wdGlvbmFsXSBTdG9yYWdlIFR5cGUgdG8gYmUgdXNlZCwgZGVmYXVsdHMgdG8gTG9jYWwgU3RvcmFnZS5cclxuICAgICAgICAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIFN0b3JhZ2UoX2NvbnRhaW5lciwgdHlwZSkge1xyXG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5fY29udGFpbmVyID0gX2NvbnRhaW5lcjtcclxuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IG51bGw7XHJcbiAgICAgICAgICAgIHR5cGUgPSB0eXBlIHx8IFN0b3JhZ2VUeXBlLkxvY2FsU3RvcmFnZTtcclxuICAgICAgICAgICAgdGhpcy5zd2l0Y2hTdG9yYWdlKHR5cGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTd2l0Y2ggdGhlIHN0b3JhZ2UgdHlwZS5cclxuICAgICAgICAgKiBTd2l0Y2hlcyB0aGUgc3RvcmFnZSB0eXBlIGFuZCB0aGVuIHJlbG9hZHMgdGhlIGluLW1lbW9yeSBjb2xsZWN0aW9uLlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHR5cGUge1N0b3JhZ2VUeXBlfSB0eXBlIFRoZSBkZXNpcmVkIHN0b3JhZ2UgdG8gYmUgdXNlZC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBTdG9yYWdlLnByb3RvdHlwZS5zd2l0Y2hTdG9yYWdlID0gZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHR5cGUgPT09IFN0b3JhZ2VUeXBlLkxvY2FsU3RvcmFnZSA/IGxvY2FsU3RvcmFnZSA6IHNlc3Npb25TdG9yYWdlO1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX3N0b3JhZ2UuaGFzT3duUHJvcGVydHkodGhpcy5fY29udGFpbmVyKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVt0aGlzLl9jb250YWluZXJdID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmxvYWQoKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFkZCBhbiBpdGVtLlxyXG4gICAgICAgICAqIEV4dGVuZHMgRGljdGlvbmFyeSdzIGltcGxlbWVudGF0aW9uIG9mIGFkZCwgd2l0aCBhIHNhdmUgdG8gdGhlIHN0b3JhZ2UuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgU3RvcmFnZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKGl0ZW0sIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIF9zdXBlci5wcm90b3R5cGUuYWRkLmNhbGwodGhpcywgaXRlbSwgdmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLnNhdmUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWRkIG9yIFVwZGF0ZSBhbiBpdGVtLlxyXG4gICAgICAgICAqIEV4dGVuZHMgRGljdGlvbmFyeSdzIGltcGxlbWVudGF0aW9uIG9mIGluc2VydCwgd2l0aCBhIHNhdmUgdG8gdGhlIHN0b3JhZ2UuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgU3RvcmFnZS5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gKGl0ZW0sIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIF9zdXBlci5wcm90b3R5cGUuaW5zZXJ0LmNhbGwodGhpcywgaXRlbSwgdmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLnNhdmUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVtb3ZlIGFuIGl0ZW0uXHJcbiAgICAgICAgICogRXh0ZW5kcyBEaWN0aW9uYXJ5J3MgaW1wbGVtZW50YXRpb24gd2l0aCBhIHNhdmUgdG8gdGhlIHN0b3JhZ2UuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgU3RvcmFnZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgdmFyIHZhbHVlID0gX3N1cGVyLnByb3RvdHlwZS5yZW1vdmUuY2FsbCh0aGlzLCBpdGVtKTtcclxuICAgICAgICAgICAgdGhpcy5zYXZlKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENsZWFyIHRoZSBzdG9yYWdlLlxyXG4gICAgICAgICAqIEV4dGVuZHMgRGljdGlvbmFyeSdzIGltcGxlbWVudGF0aW9uIHdpdGggYSBzYXZlIHRvIHRoZSBzdG9yYWdlLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIFN0b3JhZ2UucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBfc3VwZXIucHJvdG90eXBlLmNsZWFyLmNhbGwodGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2VbdGhpcy5fY29udGFpbmVyXSA9IG51bGw7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDbGVhciBhbGwgc3RvcmFnZXNcclxuICAgICAgICAgKiBDb21wbGV0ZWx5IGNsZWFycyBib3RoIHRoZSBsb2NhbFN0b3JhZ2UgYW5kIHNlc3Npb25TdG9yYWdlLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIFN0b3JhZ2UuY2xlYXJBbGwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuY2xlYXIoKTtcclxuICAgICAgICAgICAgd2luZG93LnNlc3Npb25TdG9yYWdlLmNsZWFyKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTYXZlcyB0aGUgY3VycmVudCBzdGF0ZSB0byB0aGUgc3RvcmFnZS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBTdG9yYWdlLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLl9zdG9yYWdlW3RoaXMuX2NvbnRhaW5lcl0gPSBKU09OLnN0cmluZ2lmeSh0aGlzLml0ZW1zKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJlZnJlc2hlcyB0aGUgc3RvcmFnZSB3aXRoIHRoZSBjdXJyZW50IGxvY2FsU3RvcmFnZSB2YWx1ZXMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgU3RvcmFnZS5wcm90b3R5cGUubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5jbGVhci5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gSlNPTi5wYXJzZSh0aGlzLl9zdG9yYWdlW3RoaXMuX2NvbnRhaW5lcl0pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtcyA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtcyA9IHt9O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcztcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBTdG9yYWdlO1xyXG4gICAgfShkaWN0aW9uYXJ5XzEuRGljdGlvbmFyeSkpO1xyXG4gICAgZXhwb3J0cy5TdG9yYWdlID0gU3RvcmFnZTtcclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN0b3JhZ2UuanMubWFwIiwiLy8gQ29weXJpZ2h0IChjKSBNaWNyb3NvZnQuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cclxuKGZ1bmN0aW9uIChmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciB2ID0gZmFjdG9yeShyZXF1aXJlLCBleHBvcnRzKTsgaWYgKHYgIT09IHVuZGVmaW5lZCkgbW9kdWxlLmV4cG9ydHMgPSB2O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKFtcInJlcXVpcmVcIiwgXCJleHBvcnRzXCIsICcuL2hlbHBlcnMvZGljdGlvbmFyeScsICcuL2hlbHBlcnMvc3RvcmFnZScsICcuL2F1dGhlbnRpY2F0aW9uL3Rva2VuLm1hbmFnZXInLCAnLi9hdXRoZW50aWNhdGlvbi9lbmRwb2ludC5tYW5hZ2VyJywgJy4vYXV0aGVudGljYXRpb24vYXV0aGVudGljYXRvciddLCBmYWN0b3J5KTtcclxuICAgIH1cclxufSkoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMpIHtcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgZnVuY3Rpb24gX19leHBvcnQobSkge1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKCFleHBvcnRzLmhhc093blByb3BlcnR5KHApKSBleHBvcnRzW3BdID0gbVtwXTtcclxuICAgIH1cclxuICAgIF9fZXhwb3J0KHJlcXVpcmUoJy4vaGVscGVycy9kaWN0aW9uYXJ5JykpO1xyXG4gICAgX19leHBvcnQocmVxdWlyZSgnLi9oZWxwZXJzL3N0b3JhZ2UnKSk7XHJcbiAgICBfX2V4cG9ydChyZXF1aXJlKCcuL2F1dGhlbnRpY2F0aW9uL3Rva2VuLm1hbmFnZXInKSk7XHJcbiAgICBfX2V4cG9ydChyZXF1aXJlKCcuL2F1dGhlbnRpY2F0aW9uL2VuZHBvaW50Lm1hbmFnZXInKSk7XHJcbiAgICBfX2V4cG9ydChyZXF1aXJlKCcuL2F1dGhlbnRpY2F0aW9uL2F1dGhlbnRpY2F0b3InKSk7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiXX0=
return require('office-js-helpers');
});