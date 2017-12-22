// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
import { isObject, isNil, isString } from 'lodash-es';

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

  /**
   * Gets an item from the dictionary.
   *
   * @param {string} key The key of the item.
   * @return {object} Returns an item if found, else returns null.
   */
  get(key: string): T {
    return this._items.get(key);
  }

  /**
   * Adds an item into the dictionary.
   * If the key already exists, then it will throw.
   *
   * @param {string} key The key of the item.
   * @param {object} value The item to be added.
   * @return {object} Returns the added item.
   */
  add(key: string, value: T): T {
    if (this._items.has(key)) {
      throw new ReferenceError(`Key: ${key} already exists.`);
    }
    return this.insert(key, value);
  }

  /**
   * Inserts an item into the dictionary.
   * If an item already exists with the same key, it will be overridden by the new value.
   *
   * @param {string} key The key of the item.
   * @param {object} value The item to be added.
   * @return {object} Returns the added item.
   */
  insert(key: string, value: T): T {
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
  remove(key: string): T {
    this._validateKey(key);
    if (!this._items.has(key)) {
      throw new ReferenceError(`Key: ${key} not found.`);
    }
    let value = this._items.get(key);
    this._items.delete(key);
    return value;
  }

  /**
   * Clears the dictionary.
   */
  clear() {
    this._items.clear();
  }

  /**
   * Check if the dictionary contains the given key.
   *
   * @param {string} key The key of the item.
   * @return {boolean} Returns true if the key was found.
   */
  contains(key: string): boolean {
    if (key == null) {
      throw new Error('Key cannot be null or undefined');
    }
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
   * Get the map representation of the dictionary.
   *
   * @return {object} Returns the map representation of the dictionary.
   */
  lookup(): Map<string, T> {
    return new Map(this._items);
  }

  /**
   * Serializes the map to a string
   * @param items Map that needs to be serialized
   */
  static serialize<T>(items: Map<string, T>): string {
    try {
      return JSON.stringify(Array.from(items));
    }
    catch (error) {
      throw new Error('Unable to serialize map. Invalid structure.');
    }
  }

  /**
   * Deserializes the string into a map
   * @param items String of items that correspond to a valid map
   */
  static deserialize<T>(items: string): Map<string, T> {
    try {
      return new Dictionary<T>(JSON.parse(items)).lookup();
    }
    catch (error) {
      throw new Error('Unable to deserialize map. Invalid structure.');
    }
  }

  /**
   * Merges two or more maps into a single map
   */
  static union<T>(map1: Map<string, T>, map2: Map<string, T>, ...args: Map<string, T>[]) {
    try {
      const flattendMap = args.reduce((agg, item) => agg = [...agg, ...Array.from(item)], []);
      return new Map<string, T>([...Array.from(map1), ...Array.from(map2), ...flattendMap]);
    }
    catch (error) {
      throw new Error('Unable to merge map. Invalid structure.');
    }
  }

  /**
   * Number of items in the dictionary.
   *
   * @return {number} Returns the number of items in the dictionary.
   */
  get count(): number {
    return this._items.size;
  }

  private _validateKey(key: string) {
    if (!isString(key)) {
      throw new TypeError('Key needs to be a string');
    }
    if (key == null) {
      throw new TypeError('Key cannot be null or undefined');
    }
  }
}
