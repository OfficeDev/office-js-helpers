// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
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
//# sourceMappingURL=endpoint.manager.js.map