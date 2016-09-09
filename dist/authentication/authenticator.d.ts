import { EndpointManager, TokenManager, IToken, ICode } from '../authentication/index';
/**
 * Helper for performing Implicit OAuth Authentication with registered endpoints.
 */
export declare class Authenticator {
    endpoints: EndpointManager;
    tokens: TokenManager;
    /**
     * @constructor
     *
     * @param endpointManager Depends on an instance of EndpointManager.
     * @param TokenManager Depends on an instance of TokenManager.
    */
    constructor(endpoints?: EndpointManager, tokens?: TokenManager);
    /**
     * Authenticate based on the given provider.
     * Either uses DialogAPI or Window Popups based on where its being called from either Add-in or Web.
     * If the token was cached, the it retrieves the cached token.
     *
     * WARNING: you have to manually check the expires_in or expires_at property to determine
     * if the token has expired. Not all OAuth providers support refresh token flows.
     *
     * @param {string} provider Link to the provider.
     * @param {boolean} force Force re-authentication.
     * @return {Promise<IToken|ICode>} Returns a promise of the token or code or error.
     */
    authenticate(provider: string, force?: boolean): Promise<IToken | ICode>;
    /**
     * POST Helper for exchanging the code with a given url.
     *
     * @return {Promise<IToken>} Returns a promise of the token or error.
     */
    exchangeCodeForToken(url: string, data: any, headers?: any): Promise<IToken>;
    /**
     * Check if the currrent url is running inside of a Dialog that contains an access_token or code or error.
     * If true then it calls messageParent by extracting the token information, thereby closing the dialog.
     * Otherwise, the caller should proceed with normal initialization of their application.
     *
     * @return {boolean}
     * Returns false if the code is running inside of a dialog without the required information
     * or is not running inside of a dialog at all.
     */
    static isAuthDialog(): boolean;
    /**
     * Check if the supplied url has either access_token or code or error.
     */
    static isTokenUrl(url: string): boolean;
    /**
     * Check if the code is running inside of an Addin versus a Web Context.
     * The checks for Office and Word, Excel or OneNote objects.
     */
    private static _isAddin;
    static isAddin: boolean;
    private _openInWindowPopup(endpoint);
    private _openInDialog(endpoint);
}
