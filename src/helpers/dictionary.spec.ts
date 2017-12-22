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

  describe('Add', () => {
    test('adds the object', () => {
      // Setup
      const originalCount = dictionary.count;
      dictionary.add('item4', 4);
      const item = dictionary.get('item4');

      // Assert
      expect(item).toEqual(4);
      expect(dictionary.count).toEqual(originalCount + 1);
    });

    test('returns the added object', () => {
      // Setup
      const item = dictionary.add('item4', 4);

      // Assert
      expect(item).toEqual(4);
    });

    test('throws if the key already exists', () => {
      // Setup
      dictionary.add('item4', 4);

      // Assert
      expect(() => dictionary.add('item4', 'random')).toThrow(ReferenceError);
    });

    test('throws if the key is invalid', () => {
      // Assert
      expect(() => dictionary.add(null, 'random')).toThrow(TypeError);
      expect(() => dictionary.add(2 as any, 'random')).toThrow(TypeError);
    });
  });

  describe('Insert', () => {
    test('inserts the object', () => {
      // Setup
      const originalCount = dictionary.count;
      dictionary.insert('item4', 4);
      const item = dictionary.get('item4');

      // Assert
      expect(item).toEqual(4);
      expect(dictionary.count).toEqual(originalCount + 1);
    });

    test('returns the inserted object', () => {
      // Setup
      const item = dictionary.insert('item4', 4);

      // Assert
      expect(item).toEqual(4);
    });

    test('replaces if the key already exists', () => {
      // Setup
      dictionary.insert('item4', 4);
      let item = dictionary.get('item4');
      expect(item).toEqual(4);

      // Assert
      dictionary.insert('item4', 'random');
      item = dictionary.get('item4');
      expect(item).toEqual('random');
    });

    test('throws if the key is invalid', () => {
      // Assert
      expect(() => dictionary.insert(null, 'random')).toThrow(TypeError);
      expect(() => dictionary.insert(2 as any, 'random')).toThrow(TypeError);
    });
  });

  describe('Remove', () => {
    test('removes the object', () => {
      // Setup
      const originalCount = dictionary.count;
      dictionary.remove('item3');
      const item = dictionary.get('item3');

      // Assert
      expect(item).toBeUndefined();
      expect(dictionary.count).toEqual(originalCount - 1);
    });

    test('returns the removed object', () => {
      // Setup
      const item = dictionary.remove('item1');

      // Assert
      expect(item).toEqual(1);
    });

    test('throws if the doesn\'t exist', () => {
      // Assert
      expect(() => dictionary.remove('item4')).toThrow(ReferenceError);
    });

    test('throws if the key is invalid', () => {
      // Assert
      expect(() => dictionary.remove(null)).toThrow(TypeError);
      expect(() => dictionary.remove(2 as any)).toThrow(TypeError);
    });
  });

  describe('Clear', () => {

  });
});
