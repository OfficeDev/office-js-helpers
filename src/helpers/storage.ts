// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

import { Dictionary } from './dictionary';
import { Utilities } from './utilities';

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
    static _observers: ((e: StorageEvent) => any)[] = [];
    static _storageEventRegistered: boolean;

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
        this.load();
        super.add(item, value);
        this.save();
        return value;
    }

    /**
     * Add or Update an item.
     * Extends Dictionary's implementation of insert, with a save to the storage.
     */
    insert(item: string, value: T): T {
        this.load();
        super.insert(item, value);
        this.save();
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
     * Saves the current state to the storage.
     */
    save() {
        this._storage.setItem(this.container, JSON.stringify(this.items));
    }

    /**
     * Refreshes the storage with the current localStorage values.
     */
    load() {
        let items = JSON.parse(this._storage.getItem(this.container));
        this.items = Utilities.extend({}, this.items, items);
    }

    /**
     * Registers an event handler for the window.storage event and
     * triggers the observer when the storage event is fired.
     *
     * The window.storage event is registered only once.
     */
    onStorage(observer: (e: StorageEvent) => any) {
        Storage._observers.push(observer);
    }

    private _registerStorageEvent() {
        this.onStorage(event => this.load());

        if (Storage._storageEventRegistered) {
            return;
        }

        window.onstorage = event => this._notifyObservers(event);
        Storage._storageEventRegistered = true;
    }

    private _notifyObservers = (event?: StorageEvent) => Storage._observers.forEach(observer => observer(event));
}
