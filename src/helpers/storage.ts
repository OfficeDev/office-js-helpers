// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

import extend = require('lodash/extend');
import { Dictionary } from './dictionary';

export enum StorageType {
    LocalStorage,
    SessionStorage
}

/**
 * Helper for creating and querying Local Storage or Session Storage.
 * Uses {@link Dictionary} so all the data is encapsulated in a single
 * storage namespace. Writes update the actual storage.
 */
export class Storage<T> extends Dictionary<T> {
    private _storage: typeof localStorage | typeof sessionStorage = null;
    private _storageEventRegistered: boolean;

    /**
     * @constructor
     * @param {string} container Container name to be created in the LocalStorage.
     * @param {StorageType} type[optional] Storage Type to be used, defaults to Local Storage.
    */
    constructor(public container: string, type?: StorageType) {
        super();
        type = type || StorageType.LocalStorage;
        this.switchStorage(type);
        this._registerStorageEvent();
    }

    /**
     * Switch the storage type.
     * Switches the storage type and then reloads the in-memory collection.
     *
     * @type {StorageType} type The desired storage to be used.
     */
    switchStorage(type: StorageType) {
        this._storage = type === StorageType.LocalStorage ? localStorage : sessionStorage;
        if (!this._storage.hasOwnProperty(this.container)) {
            this._storage[this.container] = null;
        }

        this.load();
    }

    /**
     * Add an item.
     * Extends Dictionary's implementation of add, with a save to the storage.
     */
    add(item: string, value: T): T {
        super.add(item, value);
        this.save(item);
        return value;
    }

    /**
     * Add or Update an item.
     * Extends Dictionary's implementation of insert, with a save to the storage.
     */
    insert(item: string, value: T): T {
        super.insert(item, value);
        this.save(item);
        return value;
    }

    /**
     * Remove an item.
     * Extends Dictionary's implementation with a save to the storage.
     */
    remove(item: string) {
        this.load();
        let value = super.remove(item);
        this.save();
        return value;
    }

    /**
     * Clear the storage.
     * Extends Dictionary's implementation with a save to the storage.
     */
    clear() {
        super.clear();
        this._storage.removeItem(this.container);
    }

    /**
     * Clear all storages.
     * Completely clears both the localStorage and sessionStorage.
     */
    static clearAll() {
        window.localStorage.clear();
        window.sessionStorage.clear();
    }

    /**
     * Synchronizes the current state to the storage.
     */
    save(item?: string) {
        let items = JSON.parse(this._storage.getItem(this.container));
        if (!(item == null) && item.trim() !== '') {
            items = extend({}, items, { item: this.items[item] });
        }
        else {
            items = extend({}, items, this.items);
        }
        this._storage.setItem(this.container, JSON.stringify(items));
    }

    /**
     * Refreshes the storage with the current localStorage values.
     */
    load() {
        let items = JSON.parse(this._storage.getItem(this.container));
        this.items = extend({}, this.items, items);
    }

    private _registerStorageEvent() {
        if (this._storageEventRegistered) {
            return;
        }

        window.onstorage = event => {
            if (event.key === this.container) {
                console.log('Reading from localStorage');
                this.load();
            }
        };

        this._storageEventRegistered = true;
    }
}
