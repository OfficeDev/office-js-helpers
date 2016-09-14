import {Dictionary} from './dictionary';

describe('Creating a dictionary', () => {
    it('should create an empty dictionary', () => {
        var dictionary = new Dictionary();
        expect(dictionary.count).toBe(0);
    });

    it('should initialize with items', () => {
        var items = {
            "blah": 1,
            "random": 2,
            "items": 3
        };

        var dictionary = new Dictionary<any>(items);
        expect(dictionary.count).toBe(3);
    });

    it('should throw when initializing incorrectly', () => {
        expect(() => new Dictionary(10 as any)).toThrow();

        expect(() => new Dictionary([1, 2, 3] as any)).toThrow();

        expect(() => new Dictionary(null as any)).toThrow();

        expect(() => new Dictionary(undefined as any)).toThrow();
    });
});

describe('Using a dictionary', () => {
    var dictionary: Dictionary<any>;

    beforeEach(() => {
        dictionary = new Dictionary<any>({
            "Google": {
                cliendId: 'clientId',
                redirectUrl: 'redirectUrl',
                scope: 'scope',
                nonce: true
            },
            "Microsoft": {
                cliendId: 'clientId',
                redirectUrl: 'redirectUrl',
                scope: 'scope',
                nonce: true
            },
            "Facebook": {
                cliendId: 'clientId',
                redirectUrl: 'redirectUrl',
                scope: 'scope',
                nonce: true
            }
        });
    });

    it('should get if key exists', () => {
        var google = dictionary.get('Google');
        expect(google).not.toBeNull();

        var random = dictionary.get('Random');
        expect(random).toBeNull();

        expect(() => dictionary.get(null)).toThrow();
    });

    it('should add if key is unique', () => {
        dictionary.add('Random', {
            cliendId: 'clientId',
            redirectUrl: 'redirectUrl',
            scope: 'scope',
            nonce: true
        });
        var random = dictionary.get('Random');
        expect(random).not.toBeNull();

        dictionary.add('NullValue', null);
        var nullTest = dictionary.get('NullValue');
        expect(nullTest).toBeNull();

        expect(() => dictionary.add('Random', {})).toThrow();

        expect(() => dictionary.add(null, {})).toThrow();
    });

    it('should return the count', () => {
        var count = dictionary.count;
        expect(count).toBe(3);
    });

    it('should clear the dictionary', () => {
        dictionary.clear();

        var count = dictionary.count;
        expect(count).toBe(0);

        var google = dictionary.get('Google');
        expect(google).toBeNull();
    });

    it('should add or update', () => {
        dictionary.insert('Random', {
            cliendId: 'clientId',
            redirectUrl: 'redirectUrl',
            scope: 'scope',
            nonce: true
        });

        var random = dictionary.get('Random');
        expect(random).not.toBeNull();

        dictionary.insert('NullValue', null);
        var nullTest = dictionary.get('NullValue');
        expect(nullTest).toBeNull();

        expect(() => {
            dictionary.insert('Random', 123);
            var random = dictionary.get('Random');
            expect(random).toBe(123);
        }).not.toThrow();

        expect(() => {
            var alreadyInDictionary = dictionary.insert(null, {});
        }).toThrow();
    });

    it('should return the keys in the dictionary', () => {
        var keys = dictionary.keys();
        expect(keys).not.toBeNull();
        expect(keys).toEqual(jasmine.arrayContaining(['Google', 'Microsoft']));
        expect(keys).not.toEqual(jasmine.arrayContaining(['Random']));

        dictionary.clear();
        keys = dictionary.keys();
        expect(keys).not.toBeNull();
        expect(keys.length).toBe(0);
    });

    it('should return the values in the dictionary', () => {
        var values = dictionary.values();
        expect(values).not.toBeNull();
        expect(values[0]).toEqual(jasmine.objectContaining({ clientId: 'clientId' }));
        expect(values).not.toEqual(jasmine.objectContaining({ access_token: 'access_token' }));

        dictionary.clear();
        values = dictionary.keys();
        expect(values).not.toBeNull();
        expect(values.length).toBe(0);
    });

    it('should remove the value for the key', () => {
        dictionary.remove('Google');
        expect(dictionary.count).toBe(2);

        var item = dictionary.get('Google');
        expect(item).toBeNull();

        expect(() => dictionary.remove('Google')).toThrow();

        dictionary.clear();
        expect(() => dictionary.remove('Microsoft')).toThrow();
    });

    it('should return the current state of the dictionary', () => {
        var items = dictionary.lookup();
        expect(items).toEqual(jasmine.objectContaining({
            'Google': {
                cliendId: 'clientId',
                redirectUrl: 'redirectUrl',
                scope: 'scope',
                nonce: true
            }
        }));

        items['Random'] = 123;

        var random = dictionary.get('Random');
        expect(random).toBeNull();

        dictionary.clear();
        items = dictionary.lookup();
        expect(items).toBeNull();
    });
});
