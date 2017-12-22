/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { debounce } from 'lodash-es';
import { Dictionary } from './dictionary';
import * as md5 from 'crypto-js/md5';
import { Observable } from 'rxjs/Observable';

const NOTIFICATION_DEBOUNCE = 300;

export enum StorageType {
  LocalStorage,
  SessionStorage
}

export interface Listener {
  subscribe(): Subscription;
  subscribe(next?: () => void, error?: (error: any) => void, complete?: () => void): Subscription;
}

export interface Subscription {
  // A flag to indicate whether this Subscription has already been unsubscribed.
  closed: boolean;
  // Disposes the resources held by the subscription. May, for instance, cancel
  // an ongoing Observable execution or cancel any other type of work that
  // started when the Subscription was created.
  unsubscribe(): void;
}

/**
 * Helper for creating and querying Local Storage or Session Storage.
 * Uses {@link Dictionary} so all the data is encapsulated in a single
 * storage namespace. Writes update the actual storage.
 */
export class Storage<T> extends Dictionary<T> {
  private _storage: typeof localStorage | typeof sessionStorage = null;
  private _observable: Observable<void> = null;

  private get _current(): Map<string, T> {
    const items = this._storage.getItem(this.container);
    return Dictionary.deserialize(items);
  }

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
  }

  /**
   * Switch the storage type.
   * Switches the storage type and then reloads the in-memory collection.
   *
   * @type {StorageType} type The desired storage to be used.
   */
  switchStorage(type: StorageType) {
    this._storage = type === StorageType.LocalStorage ? localStorage : sessionStorage;
    if (this._storage == null) {
      throw new Error('Browser local or session storage is disabled.');
    }
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
  set(item: string, value: T): T {
    super.set(item, value);
    this._sync(item, value);
    return value;
  }

  /**
   * Remove an item.
   * Extends Dictionary's implementation with a save to the storage.
   */
  delete(item: string) {
    let value = super.delete(item);
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
    this._items = Dictionary.union(this._items, this._current);
  }

  /**
   * Notify that the storage has changed only if the 'notify'
   * property has been subscribed to.
   */
  notify = (): Listener => {
    if (!(this._observable == null)) {
      return this._observable;
    }

    this._observable = new Observable((observer) => {
      // Determine the initial hash for this loop
      let lastHash = md5(Dictionary.serialize(this._items)).toString();

      // Begin the polling at NOTIFICATION_DEBOUNCE duration
      let pollInterval = setInterval(() => {
        try {
          this.load();

          // If the last hash isn't the same as the current hash
          const hash = md5(Dictionary.serialize(this._items)).toString();
          if (hash !== lastHash) {
            lastHash = hash;
            observer.next();
          }
        }
        catch (e) {
          observer.error(e);
        }
      }, NOTIFICATION_DEBOUNCE);

      // Debounced listener to localStorage events given that they fire any change
      let debouncedUpdate = debounce((event: StorageEvent) => {
        try {
          clearInterval(pollInterval);

          // If the change is on the current container
          if (event.key === this.container) {
            this.load();
            observer.next();
          }
        }
        catch (e) {
          observer.error(e);
        }
      }, NOTIFICATION_DEBOUNCE);

      window.addEventListener('storage', debouncedUpdate, false);

      // Teardown
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        window.removeEventListener('storage', debouncedUpdate, false);
        this._observable = null;
      };
    });

    return this._observable;
  }

  /**
   * Synchronizes the current state to the storage.
   */
  private _sync(item: string, value: T) {
    let items = Dictionary.union(this._current, this._items);
    if (value == null) {
      items.delete(item);
    }
    this._storage.setItem(this.container, Dictionary.serialize(items));
    this._items = items;
  }
}
