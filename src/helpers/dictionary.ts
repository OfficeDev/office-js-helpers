/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */
import { each } from 'lodash-es';

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
  constructor(items?: { [index: string]: T } | [string, T][]) {
    if (Array.isArray(items)) {
      this._items = new Map(items);
    }
    else {
      this._items = new Map();
      each(items, (value, key) => this._items.set(key, value));
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
      throw new Error(`Key: ${key} already exists.`);
    }
    this._items.set(key, value);
    return value;
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
    if (key == null) {
      throw new Error('Key cannot be null or undefined');
    }
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
    if (!this._items.has(key)) {
      throw new Error(`Key: ${key} not found.`);
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
   * Get the dictionary.
   *
   * @return {object} Returns the dictionary if it contains data, null otherwise.
   */
  lookup(): Map<string, T> {
    if (this._items.size > 0) {
      return new Map(this._items);
    }
    return null;
  }

  /**
   * Serializes the Map to a string
   * @param items Map that needs to be serialized
   */
  serialize(items: Map<string, T>): string {
    return JSON.stringify([...items]);
  }

  /**
   * Deserializes the string into a Map
   * @param items String of items that correspond to a valid map
   */
  deserialize(items: string): Map<string, T> {
    return new Map(JSON.parse(items));
  }

  /**
   * Merges two or more maps into a single map
   */
  union(map1: Map<string, T>, map2: Map<string, T>, ...args: Map<string, T>[]) {
    const flattendMap = args.reduce((agg, item) => agg = [...agg, ...item], []);
    return new Map<string, T>([...map1, ...map2, ...flattendMap]);
  }

  /**
   * Number of items in the dictionary.
   *
   * @return {number} Returns the number of items in the dictionary.
   */
  get count(): number {
    return this._items.size;
  }
}
