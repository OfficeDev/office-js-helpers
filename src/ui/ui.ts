/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { Authenticator } from '../authentication/authenticator';
import { IEndpointConfiguration } from '../authentication/endpoint.manager';
import { IToken } from '../authentication/token.manager';
import { isString, isError, isObject } from 'lodash';
import { CustomError } from '../errors/custom.error';
import { Utilities, PlatformType } from '../helpers/utilities';

const authenticator = new Authenticator();

export class UI {
    constructor() { }

    /** Shows a basic notification at the top of the page
     * @param message - Message, either single-string or multiline (punctuated by '\n')
     */
    static notify(message: string);

    /** Shows a basic error notification at the top of the page
     * @param error - Error object
     */
    static notify(error: Error);

    /** Shows a basic notification with a custom title at the top of the page
     * @param title - Title, bolded
     * @param message - Message, either single-string or multiline (punctuated by '\n')
    */
    static notify(title: string, message: string);

    /** Shows a basic error notification with a custom title at the top of the page
     * @param title - Title, bolded
     * @param error - Error object
     */
    static notify(title: string, error: Error);

    /** Shows a basic error notification, with custom parameters, at the top of the page */
    static notify(error: Error, params: {
        title?: string;
        /** custom message in place of the error text */
        message?: string;
        moreDetailsLabel?: string;
    });

    /** Shows a basic notification at the top of the page, with a background color set based on the type parameter
     * @param title - Title, bolded
     * @param message - Message, either single-string or multiline (punctuated by '\n')
     * @param type - Type, determines the background color of the notification. Acceptable types are:
     *               'default' | 'success' | 'error' | 'warning' | 'severe-warning'
     */
    static notify(title: string, message: string, type: 'default' | 'success' | 'error' | 'warning' | 'severe-warning');

    /** Shows a basic notification at the top of the page, with custom parameters */
    static notify(params: {
        title?: string;
        message: string;
        type?: 'default' | 'success' | 'error' | 'warning' | 'severe-warning'
    });

    static notify() {
        const params = parseNotificationParams(arguments);
        const messageBarClasses = {
            'success': 'ms-MessageBar--success',
            'error': 'ms-MessageBar--error',
            'warning': 'ms-MessageBar--warning',
            'severe-warning': 'ms-MessageBar--severeWarning'
        };
        const messageBarTypeClass = messageBarClasses[params.type] || '';

        let paddingForPersonalityMenu = '0';
        if (Utilities.platform === PlatformType.PC) {
            paddingForPersonalityMenu = '20px';
        } else if (Utilities.platform === PlatformType.MAC) {
            paddingForPersonalityMenu = '40px';
        }

        const id = `message-${generateUUID()}`;
        const messageBannerHtml = `
            <div id="${id}" class="office-js-helpers-notification ms-font-m ms-MessageBar ${messageBarTypeClass}">
                <style>
                    #${id} {
                        position: absolute;
                        z-index: 2147483647;
                        top: 0;
                        left: 0;
                        right: 0;
                        width: 100%;
                        padding: 0 0 10px 0;
                    }
                    #${id} > div > div {
                        padding: 10px 15px;
                        box-sizing: border-box;
                    }
                    #${id} pre {
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        margin: 0px;
                        font-size: smaller;
                    }
                    #${id} > button {
                        height: 52px;
                        width: 40px;
                        cursor: pointer;
                        float: right;
                        background: transparent;
                        border: 0;
                        margin-left: 10px;
                        margin-right: ${paddingForPersonalityMenu}
                    }
                </style>
                <button>
                    <i class="ms-Icon ms-Icon--Clear"></i>
                </button>
            </div>`;

        const existingNotifications = document.getElementsByClassName('office-js-helpers-notification');
        while (existingNotifications[0]) {
            existingNotifications[0].parentNode.removeChild(existingNotifications[0]);
        }

        document.body.insertAdjacentHTML('afterbegin', messageBannerHtml);

        const notificationDiv = document.getElementById(id);
        const messageTextArea = document.createElement('div');
        notificationDiv.insertAdjacentElement('beforeend', messageTextArea);

        if (params.title) {
            const titleDiv = document.createElement('div');
            titleDiv.textContent = params.title;
            titleDiv.classList.add('ms-fontWeight-semibold');
            messageTextArea.insertAdjacentElement('beforeend', titleDiv);
        }

        params.message.split('\n').forEach(text => {
            const div = document.createElement('div');
            div.textContent = text;
            messageTextArea.insertAdjacentElement('beforeend', div);
        });

        if (params.moreDetails) {
            const labelDiv = document.createElement('div');
            messageTextArea.insertAdjacentElement('beforeend', labelDiv);
            const label = document.createElement('a');
            label.setAttribute('href', 'javascript:void(0)');
            label.onclick = () => {
                (document.querySelector(`#${id} pre`) as HTMLPreElement).parentElement.style.display = 'block';
                labelDiv.style.display = 'none';
            };
            label.textContent = params.moreDetailsLabel;
            labelDiv.insertAdjacentElement('beforeend', label);

            const preDiv = document.createElement('div');
            preDiv.style.display = 'none';
            messageTextArea.insertAdjacentElement('beforeend', preDiv);
            const detailsDiv = document.createElement('pre');
            detailsDiv.textContent = params.moreDetails;
            preDiv.insertAdjacentElement('beforeend', detailsDiv);
        }

        (document.querySelector(`#${id} > button`) as HTMLButtonElement)
            .onclick = () => {
                notificationDiv.parentNode.removeChild(notificationDiv);
            };
    }
}


function generateUUID() {
    // Public Domain/MIT from http://stackoverflow.com/a/8809472/678505
    let d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function parseNotificationParams(params: IArguments): {
    title: string;
    message: string;
    type: 'default' | 'success' | 'error' | 'warning' | 'severe-warning';
    moreDetails: string | null;
    moreDetailsLabel: string;
} {
    try {
        const defaults = {
            title: null,
            type: 'default' as ('default' | 'success' | 'error' | 'warning' | 'severe-warning'),
            moreDetails: null,
            moreDetailsLabel: 'Additional details...'
        };
        switch (params.length) {
            case 1: {
                if (isError(params[0])) {
                    return {
                        ...defaults,
                        title: 'Error',
                        type: 'error',
                        ...getErrorDetails(params[0])
                    };
                }
                if (isString(params[0])) {
                    return {
                        ...defaults,
                        message: params[0]
                    };
                }
                if (isObject(params[0])) {
                    const customParams: {
                        title?: string;
                        message: string;
                        type?: 'default' | 'success' | 'error' | 'warning' | 'severe-warning'
                    } = params[0];

                    if (!isString(customParams.message)) {
                        throw new Error();
                    }

                    return {
                        ...defaults,
                        title: customParams.title || defaults.title,
                        message: customParams.message,
                        type: customParams.type || defaults.type,
                    };
                }
                throw new Error();
            }

            case 2: {
                if (isString(params[0])) {
                    if (isError(params[1])) {
                        return {
                            ...defaults,
                            title: params[0],
                            ...getErrorDetails(params[1])
                        };
                    }
                    if (isString(params[1])) {
                        return {
                            ...defaults,
                            title: params[0],
                            message: params[1]
                        };
                    }
                } else if (isError(params[0]) && isObject(params[1])) {
                    const customParams: {
                        title?: string;
                        /** custom message in place of the error text */
                        message?: string;
                        moreDetailsLabel?: string;
                    } = params[1];

                    const result = {
                        ...defaults,
                        ...getErrorDetails(params[0]),
                        moreDetailsLabel: customParams.moreDetailsLabel || defaults.moreDetailsLabel
                    };

                    result.title = customParams.title || result.title;
                    result.message = customParams.message || result.message;

                    return result;
                }
                throw new Error();
            }

            case 3: {
                if (!(isString(params[0]) && isString(params[2]))) {
                    throw new Error();
                }

                if (!isString(params[1])) {
                    throw new Error();
                }

                return {
                    ...defaults,
                    title: params[0],
                    message: params[1],
                    type: params[2]
                };
            }

            default:
                throw new Error();
        }
    } catch (e) {
        throw new Error('Invalid parameters passed to "notify" function');
    }
}

function getErrorDetails(error: Error): {
    type: 'error'
    message: string,
    moreDetails: string;
} {
    let moreDetails: string;

    let innerException = error;
    if (error instanceof CustomError) {
        innerException = error.innerError;
    }

    if ((window as any).OfficeExtension && innerException instanceof OfficeExtension.Error) {
        moreDetails = JSON.stringify((error as OfficeExtension.Error).debugInfo, null, 4);
    }

    return {
        type: 'error',
        message: error.toString(),
        moreDetails
    };
}
