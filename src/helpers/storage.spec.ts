import { Storage, StorageType } from './storage';

describe('Storage creation', () => {
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

  it('switches to a session storage if storage type is passed', () => {
    // Setup
    const storage = new Storage('container', StorageType.SessionStorage);

    // Assert
    expect((storage as any)._storage).toBe(sessionStorage);
  });

  it('switches to a in memory storage if storage type is passed', () => {
    // Setup
    const storage = new Storage('container', StorageType.InMemoryStorage);

    // Assert
    expect(((storage as any)._storage._map) instanceof Map).toBeTruthy();
  });
});
