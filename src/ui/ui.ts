import { Authenticator } from '../authentication/authenticator';
import { IEndpoint } from '../authentication/endpoint.manager';
import { IToken } from '../authentication/token.manager';

const authenticator = new Authenticator();

export class UI {
    constructor() {

    }

    static microsoftLogin(
        element: HTMLElement | Element,
        clientId: string,
        microsoftAuthConfig?: IEndpoint
    ) {
        authenticator.endpoints.registerMicrosoftAuth(clientId, microsoftAuthConfig);
        if (element == null) {
            throw new Error('Cannot create Microsoft Login button as the element could not be found');
        }

        let {button, style} = UI.createMicrosoftLoginButton();
        element.appendChild(button);
        element.appendChild(style);

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
            result: promise,
            dispose: () => {
                element.removeChild(button);
                element.removeChild(style);
            }
        };
    }

    static microsoftLoginButtonCss = `
#microsoft-identity {
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

#microsoft-identity:hover,
#microsoft-identity:focus {
    background-color: #0F0F0F;
}

#microsoft-identity:active {
    transform: scale3d(0.98, 0.98, 0.98);
}

#microsoft-identity-logo {
    height: 21px;
    width: 21px;
    margin-right: 12px;
    display: block;
    background: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAApCAYAAACoYAD2AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTMyIDc5LjE1OTI4NCwgMjAxNi8wNC8xOS0xMzoxMzo0MCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUuNSAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NzMxQjREREY5QkJEMTFFNkE1QzNCMTgwNjIwNzc0MjciIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NzMxQjRERTA5QkJEMTFFNkE1QzNCMTgwNjIwNzc0MjciPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo3MzFCNERERDlCQkQxMUU2QTVDM0IxODA2MjA3NzQyNyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo3MzFCNERERTlCQkQxMUU2QTVDM0IxODA2MjA3NzQyNyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PvTw8CEAAAD4SURBVHja7Ne/DsFQFAbw03+UxWBjYpYQg62JyWAQq7mjGKw2U7dOYvMYBpMmBmExSWxewKKi2qKX8gISZyD5vulMJ7/ce3NzjuS2i4IYIrwTJVrmSO9avcXe6k93A1tXiSUy/UGABBJIIIEEEkgggQTym6jxRM0ymZ9dotBPxfU9CpL+jUjiQsYjP0un0JeViuHEZT5TWxkFc6zJFHG0loQQv3/d1jbos3SKhFTOKptmTpvTcVmlg1N/vniWE1AHa89mQV4FdUr65IU8zBq0HVrEtC2qlGB63s82aYUu7z8jGbyAWGmBBBJIIIEEEkgggQTyszwEGADn4z4K2KbobgAAAABJRU5ErkJggg==') center center no-repeat;
    background-size: contain;
}

#microsoft-identity-label {
    font-size: 15px !important;
    font-family: "Segoe UI" !important;
    text-align: center;
}
`;

    static createMicrosoftLoginButton = () => {
        let button = document.createElement('button') as HTMLButtonElement;
        button.innerHTML = `<span id="microsoft-identity-logo"></span><span id="microsoft-identity-label">Sign in with Microsoft</span>`;
        button.id = 'microsoft-identity';

        let style = document.createElement('style') as HTMLStyleElement;
        style.type = 'text/css';
        style.innerText = UI.microsoftLoginButtonCss;

        return { button, style };
    }
}
