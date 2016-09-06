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
//# sourceMappingURL=dictionary.js.map