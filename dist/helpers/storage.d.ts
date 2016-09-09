import { Dictionary } from './dictionary';
export declare enum StorageType {
    LocalStorage = 0,
    SessionStorage = 1,
}
/**
 * Helper for creating and querying Local Storage or Session Storage.
 * @see Uses {@link Dictionary} to create an in-memory copy of
 * the storage for faster reads. Writes update the actual storage.
 */
export declare class Storage<T> extends Dictionary<T> {
    private _container;
    private _storage;
    /**
     * @constructor
     * @param {string} container Container name to be created in the LocalStorage.
     * @param {StorageType} type[optional] Storage Type to be used, defaults to Local Storage.
    */
    constructor(_container: string, type?: StorageType);
    /**
     * Switch the storage type
     * Switches the storage type and then reloads the in-memory collection
     *
     * @type {StorageType} type The desired storage to be used
     */
    switchStorage(type: StorageType): void;
    /**
     * Add an item
     * Extends Dictionary's implementation with a save to the storage.
     * Throws if the same key is available twice.
     */
    add(item: string, value: T): T;
    /**
     * Remove an item
     * Extends Dictionary's implementation with a save to the storage
     */
    remove(item: string): T;
    /**
     * Clear the storage
     * Extends Dictionary's implementation with a save to the storage
     */
    clear(): void;
    /**
     * Clear all storages
     * completely clears all storages
     */
    static clearAll(): void;
    /**
     * Saves the current state to the storage
     */
    save(): void;
    /**
     * Refreshes the storage with the current localstorage values.
     */
    load(): {
        [index: string]: T;
    };
}
