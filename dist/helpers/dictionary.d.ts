/**
 * Helper for creating and querying Dictionaries.
 * A rudimentary alternative to ES6 Maps.
 */
export declare class Dictionary<T> {
    protected items: {
        [index: string]: T;
    };
    /**
     * @constructor
     * @param {object} items Initial seed of items.
    */
    constructor(items?: {
        [index: string]: T;
    });
    /**
     * Gets an item from the dictionary.
     *
     * @param {string} key The key of the item.
     * @return {object} Returns an item if found, else returns null.
     */
    get(key: string): T;
    /**
     * Adds an item into the dictionary.
     * If the key already exists, then it will throw.
     *
     * @param {string} key The key of the item.
     * @param {object} value The item to be added.
     * @return {object} Returns the added item.
     */
    add(key: string, value: T): T;
    /**
     * Inserts an item into the dictionary.
     * If an item already exists with the same key, it will be overridden by the new value
     *
     * @param {string} key The key of the item.
     * @param {object} value The item to be added.
     * @return {object} Returns the added item.
     */
    insert(key: string, value: T): T;
    /**
     * Removes an item from the dictionary.
     * Will throw if the key doesn't exist.
     *
     * @param {string} key The key of the item.
     * @return {object} Returns the deleted item.
     */
    remove(key: string): T;
    /**
     * Clears the dictionary.
     */
    clear(): void;
    /**
     * Check if the dictionary contains the given key.
     *
     * @param {string} key The key of the item.
     * @return {boolean} Returns true if the key was found.
     */
    contains(key: string): boolean;
    /**
     * Lists all the keys in the dictionary.
     *
     * @return {array} Returns all the keys.
     */
    keys(): string[];
    /**
     * Lists all the values in the dictionary.
     *
     * @return {array} Returns all the values.
     */
    values(): T[];
    /**
     * Get the dictionary.
     *
     * @return {object} Returns the dictionary if it contains data, null otherwise.
     */
    lookup(): {
        [key: string]: T;
    };
    /**
     * Number of items in the dictionary.
     *
     * @return {number} Returns the number of items in the dictionary
     */
    count: number;
}
