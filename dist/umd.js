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
        Object.defineProperty(Authenticator, "isDialog", {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2F1dGhlbnRpY2F0aW9uL2F1dGhlbnRpY2F0b3IuanMiLCJkaXN0L2F1dGhlbnRpY2F0aW9uL2VuZHBvaW50Lm1hbmFnZXIuanMiLCJkaXN0L2F1dGhlbnRpY2F0aW9uL2luZGV4LmpzIiwiZGlzdC9hdXRoZW50aWNhdGlvbi90b2tlbi5tYW5hZ2VyLmpzIiwiZGlzdC9oZWxwZXJzL2RpY3Rpb25hcnkuanMiLCJkaXN0L2hlbHBlcnMvaW5kZXguanMiLCJkaXN0L2hlbHBlcnMvc3RvcmFnZS5qcyIsImRpc3QvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgdiA9IGZhY3RvcnkocmVxdWlyZSwgZXhwb3J0cyk7IGlmICh2ICE9PSB1bmRlZmluZWQpIG1vZHVsZS5leHBvcnRzID0gdjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiZXhwb3J0c1wiLCAnLi4vYXV0aGVudGljYXRpb24nXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIHZhciBhdXRoZW50aWNhdGlvbl8xID0gcmVxdWlyZSgnLi4vYXV0aGVudGljYXRpb24nKTtcclxuICAgIC8qKlxyXG4gICAgICogRW51bWVyYXRpb24gZm9yIHRoZSBzdXBwb3J0ZWQgbW9kZXMgb2YgQXV0aGVudGljYXRpb24uXHJcbiAgICAgKiBFaXRoZXIgZGlhbG9nIG9yIHJlZGlyZWN0aW9uLlxyXG4gICAgICovXHJcbiAgICAoZnVuY3Rpb24gKEF1dGhlbnRpY2F0aW9uTW9kZSkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIE9wZW5zIGEgdGhlIGF1dGhvcml6ZSB1cmwgaW5zaWRlIG9mIGEgZGlhbG9nLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEF1dGhlbnRpY2F0aW9uTW9kZVtBdXRoZW50aWNhdGlvbk1vZGVbXCJEaWFsb2dcIl0gPSAwXSA9IFwiRGlhbG9nXCI7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVkaXJlY3RzIHRoZSBjdXJyZW50IHdpbmRvdyB0byB0aGUgYXV0aG9yaXplIHVybC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBBdXRoZW50aWNhdGlvbk1vZGVbQXV0aGVudGljYXRpb25Nb2RlW1wiUmVkaXJlY3RcIl0gPSAxXSA9IFwiUmVkaXJlY3RcIjtcclxuICAgIH0pKGV4cG9ydHMuQXV0aGVudGljYXRpb25Nb2RlIHx8IChleHBvcnRzLkF1dGhlbnRpY2F0aW9uTW9kZSA9IHt9KSk7XHJcbiAgICB2YXIgQXV0aGVudGljYXRpb25Nb2RlID0gZXhwb3J0cy5BdXRoZW50aWNhdGlvbk1vZGU7XHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBmb3IgcGVyZm9ybWluZyBJbXBsaWNpdCBPQXV0aCBBdXRoZW50aWNhdGlvbiB3aXRoIHJlZ2lzdGVyZWQgZW5kcG9pbnRzLlxyXG4gICAgICovXHJcbiAgICB2YXIgQXV0aGVudGljYXRvciA9IChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0gZW5kcG9pbnRNYW5hZ2VyIERlcGVuZHMgb24gYW4gaW5zdGFuY2Ugb2YgRW5kcG9pbnRNYW5hZ2VyXHJcbiAgICAgICAgICogQHBhcmFtIFRva2VuTWFuYWdlciBEZXBlbmRzIG9uIGFuIGluc3RhbmNlIG9mIFRva2VuTWFuYWdlclxyXG4gICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gQXV0aGVudGljYXRvcihfZW5kcG9pbnRNYW5hZ2VyLCBfdG9rZW5NYW5hZ2VyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuX2VuZHBvaW50TWFuYWdlciA9IF9lbmRwb2ludE1hbmFnZXI7XHJcbiAgICAgICAgICAgIHRoaXMuX3Rva2VuTWFuYWdlciA9IF90b2tlbk1hbmFnZXI7XHJcbiAgICAgICAgICAgIGlmIChfZW5kcG9pbnRNYW5hZ2VyID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyAnUGxlYXNlIHBhc3MgYW4gaW5zdGFuY2Ugb2YgRW5kcG9pbnRNYW5hZ2VyLic7XHJcbiAgICAgICAgICAgIGlmIChfdG9rZW5NYW5hZ2VyID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyAnUGxlYXNlIHBhc3MgYW4gaW5zdGFuY2Ugb2YgVG9rZW5NYW5hZ2VyLic7XHJcbiAgICAgICAgICAgIGlmIChfZW5kcG9pbnRNYW5hZ2VyLmNvdW50ID09IDApXHJcbiAgICAgICAgICAgICAgICB0aHJvdyAnTm8gcmVnaXN0ZXJlZCBFbmRwb2ludHMgY291bGQgYmUgZm91bmQuIEVpdGhlciB1c2UgdGhlIGRlZmF1bHQgZW5kcG9pbnQgcmVnaXN0cmF0aW9ucyBvciBhZGQgb25lIG1hbnVhbGx5JztcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQXV0aGVudGljYXRlIGJhc2VkIG9uIHRoZSBnaXZlbiBwcm92aWRlclxyXG4gICAgICAgICAqIEVpdGhlciB1c2VzIERpYWxvZ0FQSSBvciBXaW5kb3cgUG9wdXBzIGJhc2VkIG9uIHdoZXJlIGl0cyBiZWluZyBjYWxsZWQgZnJvbVxyXG4gICAgICAgICAqIHZpei4gQWRkLWluIG9yIFdlYi5cclxuICAgICAgICAgKiBJZiB0aGUgdG9rZW4gd2FzIGNhY2hlZCwgdGhlIGl0IHJldHJpZXZlcyB0aGUgY2FjaGVkIHRva2VuLlxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogV0FSTklORzogeW91IGhhdmUgdG8gbWFudWFsbHkgY2hlY2sgdGhlIGV4cGlyZXNfaW4gb3IgZXhwaXJlc19hdCBwcm9wZXJ0eSB0byBkZXRlcm1pbmVcclxuICAgICAgICAgKiBpZiB0aGUgdG9rZW4gaGFzIGV4cGlyZWQuIE5vdCBhbGwgT0F1dGggcHJvdmlkZXJzIHN1cHBvcnQgcmVmcmVzaCB0b2tlbiBmbG93cy5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm92aWRlciBMaW5rIHRvIHRoZSBwcm92aWRlci5cclxuICAgICAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGZvcmNlIEZvcmNlIHJlLWF1dGhlbnRpY2F0aW9uLlxyXG4gICAgICAgICAqIEByZXR1cm4ge1Byb21pc2U8SVRva2VuPn0gUmV0dXJucyBhIHByb21pc2Ugb2YgdGhlIHRva2VuLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLmF1dGhlbnRpY2F0ZSA9IGZ1bmN0aW9uIChwcm92aWRlciwgZm9yY2UpIHtcclxuICAgICAgICAgICAgaWYgKGZvcmNlID09PSB2b2lkIDApIHsgZm9yY2UgPSBmYWxzZTsgfVxyXG4gICAgICAgICAgICB2YXIgdG9rZW4gPSB0aGlzLl90b2tlbk1hbmFnZXIuZ2V0KHByb3ZpZGVyKTtcclxuICAgICAgICAgICAgaWYgKHRva2VuICE9IG51bGwgJiYgIWZvcmNlKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh0b2tlbik7XHJcbiAgICAgICAgICAgIHZhciBlbmRwb2ludCA9IHRoaXMuX2VuZHBvaW50TWFuYWdlci5nZXQocHJvdmlkZXIpO1xyXG4gICAgICAgICAgICBpZiAoQXV0aGVudGljYXRvci5tb2RlID09IEF1dGhlbnRpY2F0aW9uTW9kZS5SZWRpcmVjdCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHVybCA9IGF1dGhlbnRpY2F0aW9uXzEuRW5kcG9pbnRNYW5hZ2VyLmdldExvZ2luVXJsKGVuZHBvaW50KTtcclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uLnJlcGxhY2UodXJsKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdCgnQVVUSF9SRURJUkVDVCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIGF1dGg7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXV0aGVudGljYXRvci5pc0FkZGluKVxyXG4gICAgICAgICAgICAgICAgICAgIGF1dGggPSB0aGlzLl9vcGVuSW5EaWFsb2coZW5kcG9pbnQpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGF1dGggPSB0aGlzLl9vcGVuSW5XaW5kb3dQb3B1cChlbmRwb2ludCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXV0aC5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHsgcmV0dXJuIGNvbnNvbGUuZXJyb3IoZXJyb3IpOyB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgQXV0aGVudGljYXRvci5wcm90b3R5cGUuZXhjaGFuZ2VDb2RlRm9yVG9rZW4gPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBoZWFkZXJzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XHJcbiAgICAgICAgICAgICAgICB4aHIub3BlbignUE9TVCcsIHVybCk7XHJcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcignQWNjZXB0JywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaGVhZGVyIGluIGhlYWRlcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaGVhZGVyID09PSAnQWNjZXB0JyB8fCBoZWFkZXIgPT09ICdDb250ZW50LVR5cGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIsIGhlYWRlcnNbaGVhZGVyXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB4aHIub25sb2FkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBqc29uID0gSlNPTi5wYXJzZSh4aHIucmVzcG9uc2VUZXh0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnYWNjZXNzX3Rva2VuJyBpbiBqc29uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChqc29uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh4aHIuc3RhdHVzICE9PSAyMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCh7IGVycm9yOiAnUmVxdWVzdCBmYWlsZWQuICcgKyB4aHIucmVzcG9uc2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHsgZXJyb3I6IGUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHhoci5zZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXV0aGVudGljYXRvciwgXCJpc0RpYWxvZ1wiLCB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBDaGVjayBpZiB0aGUgY3VycnJlbnQgdXJsIGlzIHJ1bm5pbmcgaW5zaWRlIG9mIGEgRGlhbG9nIHRoYXQgY29udGFpbnMgYW4gYWNjZXNzX3Rva2VuIG9yIGNvZGUgb3IgZXJyb3IuXHJcbiAgICAgICAgICAgICAqIElmIHRydWUgdGhlbiBpdCBjYWxscyBtZXNzYWdlUGFyZW50IGJ5IGV4dHJhY3RpbmcgdGhlIHRva2VuIGluZm9ybWF0aW9uLlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtib29sZWFufVxyXG4gICAgICAgICAgICAgKiBSZXR1cm5zIGZhbHNlIGlmIHRoZSBjb2RlIGlzIHJ1bm5pbmcgaW5zaWRlIG9mIGEgZGlhbG9nIHdpdGhvdXQgdGhlIHJlcXVyaWVkIGluZm9ybWF0aW9uXHJcbiAgICAgICAgICAgICAqIG9yIGlzIG5vdCBydW5uaW5nIGluc2lkZSBvZiBhIGRpYWxvZyBhdCBhbGwuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICghQXV0aGVudGljYXRvci5pc0FkZGluKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghYXV0aGVudGljYXRpb25fMS5Ub2tlbk1hbmFnZXIuaXNUb2tlblVybChsb2NhdGlvbi5ocmVmKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciB0b2tlbiA9IGF1dGhlbnRpY2F0aW9uXzEuVG9rZW5NYW5hZ2VyLmdldFRva2VuKGxvY2F0aW9uLmhyZWYsIGxvY2F0aW9uLm9yaWdpbik7XHJcbiAgICAgICAgICAgICAgICAgICAgT2ZmaWNlLmNvbnRleHQudWkubWVzc2FnZVBhcmVudChKU09OLnN0cmluZ2lmeSh0b2tlbikpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXV0aGVudGljYXRvciwgXCJpc0FkZGluXCIsIHtcclxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoQXV0aGVudGljYXRvci5faXNBZGRpbiA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgQXV0aGVudGljYXRvci5faXNBZGRpbiA9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5oYXNPd25Qcm9wZXJ0eSgnT2ZmaWNlJykgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICh3aW5kb3cuaGFzT3duUHJvcGVydHkoJ1dvcmQnKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5oYXNPd25Qcm9wZXJ0eSgnRXhjZWwnKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5oYXNPd25Qcm9wZXJ0eSgnT25lTm90ZScpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoZW50aWNhdG9yLl9pc0FkZGluO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgQXV0aGVudGljYXRvci5faXNBZGRpbiA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWVcclxuICAgICAgICB9KTtcclxuICAgICAgICBBdXRoZW50aWNhdG9yLnByb3RvdHlwZS5fb3BlbkluV2luZG93UG9wdXAgPSBmdW5jdGlvbiAoZW5kcG9pbnQpIHtcclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAgICAgdmFyIHVybCA9IGF1dGhlbnRpY2F0aW9uXzEuRW5kcG9pbnRNYW5hZ2VyLmdldExvZ2luVXJsKGVuZHBvaW50KTtcclxuICAgICAgICAgICAgdmFyIHdpbmRvd1NpemUgPSBlbmRwb2ludC53aW5kb3dTaXplIHx8IFwid2lkdGg9NDAwLGhlaWdodD02MDBcIjtcclxuICAgICAgICAgICAgdmFyIHdpbmRvd0ZlYXR1cmVzID0gd2luZG93U2l6ZSArIFwiLG1lbnViYXI9bm8sdG9vbGJhcj1ubyxsb2NhdGlvbj1ubyxyZXNpemFibGU9bm8sc2Nyb2xsYmFycz15ZXMsc3RhdHVzPW5vXCI7XHJcbiAgICAgICAgICAgIHZhciBwb3B1cFdpbmRvdyA9IHdpbmRvdy5vcGVuKHVybCwgZW5kcG9pbnQucHJvdmlkZXIudG9VcHBlckNhc2UoKSwgd2luZG93RmVhdHVyZXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaW50ZXJ2YWxfMSA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwb3B1cFdpbmRvdy5kb2N1bWVudC5VUkwuaW5kZXhPZihlbmRwb2ludC5yZWRpcmVjdFVybCkgIT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbF8xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gYXV0aGVudGljYXRpb25fMS5Ub2tlbk1hbmFnZXIuZ2V0VG9rZW4ocG9wdXBXaW5kb3cuZG9jdW1lbnQuVVJMLCBlbmRwb2ludC5yZWRpcmVjdFVybCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdCA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoJ05vIGFjY2Vzc190b2tlbiBvciBjb2RlIGNvdWxkIGJlIHBhcnNlZC4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgnY29kZScgaW4gcmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcHVwV2luZG93LmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmRwb2ludC50b2tlblVybCAhPSAnJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShfdGhpcy5leGNoYW5nZUNvZGVGb3JUb2tlbihlbmRwb2ludC50b2tlblVybCwgcmVzdWx0LmNvZGUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKCdhY2Nlc3NfdG9rZW4nIGluIHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fdG9rZW5NYW5hZ2VyLmFkZChlbmRwb2ludC5wcm92aWRlciwgcmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9wdXBXaW5kb3cuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShyZXN1bHQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghcG9wdXBXaW5kb3cpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsXzEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgNDAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChleGNlcHRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICBwb3B1cFdpbmRvdy5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChleGNlcHRpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIEF1dGhlbnRpY2F0b3IucHJvdG90eXBlLl9vcGVuSW5EaWFsb2cgPSBmdW5jdGlvbiAoZW5kcG9pbnQpIHtcclxuICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAgICAgdmFyIHVybCA9IGF1dGhlbnRpY2F0aW9uXzEuRW5kcG9pbnRNYW5hZ2VyLmdldExvZ2luVXJsKGVuZHBvaW50KTtcclxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IDM1LFxyXG4gICAgICAgICAgICAgICAgd2lkdGg6IDM1LFxyXG4gICAgICAgICAgICAgICAgcmVxdWlyZUhUVFBTOiB0cnVlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBPZmZpY2UuY29udGV4dC51aS5kaXNwbGF5RGlhbG9nQXN5bmModXJsLCBvcHRpb25zLCBmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRpYWxvZyA9IHJlc3VsdC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBkaWFsb2cuYWRkRXZlbnRIYW5kbGVyKE9mZmljZS5FdmVudFR5cGUuRGlhbG9nTWVzc2FnZVJlY2VpdmVkLCBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaWFsb2cuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLm1lc3NhZ2UgPT0gbnVsbCB8fCBhcmdzLm1lc3NhZ2UgPT09ICcnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdCgnTm8gYWNjZXNzX3Rva2VuIG9yIGNvZGUgY291bGQgYmUgcGFyc2VkLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGpzb24gPSBKU09OLnBhcnNlKGFyZ3MubWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoJ2NvZGUnIGluIGpzb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5kcG9pbnQudG9rZW5VcmwgIT0gJycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShfdGhpcy5leGNoYW5nZUNvZGVGb3JUb2tlbihlbmRwb2ludC50b2tlblVybCwganNvbi5jb2RlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoanNvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICgnYWNjZXNzX3Rva2VuJyBpbiBqc29uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX3Rva2VuTWFuYWdlci5hZGQoZW5kcG9pbnQucHJvdmlkZXIsIGpzb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoanNvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoanNvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgY2F0Y2ggKGV4Y2VwdGlvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGV4Y2VwdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbnRyb2xzIHRoZSB3YXkgdGhlIGF1dGhlbnRpY2F0aW9uIHNob3VsZCB0YWtlIHBsYWNlLlxyXG4gICAgICAgICAqIEVpdGhlciBieSB1c2luZyBkaWFsb2cgb3IgYnkgcmVkaXJlY3RpbmcgdGhlIGN1cnJlbnQgd2luZG93LlxyXG4gICAgICAgICAqIERlZmF1bHRzIHRvIHRoZSBkaWFsb2cgZmxvdy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBBdXRoZW50aWNhdG9yLm1vZGUgPSBBdXRoZW50aWNhdGlvbk1vZGUuRGlhbG9nO1xyXG4gICAgICAgIHJldHVybiBBdXRoZW50aWNhdG9yO1xyXG4gICAgfSgpKTtcclxuICAgIGV4cG9ydHMuQXV0aGVudGljYXRvciA9IEF1dGhlbnRpY2F0b3I7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hdXRoZW50aWNhdG9yLmpzLm1hcCIsInZhciBfX2V4dGVuZHMgPSAodGhpcyAmJiB0aGlzLl9fZXh0ZW5kcykgfHwgZnVuY3Rpb24gKGQsIGIpIHtcclxuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBkLnByb3RvdHlwZSA9IGIgPT09IG51bGwgPyBPYmplY3QuY3JlYXRlKGIpIDogKF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlLCBuZXcgX18oKSk7XHJcbn07XHJcbihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgdiA9IGZhY3RvcnkocmVxdWlyZSwgZXhwb3J0cyk7IGlmICh2ICE9PSB1bmRlZmluZWQpIG1vZHVsZS5leHBvcnRzID0gdjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiZXhwb3J0c1wiLCAnLi4vaGVscGVycyddLCBmYWN0b3J5KTtcclxuICAgIH1cclxufSkoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMpIHtcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgdmFyIGhlbHBlcnNfMSA9IHJlcXVpcmUoJy4uL2hlbHBlcnMnKTtcclxuICAgIC8vIFVuZGVyc2NvcmUuanMgaW1wbGVtZW50YXRpb24gb2YgZXh0ZW5kXHJcbiAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vamFzaGtlbmFzL3VuZGVyc2NvcmUvYmxvYi9tYXN0ZXIvdW5kZXJzY29yZS5qc1xyXG4gICAgdmFyIGV4dGVuZCA9IGZ1bmN0aW9uIChvYmopIHtcclxuICAgICAgICB2YXIgZGVmYXVsdHMgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBfaSA9IDE7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgICAgICBkZWZhdWx0c1tfaSAtIDFdID0gYXJndW1lbnRzW19pXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XHJcbiAgICAgICAgaWYgKGxlbmd0aCA8IDIgfHwgb2JqID09IG51bGwpXHJcbiAgICAgICAgICAgIHJldHVybiBvYmo7IC8vIGlmIHRoZXJlIGFyZSBubyBvYmplY3RzIHRvIGV4dGVuZCB0aGVuIHJldHVybiB0aGUgY3VycmVudCBvYmplY3RcclxuICAgICAgICBpZiAoZGVmYXVsdHMpXHJcbiAgICAgICAgICAgIG9iaiA9IE9iamVjdChvYmopOyAvLyBjcmVhdGUgYSBuZXcgb2JqZWN0IHRvIGV4dGVuZCBpZiB0aGVyZSBhcmUgYW55IGV4dGVuc2lvbnNcclxuICAgICAgICBmb3IgKHZhciBpbmRleCA9IDE7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XHJcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaW5kZXhdOyAvLyBmb3JlYWNoIG9iamVjdFxyXG4gICAgICAgICAgICBpZiAoc291cmNlID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICBjb250aW51ZTsgLy8gbW92ZSBvbiBpZiB0aGUgb2JqZWN0IGlzIG51bGwgb3IgdW5kZWZpbmVkXHJcbiAgICAgICAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc291cmNlKSwgLy8gZ2V0IGFsbCB0aGUga2V5c1xyXG4gICAgICAgICAgICBsID0ga2V5cy5sZW5ndGg7IC8vIGNhY2hlIHRoZSBsZW5ndGhcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2ldOyAvLyBmb3IgZWFjaCBrZXlcclxuICAgICAgICAgICAgICAgIGlmICghZGVmYXVsdHMgfHwgb2JqW2tleV0gPT09IHZvaWQgMClcclxuICAgICAgICAgICAgICAgICAgICBvYmpba2V5XSA9IHNvdXJjZVtrZXldOyAvLyByZXBsYWNlIHZhbHVlc1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBvYmo7XHJcbiAgICB9O1xyXG4gICAgZXhwb3J0cy5EZWZhdWx0RW5kcG9pbnRzID0ge1xyXG4gICAgICAgIEdvb2dsZTogJ0dvb2dsZScsXHJcbiAgICAgICAgTWljcm9zb2Z0OiAnTWljcm9zb2Z0JyxcclxuICAgICAgICBGYWNlYm9vazogJ0ZhY2Vib29rJ1xyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIGZvciBjcmVhdGluZyBhbmQgcmVnaXN0ZXJpbmcgT0F1dGggRW5kcG9pbnRzLlxyXG4gICAgICovXHJcbiAgICB2YXIgRW5kcG9pbnRNYW5hZ2VyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcclxuICAgICAgICBfX2V4dGVuZHMoRW5kcG9pbnRNYW5hZ2VyLCBfc3VwZXIpO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gRW5kcG9pbnRNYW5hZ2VyKCkge1xyXG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCAnT0F1dGgyRW5kcG9pbnRzJywgaGVscGVyc18xLlN0b3JhZ2VUeXBlLkxvY2FsU3RvcmFnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShFbmRwb2ludE1hbmFnZXIucHJvdG90eXBlLCBcImN1cnJlbnRIb3N0XCIsIHtcclxuICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAqIEdldHMgdGhlIGN1cnJlbnQgdXJsIHRvIGJlIHNwZWNpZmllZCBhcyB0aGUgZGVmYXVsdCByZWRpcmVjdCB1cmwuXHJcbiAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9jdXJyZW50SG9zdCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fY3VycmVudEhvc3QgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgKyBcIi8vXCIgKyB3aW5kb3cubG9jYXRpb24uaG9zdDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl9jdXJyZW50SG9zdDtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRXh0ZW5kcyBTdG9yYWdlJ3MgZGVmYXVsdCBhZGQgbWV0aG9kXHJcbiAgICAgICAgICogUmVnaXN0ZXJzIGEgbmV3IE9BdXRoIEVuZHBvaW50XHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJvdmlkZXIgVW5pcXVlIG5hbWUgZm9yIHRoZSByZWdpc3RlcmVkIE9BdXRoIEVuZHBvaW50LlxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVmFsaWQgRW5kcG9pbnQgY29uZmlndXJhdGlvblxyXG4gICAgICAgICAqIEBzZWUge0BsaW5rIElFbmRwb2ludH0uXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBhZGRlZCBlbmRwb2ludC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBFbmRwb2ludE1hbmFnZXIucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChwcm92aWRlciwgY29uZmlnKSB7XHJcbiAgICAgICAgICAgIGlmIChjb25maWcucmVkaXJlY3RVcmwgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5yZWRpcmVjdFVybCA9IHRoaXMuY3VycmVudEhvc3Q7XHJcbiAgICAgICAgICAgIGNvbmZpZy5wcm92aWRlciA9IHByb3ZpZGVyO1xyXG4gICAgICAgICAgICByZXR1cm4gX3N1cGVyLnByb3RvdHlwZS5hZGQuY2FsbCh0aGlzLCBwcm92aWRlciwgY29uZmlnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJlZ2lzdGVyIEdvb2dsZSBJbXBsaWNpdCBPQXV0aFxyXG4gICAgICAgICAqIFRoZSBkZWZhdWx0IHNjb3BlIGlzIGxpbWl0ZWQgdG8gYmFzaWMgcHJvZmlsZVxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGNsaWVudElkIENsaWVudElEIGZvciB0aGUgR29vZ2xlIEFwcFxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVmFsaWQgRW5kcG9pbnQgY29uZmlndXJhdGlvbiB0byBvdmVycmlkZSB0aGUgZGVmYXVsdHNcclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGVuZHBvaW50LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEVuZHBvaW50TWFuYWdlci5wcm90b3R5cGUucmVnaXN0ZXJHb29nbGVBdXRoID0gZnVuY3Rpb24gKGNsaWVudElkLCBvdmVycmlkZXMpIHtcclxuICAgICAgICAgICAgdmFyIGRlZmF1bHRzID0ge1xyXG4gICAgICAgICAgICAgICAgY2xpZW50SWQ6IGNsaWVudElkLFxyXG4gICAgICAgICAgICAgICAgYmFzZVVybDogJ2h0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbScsXHJcbiAgICAgICAgICAgICAgICBhdXRob3JpemVVcmw6ICcvby9vYXV0aDIvdjIvYXV0aCcsXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZTogJ2h0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tJyxcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlVHlwZTogJ3Rva2VuJyxcclxuICAgICAgICAgICAgICAgIHNjb3BlOiAnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9wbHVzLm1lJ1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgY29uZmlnID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3ZlcnJpZGVzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWRkKGV4cG9ydHMuRGVmYXVsdEVuZHBvaW50cy5Hb29nbGUsIGNvbmZpZyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICA7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVnaXN0ZXIgTWljcm9zb2Z0IEltcGxpY2l0IE9BdXRoXHJcbiAgICAgICAgICogVGhlIGRlZmF1bHQgc2NvcGUgaXMgbGltaXRlZCB0byBiYXNpYyBwcm9maWxlXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2xpZW50SWQgQ2xpZW50SUQgZm9yIHRoZSBNaWNyb3NvZnQgQXBwXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBWYWxpZCBFbmRwb2ludCBjb25maWd1cmF0aW9uIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0c1xyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgYWRkZWQgZW5kcG9pbnQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRW5kcG9pbnRNYW5hZ2VyLnByb3RvdHlwZS5yZWdpc3Rlck1pY3Jvc29mdEF1dGggPSBmdW5jdGlvbiAoY2xpZW50SWQsIG92ZXJyaWRlcykge1xyXG4gICAgICAgICAgICB2YXIgZGVmYXVsdHMgPSB7XHJcbiAgICAgICAgICAgICAgICBjbGllbnRJZDogY2xpZW50SWQsXHJcbiAgICAgICAgICAgICAgICBiYXNlVXJsOiAnaHR0cHM6Ly9sb2dpbi5taWNyb3NvZnRvbmxpbmUuY29tL2NvbW1vbi9vYXV0aDIvdjIuMCcsXHJcbiAgICAgICAgICAgICAgICBhdXRob3JpemVVcmw6ICcvYXV0aG9yaXplJyxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlOiAnaHR0cHM6Ly9ncmFwaC5taWNyb3NvZnQuY29tJyxcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlVHlwZTogJ2lkX3Rva2VuK3Rva2VuJyxcclxuICAgICAgICAgICAgICAgIHNjb3BlOiAnb3BlbmlkIGh0dHBzOi8vZ3JhcGgubWljcm9zb2Z0LmNvbS91c2VyLnJlYWQnLFxyXG4gICAgICAgICAgICAgICAgZXh0cmFQYXJhbWV0ZXJzOiAnJnJlc3BvbnNlX21vZGU9ZnJhZ21lbnQnLFxyXG4gICAgICAgICAgICAgICAgbm9uY2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzdGF0ZTogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgY29uZmlnID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3ZlcnJpZGVzKTtcclxuICAgICAgICAgICAgdGhpcy5hZGQoZXhwb3J0cy5EZWZhdWx0RW5kcG9pbnRzLk1pY3Jvc29mdCwgY29uZmlnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBSZWdpc3RlciBGYWNlYm9vayBJbXBsaWNpdCBPQXV0aFxyXG4gICAgICAgICAqIFRoZSBkZWZhdWx0IHNjb3BlIGlzIGxpbWl0ZWQgdG8gYmFzaWMgcHJvZmlsZVxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGNsaWVudElkIENsaWVudElEIGZvciB0aGUgRmFjZWJvb2sgQXBwXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyBWYWxpZCBFbmRwb2ludCBjb25maWd1cmF0aW9uIHRvIG92ZXJyaWRlIHRoZSBkZWZhdWx0c1xyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgYWRkZWQgZW5kcG9pbnQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRW5kcG9pbnRNYW5hZ2VyLnByb3RvdHlwZS5yZWdpc3RlckZhY2Vib29rQXV0aCA9IGZ1bmN0aW9uIChjbGllbnRJZCwgb3ZlcnJpZGVzKSB7XHJcbiAgICAgICAgICAgIHZhciBkZWZhdWx0cyA9IHtcclxuICAgICAgICAgICAgICAgIGNsaWVudElkOiBjbGllbnRJZCxcclxuICAgICAgICAgICAgICAgIGJhc2VVcmw6ICdodHRwczovL3d3dy5mYWNlYm9vay5jb20nLFxyXG4gICAgICAgICAgICAgICAgYXV0aG9yaXplVXJsOiAnL2RpYWxvZy9vYXV0aCcsXHJcbiAgICAgICAgICAgICAgICByZXNvdXJjZTogJ2h0dHBzOi8vZ3JhcGguZmFjZWJvb2suY29tJyxcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlVHlwZTogJ3Rva2VuJyxcclxuICAgICAgICAgICAgICAgIHNjb3BlOiAncHVibGljX3Byb2ZpbGUnLFxyXG4gICAgICAgICAgICAgICAgbm9uY2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBzdGF0ZTogdHJ1ZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgY29uZmlnID0gZXh0ZW5kKHt9LCBkZWZhdWx0cywgb3ZlcnJpZGVzKTtcclxuICAgICAgICAgICAgdGhpcy5hZGQoZXhwb3J0cy5EZWZhdWx0RW5kcG9pbnRzLkZhY2Vib29rLCBjb25maWcpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEhlbHBlciB0byBnZW5lcmF0ZSB0aGUgT0F1dGggbG9naW4gdXJsXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFZhbGlkIEVuZHBvaW50IGNvbmZpZ3VyYXRpb25cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGFkZGVkIGVuZHBvaW50LlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIEVuZHBvaW50TWFuYWdlci5nZXRMb2dpblVybCA9IGZ1bmN0aW9uIChlbmRwb2ludENvbmZpZykge1xyXG4gICAgICAgICAgICB2YXIgcmFuZCA9IGZ1bmN0aW9uIChsaW1pdCwgc3RhcnQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChsaW1pdCA9PT0gdm9pZCAwKSB7IGxpbWl0ID0gMTA7IH1cclxuICAgICAgICAgICAgICAgIGlmIChzdGFydCA9PT0gdm9pZCAwKSB7IHN0YXJ0ID0gMDsgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGxpbWl0ICsgc3RhcnQpO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB2YXIgb0F1dGhTY29wZSA9IChlbmRwb2ludENvbmZpZy5zY29wZSkgPyBlbmNvZGVVUklDb21wb25lbnQoZW5kcG9pbnRDb25maWcuc2NvcGUpIDogJycsIHN0YXRlID0gZW5kcG9pbnRDb25maWcuc3RhdGUgJiYgcmFuZCgxMDAwMCksIG5vbmNlID0gZW5kcG9pbnRDb25maWcubm9uY2UgJiYgcmFuZCgxMDAwMCk7XHJcbiAgICAgICAgICAgIHZhciB1cmxTZWdtZW50cyA9IFtcclxuICAgICAgICAgICAgICAgICdyZXNwb25zZV90eXBlPScgKyBlbmRwb2ludENvbmZpZy5yZXNwb25zZVR5cGUsXHJcbiAgICAgICAgICAgICAgICAnY2xpZW50X2lkPScgKyBlbmNvZGVVUklDb21wb25lbnQoZW5kcG9pbnRDb25maWcuY2xpZW50SWQpLFxyXG4gICAgICAgICAgICAgICAgJ3JlZGlyZWN0X3VyaT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGVuZHBvaW50Q29uZmlnLnJlZGlyZWN0VXJsKSxcclxuICAgICAgICAgICAgICAgICdzY29wZT0nICsgb0F1dGhTY29wZVxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICBpZiAoc3RhdGUpXHJcbiAgICAgICAgICAgICAgICB1cmxTZWdtZW50cy5wdXNoKCdzdGF0ZT0nICsgc3RhdGUpO1xyXG4gICAgICAgICAgICBpZiAobm9uY2UpXHJcbiAgICAgICAgICAgICAgICB1cmxTZWdtZW50cy5wdXNoKCdub25jZT0nICsgbm9uY2UpO1xyXG4gICAgICAgICAgICBpZiAoZW5kcG9pbnRDb25maWcpXHJcbiAgICAgICAgICAgICAgICB1cmxTZWdtZW50cy5wdXNoKGVuZHBvaW50Q29uZmlnLmV4dHJhUXVlcnlQYXJhbWV0ZXJzKTtcclxuICAgICAgICAgICAgcmV0dXJuIGVuZHBvaW50Q29uZmlnLmJhc2VVcmwgKyBlbmRwb2ludENvbmZpZy5hdXRob3JpemVVcmwgKyAnPycgKyB1cmxTZWdtZW50cy5qb2luKCcmJyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gRW5kcG9pbnRNYW5hZ2VyO1xyXG4gICAgfShoZWxwZXJzXzEuU3RvcmFnZSkpO1xyXG4gICAgZXhwb3J0cy5FbmRwb2ludE1hbmFnZXIgPSBFbmRwb2ludE1hbmFnZXI7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1lbmRwb2ludC5tYW5hZ2VyLmpzLm1hcCIsIihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgdiA9IGZhY3RvcnkocmVxdWlyZSwgZXhwb3J0cyk7IGlmICh2ICE9PSB1bmRlZmluZWQpIG1vZHVsZS5leHBvcnRzID0gdjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiZXhwb3J0c1wiLCAnLi9hdXRoZW50aWNhdG9yJywgJy4vZW5kcG9pbnQubWFuYWdlcicsICcuL3Rva2VuLm1hbmFnZXInXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIGZ1bmN0aW9uIF9fZXhwb3J0KG0pIHtcclxuICAgICAgICBmb3IgKHZhciBwIGluIG0pIGlmICghZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSkgZXhwb3J0c1twXSA9IG1bcF07XHJcbiAgICB9XHJcbiAgICBfX2V4cG9ydChyZXF1aXJlKCcuL2F1dGhlbnRpY2F0b3InKSk7XHJcbiAgICBfX2V4cG9ydChyZXF1aXJlKCcuL2VuZHBvaW50Lm1hbmFnZXInKSk7XHJcbiAgICBfX2V4cG9ydChyZXF1aXJlKCcuL3Rva2VuLm1hbmFnZXInKSk7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCJ2YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59O1xyXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIHYgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMpOyBpZiAodiAhPT0gdW5kZWZpbmVkKSBtb2R1bGUuZXhwb3J0cyA9IHY7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoW1wicmVxdWlyZVwiLCBcImV4cG9ydHNcIiwgJy4uL2hlbHBlcnMnXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIHZhciBoZWxwZXJzXzEgPSByZXF1aXJlKCcuLi9oZWxwZXJzJyk7XHJcbiAgICAvKipcclxuICAgICAqIEhlbHBlciBmb3IgY2FjaGluZyBhbmQgbWFuYWdpbmcgT0F1dGggVG9rZW5zLlxyXG4gICAgICovXHJcbiAgICB2YXIgVG9rZW5NYW5hZ2VyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcclxuICAgICAgICBfX2V4dGVuZHMoVG9rZW5NYW5hZ2VyLCBfc3VwZXIpO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gVG9rZW5NYW5hZ2VyKCkge1xyXG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCAnT0F1dGgyVG9rZW5zJywgaGVscGVyc18xLlN0b3JhZ2VUeXBlLkxvY2FsU3RvcmFnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbXB1dGUgdGhlIGV4cGlyYXRpb24gZGF0ZSBiYXNlZCBvbiB0aGUgZXhwaXJlc19pbiBmaWVsZCBpbiBhIE9BdXRoIHRva2VuLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIFRva2VuTWFuYWdlci5wcm90b3R5cGUuc2V0RXhwaXJ5ID0gZnVuY3Rpb24gKHRva2VuKSB7XHJcbiAgICAgICAgICAgIHZhciBleHBpcmUgPSBmdW5jdGlvbiAoc2Vjb25kcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlY29uZHMgPT09IHZvaWQgMCkgeyBzZWNvbmRzID0gMzYwMDsgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKG5ldyBEYXRlKCkuZ2V0VGltZSgpICsgfn5zZWNvbmRzICogMTAwMCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGlmICh0b2tlbiA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIGlmICh0b2tlbi5leHBpcmVzX2F0ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRva2VuLmV4cGlyZXNfYXQgPSBleHBpcmUodG9rZW4uZXhwaXJlc19pbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEV4dGVuZHMgU3RvcmFnZSdzIGRlZmF1bHQgYWRkIG1ldGhvZFxyXG4gICAgICAgICAqIEFkZHMgYSBuZXcgT0F1dGggVG9rZW4gYWZ0ZXIgc2V0dGluZ3MgaXRzIGV4cGlyeVxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHByb3ZpZGVyIFVuaXF1ZSBuYW1lIG9mIHRoZSBjb3JyZXNwb25kaW5nIE9BdXRoIEVuZHBvaW50LlxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgdmFsaWQgVG9rZW5cclxuICAgICAgICAgKiBAc2VlIHtAbGluayBJRW5kcG9pbnR9LlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgYWRkZWQgZW5kcG9pbnQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgVG9rZW5NYW5hZ2VyLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAocHJvdmlkZXIsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIHZhbHVlLnByb3ZpZGVyID0gcHJvdmlkZXI7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0RXhwaXJ5KHZhbHVlKTtcclxuICAgICAgICAgICAgcmV0dXJuIF9zdXBlci5wcm90b3R5cGUuYWRkLmNhbGwodGhpcywgcHJvdmlkZXIsIHZhbHVlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEV4dHJhY3QgdGhlIHRva2VuIGZyb20gdGhlIFVSTFxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgdXJsIHRvIGV4dHJhY3QgdGhlIHRva2VuIGZyb20uXHJcbiAgICAgICAgICogQHBhcmFtIHtzdHJpbmd9IGV4Y2x1ZGUgRXhjbHVkZSBhIHBhcnRpY2xhdXIgc3RyaW5nIGZyb20gdGhlIHVybCwgc3VjaCBhcyBhIHF1ZXJ5IHBhcmFtIG9yIHNwZWNpZmljIHN1YnN0cmluZy5cclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGVsaW1pdGVyW29wdGlvbmFsXSBEZWxpbWl0ZXIgdXNlZCBieSBPQXV0aCBwcm92aWRlciB0byBtYXJrIHRoZSBiZWdpbm5pbmcgb2YgdG9rZW4gcmVzcG9uc2UuIERlZmF1bHRzIHRvICMuXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBleHRyYWN0ZWQgdG9rZW4uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgVG9rZW5NYW5hZ2VyLmdldFRva2VuID0gZnVuY3Rpb24gKHVybCwgZXhjbHVkZSwgZGVsaW1pdGVyKSB7XHJcbiAgICAgICAgICAgIGlmIChkZWxpbWl0ZXIgPT09IHZvaWQgMCkgeyBkZWxpbWl0ZXIgPSAnIyc7IH1cclxuICAgICAgICAgICAgaWYgKGV4Y2x1ZGUpXHJcbiAgICAgICAgICAgICAgICB1cmwgPSB1cmwucmVwbGFjZShleGNsdWRlLCAnJyk7XHJcbiAgICAgICAgICAgIHZhciBwYXJ0cyA9IHVybC5zcGxpdChkZWxpbWl0ZXIpO1xyXG4gICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoIDw9IDApXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIHZhciByaWdodFBhcnQgPSBwYXJ0cy5sZW5ndGggPj0gMiA/IHBhcnRzWzFdIDogcGFydHNbMF07XHJcbiAgICAgICAgICAgIHJpZ2h0UGFydCA9IHJpZ2h0UGFydC5yZXBsYWNlKCcvJywgJycpO1xyXG4gICAgICAgICAgICBpZiAocmlnaHRQYXJ0LmluZGV4T2YoXCI/XCIpICE9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHF1ZXJ5UGFydCA9IHJpZ2h0UGFydC5zcGxpdChcIj9cIik7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXF1ZXJ5UGFydCB8fCBxdWVyeVBhcnQubGVuZ3RoIDw9IDApXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgcmlnaHRQYXJ0ID0gcXVlcnlQYXJ0WzFdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9leHRyYWN0UGFyYW1zKHJpZ2h0UGFydCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDaGVjayBpZiB0aGUgc3VwcGxpZWQgdXJsIGhhcyBlaXRoZXIgYWNjZXNzX3Rva2VuIG9yIGNvZGUgb3IgZXJyb3JcclxuICAgICAgICAgKi9cclxuICAgICAgICBUb2tlbk1hbmFnZXIuaXNUb2tlblVybCA9IGZ1bmN0aW9uICh1cmwpIHtcclxuICAgICAgICAgICAgdmFyIHJlZ2V4ID0gLyhhY2Nlc3NfdG9rZW58Y29kZXxlcnJvcikvZ2k7XHJcbiAgICAgICAgICAgIHJldHVybiByZWdleC50ZXN0KHVybCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBUb2tlbk1hbmFnZXIuX2V4dHJhY3RQYXJhbXMgPSBmdW5jdGlvbiAoc2VnbWVudCkge1xyXG4gICAgICAgICAgICB2YXIgcGFyYW1zID0ge30sIHJlZ2V4ID0gLyhbXiY9XSspPShbXiZdKikvZywgbWF0Y2hlcztcclxuICAgICAgICAgICAgd2hpbGUgKChtYXRjaGVzID0gcmVnZXguZXhlYyhzZWdtZW50KSkgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtc1tkZWNvZGVVUklDb21wb25lbnQobWF0Y2hlc1sxXSldID0gZGVjb2RlVVJJQ29tcG9uZW50KG1hdGNoZXNbMl0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gVG9rZW5NYW5hZ2VyO1xyXG4gICAgfShoZWxwZXJzXzEuU3RvcmFnZSkpO1xyXG4gICAgZXhwb3J0cy5Ub2tlbk1hbmFnZXIgPSBUb2tlbk1hbmFnZXI7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD10b2tlbi5tYW5hZ2VyLmpzLm1hcCIsIihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICB2YXIgdiA9IGZhY3RvcnkocmVxdWlyZSwgZXhwb3J0cyk7IGlmICh2ICE9PSB1bmRlZmluZWQpIG1vZHVsZS5leHBvcnRzID0gdjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xyXG4gICAgICAgIGRlZmluZShbXCJyZXF1aXJlXCIsIFwiZXhwb3J0c1wiXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIGZvciBjcmVhdGluZyBhbmQgcXVlcnlpbmcgRGljdGlvbmFyaWVzLlxyXG4gICAgICogQSBydWRpbWVudGFyeSBhbHRlcm5hdGl2ZSB0byBFUzYgTWFwcy5cclxuICAgICAqL1xyXG4gICAgdmFyIERpY3Rpb25hcnkgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxyXG4gICAgICAgICAqIEBwYXJhbSB7b2JqZWN0fSBpdGVtcyBJbml0aWFsIHNlZWQgb2YgaXRlbXMuXHJcbiAgICAgICAgKi9cclxuICAgICAgICBmdW5jdGlvbiBEaWN0aW9uYXJ5KGl0ZW1zKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSBpdGVtcztcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXMgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMgPSB7fTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogR2V0cyBhbiBpdGVtIGZyb20gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGl0ZW0uXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIGFuIGl0ZW0gaWYgZm91bmQsIGVsc2UgcmV0dXJucyBudWxsLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIERpY3Rpb25hcnkucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXMgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGljdGlvbmFyeSBpc25cXCd0IGluaXRpYWxpemVkLiBDYWxsIFxcJ25ld1xcJyBmaXJzdC4nKTtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbnRhaW5zKGtleSkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXNba2V5XTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFkZHMgYW4gaXRlbSBpbnRvIHRoZSBkaWN0aW9uYXJ5LlxyXG4gICAgICAgICAqIElmIHRoZSBrZXkgYWxyZWFkeSBleGlzdHMsIHRoZW4gaXQgd2lsbCB0aHJvdy5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgaXRlbS5cclxuICAgICAgICAgKiBAcGFyYW0ge29iamVjdH0gdmFsdWUgVGhlIGl0ZW0gdG8gYmUgYWRkZWQuXHJcbiAgICAgICAgICogQHJldHVybiB7b2JqZWN0fSBSZXR1cm5zIHRoZSBhZGRlZCBpdGVtLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIERpY3Rpb25hcnkucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbnRhaW5zKGtleSkpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0tleSBhbHJlYWR5IGV4aXN0cy4nKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5zZXJ0KGtleSwgdmFsdWUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEdldHMgdGhlIGZpcnN0IHRpbWUgb2YgdGhlIGRpY3Rpb25hcnlcclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgZmlyc3QgaXRlbSBpbiB0aGUgZGljdGlvbmFyeS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5maXJzdCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXMgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGljdGlvbmFyeSBpc25cXCd0IGluaXRpYWxpemVkLiBDYWxsIFxcJ25ld1xcJyBmaXJzdC4nKTtcclxuICAgICAgICAgICAgdmFyIGtleSA9IHRoaXMua2V5cygpWzBdO1xyXG4gICAgICAgICAgICBpZiAoa2V5ICE9IG51bGwpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtc1trZXldO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogSW5zZXJ0cyBhbiBpdGVtIGludG8gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGl0ZW0uXHJcbiAgICAgICAgICogQHBhcmFtIHtvYmplY3R9IHZhbHVlIFRoZSBpdGVtIHRvIGJlIGFkZGVkLlxyXG4gICAgICAgICAqIEByZXR1cm4ge29iamVjdH0gUmV0dXJucyB0aGUgYWRkZWQgaXRlbS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5pbnNlcnQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtcyA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdEaWN0aW9uYXJ5IGlzblxcJ3QgaW5pdGlhbGl6ZWQuIENhbGwgXFwnbmV3XFwnIGZpcnN0LicpO1xyXG4gICAgICAgICAgICBpZiAodmFsdWUgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVmFsdWUgZXhwZWN0ZWQuIEdvdCAnICsgdmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zW2tleV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogUmVtb3ZlcyBhbiBpdGVtIGZyb20gdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICogSWYgdGhlIGtleSBkb2VzbnQgZXhpc3QsIHRoZW4gaXQgd2lsbCB0aHJvdy5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgaXRlbS5cclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGRlbGV0ZWQgaXRlbS5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb250YWlucyhrZXkpKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdLZXkgbm90IGZvdW5kLicpO1xyXG4gICAgICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLml0ZW1zW2tleV07XHJcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLml0ZW1zW2tleV07XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluc2VydChrZXksIHZhbHVlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDbGVhcnMgdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSB7fTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENoZWNrIGlmIHRoZSBkaWN0aW9uYXJ5IGNvbnRhaW5zIHRoZSBnaXZlbiBrZXkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIGl0ZW0uXHJcbiAgICAgICAgICogQHJldHVybiB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSBrZXkgd2FzIGZvdW5kLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIERpY3Rpb25hcnkucHJvdG90eXBlLmNvbnRhaW5zID0gZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICBpZiAoa2V5ID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0tleSBjYW5ub3QgYmUgbnVsbCBvciB1bmRlZmluZWQnKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXMgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGljdGlvbmFyeSBpc25cXCd0IGluaXRpYWxpemVkLiBDYWxsIFxcJ25ld1xcJyBmaXJzdC4nKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXMuaGFzT3duUHJvcGVydHkoa2V5KTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIExpc3RzIGFsbCB0aGUga2V5cyBpbiB0aGUgZGljdGlvbmFyeS5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEByZXR1cm4ge2FycmF5fSBSZXR1cm5zIGFsbCB0aGUga2V5cy5cclxuICAgICAgICAgKi9cclxuICAgICAgICBEaWN0aW9uYXJ5LnByb3RvdHlwZS5rZXlzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcyA9PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdEaWN0aW9uYXJ5IGlzblxcJ3QgaW5pdGlhbGl6ZWQuIENhbGwgXFwnbmV3XFwnIGZpcnN0LicpO1xyXG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5pdGVtcyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBMaXN0cyBhbGwgdGhlIHZhbHVlcyBpbiB0aGUgZGljdGlvbmFyeS5cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEByZXR1cm4ge2FycmF5fSBSZXR1cm5zIGFsbCB0aGUgdmFsdWVzLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIERpY3Rpb25hcnkucHJvdG90eXBlLnZhbHVlcyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMgPT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRGljdGlvbmFyeSBpc25cXCd0IGluaXRpYWxpemVkLiBDYWxsIFxcJ25ld1xcJyBmaXJzdC4nKTtcclxuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC52YWx1ZXModGhpcy5pdGVtcyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBHZXQgdGhlIGRpY3Rpb25hcnkuXHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiBAcmV0dXJuIHtvYmplY3R9IFJldHVybnMgdGhlIGRpY3Rpb25hcnkgaWYgaXQgY29udGFpbnMgZGF0YSBlbHNlIG51bGwuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgRGljdGlvbmFyeS5wcm90b3R5cGUubG9va3VwID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5rZXlzKCkubGVuZ3RoID8gdGhpcy5pdGVtcyA6IG51bGw7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRGljdGlvbmFyeS5wcm90b3R5cGUsIFwiY291bnRcIiwge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogTnVtYmVyIG9mIGl0ZW1zIGluIHRoZSBkaWN0aW9uYXJ5LlxyXG4gICAgICAgICAgICAgKlxyXG4gICAgICAgICAgICAgKiBAcmV0dXJuIHtudW1iZXJ9IFJldHVybnMgdGhlIG51bWJlciBvZiBpdGVtcyBpbiB0aGUgZGljdGlvbmFyeVxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy52YWx1ZXMoKS5sZW5ndGg7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIDtcclxuICAgICAgICByZXR1cm4gRGljdGlvbmFyeTtcclxuICAgIH0oKSk7XHJcbiAgICBleHBvcnRzLkRpY3Rpb25hcnkgPSBEaWN0aW9uYXJ5O1xyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGljdGlvbmFyeS5qcy5tYXAiLCIoZnVuY3Rpb24gKGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIHYgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMpOyBpZiAodiAhPT0gdW5kZWZpbmVkKSBtb2R1bGUuZXhwb3J0cyA9IHY7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoW1wicmVxdWlyZVwiLCBcImV4cG9ydHNcIiwgJy4vZGljdGlvbmFyeScsICcuL3N0b3JhZ2UnXSwgZmFjdG9yeSk7XHJcbiAgICB9XHJcbn0pKGZ1bmN0aW9uIChyZXF1aXJlLCBleHBvcnRzKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuICAgIGZ1bmN0aW9uIF9fZXhwb3J0KG0pIHtcclxuICAgICAgICBmb3IgKHZhciBwIGluIG0pIGlmICghZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSkgZXhwb3J0c1twXSA9IG1bcF07XHJcbiAgICB9XHJcbiAgICBfX2V4cG9ydChyZXF1aXJlKCcuL2RpY3Rpb25hcnknKSk7XHJcbiAgICBfX2V4cG9ydChyZXF1aXJlKCcuL3N0b3JhZ2UnKSk7XHJcbn0pO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCJ2YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTtcclxuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG59O1xyXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIHYgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMpOyBpZiAodiAhPT0gdW5kZWZpbmVkKSBtb2R1bGUuZXhwb3J0cyA9IHY7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoW1wicmVxdWlyZVwiLCBcImV4cG9ydHNcIiwgJy4vZGljdGlvbmFyeSddLCBmYWN0b3J5KTtcclxuICAgIH1cclxufSkoZnVuY3Rpb24gKHJlcXVpcmUsIGV4cG9ydHMpIHtcclxuICAgIFwidXNlIHN0cmljdFwiO1xyXG4gICAgdmFyIGRpY3Rpb25hcnlfMSA9IHJlcXVpcmUoJy4vZGljdGlvbmFyeScpO1xyXG4gICAgKGZ1bmN0aW9uIChTdG9yYWdlVHlwZSkge1xyXG4gICAgICAgIFN0b3JhZ2VUeXBlW1N0b3JhZ2VUeXBlW1wiTG9jYWxTdG9yYWdlXCJdID0gMF0gPSBcIkxvY2FsU3RvcmFnZVwiO1xyXG4gICAgICAgIFN0b3JhZ2VUeXBlW1N0b3JhZ2VUeXBlW1wiU2Vzc2lvblN0b3JhZ2VcIl0gPSAxXSA9IFwiU2Vzc2lvblN0b3JhZ2VcIjtcclxuICAgIH0pKGV4cG9ydHMuU3RvcmFnZVR5cGUgfHwgKGV4cG9ydHMuU3RvcmFnZVR5cGUgPSB7fSkpO1xyXG4gICAgdmFyIFN0b3JhZ2VUeXBlID0gZXhwb3J0cy5TdG9yYWdlVHlwZTtcclxuICAgIC8qKlxyXG4gICAgICogSGVscGVyIGZvciBjcmVhdGluZyBhbmQgcXVlcnlpbmcgTG9jYWwgU3RvcmFnZSBvciBTZXNzaW9uIFN0b3JhZ2UuXHJcbiAgICAgKiBAc2VlIFVzZXMge0BsaW5rIERpY3Rpb25hcnl9IHRvIGNyZWF0ZSBhbiBpbi1tZW1vcnkgY29weSBvZlxyXG4gICAgICogdGhlIHN0b3JhZ2UgZm9yIGZhc3RlciByZWFkcy4gV3JpdGVzIHVwZGF0ZSB0aGUgYWN0dWFsIHN0b3JhZ2UuXHJcbiAgICAgKi9cclxuICAgIHZhciBTdG9yYWdlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcclxuICAgICAgICBfX2V4dGVuZHMoU3RvcmFnZSwgX3N1cGVyKTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAY29uc3RydWN0b3JcclxuICAgICAgICAgKiBAcGFyYW0ge3N0cmluZ30gY29udGFpbmVyIENvbnRhaW5lciBuYW1lIHRvIGJlIGNyZWF0ZWQgaW4gdGhlIExvY2FsU3RvcmFnZS5cclxuICAgICAgICAgKiBAcGFyYW0ge1N0b3JhZ2VUeXBlfSB0eXBlW29wdGlvbmFsXSBTdG9yYWdlIFR5cGUgdG8gYmUgdXNlZCwgZGVmYXVsdHMgdG8gTG9jYWwgU3RvcmFnZS5cclxuICAgICAgICAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIFN0b3JhZ2UoX2NvbnRhaW5lciwgdHlwZSkge1xyXG4gICAgICAgICAgICBfc3VwZXIuY2FsbCh0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5fY29udGFpbmVyID0gX2NvbnRhaW5lcjtcclxuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IG51bGw7XHJcbiAgICAgICAgICAgIHR5cGUgPSB0eXBlIHx8IFN0b3JhZ2VUeXBlLkxvY2FsU3RvcmFnZTtcclxuICAgICAgICAgICAgdGhpcy5zd2l0Y2hTdG9yYWdlKHR5cGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTd2l0Y2ggdGhlIHN0b3JhZ2UgdHlwZVxyXG4gICAgICAgICAqIFN3aXRjaGVzIHRoZSBzdG9yYWdlIHR5cGUgYW5kIHRoZW4gcmVsb2FkcyB0aGUgaW4tbWVtb3J5IGNvbGxlY3Rpb25cclxuICAgICAgICAgKlxyXG4gICAgICAgICAqIEB0eXBlIHtTdG9yYWdlVHlwZX0gdHlwZSBUaGUgZGVzaXJlZCBzdG9yYWdlIHRvIGJlIHVzZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICBTdG9yYWdlLnByb3RvdHlwZS5zd2l0Y2hTdG9yYWdlID0gZnVuY3Rpb24gKHR5cGUpIHtcclxuICAgICAgICAgICAgdGhpcy5fc3RvcmFnZSA9IHR5cGUgPT09IFN0b3JhZ2VUeXBlLkxvY2FsU3RvcmFnZSA/IGxvY2FsU3RvcmFnZSA6IHNlc3Npb25TdG9yYWdlO1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuX3N0b3JhZ2UuaGFzT3duUHJvcGVydHkodGhpcy5fY29udGFpbmVyKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5fc3RvcmFnZVt0aGlzLl9jb250YWluZXJdID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLl9sb2FkKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBZGQgYW4gaXRlbVxyXG4gICAgICAgICAqIEV4dGVuZHMgRGljdGlvbmFyeSdzIGltcGxlbWVudGF0aW9uIHdpdGggYSBzYXZlIHRvIHRoZSBzdG9yYWdlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgU3RvcmFnZS5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24gKGl0ZW0sIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIF9zdXBlci5wcm90b3R5cGUuaW5zZXJ0LmNhbGwodGhpcywgaXRlbSwgdmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLl9zYXZlKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFJlbW92ZSBhbiBpdGVtXHJcbiAgICAgICAgICogRXh0ZW5kcyBEaWN0aW9uYXJ5J3MgaW1wbGVtZW50YXRpb24gd2l0aCBhIHNhdmUgdG8gdGhlIHN0b3JhZ2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBTdG9yYWdlLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBfc3VwZXIucHJvdG90eXBlLnJlbW92ZS5jYWxsKHRoaXMsIGl0ZW0pO1xyXG4gICAgICAgICAgICB0aGlzLl9zYXZlKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENsZWFyIHRoZSBzdG9yYWdlXHJcbiAgICAgICAgICogRXh0ZW5kcyBEaWN0aW9uYXJ5J3MgaW1wbGVtZW50YXRpb24gd2l0aCBhIHNhdmUgdG8gdGhlIHN0b3JhZ2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBTdG9yYWdlLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgX3N1cGVyLnByb3RvdHlwZS5jbGVhci5jYWxsKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLl9zdG9yYWdlW3RoaXMuX2NvbnRhaW5lcl0gPSBudWxsO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ2xlYXIgYWxsIHN0b3JhZ2VzXHJcbiAgICAgICAgICogY29tcGxldGVseSBjbGVhcnMgYWxsIHN0b3JhZ2VzXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgU3RvcmFnZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5jbGVhcigpO1xyXG4gICAgICAgICAgICB3aW5kb3cuc2Vzc2lvblN0b3JhZ2UuY2xlYXIoKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFN0b3JhZ2UucHJvdG90eXBlLl9zYXZlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICB0aGlzLl9zdG9yYWdlW3RoaXMuX2NvbnRhaW5lcl0gPSBKU09OLnN0cmluZ2lmeSh0aGlzLml0ZW1zKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFN0b3JhZ2UucHJvdG90eXBlLl9sb2FkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBfc3VwZXIucHJvdG90eXBlLmNsZWFyLmNhbGwodGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSBKU09OLnBhcnNlKHRoaXMuX3N0b3JhZ2VbdGhpcy5fY29udGFpbmVyXSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zID09IG51bGwpXHJcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1zID0ge307XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIFN0b3JhZ2U7XHJcbiAgICB9KGRpY3Rpb25hcnlfMS5EaWN0aW9uYXJ5KSk7XHJcbiAgICBleHBvcnRzLlN0b3JhZ2UgPSBTdG9yYWdlO1xyXG59KTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3RvcmFnZS5qcy5tYXAiLCIoZnVuY3Rpb24gKGZhY3RvcnkpIHtcclxuICAgIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgdmFyIHYgPSBmYWN0b3J5KHJlcXVpcmUsIGV4cG9ydHMpOyBpZiAodiAhPT0gdW5kZWZpbmVkKSBtb2R1bGUuZXhwb3J0cyA9IHY7XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoW1wicmVxdWlyZVwiLCBcImV4cG9ydHNcIiwgJy4vaGVscGVycycsICcuL2F1dGhlbnRpY2F0aW9uJ10sIGZhY3RvcnkpO1xyXG4gICAgfVxyXG59KShmdW5jdGlvbiAocmVxdWlyZSwgZXhwb3J0cykge1xyXG4gICAgXCJ1c2Ugc3RyaWN0XCI7XHJcbiAgICBmdW5jdGlvbiBfX2V4cG9ydChtKSB7XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBtKSBpZiAoIWV4cG9ydHMuaGFzT3duUHJvcGVydHkocCkpIGV4cG9ydHNbcF0gPSBtW3BdO1xyXG4gICAgfVxyXG4gICAgX19leHBvcnQocmVxdWlyZSgnLi9oZWxwZXJzJykpO1xyXG4gICAgX19leHBvcnQocmVxdWlyZSgnLi9hdXRoZW50aWNhdGlvbicpKTtcclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCJdfQ==
return require('office-js-helpers');
});