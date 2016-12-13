import { Authenticator } from '../authentication/authenticator';
import { IEndpoint } from '../authentication/endpoint.manager';
import { IToken } from '../authentication/token.manager';
import { createMicrosoftLoginButton } from './microsoft.button';

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

        let {button, style} = createMicrosoftLoginButton();
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
}
