/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { debounce, isEmpty, isString, keys, values } from 'lodash-es';
import { Observable } from 'rxjs/Observable';
import { Exception } from '../errors/exception';

const NOTIFICATION_DEBOUNCE = 300;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export enum StorageType {
  LocalStorage,
  SessionStorage
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
export class Storage<T> {
  private _storage: typeof localStorage | typeof sessionStorage;
  private _observable: Observable<string> = null;

  /**
   * @constructor
   * @param {string} container Container name to be created in the LocalStorage.
   * @param {StorageType} type[optional] Storage Type to be used, defaults to Local Storage.
   */
  constructor(
    public container: string,
    private _type: StorageType = StorageType.LocalStorage
  ) {
    this.switchStorage(this._type);
  }

  /**
   * Switch the storage type.
   * Switches the storage type and then reloads the in-memory collection.
   *
   * @type {StorageType} type The desired storage to be used.
   */
  switchStorage(type: StorageType) {
    this._storage = type === StorageType.LocalStorage ? window.localStorage : window.sessionStorage;
    if (this._storage == null) {
      throw new Error('Browser local or session storage is not supported.');
    }
    if (!this._storage.hasOwnProperty(this.container)) {
      this._storage[this.container] = null;
    }
  }

  /**
   * Gets an item from the storage.
   *
   * @param {string} key The key of the item.
   * @return {object} Returns an item if found.
   */
  get(key: string): T {
    try {
      const scopedKey = this._scope(key);
      const item = this._storage.getItem(scopedKey);
      return JSON.parse(item, this._reviver.bind(this));
    }
    catch (error) {
      throw new Exception(`Unable to deserialize value for: ${key} `, error);
    }
  }

  /**
   * Inserts an item into the storage.
   * If an item already exists with the same key,
   * it will be overridden by the new value.
   *
   * @param {string} key The key of the item.
   * @param {object} value The item to be added.
   * @return {object} Returns the added item.
   */
  set(key: string, value: T): T {
    this._validateKey(key);
    try {
      const scopedKey = this._scope(key);
      const item = JSON.stringify(value);
      this._storage.setItem(scopedKey, item);
      return value;
    }
    catch (error) {
      throw new Exception(`Unable to serialize value for: ${key} `, error);
    }
  }

  /**
   * Removes an item from the storage.
   * Will throw if the key doesn't exist.
   *
   * @param {string} key The key of the item.
   * @return {object} Returns the deleted item.
   */
  delete(key: string): T {
    try {
      let value = this.get(key);
      if (value === undefined) {
        throw new ReferenceError(`Key: ${key} not found.`);
      }
      const scopedKey = this._scope(key);
      this._storage.removeItem(scopedKey);
      return value;
    }
    catch (error) {
      throw new Exception(`Unable to delete '${key}' from storage`, error);
    }
  }

  /**
   * Clear the storage.
   */
  clear() {
    this._storage.removeItem(this.container);
  }

  /**
   * Check if the storage contains the given key.
   *
   * @param {string} key The key of the item.
   * @return {boolean} Returns true if the key was found.
   */
  has(key: string): boolean {
    this._validateKey(key);
    return this.get(key) !== undefined;
  }

  /**
   * Lists all the keys in the storage.
   *
   * @return {array} Returns all the keys.
   */
  keys(): Array<string> {
    try {
      return keys(this._storage);
    }
    catch (error) {
      throw new Exception(`Unable to get keys from storage`, error);
    }
  }

  /**
   * Lists all the values in the storage.
   *
   * @return {array} Returns all the values.
   */
  values(): Array<string> {
    try {
      return values(this._storage);
    }
    catch (error) {
      throw new Exception(`Unable to get values from storage`, error);
    }
  }

  /**
   * Clear all storages.
   * Completely clears both the localStorage and sessionStorage.
   */
  static clearAll(): void {
    window.localStorage.clear();
    window.sessionStorage.clear();
  }

  /**
   * Returns an observable that triggers everytime there's a Storage Event
   * or if the collection is modified in a different tab.
   */
  notify(next: () => void, error?: (error: any) => void, complete?: () => void): Subscription {
    const containerRegex = new RegExp(`^@${this.container}\/`);
    if (!(this._observable == null)) {
      return this._observable.subscribe(next, error, complete);
    }

    this._observable = new Observable<string>((observer) => {
      // Debounced listener to storage events
      let debouncedUpdate = debounce((event: StorageEvent) => {
        try {
          // If the change is on the current container
          if (containerRegex.test(event.key)) {
            // Notify the listener of the change
            observer.next(event.key);
          }
        }
        catch (e) {
          observer.error(e);
        }
      }, NOTIFICATION_DEBOUNCE);

      window.addEventListener('storage', debouncedUpdate, false);

      // Teardown
      return () => {
        window.removeEventListener('storage', debouncedUpdate, false);
        this._observable = null;
      };
    });

    return this._observable.subscribe(next, error, complete);
  }

  private _validateKey(key: string): void {
    if (!isString(key)) {
      throw new TypeError('Key needs to be a string');
    }
    if (key == null) {
      throw new TypeError('Key cannot be null or undefined');
    }
  }

  /**
   * Determine if the value was a Date type and if so return a Date object instead.
   * https://blog.mariusschulz.com/2016/04/28/deserializing-json-strings-as-javascript-date-objects
   */
  private _reviver(_key: string, value: any) {
    if (isString(value) && DATE_REGEX.test(value)) {
      return new Date(value);
    }
    return value;
  }

  /**
   * Scope the key to the container as @<container>/<key> so as to easily identify
   * the item in localStorage and reduce collisions
   * @param key key to be scoped
   */
  private _scope(key: string): string {
    if (isEmpty(this.container)) {
      return key;
    }
    return `@${this.container}/${key}`;
  }
}
