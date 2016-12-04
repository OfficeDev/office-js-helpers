// Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.

/**
 * Enumeration for the Office host types
 */
export const HostTypes = {
    ACCESS: 'ACCESS',
    EXCEL: 'EXCEL',
    ONENOTE: 'ONENOTE',
    OUTLOOK: 'OUTLOOK',
    POWERPOINT: 'POWERPOINT',
    PROJECT: 'PROJECT',
    WORD: 'WORD'
};

/**
 * Enumeration for the Office host platforms
 */
export const PlatformTypes = {
    IOS: 'IOS',
    MAC: 'MAC',
    OFFICE_ONLINE: 'OFFICE_ONLINE',
    PC: 'PC'
};

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

    /*
     * Returns the host application's name ("EXCEL", "WORD", etc.), in ALL CAPS.
     * See "HostTypes" for all available names.
     * 
     * Note that this code currently uses a workaround that relies on the internals of Office.js.
     * A more robus approach is forthcoming within the Office.js library.  Once it is released,
     * this implementation will simply re-route to the Office.js official implementation.
     * Please be sure to check for updates to this library in the coming weeks.
     */
    static get host(): 'ACCESS' | 'EXCEL' | 'ONENOTE' | 'OUTLOOK' | 'POWERPOINT' | 'PROJECT' | 'WORD' {
        var hostInfo = Utilities.getHostInfo();
        if (!hostInfo) {
            return null;
        }
        
        var host = HostTypes[hostInfo.host.toUpperCase()];
        return host || null;
    }

    /*
     * Returns the host application's platform ("IOS", "MAC", "OFFICE_ONLINE", or "PC").
     * The platform is in ALL-CAPS. See "PlatformTypes" for constants corresonding to the strings above.
     * 
     * Note that this code currently uses a workaround that relies on the internals of Office.js.
     * A more robus approach is forthcoming within the Office.js library.  Once it is released,
     * this implementation will simply re-route to the Office.js official implementation.
     * Please be sure to check for updates to this library in the coming weeks.
     */
    static get platform(): 'IOS' | 'MAC' | 'OFFICE_ONLINE' | 'PC' {
        var hostInfo = Utilities.getHostInfo();
        if (!hostInfo) {
            return null;
        }

        return {
            "ios": PlatformTypes.IOS,
            "mac": PlatformTypes.MAC,
            "web": PlatformTypes.OFFICE_ONLINE,
            "win32": PlatformTypes.PC
        }[hostInfo.platform] || null;
    }

    /*
     * Retrieves host info using a workaround that utilizes the internals of the
     * Office.js library.  Such workarounds should be avoided, as they can lead to
     * a break in behavior, if the internals are ever changed.  In this case, however,
     * Office.js will soon be delivering a new API to provide the host and platform
     * information, so the "hack" is a temporary workaround for an API that is forthcoming.
     * Once the API is released, this function will cease to be necessary, so
     * please be sure to check for updates to this library in the coming weeks.
     */
    private static getHostInfo() : { host: string, platform: string } {
        if (!window || !window.sessionStorage) {
            return null;
        }
        
        var hostInfoValue = window.sessionStorage["hostInfoValue"];
        if (!hostInfoValue) {
            return null;
        }

        // Try parsing using the '$' delimiter.
        var items = hostInfoValue.split("$");
        // Older hosts used "|", so check for that as well:
        if (typeof items[2] == "undefined") {
            items = hostInfoValue.split("|");
        }

        return {
            host: (typeof items[0] == "undefined") ? "" : items[0].toLowerCase(),
            platform: (typeof items[1] == "undefined") ? "" : items[1].toLowerCase()
        };
    }

    /**
     * Utility to check if the code is running inside of an add-in.
     */
    static isAddin() {
        return Utilities.host != null;
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
            console.groupEnd();
        }
    }
}
