// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

/**
 * Enumeration for the execution context types
 */
export enum HostTypes {
    Web,
    Word,
    Excel,
    PowerPoint,
    OneNote,
    Project
}

/**
 * Helper exposing useful Utilities for Office-Addins.
 */
export class Utilities {
    // Underscore.js implementation of extend.
    // https://github.com/jashkenas/underscore/blob/master/underscore.js

    /**
     * Utility to clone or merge objects.
     */
    static extend(dest, ...sources) {
        let length = arguments.length;
        if (length < 2 || dest == null) {
            return dest; // if there are no objects to extend then return the current object
        }

        if (sources) {
            dest = Object(dest); // create a new object to extend if there are any extensions
        }

        for (let index = 1; index < length; index++) {
            let source = arguments[index]; // foreach object

            if (source == null) {
                continue; // move on if the object is null or undefined
            }

            let keys = Object.keys(source), // get all the keys
                l = keys.length; // cache the length

            for (let i = 0; i < l; i++) {
                let key = keys[i]; // for each key

                if (!sources || dest[key] === void 0) {
                    dest[key] = source[key]; // replace values
                }
            }
        }
        return dest;
    };

    static get host(): HostTypes {
        let host: HostTypes = HostTypes.Web;

        try {
            if (Office.context.requirements.isSetSupported('ExcelApi')) {
                host = HostTypes.Excel;
            }
            else if (Office.context.requirements.isSetSupported('WordApi')) {
                host = HostTypes.Word;
            }
            else if (Office.context.requirements.isSetSupported('OoxmlCoercion')) {
                host = HostTypes.Word;
            }
            else if (Office.context.requirements.isSetSupported('MatrixBinding')) {
                // MatrixBinding is also supported in Word but since we have passed the
                // check for Word 2013 & 2016 this has got to be Excel 2013.
                host = HostTypes.Excel;
            }
            else if (Office.context.requirements.isSetSupported('OneNoteApi')) {
                host = HostTypes.OneNote;
            }
            else if (Office.context.requirements.isSetSupported('ActiveView')) {
                host = HostTypes.PowerPoint;
            }
            else if (Office.context.document.getProjectFieldAsync) {
                host = HostTypes.Project;
            }


            /* Overriding the definition of toString() so that we can get the context name
             * directly instead a number
             */
            host.toString = () => HostTypes[host];
        }
        catch (exception) {
        }

        return host;
    }

    /**
     * Utility to check if the code is running inside of an add-in.
     */
    static isAddin() {
        return Utilities.host !== HostTypes.Web;
    }

    /**
     * Utility to print prettified errors.
     */
    static log(exception: Error | string) {
        if (typeof exception === 'string') {
            console.error(exception);
        }
        else {
            console.group(exception.message || exception.name || 'Unhandled Exception');
            console.error(exception);
            if ((exception.stack == null)) {
                console.groupCollapsed('Stack Trace');
                console.error(exception.stack);
                console.groupEnd();
            }
            if ((window as any).OfficeExtenstion && exception instanceof OfficeExtension.Error) {
                console.groupCollapsed('Debug Info');
                console.error(exception.debugInfo);
                console.groupEnd();
            }
        }
    }
}
