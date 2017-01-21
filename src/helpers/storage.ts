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

    /**
     * @constructor
     * @param {string} container Container name to be created in the LocalStorage.
     * @param {StorageType} type[optional] Storage Type to be used, defaults to Local Storage.
    */
    constructor(
        public container: string,
        private _type?: StorageType
    ) {
        super();
        this._type = this._type || StorageType.LocalStorage;
        this.switchStorage(this._type);
        window.addEventListener('storage', (event: StorageEvent) => {
            if (this.container === event.key) {
                this.load();
                if (this.notify) {
                    this.notify(event);
                }
            }
        });
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
        this._sync(item, value);
        return value;
    }

    /**
     * Add or Update an item.
     * Extends Dictionary's implementation of insert, with a save to the storage.
     */
    insert(item: string, value: T): T {
        super.insert(item, value);
        this._sync(item, value);
        return value;
    }

    /**
     * Remove an item.
     * Extends Dictionary's implementation with a save to the storage.
     */
    remove(item: string) {
        let value = super.remove(item);
        this._sync(item, null);
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
     * Refreshes the storage with the current localStorage values.
     */
    load() {
        let items = extend({}, this.items, JSON.parse(this._storage.getItem(this.container)));
        this.items = items;
    }

    /**
     * Triggered when the storage is updated from an external source.
     */
    notify: (event?: StorageEvent) => any;

    /**
     * Synchronizes the current state to the storage.
     */
    private _sync(item: string, value: any) {
        let items = extend({}, JSON.parse(this._storage.getItem(this.container)));
        if (value == null) {
            delete items[item];
        }
        else {
            items[item] = value;
        }
        this._storage.setItem(this.container, JSON.stringify(items));
        this.items = items;
    }
}
