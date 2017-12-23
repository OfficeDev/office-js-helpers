import { Dictionary } from './dictionary';

describe('Dictionary creation', () => {
  it('creates a new empty dictionary', () => {
    // Setup
    const dictionary = new Dictionary();

    // Assert
    expect(dictionary).toBeDefined();
    expect(dictionary.count).toBe(0);
  });

  it('creates a dictionary from a Map<string, T>', () => {
    // Setup
    const dictionary = new Dictionary<any>(new Map<string, any>([
      ['item1', 1],
      ['item2', 'the second item'],
      ['item3', { number: 3 }]
    ]));

    // Assert
    expect(dictionary).toBeDefined();
    expect(dictionary.count).toBe(3);
    expect(dictionary.get('item1')).toBe(1);
    expect(dictionary.get('item2')).toBe('the second item');
  });

  it('creates a dictionary from Array<[string, T]>', () => {
    // Setup
    const dictionary = new Dictionary<any>([
      ['item1', 1],
      ['item2', 'the second item'],
      ['item3', { number: 3 }]
    ]);

    // Assert
    expect(dictionary).toBeDefined();
    expect(dictionary.count).toBe(3);
    expect(dictionary.get('item1')).toBe(1);
    expect(dictionary.get('item2')).toBe('the second item');
  });

  it('creates a dictionary from an Object', () => {
    // Setup
    const dictionary = new Dictionary<any>({
      item1: 1,
      item2: 'the second item',
      item3: { number: 3 }
    });

    // Assert
    expect(dictionary).toBeDefined();
    expect(dictionary.count).toBe(3);
    expect(dictionary.get('item1')).toBe(1);
    expect(dictionary.get('item2')).toBe('the second item');
  });

  it('fails if Dictionary is instantiated with invalid values', () => {
    // Assert
    expect(() => new Dictionary(2 as any)).toThrow(TypeError);
    expect(() => new Dictionary(new Set() as any)).toThrow(TypeError);
    expect(() => new Dictionary('new Set() as any)' as any)).toThrow(TypeError);
  });
});

describe('Dictionary operations', () => {
  let dictionary: Dictionary<any>;

  beforeEach(() => {
    dictionary = new Dictionary({
      item1: 1,
      item2: 'the second item',
      item3: { number: 3 }
    });
  });

  describe('Get', () => {
    it('returns an object', () => {
      // Assert
      expect(dictionary.get('item1')).toBe(1);
    });

    it('returns undefined if the object doesn\'t exist', () => {
      // Assert
      expect(dictionary.get('item4')).toBeUndefined();
    });

    it('returns undefined if the key is invalid', () => {
      // Assert
      expect(dictionary.get(undefined)).toBeUndefined();
    });
  });

  describe('Set', () => {
    it('inserts the object', () => {
      // Setup
      const originalCount = dictionary.count;
      dictionary.set('item4', 4);
      const item = dictionary.get('item4');

      // Assert
      expect(item).toBe(4);
      expect(dictionary.count).toBe(originalCount + 1);
    });

    it('returns the inserted object', () => {
      // Setup
      const item = dictionary.set('item4', 4);

      // Assert
      expect(item).toBe(4);
    });

    it('replaces if the key already exists', () => {
      // Setup
      dictionary.set('item4', 4);
      let item = dictionary.get('item4');
      expect(item).toBe(4);

      // Assert
      dictionary.set('item4', 'random');
      item = dictionary.get('item4');
      expect(item).toBe('random');
    });

    it('throws if the key is invalid', () => {
      // Assert
      expect(() => dictionary.set(null, 'random')).toThrow(TypeError);
      expect(() => dictionary.set(2 as any, 'random')).toThrow(TypeError);
    });
  });

  describe('Delete', () => {
    it('deletes the object', () => {
      // Setup
      const originalCount = dictionary.count;
      dictionary.delete('item3');
      const item = dictionary.get('item3');

      // Assert
      expect(item).toBeUndefined();
      expect(dictionary.count).toBe(originalCount - 1);
    });

    it('returns the deleted object', () => {
      // Setup
      const item = dictionary.delete('item1');

      // Assert
      expect(item).toBe(1);
    });

    it('throws if the doesn\'t exist', () => {
      // Assert
      expect(() => dictionary.delete('item4')).toThrow(ReferenceError);
    });

    it('throws if the key is invalid', () => {
      // Assert
      expect(() => dictionary.delete(null)).toThrow(TypeError);
      expect(() => dictionary.delete(2 as any)).toThrow(TypeError);
    });
  });

  describe('Clear', () => {
    it('empties the dictionary', () => {
      // Setup
      dictionary.clear();
      const item = dictionary.get('item4');

      // Assert
      expect(item).toBeUndefined();
      expect(dictionary.count).toBe(0);
    });
  });

  describe('Keys', () => {
    it('returns the keys in the dictionary', () => {
      // Setup
      const keys = dictionary.keys();

      // Assert
      expect(keys).toBeDefined();
      expect(keys[0]).toBe('item1');
    });
  });

  describe('Values', () => {
    it('returns the values in the dictionary', () => {
      // Setup
      const values = dictionary.values();

      // Assert
      expect(values).toBeDefined();
      expect(values[0]).toBe(1);
    });
  });

  describe('Clone', () => {
    it('returns a shallow copy of the dictonary', () => {
      // Setup
      const dictionaryCopy = dictionary.clone();

      // Assert
      expect(dictionaryCopy).toBeDefined();
    });

    it('ensure the copy is shallow', () => {
      // Setup
      const dictionaryCopy = dictionary.clone();
      dictionaryCopy.set('item1', 10);

      // Assert
      expect(dictionaryCopy.get('item1')).toBe(10);
      expect(dictionary.get('item1')).toBe(1);
    });
  });

  describe('Count', () => {
    it('returns the count of the dictonary', () => {
      // Setup
      const count = dictionary.count;

      // Assert
      expect(count).toBe(3);
    });
  });
});
