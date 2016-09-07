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
         * @return {Promise<IToken>} Returns a promise of the token.
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
                width: 35,
                requireHTTPS: true
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

},{"../authentication":3}],2:[function(require,module,exports){
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
        define(["require", "exports", '../helpers'], factory);
    }
})(function (require, exports) {
    "use strict";
    var helpers_1 = require('../helpers');
    // Underscore.js implementation of extend
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
        Facebook: 'Facebook'
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
            _super.call(this, 'OAuth2Endpoints', helpers_1.StorageType.LocalStorage);
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
         * Extends Storage's default add method
         * Registers a new OAuth Endpoint
         *
         * @param {string} provider Unique name for the registered OAuth Endpoint.
         * @param {object} config Valid Endpoint configuration
         * @see {@link IEndpoint}.
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.prototype.add = function (provider, config) {
            if (config.redirectUrl == null)
                config.redirectUrl = this.currentHost;
            config.provider = provider;
            return _super.prototype.add.call(this, provider, config);
        };
        /**
         * Register Google Implicit OAuth
         * The default scope is limited to basic profile
         *
         * @param {string} clientId ClientID for the Google App
         * @param {object} config Valid Endpoint configuration to override the defaults
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.prototype.registerGoogleAuth = function (clientId, overrides) {
            var defaults = {
                clientId: clientId,
                baseUrl: 'https://accounts.google.com',
                authorizeUrl: '/o/oauth2/v2/auth',
                resource: 'https://www.googleapis.com',
                responseType: 'token',
                scope: 'https://www.googleapis.com/auth/plus.me'
            };
            var config = extend({}, defaults, overrides);
            return this.add(exports.DefaultEndpoints.Google, config);
        };
        ;
        /**
         * Register Microsoft Implicit OAuth
         * The default scope is limited to basic profile
         *
         * @param {string} clientId ClientID for the Microsoft App
         * @param {object} config Valid Endpoint configuration to override the defaults
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.prototype.registerMicrosoftAuth = function (clientId, overrides) {
            var defaults = {
                clientId: clientId,
                baseUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0',
                authorizeUrl: '/authorize',
                resource: 'https://graph.microsoft.com',
                responseType: 'id_token+token',
                scope: 'openid https://graph.microsoft.com/user.read',
                extraParameters: '&response_mode=fragment',
                nonce: true,
                state: true
            };
            var config = extend({}, defaults, overrides);
            this.add(exports.DefaultEndpoints.Microsoft, config);
        };
        ;
        /**
         * Register Facebook Implicit OAuth
         * The default scope is limited to basic profile
         *
         * @param {string} clientId ClientID for the Facebook App
         * @param {object} config Valid Endpoint configuration to override the defaults
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
            var config = extend({}, defaults, overrides);
            this.add(exports.DefaultEndpoints.Facebook, config);
        };
        ;
        /**
         * Helper to generate the OAuth login url
         *
         * @param {object} config Valid Endpoint configuration
         * @return {object} Returns the added endpoint.
         */
        EndpointManager.getLoginUrl = function (endpointConfig) {
            var rand = function (limit, start) {
                if (limit === void 0) { limit = 10; }
                if (start === void 0) { start = 0; }
                return Math.floor(Math.random() * limit + start);
            };
            var oAuthScope = (endpointConfig.scope) ? encodeURIComponent(endpointConfig.scope) : '', state = endpointConfig.state && rand(10000), nonce = endpointConfig.nonce && rand(10000);
            var urlSegments = [
                'response_type=' + endpointConfig.responseType,
                'client_id=' + encodeURIComponent(endpointConfig.clientId),
                'redirect_uri=' + encodeURIComponent(endpointConfig.redirectUrl),
                'scope=' + oAuthScope
            ];
            if (state)
                urlSegments.push('state=' + state);
            if (nonce)
                urlSegments.push('nonce=' + nonce);
            if (endpointConfig)
                urlSegments.push(endpointConfig.extraQueryParameters);
            return endpointConfig.baseUrl + endpointConfig.authorizeUrl + '?' + urlSegments.join('&');
        };
        return EndpointManager;
    }(helpers_1.Storage));
    exports.EndpointManager = EndpointManager;
});

},{"../helpers":6}],3:[function(require,module,exports){
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", './authenticator', './endpoint.manager', './token.manager'], factory);
    }
})(function (require, exports) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    __export(require('./authenticator'));
    __export(require('./endpoint.manager'));
    __export(require('./token.manager'));
});

},{"./authenticator":1,"./endpoint.manager":2,"./token.manager":4}],4:[function(require,module,exports){
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
        define(["require", "exports", '../helpers'], factory);
    }
})(function (require, exports) {
    "use strict";
    var helpers_1 = require('../helpers');
    /**
     * Helper for caching and managing OAuth Tokens.
     */
    var TokenManager = (function (_super) {
        __extends(TokenManager, _super);
        /**
         * @constructor
        */
        function TokenManager() {
            _super.call(this, 'OAuth2Tokens', helpers_1.StorageType.LocalStorage);
        }
        /**
         * Compute the expiration date based on the expires_in field in a OAuth token.
         */
        TokenManager.prototype.setExpiry = function (token) {
            var expire = function (seconds) {
                if (seconds === void 0) { seconds = 3600; }
                return new Date(new Date().getTime() + ~~seconds * 1000);
            };
            if (token == null)
                return null;
            if (token.expires_at == null) {
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
            return _super.prototype.add.call(this, provider, value);
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
        /**
         * Check if the supplied url has either access_token or code or error
         */
        TokenManager.isTokenUrl = function (url) {
            var regex = /(access_token|code|error)/gi;
            return regex.test(url);
        };
        TokenManager._extractParams = function (segment) {
            var params = {}, regex = /([^&=]+)=([^&]*)/g, matches;
            while ((matches = regex.exec(segment)) !== null) {
                params[decodeURIComponent(matches[1])] = decodeURIComponent(matches[2]);
            }
            return params;
        };
        return TokenManager;
    }(helpers_1.Storage));
    exports.TokenManager = TokenManager;
});

},{"../helpers":6}],5:[function(require,module,exports){
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
            if (this.items == null)
                this.items = {};
        }
        /**
         * Gets an item from the dictionary.
         *
         * @param {string} key The key of the item.
         * @return {object} Returns an item if found, else returns null.
         */
        Dictionary.prototype.get = function (key) {
            if (this.items == null)
                throw new Error('Dictionary isn\'t initialized. Call \'new\' first.');
            if (!this.contains(key))
                return null;
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
            if (this.contains(key))
                throw new Error('Key already exists.');
            return this.insert(key, value);
        };
        ;
        /**
         * Gets the first time of the dictionary
         *
         * @return {object} Returns the first item in the dictionary.
         */
        Dictionary.prototype.first = function () {
            if (this.items == null)
                throw new Error('Dictionary isn\'t initialized. Call \'new\' first.');
            var key = this.keys()[0];
            if (key != null)
                return this.items[key];
        };
        /**
         * Inserts an item into the dictionary.
         *
         * @param {string} key The key of the item.
         * @param {object} value The item to be added.
         * @return {object} Returns the added item.
         */
        Dictionary.prototype.insert = function (key, value) {
            if (this.items == null)
                throw new Error('Dictionary isn\'t initialized. Call \'new\' first.');
            if (value == null)
                throw new Error('Value expected. Got ' + value);
            this.items[key] = value;
            return value;
        };
        /**
         * Removes an item from the dictionary.
         * If the key doesnt exist, then it will throw.
         *
         * @param {string} key The key of the item.
         * @return {object} Returns the deleted item.
         */
        Dictionary.prototype.remove = function (key) {
            if (!this.contains(key))
                throw new Error('Key not found.');
            var value = this.items[key];
            delete this.items[key];
            return this.insert(key, value);
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
            if (key == null)
                throw new Error('Key cannot be null or undefined');
            if (this.items == null)
                throw new Error('Dictionary isn\'t initialized. Call \'new\' first.');
            return this.items.hasOwnProperty(key);
        };
        /**
         * Lists all the keys in the dictionary.
         *
         * @return {array} Returns all the keys.
         */
        Dictionary.prototype.keys = function () {
            if (this == null)
                throw new Error('Dictionary isn\'t initialized. Call \'new\' first.');
            return Object.keys(this.items);
        };
        /**
         * Lists all the values in the dictionary.
         *
         * @return {array} Returns all the values.
         */
        Dictionary.prototype.values = function () {
            if (this == null)
                throw new Error('Dictionary isn\'t initialized. Call \'new\' first.');
            return Object.values(this.items);
        };
        /**
         * Get the dictionary.
         *
         * @return {object} Returns the dictionary if it contains data else null.
         */
        Dictionary.prototype.lookup = function () {
            return this.keys().length ? this.items : null;
        };
        Object.defineProperty(Dictionary.prototype, "count", {
            /**
             * Number of items in the dictionary.
             *
             * @return {number} Returns the number of items in the dictionary
             */
            get: function () {
                return this.values().length;
            },
            enumerable: true,
            configurable: true
        });
        ;
        return Dictionary;
    }());
    exports.Dictionary = Dictionary;
});

},{}],6:[function(require,module,exports){
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", './dictionary', './storage'], factory);
    }
})(function (require, exports) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    __export(require('./dictionary'));
    __export(require('./storage'));
});

},{"./dictionary":5,"./storage":7}],7:[function(require,module,exports){
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
         * Switch the storage type
         * Switches the storage type and then reloads the in-memory collection
         *
         * @type {StorageType} type The desired storage to be used
         */
        Storage.prototype.switchStorage = function (type) {
            this._storage = type === StorageType.LocalStorage ? localStorage : sessionStorage;
            if (!this._storage.hasOwnProperty(this._container)) {
                this._storage[this._container] = null;
            }
            this._load();
        };
        /**
         * Add an item
         * Extends Dictionary's implementation with a save to the storage
         */
        Storage.prototype.add = function (item, value) {
            _super.prototype.insert.call(this, item, value);
            this._save();
            return value;
        };
        /**
         * Remove an item
         * Extends Dictionary's implementation with a save to the storage
         */
        Storage.prototype.remove = function (item) {
            var value = _super.prototype.remove.call(this, item);
            this._save();
            return value;
        };
        /**
         * Clear the storage
         * Extends Dictionary's implementation with a save to the storage
         */
        Storage.prototype.clear = function () {
            _super.prototype.clear.call(this);
            this._storage[this._container] = null;
        };
        /**
         * Clear all storages
         * completely clears all storages
         */
        Storage.clear = function () {
            window.localStorage.clear();
            window.sessionStorage.clear();
        };
        Storage.prototype._save = function () {
            this._storage[this._container] = JSON.stringify(this.items);
        };
        Storage.prototype._load = function () {
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

},{"./dictionary":5}],"office-js-helpers":[function(require,module,exports){
(function (factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(["require", "exports", './helpers', './authentication'], factory);
    }
})(function (require, exports) {
    "use strict";
    function __export(m) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    }
    __export(require('./helpers'));
    __export(require('./authentication'));
});

},{"./authentication":3,"./helpers":6}]},{},[])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2F1dGhlbnRpY2F0aW9uL2F1dGhlbnRpY2F0b3IuanMiLCJkaXN0L2F1dGhlbnRpY2F0aW9uL2VuZHBvaW50Lm1hbmFnZXIuanMiLCJkaXN0L2F1dGhlbnRpY2F0aW9uL2luZGV4LmpzIiwiZGlzdC9hdXRoZW50aWNhdGlvbi90b2tlbi5tYW5hZ2VyLmpzIiwiZGlzdC9oZWxwZXJzL2RpY3Rpb25hcnkuanMiLCJkaXN0L2hlbHBlcnMvaW5kZXguanMiLCJkaXN0L2hlbHBlcnMvc3RvcmFnZS5qcyIsImRpc3QvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgdiA9IGZhY3RvcnkocmVxdWlyZSwgZXhwb3J0cyk7IGlmICh2ICE9PSB1bmRlZmluZWQpIG1vZHVsZS5leHBvcnRzID0gdjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiZXhwb3J0c1wiLCAnLi4vYXV0aGVudGljYXRpb24nXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIHZhciBhdXRoZW50aWNhdGlvbl8xID0gcmVxdWlyZSgnLi4vYXV0aGVudGljYXRpb24nKTtcclxuICAgIC8qKlxyXG4gICAgICogRW51bWVyYXRpb24gZm9yIHRoZSBzdXBwb3J0ZWQgbW9kZXMgb2YgQXV0aGVudGljYXRpb24uXHJcbiAgICAgKiBFaXRoZXIgZGlhbG9nIG9yIHJlZGlyZWN0aW9uLlxyXG4gICAgICovXHJcbiAgICAoZnVuY3Rpb24gKEF1dGhlbnRpY2F0aW9uTW9kZSkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIE9wZW5zIGEgdGhlIGF1dGhvcml6ZSB1cmwgaW5zaWRlIG9mIGEgZGlhbG9nLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEF1dGhlbnRpY2F0aW9uTW9kZVtBdXRoZW50aWNhdGlvbk1vZGVbXCJEaWFsb2dcIl0gPSAwXSA9IFwiRGlhbG9nXCI7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVkaXJlY3RzIHRoZSBjdXJyZW50IHdpbmRvdyB0byB0aGUgYXV0aG9yaXplIHVybC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBBdXRoZW50aWNhdGlvbk1vZGVbQXV0aGVudGljYXRpb25Nb2RlW1wiUmVkaXJlY3RcIl0gPSAxXSA9IFwiUmVkaXJlY3RcIjtcclxuICAgIH0pKGV4cG9ydHMuQXV0aGVudGljYXRpb25Nb2RlIHx8IChleHBvcnRzLkF1dGhlbnRpY2F0aW9uTW9kZSA9IHt9KSk7XHJcbiAgICB2YXIgQXV0aGVudGljYXRpb25Nb2RlID0gZXhwb3J0cy5BdXRoZW50aWNhdGlvbk1vZGU7XHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBmb3IgcGVyZm9ybWluZyBJbXBsaWNpdCBPQXV0aCBBdXRoZW50aWNhdGlvbiB3aXRoIHJlZ2lzdGVyZWQgZW5kcG9pbnRzLlxyXG4gICAgICovXHJcbiAgICB2YXIgQXV0aGVudGljYXRvciA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0gZW5kcG9pbnRNYW5hZ2VyIERlcGVuZHMgb24gYW4gaW5zdGFuY2Ugb2YgRW5kcG9pbnRNYW5hZ2VyXHJcbiAgICAgICAgICogQHBhcmFtIFRva2VuTWFuYWdlciBEZXBlbmRzIG9uIGFuIGluc3RhbmNlIG9mIFRva2VuTWFuYWdlclxyXG4gICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gQXV0aGVudGljYXRvcihfZW5kcG9pbnRNYW5hZ2VyLCBfdG9rZW5NYW5hZ2VyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2VuZHBvaW50TWFuYWdlciA9IF9lbmRwb2ludE1hbmFnZXI7XHJcbiAgICAgICAgICAgIHRoaXMuX3Rva2VuTWFuYWdlciA9IF90b2tlbk1hbmFnZXI7XHJcbiAgICAgICAgICAgIGlmIChfZW5kcG9pbnRNYW5hZ2VyID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyAnUGxlYXNlIHBhc3MgYW4gaW5zdGFuY2Ugb2YgRW5kcG9pbnRNYW5hZ2VyLic7XHJcbiAgICAgICAgICAgIGlmIChfdG9rZW5NYW5hZ2VyID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyAnUGxlYXNlIHBhc3MgYW4gaW5zdGFuY2Ugb2YgVG9rZW5NYW5hZ2VyLic7XHJcbiAgICAgICAgICAgIGlmIChfZW5kcG9pbnRNYW5hZ2VyLmNvdW50ID09IDApXHJcbiAgICAgICAgICAgICAgICB0aHJvdyAnTm8gcmVnaXN0ZXJlZCBFbmRwb2ludHMgY291bGQgYmUgZm91bmQuIEVpdGhlciB1c2UgdGhlIGRlZmF1bHQgZW5kcG9pbnQgcmVnaXN0cmF0aW9ucyBvciBhZGQgb25lIG1hbnVhbGx5JztcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQXV0aGVudGljYXRlIGJhc2VkIG9uIHRoZSBnaXZlbiBwcm92aWRlclxyXG4gICAgICAgICAqIEVpdGhlciB1c2VzIERpYWxvZ0FQSSBvciBXaW5kb3cgUG9wdXBzIGJhc2VkIG9uIHdoZXJlIGl0cyBiZWluZyBjYWxsZWQgZnJvbVxyXG4gICAgICAgICAqIHZpei4gQWRkLWluIG9yIFdlYi5cclxuICAgICAgICAgKiBJZiB0aGUgdG9rZW4gd2FzIGNhY2hlZCwgdGhlIGl0IHJldHJpZXZlcyB0aGUgY2FjaGVkIHRva2VuLlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogV0FSTklORzogeW91IGhhdmUgdG8gbWFudWFsbHkgY2hlY2sgdGhlIGV4cGlyZXNfaW4gb3IgZXhwaXJlc19hdCBwcm9wZXJ0eSB0byBkZXRlcm1pbmVcclxuICAgICAgICAgKiBpZiB0aGUgdG9rZW4gaGFzIGV4cGlyZWQuIE5vdCBhbGwgT0F1dGggcHJvdmlkZXJzIHN1cHBvcnQgcmVmcmVzaCB0b2tlbiBmbG93cy5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciBMaW5rIHRvIHRoZSBwcm92aWRlci5cclxuICAgICAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGZvcmNlIEZvcmNlIHJlLWF1dGhlbnRpY2F0aW9uLlxyXG4gICAgICAgICAqIEByZXR1cm4ge1Byb21pc2U8SVRva2VuPn0gUmV0dXJucyBhIHByb21pc2Ugb2YgdGhlIHRva2VuLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uIChwcm92aWRlciwgZm9yY2UpIHtcclxuICAgICAgICAgICAgaWYgKGZvcmNlID09PSB2b2lkIDApIHsgZm9yY2UgPSBmYWxzZTsgfVxyXG4gICAgICAgICAgICB2YXIgdG9rZW4gPSB0aGlzLl90b2tlbk1hbmFnZXIuZ2V0KHByb3ZpZGVyKTtcclxuICAgICAgICAgICAgaWYgKHRva2VuICE9IG51bGwgJiYgIWZvcmNlKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0b2tlbik7XHJcbiAgICAgICAgICAgIHZhciBlbmRwb2ludCA9IHRoaXMuX2VuZHBvaW50TWFuYWdlci5nZXQocHJvdmlkZXIpO1xyXG4gICAgICAgICAgICBpZiAoQXV0aGVudGljYXRvci5tb2RlID09IEF1dGhlbnRpY2F0aW9uTW9kZS5SZWRpcmVjdCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IGF1dGhlbnRpY2F0aW9uXzEuRW5kcG9pbnRNYW5hZ2VyLmdldExvZ2luVXJsKGVuZHBvaW50KTtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uLnJlcGxhY2UodXJsKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnQVVUSF9SRURJUkVDVCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIGF1dGg7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXV0aGVudGljYXRvci5pc0FkZGluKVxyXG4gICAgICAgICAgICAgICAgICAgIGF1dGggPSB0aGlzLl9vcGVuSW5EaWFsb2coZW5kcG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGF1dGggPSB0aGlzLl9vcGVuSW5XaW5kb3dQb3B1cChlbmRwb2ludCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXV0aC5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHsgcmV0dXJuIGNvbnNvbGUuZXJyb3IoZXJyb3IpOyB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgQXV0aGVudGljYXRvci5wcm90b3R5cGUuZXhjaGFuZ2VDb2RlRm9yVG9rZW4gPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBoZWFkZXJzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICAgICAgICAgICAgICB4aHIub3BlbignUE9TVCcsIHVybCk7XHJcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaGVhZGVyIGluIGhlYWRlcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaGVhZGVyID09PSAnQWNjZXB0JyB8fCBoZWFkZXIgPT09ICdDb250ZW50LVR5cGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIsIGhlYWRlcnNbaGVhZGVyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqc29uID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnYWNjZXNzX3Rva2VuJyBpbiBqc29uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh4aHIuc3RhdHVzICE9PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiAnUmVxdWVzdCBmYWlsZWQuICcgKyB4aHIucmVzcG9uc2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IGUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHhoci5zZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXV0aGVudGljYXRvciwgXCJpc0F1dGhEaWFsb2dcIiwge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogQ2hlY2sgaWYgdGhlIGN1cnJyZW50IHVybCBpcyBydW5uaW5nIGluc2lkZSBvZiBhIERpYWxvZyB0aGF0IGNvbnRhaW5zIGFuIGFjY2Vzc190b2tlbiBvciBjb2RlIG9yIGVycm9yLlxyXG4gICAgICAgICAgICAgKiBJZiB0cnVlIHRoZW4gaXQgY2FsbHMgbWVzc2FnZVBhcmVudCBieSBleHRyYWN0aW5nIHRoZSB0b2tlbiBpbmZvcm1hdGlvbi5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn1cclxuICAgICAgICAgICAgICogUmV0dXJucyBmYWxzZSBpZiB0aGUgY29kZSBpcyBydW5uaW5nIGluc2lkZSBvZiBhIGRpYWxvZyB3aXRob3V0IHRoZSByZXF1cmllZCBpbmZvcm1hdGlvblxyXG4gICAgICAgICAgICAgKiBvciBpcyBub3QgcnVubmluZyBpbnNpZGUgb2YgYSBkaWFsb2cgYXQgYWxsLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIUF1dGhlbnRpY2F0b3IuaXNBZGRpbilcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWF1dGhlbnRpY2F0aW9uXzEuVG9rZW5NYW5hZ2VyLmlzVG9rZW5VcmwobG9jYXRpb24uaHJlZikpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdG9rZW4gPSBhdXRoZW50aWNhdGlvbl8xLlRva2VuTWFuYWdlci5nZXRUb2tlbihsb2NhdGlvbi5ocmVmLCBsb2NhdGlvbi5vcmlnaW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIE9mZmljZS5jb250ZXh0LnVpLm1lc3NhZ2VQYXJlbnQoSlNPTi5zdHJpbmdpZnkodG9rZW4pKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEF1dGhlbnRpY2F0b3IsIFwiaXNBZGRpblwiLCB7XHJcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKEF1dGhlbnRpY2F0b3IuX2lzQWRkaW4gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEF1dGhlbnRpY2F0b3IuX2lzQWRkaW4gPVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuaGFzT3duUHJvcGVydHkoJ09mZmljZScpICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAod2luZG93Lmhhc093blByb3BlcnR5KCdXb3JkJykgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuaGFzT3duUHJvcGVydHkoJ0V4Y2VsJykgfHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cuaGFzT3duUHJvcGVydHkoJ09uZU5vdGUnKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aGVudGljYXRvci5faXNBZGRpbjtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIEF1dGhlbnRpY2F0b3IuX2lzQWRkaW4gPSB2YWx1ZTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgQXV0aGVudGljYXRvci5wcm90b3R5cGUuX29wZW5JbldpbmRvd1BvcHVwID0gZnVuY3Rpb24gKGVuZHBvaW50KSB7XHJcbiAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgICAgIHZhciB1cmwgPSBhdXRoZW50aWNhdGlvbl8xLkVuZHBvaW50TWFuYWdlci5nZXRMb2dpblVybChlbmRwb2ludCk7XHJcbiAgICAgICAgICAgIHZhciB3aW5kb3dTaXplID0gZW5kcG9pbnQud2luZG93U2l6ZSB8fCBcIndpZHRoPTQwMCxoZWlnaHQ9NjAwXCI7XHJcbiAgICAgICAgICAgIHZhciB3aW5kb3dGZWF0dXJlcyA9IHdpbmRvd1NpemUgKyBcIixtZW51YmFyPW5vLHRvb2xiYXI9bm8sbG9jYXRpb249bm8scmVzaXphYmxlPW5vLHNjcm9sbGJhcnM9eWVzLHN0YXR1cz1ub1wiO1xyXG4gICAgICAgICAgICB2YXIgcG9wdXBXaW5kb3cgPSB3aW5kb3cub3Blbih1cmwsIGVuZHBvaW50LnByb3ZpZGVyLnRvVXBwZXJDYXNlKCksIHdpbmRvd0ZlYXR1cmVzKTtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGludGVydmFsXzEgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocG9wdXBXaW5kb3cuZG9jdW1lbnQuVVJMLmluZGV4T2YoZW5kcG9pbnQucmVkaXJlY3RVcmwpICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxfMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IGF1dGhlbnRpY2F0aW9uXzEuVG9rZW5NYW5hZ2VyLmdldFRva2VuKHBvcHVwV2luZG93LmRvY3VtZW50LlVSTCwgZW5kcG9pbnQucmVkaXJlY3RVcmwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXN1bHQgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KCdObyBhY2Nlc3NfdG9rZW4gb3IgY29kZSBjb3VsZCBiZSBwYXJzZWQuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoJ2NvZGUnIGluIHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3B1cFdpbmRvdy5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5kcG9pbnQudG9rZW5VcmwgIT0gJycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoX3RoaXMuZXhjaGFuZ2VDb2RlRm9yVG9rZW4oZW5kcG9pbnQudG9rZW5VcmwsIHJlc3VsdC5jb2RlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgnYWNjZXNzX3Rva2VuJyBpbiByZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3Rva2VuTWFuYWdlci5hZGQoZW5kcG9pbnQucHJvdmlkZXIsIHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcHVwV2luZG93LmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXBvcHVwV2luZG93KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbF8xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXhjZXB0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sIDQwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXRjaCAoZXhjZXB0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9wdXBXaW5kb3cuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXhjZXB0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBBdXRoZW50aWNhdG9yLnByb3RvdHlwZS5fb3BlbkluRGlhbG9nID0gZnVuY3Rpb24gKGVuZHBvaW50KSB7XHJcbiAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgICAgIHZhciB1cmwgPSBhdXRoZW50aWNhdGlvbl8xLkVuZHBvaW50TWFuYWdlci5nZXRMb2dpblVybChlbmRwb2ludCk7XHJcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiAzNSxcclxuICAgICAgICAgICAgICAgIHdpZHRoOiAzNSxcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVIVFRQUzogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICAgICAgT2ZmaWNlLmNvbnRleHQudWkuZGlzcGxheURpYWxvZ0FzeW5jKHVybCwgb3B0aW9ucywgZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkaWFsb2cgPSByZXN1bHQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9nLmFkZEV2ZW50SGFuZGxlcihPZmZpY2UuRXZlbnRUeXBlLkRpYWxvZ01lc3NhZ2VSZWNlaXZlZCwgZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbG9nLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5tZXNzYWdlID09IG51bGwgfHwgYXJncy5tZXNzYWdlID09PSAnJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ05vIGFjY2Vzc190b2tlbiBvciBjb2RlIGNvdWxkIGJlIHBhcnNlZC4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqc29uID0gSlNPTi5wYXJzZShhcmdzLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCdjb2RlJyBpbiBqc29uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuZHBvaW50LnRva2VuVXJsICE9ICcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoX3RoaXMuZXhjaGFuZ2VDb2RlRm9yVG9rZW4oZW5kcG9pbnQudG9rZW5VcmwsIGpzb24uY29kZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGpzb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAoJ2FjY2Vzc190b2tlbicgaW4ganNvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl90b2tlbk1hbmFnZXIuYWRkKGVuZHBvaW50LnByb3ZpZGVyLCBqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGpzb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGpzb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb250cm9scyB0aGUgd2F5IHRoZSBhdXRoZW50aWNhdGlvbiBzaG91bGQgdGFrZSBwbGFjZS5cclxuICAgICAgICAgKiBFaXRoZXIgYnkgdXNpbmcgZGlhbG9nIG9yIGJ5IHJlZGlyZWN0aW5nIHRoZSBjdXJyZW50IHdpbmRvdy5cclxuICAgICAgICAgKiBEZWZhdWx0cyB0byB0aGUgZGlhbG9nIGZsb3cuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgQXV0aGVudGljYXRvci5tb2RlID0gQXV0aGVudGljYXRpb25Nb2RlLkRpYWxvZztcclxuICAgICAgICByZXR1cm4gQXV0aGVudGljYXRvcjtcclxuICAgIH0oKSk7XHJcbiAgICBleHBvcnRzLkF1dGhlbnRpY2F0b3IgPSBBdXRoZW50aWNhdG9yO1xyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXV0aGVudGljYXRvci5qcy5tYXAiLCJ2YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59O1xyXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIHYgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMpOyBpZiAodiAhPT0gdW5kZWZpbmVkKSBtb2R1bGUuZXhwb3J0cyA9IHY7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoW1wicmVxdWlyZVwiLCBcImV4cG9ydHNcIiwgJy4uL2hlbHBlcnMnXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIHZhciBoZWxwZXJzXzEgPSByZXF1aXJlKCcuLi9oZWxwZXJzJyk7XHJcbiAgICAvLyBVbmRlcnNjb3JlLmpzIGltcGxlbWVudGF0aW9uIG9mIGV4dGVuZFxyXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2phc2hrZW5hcy91bmRlcnNjb3JlL2Jsb2IvbWFzdGVyL3VuZGVyc2NvcmUuanNcclxuICAgIHZhciBleHRlbmQgPSBmdW5jdGlvbiAob2JqKSB7XHJcbiAgICAgICAgdmFyIGRlZmF1bHRzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAxOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgZGVmYXVsdHNbX2kgLSAxXSA9IGFyZ3VtZW50c1tfaV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xyXG4gICAgICAgIGlmIChsZW5ndGggPCAyIHx8IG9iaiA9PSBudWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gb2JqOyAvLyBpZiB0aGVyZSBhcmUgbm8gb2JqZWN0cyB0byBleHRlbmQgdGhlbiByZXR1cm4gdGhlIGN1cnJlbnQgb2JqZWN0XHJcbiAgICAgICAgaWYgKGRlZmF1bHRzKVxyXG4gICAgICAgICAgICBvYmogPSBPYmplY3Qob2JqKTsgLy8gY3JlYXRlIGEgbmV3IG9iamVjdCB0byBleHRlbmQgaWYgdGhlcmUgYXJlIGFueSBleHRlbnNpb25zXHJcbiAgICAgICAgZm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2luZGV4XTsgLy8gZm9yZWFjaCBvYmplY3RcclxuICAgICAgICAgICAgaWYgKHNvdXJjZSA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgY29udGludWU7IC8vIG1vdmUgb24gaWYgdGhlIG9iamVjdCBpcyBudWxsIG9yIHVuZGVmaW5lZFxyXG4gICAgICAgICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHNvdXJjZSksIC8vIGdldCBhbGwgdGhlIGtleXNcclxuICAgICAgICAgICAgbCA9IGtleXMubGVuZ3RoOyAvLyBjYWNoZSB0aGUgbGVuZ3RoXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIga2V5ID0ga2V5c1tpXTsgLy8gZm9yIGVhY2gga2V5XHJcbiAgICAgICAgICAgICAgICBpZiAoIWRlZmF1bHRzIHx8IG9ialtrZXldID09PSB2b2lkIDApXHJcbiAgICAgICAgICAgICAgICAgICAgb2JqW2tleV0gPSBzb3VyY2Vba2V5XTsgLy8gcmVwbGFjZSB2YWx1ZXNcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gb2JqO1xyXG4gICAgfTtcclxuICAgIGV4cG9ydHMuRGVmYXVsdEVuZHBvaW50cyA9IHtcclxuICAgICAgICBHb29nbGU6ICdHb29nbGUnLFxyXG4gICAgICAgIE1pY3Jvc29mdDogJ01pY3Jvc29mdCcsXHJcbiAgICAgICAgRmFjZWJvb2s6ICdGYWNlYm9vaydcclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBmb3IgY3JlYXRpbmcgYW5kIHJlZ2lzdGVyaW5nIE9BdXRoIEVuZHBvaW50cy5cclxuICAgICAqL1xyXG4gICAgdmFyIEVuZHBvaW50TWFuYWdlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XHJcbiAgICAgICAgX19leHRlbmRzKEVuZHBvaW50TWFuYWdlciwgX3N1cGVyKTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAgICAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIEVuZHBvaW50TWFuYWdlcigpIHtcclxuICAgICAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgJ09BdXRoMkVuZHBvaW50cycsIGhlbHBlcnNfMS5TdG9yYWdlVHlwZS5Mb2NhbFN0b3JhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRW5kcG9pbnRNYW5hZ2VyLnByb3RvdHlwZSwgXCJjdXJyZW50SG9zdFwiLCB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBHZXRzIHRoZSBjdXJyZW50IHVybCB0byBiZSBzcGVjaWZpZWQgYXMgdGhlIGRlZmF1bHQgcmVkaXJlY3QgdXJsLlxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fY3VycmVudEhvc3QgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2N1cnJlbnRIb3N0ID0gd2luZG93LmxvY2F0aW9uLnByb3RvY29sICsgXCIvL1wiICsgd2luZG93LmxvY2F0aW9uLmhvc3Q7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudEhvc3Q7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEV4dGVuZHMgU3RvcmFnZSdzIGRlZmF1bHQgYWRkIG1ldGhvZFxyXG4gICAgICAgICAqIFJlZ2lzdGVycyBhIG5ldyBPQXV0aCBFbmRwb2ludFxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIFVuaXF1ZSBuYW1lIGZvciB0aGUgcmVnaXN0ZXJlZCBPQXV0aCBFbmRwb2ludC5cclxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFZhbGlkIEVuZHBvaW50IGNvbmZpZ3VyYXRpb25cclxuICAgICAgICAgKiBAc2VlIHtAbGluayBJRW5kcG9pbnR9LlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgYWRkZWQgZW5kcG9pbnQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRW5kcG9pbnRNYW5hZ2VyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAocHJvdmlkZXIsIGNvbmZpZykge1xyXG4gICAgICAgICAgICBpZiAoY29uZmlnLnJlZGlyZWN0VXJsID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICBjb25maWcucmVkaXJlY3RVcmwgPSB0aGlzLmN1cnJlbnRIb3N0O1xyXG4gICAgICAgICAgICBjb25maWcucHJvdmlkZXIgPSBwcm92aWRlcjtcclxuICAgICAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUuYWRkLmNhbGwodGhpcywgcHJvdmlkZXIsIGNvbmZpZyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZWdpc3RlciBHb29nbGUgSW1wbGljaXQgT0F1dGhcclxuICAgICAgICAgKiBUaGUgZGVmYXVsdCBzY29wZSBpcyBsaW1pdGVkIHRvIGJhc2ljIHByb2ZpbGVcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjbGllbnRJZCBDbGllbnRJRCBmb3IgdGhlIEdvb2dsZSBBcHBcclxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFZhbGlkIEVuZHBvaW50IGNvbmZpZ3VyYXRpb24gdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHRzXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBhZGRlZCBlbmRwb2ludC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBFbmRwb2ludE1hbmFnZXIucHJvdG90eXBlLnJlZ2lzdGVyR29vZ2xlQXV0aCA9IGZ1bmN0aW9uIChjbGllbnRJZCwgb3ZlcnJpZGVzKSB7XHJcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcclxuICAgICAgICAgICAgICAgIGNsaWVudElkOiBjbGllbnRJZCxcclxuICAgICAgICAgICAgICAgIGJhc2VVcmw6ICdodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20nLFxyXG4gICAgICAgICAgICAgICAgYXV0aG9yaXplVXJsOiAnL28vb2F1dGgyL3YyL2F1dGgnLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2U6ICdodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbScsXHJcbiAgICAgICAgICAgICAgICByZXNwb25zZVR5cGU6ICd0b2tlbicsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL2F1dGgvcGx1cy5tZSdcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG92ZXJyaWRlcyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFkZChleHBvcnRzLkRlZmF1bHRFbmRwb2ludHMuR29vZ2xlLCBjb25maWcpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJlZ2lzdGVyIE1pY3Jvc29mdCBJbXBsaWNpdCBPQXV0aFxyXG4gICAgICAgICAqIFRoZSBkZWZhdWx0IHNjb3BlIGlzIGxpbWl0ZWQgdG8gYmFzaWMgcHJvZmlsZVxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGNsaWVudElkIENsaWVudElEIGZvciB0aGUgTWljcm9zb2Z0IEFwcFxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVmFsaWQgRW5kcG9pbnQgY29uZmlndXJhdGlvbiB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHNcclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGVuZHBvaW50LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEVuZHBvaW50TWFuYWdlci5wcm90b3R5cGUucmVnaXN0ZXJNaWNyb3NvZnRBdXRoID0gZnVuY3Rpb24gKGNsaWVudElkLCBvdmVycmlkZXMpIHtcclxuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICAgICAgY2xpZW50SWQ6IGNsaWVudElkLFxyXG4gICAgICAgICAgICAgICAgYmFzZVVybDogJ2h0dHBzOi8vbG9naW4ubWljcm9zb2Z0b25saW5lLmNvbS9jb21tb24vb2F1dGgyL3YyLjAnLFxyXG4gICAgICAgICAgICAgICAgYXV0aG9yaXplVXJsOiAnL2F1dGhvcml6ZScsXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZTogJ2h0dHBzOi8vZ3JhcGgubWljcm9zb2Z0LmNvbScsXHJcbiAgICAgICAgICAgICAgICByZXNwb25zZVR5cGU6ICdpZF90b2tlbit0b2tlbicsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogJ29wZW5pZCBodHRwczovL2dyYXBoLm1pY3Jvc29mdC5jb20vdXNlci5yZWFkJyxcclxuICAgICAgICAgICAgICAgIGV4dHJhUGFyYW1ldGVyczogJyZyZXNwb25zZV9tb2RlPWZyYWdtZW50JyxcclxuICAgICAgICAgICAgICAgIG5vbmNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhdGU6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG92ZXJyaWRlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkKGV4cG9ydHMuRGVmYXVsdEVuZHBvaW50cy5NaWNyb3NvZnQsIGNvbmZpZyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICA7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVnaXN0ZXIgRmFjZWJvb2sgSW1wbGljaXQgT0F1dGhcclxuICAgICAgICAgKiBUaGUgZGVmYXVsdCBzY29wZSBpcyBsaW1pdGVkIHRvIGJhc2ljIHByb2ZpbGVcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjbGllbnRJZCBDbGllbnRJRCBmb3IgdGhlIEZhY2Vib29rIEFwcFxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVmFsaWQgRW5kcG9pbnQgY29uZmlndXJhdGlvbiB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHNcclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGVuZHBvaW50LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEVuZHBvaW50TWFuYWdlci5wcm90b3R5cGUucmVnaXN0ZXJGYWNlYm9va0F1dGggPSBmdW5jdGlvbiAoY2xpZW50SWQsIG92ZXJyaWRlcykge1xyXG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XHJcbiAgICAgICAgICAgICAgICBjbGllbnRJZDogY2xpZW50SWQsXHJcbiAgICAgICAgICAgICAgICBiYXNlVXJsOiAnaHR0cHM6Ly93d3cuZmFjZWJvb2suY29tJyxcclxuICAgICAgICAgICAgICAgIGF1dGhvcml6ZVVybDogJy9kaWFsb2cvb2F1dGgnLFxyXG4gICAgICAgICAgICAgICAgcmVzb3VyY2U6ICdodHRwczovL2dyYXBoLmZhY2Vib29rLmNvbScsXHJcbiAgICAgICAgICAgICAgICByZXNwb25zZVR5cGU6ICd0b2tlbicsXHJcbiAgICAgICAgICAgICAgICBzY29wZTogJ3B1YmxpY19wcm9maWxlJyxcclxuICAgICAgICAgICAgICAgIG5vbmNlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgc3RhdGU6IHRydWVcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdmFyIGNvbmZpZyA9IGV4dGVuZCh7fSwgZGVmYXVsdHMsIG92ZXJyaWRlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkKGV4cG9ydHMuRGVmYXVsdEVuZHBvaW50cy5GYWNlYm9vaywgY29uZmlnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBIZWxwZXIgdG8gZ2VuZXJhdGUgdGhlIE9BdXRoIGxvZ2luIHVybFxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBWYWxpZCBFbmRwb2ludCBjb25maWd1cmF0aW9uXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBhZGRlZCBlbmRwb2ludC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBFbmRwb2ludE1hbmFnZXIuZ2V0TG9naW5VcmwgPSBmdW5jdGlvbiAoZW5kcG9pbnRDb25maWcpIHtcclxuICAgICAgICAgICAgdmFyIHJhbmQgPSBmdW5jdGlvbiAobGltaXQsIHN0YXJ0KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobGltaXQgPT09IHZvaWQgMCkgeyBsaW1pdCA9IDEwOyB9XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhcnQgPT09IHZvaWQgMCkgeyBzdGFydCA9IDA7IH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBsaW1pdCArIHN0YXJ0KTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgdmFyIG9BdXRoU2NvcGUgPSAoZW5kcG9pbnRDb25maWcuc2NvcGUpID8gZW5jb2RlVVJJQ29tcG9uZW50KGVuZHBvaW50Q29uZmlnLnNjb3BlKSA6ICcnLCBzdGF0ZSA9IGVuZHBvaW50Q29uZmlnLnN0YXRlICYmIHJhbmQoMTAwMDApLCBub25jZSA9IGVuZHBvaW50Q29uZmlnLm5vbmNlICYmIHJhbmQoMTAwMDApO1xyXG4gICAgICAgICAgICB2YXIgdXJsU2VnbWVudHMgPSBbXHJcbiAgICAgICAgICAgICAgICAncmVzcG9uc2VfdHlwZT0nICsgZW5kcG9pbnRDb25maWcucmVzcG9uc2VUeXBlLFxyXG4gICAgICAgICAgICAgICAgJ2NsaWVudF9pZD0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGVuZHBvaW50Q29uZmlnLmNsaWVudElkKSxcclxuICAgICAgICAgICAgICAgICdyZWRpcmVjdF91cmk9JyArIGVuY29kZVVSSUNvbXBvbmVudChlbmRwb2ludENvbmZpZy5yZWRpcmVjdFVybCksXHJcbiAgICAgICAgICAgICAgICAnc2NvcGU9JyArIG9BdXRoU2NvcGVcclxuICAgICAgICAgICAgXTtcclxuICAgICAgICAgICAgaWYgKHN0YXRlKVxyXG4gICAgICAgICAgICAgICAgdXJsU2VnbWVudHMucHVzaCgnc3RhdGU9JyArIHN0YXRlKTtcclxuICAgICAgICAgICAgaWYgKG5vbmNlKVxyXG4gICAgICAgICAgICAgICAgdXJsU2VnbWVudHMucHVzaCgnbm9uY2U9JyArIG5vbmNlKTtcclxuICAgICAgICAgICAgaWYgKGVuZHBvaW50Q29uZmlnKVxyXG4gICAgICAgICAgICAgICAgdXJsU2VnbWVudHMucHVzaChlbmRwb2ludENvbmZpZy5leHRyYVF1ZXJ5UGFyYW1ldGVycyk7XHJcbiAgICAgICAgICAgIHJldHVybiBlbmRwb2ludENvbmZpZy5iYXNlVXJsICsgZW5kcG9pbnRDb25maWcuYXV0aG9yaXplVXJsICsgJz8nICsgdXJsU2VnbWVudHMuam9pbignJicpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIEVuZHBvaW50TWFuYWdlcjtcclxuICAgIH0oaGVscGVyc18xLlN0b3JhZ2UpKTtcclxuICAgIGV4cG9ydHMuRW5kcG9pbnRNYW5hZ2VyID0gRW5kcG9pbnRNYW5hZ2VyO1xyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZW5kcG9pbnQubWFuYWdlci5qcy5tYXAiLCIoZnVuY3Rpb24gKGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIHYgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMpOyBpZiAodiAhPT0gdW5kZWZpbmVkKSBtb2R1bGUuZXhwb3J0cyA9IHY7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoW1wicmVxdWlyZVwiLCBcImV4cG9ydHNcIiwgJy4vYXV0aGVudGljYXRvcicsICcuL2VuZHBvaW50Lm1hbmFnZXInLCAnLi90b2tlbi5tYW5hZ2VyJ10sIGZhY3RvcnkpO1xyXG4gICAgfVxyXG59KShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cykge1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICBmdW5jdGlvbiBfX2V4cG9ydChtKSB7XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBtKSBpZiAoIWV4cG9ydHMuaGFzT3duUHJvcGVydHkocCkpIGV4cG9ydHNbcF0gPSBtW3BdO1xyXG4gICAgfVxyXG4gICAgX19leHBvcnQocmVxdWlyZSgnLi9hdXRoZW50aWNhdG9yJykpO1xyXG4gICAgX19leHBvcnQocmVxdWlyZSgnLi9lbmRwb2ludC5tYW5hZ2VyJykpO1xyXG4gICAgX19leHBvcnQocmVxdWlyZSgnLi90b2tlbi5tYW5hZ2VyJykpO1xyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwidmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xyXG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XHJcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cclxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcclxufTtcclxuKGZ1bmN0aW9uIChmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciB2ID0gZmFjdG9yeShyZXF1aXJlLCBleHBvcnRzKTsgaWYgKHYgIT09IHVuZGVmaW5lZCkgbW9kdWxlLmV4cG9ydHMgPSB2O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKFtcInJlcXVpcmVcIiwgXCJleHBvcnRzXCIsICcuLi9oZWxwZXJzJ10sIGZhY3RvcnkpO1xyXG4gICAgfVxyXG59KShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cykge1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICB2YXIgaGVscGVyc18xID0gcmVxdWlyZSgnLi4vaGVscGVycycpO1xyXG4gICAgLyoqXHJcbiAgICAgKiBIZWxwZXIgZm9yIGNhY2hpbmcgYW5kIG1hbmFnaW5nIE9BdXRoIFRva2Vucy5cclxuICAgICAqL1xyXG4gICAgdmFyIFRva2VuTWFuYWdlciA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XHJcbiAgICAgICAgX19leHRlbmRzKFRva2VuTWFuYWdlciwgX3N1cGVyKTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAgICAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIFRva2VuTWFuYWdlcigpIHtcclxuICAgICAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgJ09BdXRoMlRva2VucycsIGhlbHBlcnNfMS5TdG9yYWdlVHlwZS5Mb2NhbFN0b3JhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDb21wdXRlIHRoZSBleHBpcmF0aW9uIGRhdGUgYmFzZWQgb24gdGhlIGV4cGlyZXNfaW4gZmllbGQgaW4gYSBPQXV0aCB0b2tlbi5cclxuICAgICAgICAgKi9cclxuICAgICAgICBUb2tlbk1hbmFnZXIucHJvdG90eXBlLnNldEV4cGlyeSA9IGZ1bmN0aW9uICh0b2tlbikge1xyXG4gICAgICAgICAgICB2YXIgZXhwaXJlID0gZnVuY3Rpb24gKHNlY29uZHMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChzZWNvbmRzID09PSB2b2lkIDApIHsgc2Vjb25kcyA9IDM2MDA7IH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgRGF0ZShuZXcgRGF0ZSgpLmdldFRpbWUoKSArIH5+c2Vjb25kcyAqIDEwMDApO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAodG9rZW4gPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICBpZiAodG9rZW4uZXhwaXJlc19hdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0b2tlbi5leHBpcmVzX2F0ID0gZXhwaXJlKHRva2VuLmV4cGlyZXNfaW4pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFeHRlbmRzIFN0b3JhZ2UncyBkZWZhdWx0IGFkZCBtZXRob2RcclxuICAgICAgICAgKiBBZGRzIGEgbmV3IE9BdXRoIFRva2VuIGFmdGVyIHNldHRpbmdzIGl0cyBleHBpcnlcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciBVbmlxdWUgbmFtZSBvZiB0aGUgY29ycmVzcG9uZGluZyBPQXV0aCBFbmRwb2ludC5cclxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIHZhbGlkIFRva2VuXHJcbiAgICAgICAgICogQHNlZSB7QGxpbmsgSUVuZHBvaW50fS5cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGVuZHBvaW50LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIFRva2VuTWFuYWdlci5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKHByb3ZpZGVyLCB2YWx1ZSkge1xyXG4gICAgICAgICAgICB2YWx1ZS5wcm92aWRlciA9IHByb3ZpZGVyO1xyXG4gICAgICAgICAgICB0aGlzLnNldEV4cGlyeSh2YWx1ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBfc3VwZXIucHJvdG90eXBlLmFkZC5jYWxsKHRoaXMsIHByb3ZpZGVyLCB2YWx1ZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFeHRyYWN0IHRoZSB0b2tlbiBmcm9tIHRoZSBVUkxcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIHVybCB0byBleHRyYWN0IHRoZSB0b2tlbiBmcm9tLlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleGNsdWRlIEV4Y2x1ZGUgYSBwYXJ0aWNsYXVyIHN0cmluZyBmcm9tIHRoZSB1cmwsIHN1Y2ggYXMgYSBxdWVyeSBwYXJhbSBvciBzcGVjaWZpYyBzdWJzdHJpbmcuXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGRlbGltaXRlcltvcHRpb25hbF0gRGVsaW1pdGVyIHVzZWQgYnkgT0F1dGggcHJvdmlkZXIgdG8gbWFyayB0aGUgYmVnaW5uaW5nIG9mIHRva2VuIHJlc3BvbnNlLiBEZWZhdWx0cyB0byAjLlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgZXh0cmFjdGVkIHRva2VuLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIFRva2VuTWFuYWdlci5nZXRUb2tlbiA9IGZ1bmN0aW9uICh1cmwsIGV4Y2x1ZGUsIGRlbGltaXRlcikge1xyXG4gICAgICAgICAgICBpZiAoZGVsaW1pdGVyID09PSB2b2lkIDApIHsgZGVsaW1pdGVyID0gJyMnOyB9XHJcbiAgICAgICAgICAgIGlmIChleGNsdWRlKVxyXG4gICAgICAgICAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoZXhjbHVkZSwgJycpO1xyXG4gICAgICAgICAgICB2YXIgcGFydHMgPSB1cmwuc3BsaXQoZGVsaW1pdGVyKTtcclxuICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA8PSAwKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB2YXIgcmlnaHRQYXJ0ID0gcGFydHMubGVuZ3RoID49IDIgPyBwYXJ0c1sxXSA6IHBhcnRzWzBdO1xyXG4gICAgICAgICAgICByaWdodFBhcnQgPSByaWdodFBhcnQucmVwbGFjZSgnLycsICcnKTtcclxuICAgICAgICAgICAgaWYgKHJpZ2h0UGFydC5pbmRleE9mKFwiP1wiKSAhPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHZhciBxdWVyeVBhcnQgPSByaWdodFBhcnQuc3BsaXQoXCI/XCIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFxdWVyeVBhcnQgfHwgcXVlcnlQYXJ0Lmxlbmd0aCA8PSAwKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHJpZ2h0UGFydCA9IHF1ZXJ5UGFydFsxXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fZXh0cmFjdFBhcmFtcyhyaWdodFBhcnQpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ2hlY2sgaWYgdGhlIHN1cHBsaWVkIHVybCBoYXMgZWl0aGVyIGFjY2Vzc190b2tlbiBvciBjb2RlIG9yIGVycm9yXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgVG9rZW5NYW5hZ2VyLmlzVG9rZW5VcmwgPSBmdW5jdGlvbiAodXJsKSB7XHJcbiAgICAgICAgICAgIHZhciByZWdleCA9IC8oYWNjZXNzX3Rva2VufGNvZGV8ZXJyb3IpL2dpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVnZXgudGVzdCh1cmwpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgVG9rZW5NYW5hZ2VyLl9leHRyYWN0UGFyYW1zID0gZnVuY3Rpb24gKHNlZ21lbnQpIHtcclxuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9LCByZWdleCA9IC8oW14mPV0rKT0oW14mXSopL2csIG1hdGNoZXM7XHJcbiAgICAgICAgICAgIHdoaWxlICgobWF0Y2hlcyA9IHJlZ2V4LmV4ZWMoc2VnbWVudCkpICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXNbZGVjb2RlVVJJQ29tcG9uZW50KG1hdGNoZXNbMV0pXSA9IGRlY29kZVVSSUNvbXBvbmVudChtYXRjaGVzWzJdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIFRva2VuTWFuYWdlcjtcclxuICAgIH0oaGVscGVyc18xLlN0b3JhZ2UpKTtcclxuICAgIGV4cG9ydHMuVG9rZW5NYW5hZ2VyID0gVG9rZW5NYW5hZ2VyO1xyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dG9rZW4ubWFuYWdlci5qcy5tYXAiLCIoZnVuY3Rpb24gKGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIHYgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMpOyBpZiAodiAhPT0gdW5kZWZpbmVkKSBtb2R1bGUuZXhwb3J0cyA9IHY7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoW1wicmVxdWlyZVwiLCBcImV4cG9ydHNcIl0sIGZhY3RvcnkpO1xyXG4gICAgfVxyXG59KShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cykge1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBmb3IgY3JlYXRpbmcgYW5kIHF1ZXJ5aW5nIERpY3Rpb25hcmllcy5cclxuICAgICAqIEEgcnVkaW1lbnRhcnkgYWx0ZXJuYXRpdmUgdG8gRVM2IE1hcHMuXHJcbiAgICAgKi9cclxuICAgIHZhciBEaWN0aW9uYXJ5ID0gKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gaXRlbXMgSW5pdGlhbCBzZWVkIG9mIGl0ZW1zLlxyXG4gICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gRGljdGlvbmFyeShpdGVtcykge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gaXRlbXM7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1zID0ge307XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEdldHMgYW4gaXRlbSBmcm9tIHRoZSBkaWN0aW9uYXJ5LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBpdGVtLlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyBhbiBpdGVtIGlmIGZvdW5kLCBlbHNlIHJldHVybnMgbnVsbC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RpY3Rpb25hcnkgaXNuXFwndCBpbml0aWFsaXplZC4gQ2FsbCBcXCduZXdcXCcgZmlyc3QuJyk7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWlucyhrZXkpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zW2tleV07XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBZGRzIGFuIGl0ZW0gaW50byB0aGUgZGljdGlvbmFyeS5cclxuICAgICAgICAgKiBJZiB0aGUga2V5IGFscmVhZHkgZXhpc3RzLCB0aGVuIGl0IHdpbGwgdGhyb3cuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGl0ZW0uXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHZhbHVlIFRoZSBpdGVtIHRvIGJlIGFkZGVkLlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgYWRkZWQgaXRlbS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb250YWlucyhrZXkpKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdLZXkgYWxyZWFkeSBleGlzdHMuJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluc2VydChrZXksIHZhbHVlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBHZXRzIHRoZSBmaXJzdCB0aW1lIG9mIHRoZSBkaWN0aW9uYXJ5XHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGZpcnN0IGl0ZW0gaW4gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUuZmlyc3QgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RpY3Rpb25hcnkgaXNuXFwndCBpbml0aWFsaXplZC4gQ2FsbCBcXCduZXdcXCcgZmlyc3QuJyk7XHJcbiAgICAgICAgICAgIHZhciBrZXkgPSB0aGlzLmtleXMoKVswXTtcclxuICAgICAgICAgICAgaWYgKGtleSAhPSBudWxsKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXNba2V5XTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEluc2VydHMgYW4gaXRlbSBpbnRvIHRoZSBkaWN0aW9uYXJ5LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBpdGVtLlxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSB2YWx1ZSBUaGUgaXRlbSB0byBiZSBhZGRlZC5cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGl0ZW0uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUuaW5zZXJ0ID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXMgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGljdGlvbmFyeSBpc25cXCd0IGluaXRpYWxpemVkLiBDYWxsIFxcJ25ld1xcJyBmaXJzdC4nKTtcclxuICAgICAgICAgICAgaWYgKHZhbHVlID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIGV4cGVjdGVkLiBHb3QgJyArIHZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5pdGVtc1trZXldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJlbW92ZXMgYW4gaXRlbSBmcm9tIHRoZSBkaWN0aW9uYXJ5LlxyXG4gICAgICAgICAqIElmIHRoZSBrZXkgZG9lc250IGV4aXN0LCB0aGVuIGl0IHdpbGwgdGhyb3cuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGl0ZW0uXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBkZWxldGVkIGl0ZW0uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29udGFpbnMoa2V5KSlcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignS2V5IG5vdCBmb3VuZC4nKTtcclxuICAgICAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5pdGVtc1trZXldO1xyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5pdGVtc1trZXldO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnNlcnQoa2V5LCB2YWx1ZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICA7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ2xlYXJzIHRoZSBkaWN0aW9uYXJ5LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIERpY3Rpb25hcnkucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zID0ge307XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDaGVjayBpZiB0aGUgZGljdGlvbmFyeSBjb250YWlucyB0aGUgZ2l2ZW4ga2V5LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBpdGVtLlxyXG4gICAgICAgICAqIEByZXR1cm4ge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiB0aGUga2V5IHdhcyBmb3VuZC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgaWYgKGtleSA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdLZXkgY2Fubm90IGJlIG51bGwgb3IgdW5kZWZpbmVkJyk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RpY3Rpb25hcnkgaXNuXFwndCBpbml0aWFsaXplZC4gQ2FsbCBcXCduZXdcXCcgZmlyc3QuJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zLmhhc093blByb3BlcnR5KGtleSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBMaXN0cyBhbGwgdGhlIGtleXMgaW4gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcmV0dXJuIHthcnJheX0gUmV0dXJucyBhbGwgdGhlIGtleXMuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUua2V5cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGljdGlvbmFyeSBpc25cXCd0IGluaXRpYWxpemVkLiBDYWxsIFxcJ25ld1xcJyBmaXJzdC4nKTtcclxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuaXRlbXMpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogTGlzdHMgYWxsIHRoZSB2YWx1ZXMgaW4gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcmV0dXJuIHthcnJheX0gUmV0dXJucyBhbGwgdGhlIHZhbHVlcy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS52YWx1ZXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RpY3Rpb25hcnkgaXNuXFwndCBpbml0aWFsaXplZC4gQ2FsbCBcXCduZXdcXCcgZmlyc3QuJyk7XHJcbiAgICAgICAgICAgIHJldHVybiBPYmplY3QudmFsdWVzKHRoaXMuaXRlbXMpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogR2V0IHRoZSBkaWN0aW9uYXJ5LlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBkaWN0aW9uYXJ5IGlmIGl0IGNvbnRhaW5zIGRhdGEgZWxzZSBudWxsLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIERpY3Rpb25hcnkucHJvdG90eXBlLmxvb2t1cCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMua2V5cygpLmxlbmd0aCA/IHRoaXMuaXRlbXMgOiBudWxsO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KERpY3Rpb25hcnkucHJvdG90eXBlLCBcImNvdW50XCIsIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIE51bWJlciBvZiBpdGVtcyBpbiB0aGUgZGljdGlvbmFyeS5cclxuICAgICAgICAgICAgICpcclxuICAgICAgICAgICAgICogQHJldHVybiB7bnVtYmVyfSBSZXR1cm5zIHRoZSBudW1iZXIgb2YgaXRlbXMgaW4gdGhlIGRpY3Rpb25hcnlcclxuICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVzKCkubGVuZ3RoO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgICAgICA7XHJcbiAgICAgICAgcmV0dXJuIERpY3Rpb25hcnk7XHJcbiAgICB9KCkpO1xyXG4gICAgZXhwb3J0cy5EaWN0aW9uYXJ5ID0gRGljdGlvbmFyeTtcclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRpY3Rpb25hcnkuanMubWFwIiwiKGZ1bmN0aW9uIChmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciB2ID0gZmFjdG9yeShyZXF1aXJlLCBleHBvcnRzKTsgaWYgKHYgIT09IHVuZGVmaW5lZCkgbW9kdWxlLmV4cG9ydHMgPSB2O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKFtcInJlcXVpcmVcIiwgXCJleHBvcnRzXCIsICcuL2RpY3Rpb25hcnknLCAnLi9zdG9yYWdlJ10sIGZhY3RvcnkpO1xyXG4gICAgfVxyXG59KShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cykge1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICBmdW5jdGlvbiBfX2V4cG9ydChtKSB7XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBtKSBpZiAoIWV4cG9ydHMuaGFzT3duUHJvcGVydHkocCkpIGV4cG9ydHNbcF0gPSBtW3BdO1xyXG4gICAgfVxyXG4gICAgX19leHBvcnQocmVxdWlyZSgnLi9kaWN0aW9uYXJ5JykpO1xyXG4gICAgX19leHBvcnQocmVxdWlyZSgnLi9zdG9yYWdlJykpO1xyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwidmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xyXG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XHJcbiAgICBmdW5jdGlvbiBfXygpIHsgdGhpcy5jb25zdHJ1Y3RvciA9IGQ7IH1cclxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcclxufTtcclxuKGZ1bmN0aW9uIChmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciB2ID0gZmFjdG9yeShyZXF1aXJlLCBleHBvcnRzKTsgaWYgKHYgIT09IHVuZGVmaW5lZCkgbW9kdWxlLmV4cG9ydHMgPSB2O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKFtcInJlcXVpcmVcIiwgXCJleHBvcnRzXCIsICcuL2RpY3Rpb25hcnknXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIHZhciBkaWN0aW9uYXJ5XzEgPSByZXF1aXJlKCcuL2RpY3Rpb25hcnknKTtcclxuICAgIChmdW5jdGlvbiAoU3RvcmFnZVR5cGUpIHtcclxuICAgICAgICBTdG9yYWdlVHlwZVtTdG9yYWdlVHlwZVtcIkxvY2FsU3RvcmFnZVwiXSA9IDBdID0gXCJMb2NhbFN0b3JhZ2VcIjtcclxuICAgICAgICBTdG9yYWdlVHlwZVtTdG9yYWdlVHlwZVtcIlNlc3Npb25TdG9yYWdlXCJdID0gMV0gPSBcIlNlc3Npb25TdG9yYWdlXCI7XHJcbiAgICB9KShleHBvcnRzLlN0b3JhZ2VUeXBlIHx8IChleHBvcnRzLlN0b3JhZ2VUeXBlID0ge30pKTtcclxuICAgIHZhciBTdG9yYWdlVHlwZSA9IGV4cG9ydHMuU3RvcmFnZVR5cGU7XHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBmb3IgY3JlYXRpbmcgYW5kIHF1ZXJ5aW5nIExvY2FsIFN0b3JhZ2Ugb3IgU2Vzc2lvbiBTdG9yYWdlLlxyXG4gICAgICogQHNlZSBVc2VzIHtAbGluayBEaWN0aW9uYXJ5fSB0byBjcmVhdGUgYW4gaW4tbWVtb3J5IGNvcHkgb2ZcclxuICAgICAqIHRoZSBzdG9yYWdlIGZvciBmYXN0ZXIgcmVhZHMuIFdyaXRlcyB1cGRhdGUgdGhlIGFjdHVhbCBzdG9yYWdlLlxyXG4gICAgICovXHJcbiAgICB2YXIgU3RvcmFnZSA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XHJcbiAgICAgICAgX19leHRlbmRzKFN0b3JhZ2UsIF9zdXBlcik7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGNvbnRhaW5lciBDb250YWluZXIgbmFtZSB0byBiZSBjcmVhdGVkIGluIHRoZSBMb2NhbFN0b3JhZ2UuXHJcbiAgICAgICAgICogQHBhcmFtIHtTdG9yYWdlVHlwZX0gdHlwZVtvcHRpb25hbF0gU3RvcmFnZSBUeXBlIHRvIGJlIHVzZWQsIGRlZmF1bHRzIHRvIExvY2FsIFN0b3JhZ2UuXHJcbiAgICAgICAgKi9cclxuICAgICAgICBmdW5jdGlvbiBTdG9yYWdlKF9jb250YWluZXIsIHR5cGUpIHtcclxuICAgICAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuX2NvbnRhaW5lciA9IF9jb250YWluZXI7XHJcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UgPSBudWxsO1xyXG4gICAgICAgICAgICB0eXBlID0gdHlwZSB8fCBTdG9yYWdlVHlwZS5Mb2NhbFN0b3JhZ2U7XHJcbiAgICAgICAgICAgIHRoaXMuc3dpdGNoU3RvcmFnZSh0eXBlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU3dpdGNoIHRoZSBzdG9yYWdlIHR5cGVcclxuICAgICAgICAgKiBTd2l0Y2hlcyB0aGUgc3RvcmFnZSB0eXBlIGFuZCB0aGVuIHJlbG9hZHMgdGhlIGluLW1lbW9yeSBjb2xsZWN0aW9uXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAdHlwZSB7U3RvcmFnZVR5cGV9IHR5cGUgVGhlIGRlc2lyZWQgc3RvcmFnZSB0byBiZSB1c2VkXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgU3RvcmFnZS5wcm90b3R5cGUuc3dpdGNoU3RvcmFnZSA9IGZ1bmN0aW9uICh0eXBlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2UgPSB0eXBlID09PSBTdG9yYWdlVHlwZS5Mb2NhbFN0b3JhZ2UgPyBsb2NhbFN0b3JhZ2UgOiBzZXNzaW9uU3RvcmFnZTtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLl9zdG9yYWdlLmhhc093blByb3BlcnR5KHRoaXMuX2NvbnRhaW5lcikpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuX3N0b3JhZ2VbdGhpcy5fY29udGFpbmVyXSA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5fbG9hZCgpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWRkIGFuIGl0ZW1cclxuICAgICAgICAgKiBFeHRlbmRzIERpY3Rpb25hcnkncyBpbXBsZW1lbnRhdGlvbiB3aXRoIGEgc2F2ZSB0byB0aGUgc3RvcmFnZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIFN0b3JhZ2UucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChpdGVtLCB2YWx1ZSkge1xyXG4gICAgICAgICAgICBfc3VwZXIucHJvdG90eXBlLmluc2VydC5jYWxsKHRoaXMsIGl0ZW0sIHZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5fc2F2ZSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZW1vdmUgYW4gaXRlbVxyXG4gICAgICAgICAqIEV4dGVuZHMgRGljdGlvbmFyeSdzIGltcGxlbWVudGF0aW9uIHdpdGggYSBzYXZlIHRvIHRoZSBzdG9yYWdlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgU3RvcmFnZS5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgICAgICAgdmFyIHZhbHVlID0gX3N1cGVyLnByb3RvdHlwZS5yZW1vdmUuY2FsbCh0aGlzLCBpdGVtKTtcclxuICAgICAgICAgICAgdGhpcy5fc2F2ZSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDbGVhciB0aGUgc3RvcmFnZVxyXG4gICAgICAgICAqIEV4dGVuZHMgRGljdGlvbmFyeSdzIGltcGxlbWVudGF0aW9uIHdpdGggYSBzYXZlIHRvIHRoZSBzdG9yYWdlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgU3RvcmFnZS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIF9zdXBlci5wcm90b3R5cGUuY2xlYXIuY2FsbCh0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVt0aGlzLl9jb250YWluZXJdID0gbnVsbDtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENsZWFyIGFsbCBzdG9yYWdlc1xyXG4gICAgICAgICAqIGNvbXBsZXRlbHkgY2xlYXJzIGFsbCBzdG9yYWdlc1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIFN0b3JhZ2UuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UuY2xlYXIoKTtcclxuICAgICAgICAgICAgd2luZG93LnNlc3Npb25TdG9yYWdlLmNsZWFyKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBTdG9yYWdlLnByb3RvdHlwZS5fc2F2ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVt0aGlzLl9jb250YWluZXJdID0gSlNPTi5zdHJpbmdpZnkodGhpcy5pdGVtcyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBTdG9yYWdlLnByb3RvdHlwZS5fbG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5jbGVhci5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gSlNPTi5wYXJzZSh0aGlzLl9zdG9yYWdlW3RoaXMuX2NvbnRhaW5lcl0pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtcyA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtcyA9IHt9O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcztcclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBTdG9yYWdlO1xyXG4gICAgfShkaWN0aW9uYXJ5XzEuRGljdGlvbmFyeSkpO1xyXG4gICAgZXhwb3J0cy5TdG9yYWdlID0gU3RvcmFnZTtcclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXN0b3JhZ2UuanMubWFwIiwiKGZ1bmN0aW9uIChmYWN0b3J5KSB7XHJcbiAgICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHZhciB2ID0gZmFjdG9yeShyZXF1aXJlLCBleHBvcnRzKTsgaWYgKHYgIT09IHVuZGVmaW5lZCkgbW9kdWxlLmV4cG9ydHMgPSB2O1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKFtcInJlcXVpcmVcIiwgXCJleHBvcnRzXCIsICcuL2hlbHBlcnMnLCAnLi9hdXRoZW50aWNhdGlvbiddLCBmYWN0b3J5KTtcclxuICAgIH1cclxufSkoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMpIHtcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgZnVuY3Rpb24gX19leHBvcnQobSkge1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKCFleHBvcnRzLmhhc093blByb3BlcnR5KHApKSBleHBvcnRzW3BdID0gbVtwXTtcclxuICAgIH1cclxuICAgIF9fZXhwb3J0KHJlcXVpcmUoJy4vaGVscGVycycpKTtcclxuICAgIF9fZXhwb3J0KHJlcXVpcmUoJy4vYXV0aGVudGljYXRpb24nKSk7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiXX0=
return require('office-js-helpers');
});