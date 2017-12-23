import { Storage, StorageType } from './storage';

describe('it storage creation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a new empty storage with container', () => {
    // Setup
    const storage = new Storage('container');

    // Assert
    expect(storage).toBeDefined();
    expect(storage.count).toBe(0);
  });

  it('sets the container correctly', () => {
    // Setup
    const storage = new Storage('container');

    // Assert
    expect(storage.container).toBe('container');
  });

  it('defaults to localStorage', () => {
    // Setup
    const storage = new Storage('container');

    // Assert
    expect((storage as any)._storage).toBe(localStorage);
  });

  it('throws an error if an invalid key is passed', () => {
    // Assert
    expect(() => new Storage(null)).toThrowError(TypeError);
  });

  it('switches to a different storage if storage type is passed', () => {
    // Setup
    const storage = new Storage('container', StorageType.SessionStorage);

    // Assert
    expect((storage as any)._storage).toBe(sessionStorage);
  });

  it('opens an existing container', () => {
    // Setup
    localStorage.clear();
    localStorage.setItem('@container/item1', 'item1');
    const storage = new Storage('container', StorageType.SessionStorage);

    // Assert
    expect(storage.get('item1')).toBe('item1');
    expect(storage.count).toBe(1);
  });
});

// describe('it storage operations', () => {
//   let storage: Storage<any>;

//   beforeEach(() => {
//     localStorage.clear();
//     localStorage.setItem('@container/item1', 'item1');
//     localStorage.setItem('@container/item2', '2012-04-23T18:25:43.511Z');
//     localStorage.setItem('@container/item3', '{"subitem1":"subitem1"}');
//     storage = new Storage('container');
//   });

//   describe('Get', () => {
//     it('returns an object', () => {
//       // Assert
//       expect(storage.get('item1')).toBe(1);
//     });

//     it('returns undefined if the object doesn\'t exist', () => {
//       // Assert
//       expect(storage.get('item4')).toBeUndefined();
//     });

//     it('returns undefined if the key is invalid', () => {
//       // Assert
//       expect(storage.get(undefined)).toBeUndefined();
//     });
//   });

//   describe('Set', () => {
//     it('inserts the object', () => {
//       // Setup
//       const originalCount = storage.count;
//       storage.set('item4', 4);
//       const item = storage.get('item4');

//       // Assert
//       expect(item).toEqual(4);
//       expect(storage.count).toEqual(originalCount + 1);
//     });

//     it('returns the inserted object', () => {
//       // Setup
//       const item = storage.set('item4', 4);

//       // Assert
//       expect(item).toEqual(4);
//     });

//     it('replaces if the key already exists', () => {
//       // Setup
//       storage.set('item4', 4);
//       let item = storage.get('item4');
//       expect(item).toEqual(4);

//       // Assert
//       storage.set('item4', 'random');
//       item = storage.get('item4');
//       expect(item).toEqual('random');
//     });

//     it('throws if the key is invalid', () => {
//       // Assert
//       expect(() => storage.set(null, 'random')).toThrow(TypeError);
//       expect(() => storage.set(2 as any, 'random')).toThrow(TypeError);
//     });
//   });

//   describe('Delete', () => {
//     it('deletes the object', () => {
//       // Setup
//       const originalCount = storage.count;
//       storage.delete('item3');
//       const item = storage.get('item3');

//       // Assert
//       expect(item).toBeUndefined();
//       expect(storage.count).toEqual(originalCount - 1);
//     });

//     it('returns the deleted object', () => {
//       // Setup
//       const item = storage.delete('item1');

//       // Assert
//       expect(item).toEqual(1);
//     });

//     it('throws if the doesn\'t exist', () => {
//       // Assert
//       expect(() => storage.delete('item4')).toThrow(ReferenceError);
//     });

//     it('throws if the key is invalid', () => {
//       // Assert
//       expect(() => storage.delete(null)).toThrow(TypeError);
//       expect(() => storage.delete(2 as any)).toThrow(TypeError);
//     });
//   });

//   describe('Clear', () => {
//     it('empties the storage', () => {
//       // Setup
//       storage.clear();
//       const item = storage.get('item4');

//       // Assert
//       expect(item).toBeUndefined();
//       expect(storage.count).toEqual(0);
//     });
//   });

//   describe('Keys', () => {
//     it('returns the keys in the storage', () => {
//       // Setup
//       const keys = storage.keys();

//       // Assert
//       expect(keys).toBeDefined();
//       expect(keys.next().value).toBe('item1');
//     });
//   });

//   describe('Values', () => {
//     it('returns the values in the storage', () => {
//       // Setup
//       const values = storage.values();

//       // Assert
//       expect(values).toBeDefined();
//       expect(values.next().value).toBe(1);
//     });
//   });

//   describe('Clone', () => {
//     it('returns a shallow copy of the dictonary', () => {
//       // Setup
//       const dictionaryCopy = storage.clone();

//       // Assert
//       expect(dictionaryCopy).toBeDefined();
//     });

//     it('ensure the copy is shallow', () => {
//       // Setup
//       const dictionaryCopy = storage.clone();
//       dictionaryCopy.set('item1', 10);

//       // Assert
//       expect(dictionaryCopy.get('item1')).toEqual(10);
//       expect(storage.get('item1')).toEqual(1);
//     });
//   });

//   describe('Count', () => {
//     it('returns the count of the dictonary', () => {
//       // Setup
//       const count = storage.count;

//       // Assert
//       expect(count).toEqual(3);
//     });
//   });

//   describe('Iterator', () => {
//     it('iterators over the key value pair of the storage', () => {
//       // Setup
//       for (const kvp of storage) {
//         // Assert
//         expect(kvp.key).toEqual('item1');
//         expect(kvp.value).toEqual(1);
//         break;
//       }
//     });
//   });
// });
