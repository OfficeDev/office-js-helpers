// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
import { isObject, isNil, isString, isEmpty } from 'lodash-es';

export interface KeyValuePair<T> {
  key: string,
  value: T
}

/**
 * Helper for creating and querying Dictionaries.
 * A wrapper around ES6 Maps.
 */
export class Dictionary<T> {
  protected _items: Map<string, T>;

  /**
   * @constructor
   * @param {object} items Initial seed of items.
   */
  constructor(items?: { [index: string]: T } | Array<[string, T]> | Map<string, T>) {
    if (isNil(items)) {
      this._items = new Map();
    }
    else if (items instanceof Set) {
      throw new TypeError(`Invalid type of argument: Set`);
    }
    else if (items instanceof Map) {
      this._items = new Map(items);
    }
    else if (Array.isArray(items)) {
      this._items = new Map(items);
    }
    else if (isObject(items)) {
      this._items = new Map();
      for (const key of Object.keys(items)) {
        this._items.set(key, items[key]);
      }
    }
    else {
      throw new TypeError(`Invalid type of argument: ${typeof items}`);
    }
  }

  *[Symbol.iterator](): IterableIterator<KeyValuePair<T>> {
    let key: IteratorResult<string> = null;
    while (key = this.keys().next()) {
      const value = this.get(key.value);
      yield ({ key: key.value, value });
    }
  }

  /**
   * Gets an item from the dictionary.
   *
   * @param {string} key The key of the item.
   * @return {object} Returns an item if found.
   */
  get(key: string): T {
    return this._items.get(key);
  }

  /**
   * Inserts an item into the dictionary.
   * If an item already exists with the same key, it will be overridden by the new value.
   *
   * @param {string} key The key of the item.
   * @param {object} value The item to be added.
   * @return {object} Returns the added item.
   */
  set(key: string, value: T): T {
    this._validateKey(key);
    this._items.set(key, value);
    return value;
  }

  /**
   * Removes an item from the dictionary.
   * Will throw if the key doesn't exist.
   *
   * @param {string} key The key of the item.
   * @return {object} Returns the deleted item.
   */
  delete(key: string): T {
    if (!this.has(key)) {
      throw new ReferenceError(`Key: ${key} not found.`);
    }
    let value = this._items.get(key);
    this._items.delete(key);
    return value;
  }

  /**
   * Clears the dictionary.
   */
  clear(): void {
    this._items.clear();
  }

  /**
   * Check if the dictionary contains the given key.
   *
   * @param {string} key The key of the item.
   * @return {boolean} Returns true if the key was found.
   */
  has(key: string): boolean {
    this._validateKey(key);
    return this._items.has(key);
  }

  /**
   * Lists all the keys in the dictionary.
   *
   * @return {array} Returns all the keys.
   */
  keys(): IterableIterator<string> {
    return this._items.keys();
  }

  /**
   * Lists all the values in the dictionary.
   *
   * @return {array} Returns all the values.
   */
  values(): IterableIterator<T> {
    return this._items.values();
  }

  /**
   * Get a shallow copy of the underlying map.
   *
   * @return {object} Returns the shallow copy of the map.
   */
  clone(): Map<string, T> {
    return new Map(this._items);
  }

  /**
   * Number of items in the dictionary.
   *
   * @return {number} Returns the number of items in the dictionary.
   */
  get count(): number {
    return this._items.size;
  }

  private _validateKey(key: string): void {
    if (!isString(key) || isEmpty(key)) {
      throw new TypeError('Key needs to be a string');
    }
  }
}
