/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { debounce, isEmpty, isString, isNil } from 'lodash-es';
import { Observable } from 'rxjs/Observable';
import { Exception } from '../errors/exception';

const NOTIFICATION_DEBOUNCE = 300;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

export enum StorageType {
  LocalStorage,
  SessionStorage,
  InMemoryStorage
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
  private _containerRegex: RegExp = null;

  /**
   * @constructor
   * @param {string} container Container name to be created in the LocalStorage.
   * @param {StorageType} type[optional] Storage Type to be used, defaults to Local Storage.
   */
  constructor(
    public container: string,
    private _type: StorageType = StorageType.LocalStorage
  ) {
    this._validateKey(container);
    this._containerRegex = new RegExp(`^@${this.container}\/`);
    this.switchStorage(this._type);
  }

  /**
   * Switch the storage type.
   * Switches the storage type and then reloads the in-memory collection.
   *
   * @type {StorageType} type The desired storage to be used.
   */
  switchStorage(type: StorageType) {
    switch (type) {
      case StorageType.LocalStorage:
        this._storage = window.localStorage;
        break;

      case StorageType.SessionStorage:
        this._storage = window.sessionStorage;
        break;

      case StorageType.InMemoryStorage:
        this._storage = new InMemoryStorage() as any;
        break;
    }
    if (isNil(this._storage)) {
      throw new Exception('Browser local or session storage is not supported.');
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
    const scopedKey = this._scope(key);
    const item = this._storage.getItem(scopedKey);
    try {
      return JSON.parse(item, this._reviver.bind(this));
    }
    catch (_error) {
      return item as any;
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
      return Object.keys(this._storage).filter(key => this._containerRegex.test(key));
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
  values(): Array<T> {
    try {
      return this.keys().map(key => this.get(key));
    }
    catch (error) {
      throw new Exception(`Unable to get values from storage`, error);
    }
  }

  /**
   * Number of items in the store.
   *
   * @return {number} Returns the number of items in the dictionary.
   */
  get count(): number {
    try {
      return this.keys().length;
    }
    catch (error) {
      throw new Exception(`Unable to get size of localStorage`, error);
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
    if (!(this._observable == null)) {
      return this._observable.subscribe(next, error, complete);
    }

    this._observable = new Observable<string>((observer) => {
      // Debounced listener to storage events
      let debouncedUpdate = debounce((event: StorageEvent) => {
        try {
          // If the change is on the current container
          if (this._containerRegex.test(event.key)) {
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
    if (!isString(key) || isEmpty(key)) {
      throw new TypeError('Key needs to be a string');
    }
  }

  /**
   * Determine if the value was a Date type and if so return a Date object instead.
   * Regex matches an ISO date string.
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

/**
 * Creating a mock for folks who don't want to use localStorage.
 * This will still allow them to use the APIs.
*/
class InMemoryStorage {
  private _map: Map<string, string>;

  constructor() {
    console.warn(`Using non persistant storage. Data will be lost when browser is refreshed/closed`);
    this._map = new Map();
  }

  get length(): number {
    return this._map.size;
  }

  clear(): void {
    this._map.clear();
  }

  getItem(key: string): string {
    return this._map.get(key);
  }

  removeItem(key: string): boolean {
    return this._map.delete(key);
  }

  setItem(key: string, data: string): void {
    this._map.set(key, data);
  }

  key(index: number): string {
    let result = undefined;
    let ctr = 0;
    this._map.forEach((_val, key) => {
      if (++ctr === index) {
        result = key;
      }
    });
    return result;
  }
}
