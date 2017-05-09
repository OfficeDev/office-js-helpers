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

    static microsoftLogin(
        container: HTMLButtonElement | JQuery,
        clientId: string,
        microsoftAuthConfig?: IEndpointConfiguration
    ) {
        let element: HTMLButtonElement;
        authenticator.endpoints.registerMicrosoftAuth(clientId, microsoftAuthConfig);
        if (container instanceof jQuery) {
            element = container[0] as HTMLButtonElement;
        }
        else {
            element = container as any;
        }

        if (element == null) {
            throw new Error('Cannot create Microsoft Login button as the element could not be found');
        }

        let { button, style } = UI.createMicrosoftLoginButton(element);
        button.appendChild(style);

        let promise = new Promise<IToken>((resolve, reject) => {
            button.addEventListener('click', async () => {
                try {
                    let result = await authenticator.authenticate('Microsoft');
                    resolve(result);
                }
                catch (error) {
                    reject(error);
                }
            }, false);
        });

        return {
            context: authenticator,
            result: promise,
            dispose: () => {
                button.parentElement.removeChild(element);
            }
        };
    }

    static microsoftLoginButtonCss = `
.microsoft-identity {
    width: 215px;
    height: 41px;
    background: #2F2F2F;
    color: #FFFFFF;
    border: none;
    outline: none;
    padding: 0;
    margin-bottom: 10px;
    margin-right: 10px;
    display: flex;
    align-items: center;
    padding: 0 12px;
    cursor: pointer;
    transition: all 0.1s ease;
}

.microsoft-identity:hover,
.microsoft-identity:focus {
    background-color: #0F0F0F;
}

.microsoft-identity:active {
    transform: scale3d(0.98, 0.98, 0.98);
}

.microsoft-identity__logo {
    height: 21px;
    width: 21px;
    margin-right: 12px;
    display: block;
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAApCAYAAACoYAD2AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUuNSAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzMxQjREREY5QkJEMTFFNkE1QzNCMTgwNjIwNzc0MjciIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NzMxQjRERTA5QkJEMTFFNkE1QzNCMTgwNjIwNzc0MjciPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3MzFCNERERDlCQkQxMUU2QTVDM0IxODA2MjA3NzQyNyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3MzFCNERERTlCQkQxMUU2QTVDM0IxODA2MjA3NzQyNyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvTw8CEAAAD4SURBVHja7Ne/DsFQFAbw03+UxWBjYpYQg62JyWAQq7mjGKw2U7dOYvMYBpMmBmExSWxewKKi2qKX8gISZyD5vulMJ7/ce3NzjuS2i4IYIrwTJVrmSO9avcXe6k93A1tXiSUy/UGABBJIIIEEEkgggQTym6jxRM0ymZ9dotBPxfU9CpL+jUjiQsYjP0un0JeViuHEZT5TWxkFc6zJFHG0loQQv3/d1jbos3SKhFTOKptmTpvTcVmlg1N/vniWE1AHa89mQV4FdUr65IU8zBq0HVrEtC2qlGB63s82aYUu7z8jGbyAWGmBBBJIIIEEEkgggQTyszwEGADn4z4K2KbobgAAAABJRU5ErkJggg==') center center no-repeat;
    background-size: contain;
}

.microsoft-identity__label {
    font-size: 15px !important;
    font-family: "Segoe UI" !important;
    text-align: center;
}
`;

    static createMicrosoftLoginButton = (button: HTMLButtonElement) => {
        button.innerHTML = `<span class="microsoft-identity__logo"></span><span class="microsoft-identity__label">Sign in with Microsoft</span>`;
        button.classList.add('microsoft-identity');

        let style = document.createElement('style') as HTMLStyleElement;
        style.type = 'text/css';
        style.innerHTML = UI.microsoftLoginButtonCss;

        return { button, style };
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
