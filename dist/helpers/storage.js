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
         * Extends Dictionary's implementation of insert, with a save to the storage.
         */
        Storage.prototype.add = function (item, value) {
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
//# sourceMappingURL=storage.js.map