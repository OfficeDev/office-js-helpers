/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { Authenticator } from '../authentication/authenticator';
import { IEndpointConfiguration } from '../authentication/endpoint.manager';
import { IToken } from '../authentication/token.manager';
import { isString, isArray, isError, isObject } from 'lodash';

const authenticator = new Authenticator();

export class UI {
    constructor() {

    }


    static notify(message: string | string[]);
    static notify(error: Error);
    static notify(title: string, message: string | string[]);
    static notify(title: string, error: Error);
    static notify(title: string, message: string | string[], type: 'default' | 'success' | 'error' | 'warning' | 'severe-warning');
    static notify(params: {
        title?: string;
        message: string | string[];
        type?: 'default' | 'success' | 'error' | 'warning' | 'severe-warning';
        details?: string;
        detailsLabels?: {
            moreDetails: 'More details...',
            lessDetails: 'Hide details'
        }
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
                    }
                    #${id} > div > div {
                        padding: 10px;
                    }
                    #${id} > button {
                        height: 52px;
                        width: 40px;
                        cursor: pointer;
                        float: right;
                        background: transparent;
                        border: 0;
                        margin-left: 10px;
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

        const notificationDiv = document.getElementById(id)
        const messageTextArea = document.createElement('div');
        notificationDiv.insertAdjacentElement('beforeend', messageTextArea);

        if (params.title) {
            const titleDiv = document.createElement('div');
            titleDiv.textContent = params.title;
            titleDiv.classList.add('ms-fontWeight-semibold');
            messageTextArea.insertAdjacentElement('beforeend', titleDiv);
        }

        params.messages.forEach(text => {
            const div = document.createElement('div');
            div.textContent = text;
            messageTextArea.insertAdjacentElement('beforeend', div);
        });

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
    messages: string[];
    type: 'default' | 'success' | 'error' | 'warning' | 'severe-warning',
    details: string;
    detailsLabels: {
        moreDetails: string;
        lessDetails: string;
    }
} {
    try {
        const defaults = {
            title: null,
            type: 'default' as ('default' | 'success' | 'error' | 'warning' | 'severe-warning'),
            details: null,
            detailsLabels: {
                moreDetails: 'More details...',
                lessDetails: 'Hide details'
            }
        }
        switch (params.length) {
            case 1: {
                if (isError(params[0])) {
                    return {
                        ...defaults,
                        title: (params[0] as Error).name,
                        messages: [(params[0] as Error).message],
                        type: 'error'
                    };
                }
                if (isString(params[0])) {
                    return {
                        ...defaults,
                        messages: [params[0]]
                    };
                }
                if (isArray(params[0])) {
                    return {
                        ...defaults,
                        messages: params[0]
                    };
                }
                if (isObject(params[0])) {
                    let messages: string[];
                    if (isString(params[0].message)) {
                        messages = [params[0].message];
                    } else if (isArray(params[0].message)) {
                        messages = params[0].message;
                    } else {
                        throw new Error();
                    }

                    return {
                        title: params[0].title || defaults.title,
                        messages: messages,
                        type: params[0].type || defaults.type,
                        details: params[0].details || defaults.details,
                        detailsLabels: params[0].detailsLabels || defaults.detailsLabels,
                    };
                }
                throw new Error();
            }

            case 2: {
                if (!isString(params[0])) {
                    throw new Error();
                }

                if (isError(params[1])) {
                    return {
                        ...defaults,
                        title: params[0],
                        messages: [(params[1] as Error).toString()],
                        type: 'error'
                    };
                }
                if (isString(params[1])) {
                    return {
                        ...defaults,
                        title: params[0],
                        messages: [params[1]]
                    };
                }
                if (isArray(params[1])) {
                    return {
                        ...defaults,
                        title: params[0],
                        messages: params[1]
                    };
                }
                throw new Error();
            }

            case 3: {
                if (!(isString(params[0]) && isString(params[2]))) {
                    throw new Error();
                }

                let messages: string[];
                if (isString(params[1])) {
                    messages = [params[1]];
                } else if (isArray(params[1])) {
                    messages = params[1];
                } else {
                    throw new Error();
                }

                return {
                    ...defaults,
                    title: params[0],
                    messages: messages,
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
