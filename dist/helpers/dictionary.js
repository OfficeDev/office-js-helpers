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
        return Object.keys(this.items);
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
//# sourceMappingURL=dictionary.js.map