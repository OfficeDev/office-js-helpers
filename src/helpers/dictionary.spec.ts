// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

import { Dictionary } from './dictionary';

export default describe('Testing Dictionary', () => {

    describe('Creation:', () => {
        it('should create an empty dictionary', () => {
            let dictionary = new Dictionary();
            expect(dictionary.count).toBe(0);
        });

        it('should initialize with items', () => {
            let items = {
                'blah': 1,
                'random': 2,
                'items': 3
            };

            let dictionary = new Dictionary<any>(items);
            expect(dictionary.count).toBe(3);
        });

        it('should default to empty when initializing incorrectly', () => {
            let dictionary = new Dictionary(10 as any);
            expect(dictionary.count).toBe(0);

            dictionary = new Dictionary([1, 2, 3] as any);
            expect(dictionary.count).toBe(0);

            dictionary = new Dictionary(null as any);
            expect(dictionary.count).toBe(0);

            dictionary = new Dictionary(undefined as any);
            expect(dictionary.count).toBe(0);
        });
    });

    describe('Mutation:', () => {
        let dictionary: Dictionary<any>;

        beforeEach(() => {
            dictionary = new Dictionary<any>({
                'Google': {
                    cliendId: 'clientId',
                    redirectUrl: 'redirectUrl',
                    scope: 'scope',
                    nonce: true
                },
                'Microsoft': {
                    cliendId: 'clientId',
                    redirectUrl: 'redirectUrl',
                    scope: 'scope',
                    nonce: true
                },
                'Facebook': {
                    cliendId: 'clientId',
                    redirectUrl: 'redirectUrl',
                    scope: 'scope',
                    nonce: true
                }
            });
        });

        it('should get if key exists', () => {
            let google = dictionary.get('Google');
            expect(google).not.toBeNull();

            let random = dictionary.get('Random');
            expect(random).toBeNull();

            expect(() => dictionary.get(null)).toThrowError();
        });

        it('should add if key is unique', () => {
            dictionary.add('Random', {
                cliendId: 'clientId',
                redirectUrl: 'redirectUrl',
                scope: 'scope',
                nonce: true
            });
            let random = dictionary.get('Random');
            expect(random).not.toBeNull();

            dictionary.add('NullValue', null);
            let nullTest = dictionary.get('NullValue');
            expect(nullTest).toBeNull();

            expect(() => dictionary.add('Random', {})).toThrowError();

            expect(() => dictionary.add(null, {})).toThrowError();
        });

        it('should return the count', () => {
            let count = dictionary.count;
            expect(count).toBe(3);
        });

        it('should clear the dictionary', () => {
            dictionary.clear();

            let count = dictionary.count;
            expect(count).toBe(0);

            let google = dictionary.get('Google');
            expect(google).toBeNull();
        });

        it('should add or update', () => {
            dictionary.insert('Random', {
                cliendId: 'clientId',
                redirectUrl: 'redirectUrl',
                scope: 'scope',
                nonce: true
            });

            let random = dictionary.get('Random');
            expect(random).not.toBeNull();

            dictionary.insert('NullValue', null);
            let nullTest = dictionary.get('NullValue');
            expect(nullTest).toBeNull();

            expect(() => {
                dictionary.insert('Random', 123);
                let random = dictionary.get('Random');
                expect(random).toBe(123);
            }).not.toThrowError();

            expect(() => {
                dictionary.insert(null, {});
            }).toThrowError();
        });

        it('should return the keys in the dictionary', () => {
            let keys = dictionary.keys();
            expect(keys).not.toBeNull();
            expect(keys).toEqual(jasmine.arrayContaining(['Google', 'Microsoft']));
            expect(keys).not.toEqual(jasmine.arrayContaining(['Random']));

            dictionary.clear();
            keys = dictionary.keys();
            expect(keys).not.toBeNull();
            expect(keys.length).toBe(0);
        });

        it('should return the values in the dictionary', () => {
            let values = dictionary.values();
            expect(values).not.toBeNull();
            expect(values).toEqual(jasmine.arrayContaining(['Google', 'Microsoft']));
            expect(values).not.toEqual(jasmine.arrayContaining(['Random']));

            dictionary.clear();
            values = dictionary.keys();
            expect(values).not.toBeNull();
            expect(values.length).toBe(0);
        });

        it('should remove the value for the key', () => {
            dictionary.remove('Google');
            expect(dictionary.count).toBe(2);

            let item = dictionary.get('Google');
            expect(item).toBeNull();

            expect(() => dictionary.remove('Google')).toThrowError();

            dictionary.clear();
            expect(() => dictionary.remove('Microsoft')).toThrowError();
        });

        it('should return the current state of the dictionary', () => {
            let items = dictionary.lookup();
            expect(items).toEqual(jasmine.objectContaining({
                'Google': {
                    cliendId: 'clientId',
                    redirectUrl: 'redirectUrl',
                    scope: 'scope',
                    nonce: true
                }
            }));

            items['Random'] = 123;

            let random = dictionary.get('Random');
            expect(random).toBeNull();

            dictionary.clear();
            items = dictionary.lookup();
            expect(items).toBeNull();
        });
    });
});
