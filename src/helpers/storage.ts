import { Dictionary } from './dictionary';

export enum StorageType {
    LocalStorage,
    SessionStorage
}

/**
 * Helper for creating and querying Local Storage or Session Storage.
 * @see Uses {@link Dictionary} to create an in-memory copy of
 * the storage for faster reads. Writes update the actual storage.
 */
export class Storage<T> extends Dictionary<T>{
    private _storage = null;

    /**
     * @constructor
     * @param {string} container Container name to be created in the LocalStorage.
     * @param {StorageType} type[optional] Storage Type to be used, defaults to Local Storage.
    */
    constructor(private _container: string, type?: StorageType) {
        super();
        type = type || StorageType.LocalStorage;
        this.switchStorage(type);
    }

    /**
     * Switch the storage type
     * Switches the storage type and then reloads the in-memory collection
     *
     * @type {StorageType} type The desired storage to be used
     */
    switchStorage(type: StorageType) {
        this._storage = type === StorageType.LocalStorage ? localStorage : sessionStorage;
        if (!this._storage.hasOwnProperty(this._container)) {
            this._storage[this._container] = null;
        }

        this.load();
    }

    /**
     * Add an item
     * Extends Dictionary's implementation with a save to the storage.
     * Throws if the same key is available twice.
     */
    add(item: string, value: T): T {
        super.insert(item, value);
        this.save();
        return value;
    }

    /**
     * Remove an item
     * Extends Dictionary's implementation with a save to the storage
     */
    remove(item: string) {
        var value = super.remove(item);
        this.save();
        return value;
    }

    /**
     * Clear the storage
     * Extends Dictionary's implementation with a save to the storage
     */
    clear() {
        super.clear();
        this._storage[this._container] = null;
    }

    /**
     * Clear all storages
     * completely clears all storages
     */
    static clearAll() {
        window.localStorage.clear();
        window.sessionStorage.clear();
    }

    /**
     * Saves the current state to the storage
     */
    save() {
        this._storage[this._container] = JSON.stringify(this.items);
    }

    /**
     * Refreshes the storage with the current localstorage values.
     */
    load() {
        super.clear();
        this.items = JSON.parse(this._storage[this._container]);
        if (this.items == null) this.items = {};
        return this.items;
    }
}
