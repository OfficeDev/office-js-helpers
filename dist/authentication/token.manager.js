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
//# sourceMappingURL=token.manager.js.map