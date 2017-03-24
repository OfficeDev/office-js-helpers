/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

/**
 * Constant strings for the host types
 */
export const HostType = {
    WEB: 'WEB',
    ACCESS: 'ACCESS',
    EXCEL: 'EXCEL',
    ONENOTE: 'ONENOTE',
    OUTLOOK: 'OUTLOOK',
    POWERPOINT: 'POWERPOINT',
    PROJECT: 'PROJECT',
    WORD: 'WORD'
};

/**
 * Constant strings for the host platforms
 */
export const PlatformType = {
    IOS: 'IOS',
    MAC: 'MAC',
    OFFICE_ONLINE: 'OFFICE_ONLINE',
    PC: 'PC'
};

/*
* Retrieves host info using a workaround that utilizes the internals of the
* Office.js library. Such workarounds should be avoided, as they can lead to
* a break in behavior, if the internals are ever changed. In this case, however,
* Office.js will soon be delivering a new API to provide the host and platform
* information.
*/
function getHostInfo() {
    let host = 'WEB';
    let platform: string = null;
    let extras = null;

    try {
        if (window.sessionStorage == null) {
            throw new Error(`Session Storage isn't supported`);
        }

        let hostInfoValue = window.sessionStorage['hostInfoValue'];
        [host, platform, extras] = hostInfoValue.split('$');

        // Older hosts used "|", so check for that as well:
        if (extras == null) {
            [host, platform] = hostInfoValue.split('|');
        }

        host = host.toUpperCase() || 'WEB';
        platform = platform.toUpperCase() || null;
    }
    catch (error) {
    }

    return { host, platform };
};

/**
 * Helper exposing useful Utilities for Office-Addins.
 */
export class Utilities {
    /*
     * Returns the current host which is either the name of the application where the
     * Office Add-in is running ("EXCEL", "WORD", etc.) or simply "WEB" for all other platforms.
     * The property is always returned in ALL_CAPS.
     * Note that this property is guranteed to return the correct value ONLY after Office has
     * initialized (i.e., inside, or seqentially after, an Office.initialize = function() { ... }; statement).
     *
     * This code currently uses a workaround that relies on the internals of Office.js.
     * A more robust approach is forthcoming within the official  Office.js library.
     * Once the new approach is released, this implementation will switch to using it
     * instead of the current workaround.
     */
    static get host(): string {
        let hostInfo = getHostInfo();
        return HostType[hostInfo.host];
    }

    /*
    * Returns the host application's platform ("IOS", "MAC", "OFFICE_ONLINE", or "PC").
    * This is only valid for Office Add-ins, and hence returns null if the HostType is WEB.
    * The platform is in ALL-CAPS.
    * Note that this property is guranteed to return the correct value ONLY after Office has
    * initialized (i.e., inside, or seqentially after, an Office.initialize = function() { ... }; statement).
    *
    * This code currently uses a workaround that relies on the internals of Office.js.
    * A more robust approach is forthcoming within the official  Office.js library.
    * Once the new approach is released, this implementation will switch to using it
    * instead of the current workaround.
    */
    static get platform(): string {
        let hostInfo = getHostInfo();

        if (Utilities.host === HostType.WEB) {
            return null;
        }

        let platforms = {
            'IOS': PlatformType.IOS,
            'MAC': PlatformType.MAC,
            'WEB': PlatformType.OFFICE_ONLINE,
            'WIN32': PlatformType.PC
        };

        return platforms[hostInfo.platform] || null;
    }

    /**
     * Utility to check if the code is running inside of an add-in.
     */
    static get isAddin() {
        return Utilities.host !== HostType.WEB;
    }

    /**
     * Utility to print prettified errors.
     */
    static log(exception: Error | string) {
        if (exception == null) {
            console.error(exception);
        }
        else if (typeof exception === 'string') {
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
