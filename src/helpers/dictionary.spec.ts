import { Dictionary } from './dictionary';

describe('test dictionary creation', () => {
  test('creates a new empty dictionary', () => {
    const dictionary = new Dictionary();
    expect(dictionary).toBeDefined();
    expect(dictionary.count).toEqual(0);
  });

  test('creates a dictionary from a Map<string, T>', () => {
    // Setup
    const dictionary = new Dictionary<any>(new Map<string, any>([
      ['item1', 1],
      ['item2', 'the second item'],
      ['item3', { number: 3 }]
    ]));

    // Assert
    expect(dictionary).toBeDefined();
    expect(dictionary.count).toEqual(3);
    expect(dictionary.get('item1')).toEqual(1);
    expect(dictionary.get('item2')).toEqual('the second item');
  });

  test('creates a dictionary from Array<[string, T]>', () => {
    // Setup
    const dictionary = new Dictionary<any>([
      ['item1', 1],
      ['item2', 'the second item'],
      ['item3', { number: 3 }]
    ]);

    // Assert
    expect(dictionary).toBeDefined();
    expect(dictionary.count).toEqual(3);
    expect(dictionary.get('item1')).toEqual(1);
    expect(dictionary.get('item2')).toEqual('the second item');
  });

  test('creates a dictionary from an Object', () => {
    // Setup
    const dictionary = new Dictionary<any>({
      item1: 1,
      item2: 'the second item',
      item3: { number: 3 }
    });

    // Assert
    expect(dictionary).toBeDefined();
    expect(dictionary.count).toEqual(3);
    expect(dictionary.get('item1')).toEqual(1);
    expect(dictionary.get('item2')).toEqual('the second item');
  });

  test('fails if Dictionary is instantiated with invalid values', () => {
    // Assert
    expect(() => new Dictionary(2 as any)).toThrow(TypeError);
    expect(() => new Dictionary(new Set() as any)).toThrow(TypeError);
    expect(() => new Dictionary('new Set() as any)' as any)).toThrow(TypeError);
  });
});

describe('test dictionary operations', () => {
  let dictionary: Dictionary<any>;

  beforeEach(() => {
    dictionary = new Dictionary({
      item1: 1,
      item2: 'the second item',
      item3: { number: 3 }
    });
  });

  describe('Get', () => {
    test('returns an object', () => {
      // Assert
      expect(dictionary.get('item1')).toBe(1);
    });

    test('returns undefined if the object doesn\'t exist', () => {
      // Assert
      expect(dictionary.get('item4')).toBeUndefined();
    });

    test('returns undefined if the key is invalid', () => {
      // Assert
      expect(dictionary.get(undefined)).toBeUndefined();
    });
  });

  describe('Set', () => {
    test('inserts the object', () => {
      // Setup
      const originalCount = dictionary.count;
      dictionary.set('item4', 4);
      const item = dictionary.get('item4');

      // Assert
      expect(item).toEqual(4);
      expect(dictionary.count).toEqual(originalCount + 1);
    });

    test('returns the inserted object', () => {
      // Setup
      const item = dictionary.set('item4', 4);

      // Assert
      expect(item).toEqual(4);
    });

    test('replaces if the key already exists', () => {
      // Setup
      dictionary.set('item4', 4);
      let item = dictionary.get('item4');
      expect(item).toEqual(4);

      // Assert
      dictionary.set('item4', 'random');
      item = dictionary.get('item4');
      expect(item).toEqual('random');
    });

    test('throws if the key is invalid', () => {
      // Assert
      expect(() => dictionary.set(null, 'random')).toThrow(TypeError);
      expect(() => dictionary.set(2 as any, 'random')).toThrow(TypeError);
    });
  });

  describe('Delete', () => {
    test('deletes the object', () => {
      // Setup
      const originalCount = dictionary.count;
      dictionary.delete('item3');
      const item = dictionary.get('item3');

      // Assert
      expect(item).toBeUndefined();
      expect(dictionary.count).toEqual(originalCount - 1);
    });

    test('returns the deleted object', () => {
      // Setup
      const item = dictionary.delete('item1');

      // Assert
      expect(item).toEqual(1);
    });

    test('throws if the doesn\'t exist', () => {
      // Assert
      expect(() => dictionary.delete('item4')).toThrow(ReferenceError);
    });

    test('throws if the key is invalid', () => {
      // Assert
      expect(() => dictionary.delete(null)).toThrow(TypeError);
      expect(() => dictionary.delete(2 as any)).toThrow(TypeError);
    });
  });

  describe('Clear', () => {
    test('empties the dictionary', () => {
      // Setup
      dictionary.clear();
      const item = dictionary.get('item4');

      // Assert
      expect(item).toBeUndefined();
      expect(dictionary.count).toEqual(0);
    });
  });

  describe('Keys', () => {
    test('returns the keys in the dictionary', () => {
      // Setup
      const keys = dictionary.keys();

      // Assert
      expect(keys).toBeDefined();
      expect(keys.next().value).toBe('item1');
    });
  });

  describe('Values', () => {
    test('returns the values in the dictionary', () => {
      // Setup
      const values = dictionary.values();

      // Assert
      expect(values).toBeDefined();
      expect(values.next().value).toBe(1);
    });
  });

  describe('Clone', () => {
    test('returns a shallow copy of the dictonary', () => {
      // Setup
      const dictionaryCopy = dictionary.clone();

      // Assert
      expect(dictionaryCopy).toBeDefined();
    });

    test('ensure the copy is shallow', () => {
      // Setup
      const dictionaryCopy = dictionary.clone();
      dictionaryCopy.set('item1', 10);

      // Assert
      expect(dictionaryCopy.get('item1')).toEqual(10);
      expect(dictionary.get('item1')).toEqual(1);
    });
  });
});
