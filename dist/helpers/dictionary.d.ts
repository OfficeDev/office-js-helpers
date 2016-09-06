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
     * Gets the first time of the dictionary
     *
     * @return {object} Returns the first item in the dictionary.
     */
    first(): T;
    /**
     * Inserts an item into the dictionary.
     *
     * @param {string} key The key of the item.
     * @param {object} value The item to be added.
     * @return {object} Returns the added item.
     */
    insert(key: string, value: T): T;
    /**
     * Removes an item from the dictionary.
     * If the key doesnt exist, then it will throw.
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
     * @return {object} Returns the dictionary if it contains data else null.
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
