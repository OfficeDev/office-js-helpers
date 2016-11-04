// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

/**
 * Helper exposing useful Utilities for Office-Addins.
 */
export class Utilities {
    // Underscore.js implementation of extend.
    // https://github.com/jashkenas/underscore/blob/master/underscore.js

    /**
     * Utility to clone or merge objects.
     */
    static extend(obj, ...defaults) {
        var length = arguments.length;
        if (length < 2 || obj == null) return obj; // if there are no objects to extend then return the current object
        if (defaults) obj = Object(obj); // create a new object to extend if there are any extensions

        for (var index = 1; index < length; index++) {
            var source = arguments[index]; // foreach object
            if (source == null) continue; // move on if the object is null or undefined
            var keys = Object.keys(source), // get all the keys
                l = keys.length; // cache the length
            for (var i = 0; i < l; i++) {
                var key = keys[i]; // for each key
                if (!defaults || obj[key] === void 0) obj[key] = source[key]; // replace values
            }
        }
        return obj;
    };

    /**
     * Utility to check if the code is running inside of an add-in.
     */
    static isAddin() {
        return window.hasOwnProperty('Office')
            && window.hasOwnProperty('OfficeExtension')
            && (
                window.hasOwnProperty('Excel') ||
                window.hasOwnProperty('Word') ||
                window.hasOwnProperty('OneNote')
            )
    }

    /**
     * Utility to print prettified errors.
     */
    static error(exception: Error, logger?: any)
    static error(exception: string, logger?: any)
    static error(exception: any, logger?: any) {
        if (logger) {
            logger(JSON.stringify(exception));
        }
        else {
            console.group(exception.message || exception)
            console.error(exception);
            if ((exception.stack == null)) {
                console.groupCollapsed('Stack Trace');
                console.error(exception.stack);
                console.groupEnd();
            }
            if (Utilities.isAddin() && exception instanceof (<any>window).OfficeExtension.Error) {
                console.groupCollapsed('Debug Info');
                console.error(exception.debugInfo);
                console.groupEnd();
            }
        }
    }
}