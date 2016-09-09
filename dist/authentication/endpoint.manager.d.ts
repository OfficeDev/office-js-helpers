import { Storage } from '../helpers/storage';
export declare const DefaultEndpoints: {
    Google: string;
    Microsoft: string;
    Facebook: string;
};
export interface IEndpoint {
    provider?: string;
    clientId?: string;
    baseUrl?: string;
    authorizeUrl?: string;
    redirectUrl?: string;
    tokenUrl?: string;
    scope?: string;
    resource?: string;
    state?: boolean;
    nonce?: boolean;
    responseType?: string;
    extraQueryParameters?: string;
    windowSize?: string;
}
/**
 * Helper for creating and registering OAuth Endpoints.
 */
export declare class EndpointManager extends Storage<IEndpoint> {
    /**
     * @constructor
    */
    constructor();
    private _currentHost;
    /**
     * Gets the current url to be specified as the default redirect url.
     */
    currentHost: string;
    /**
     * Extends Storage's default add method.
     * Registers a new OAuth Endpoint.
     *
     * @param {string} provider Unique name for the registered OAuth Endpoint.
     * @param {object} config Valid Endpoint configuration.
     * @see {@link IEndpoint}.
     * @return {object} Returns the added endpoint.
     */
    add(provider: string, config: IEndpoint): IEndpoint;
    /**
     * Register Google Implicit OAuth.
     * If overrides is left empty, the default scope is limited to basic profile information.
     *
     * @param {string} clientId ClientID for the Google App.
     * @param {object} config Valid Endpoint configuration to override the defaults.
     * @return {object} Returns the added endpoint.
     */
    registerGoogleAuth(clientId: string, overrides?: IEndpoint): IEndpoint;
    /**
     * Register Microsoft Implicit OAuth.
     * If overrides is left empty, the default scope is limited to basic profile information.
     *
     * @param {string} clientId ClientID for the Microsoft App.
     * @param {object} config Valid Endpoint configuration to override the defaults.
     * @return {object} Returns the added endpoint.
     */
    registerMicrosoftAuth(clientId: string, overrides?: IEndpoint): void;
    /**
     * Register Facebook Implicit OAuth.
     * If overrides is left empty, the default scope is limited to basic profile information.
     *
     * @param {string} clientId ClientID for the Facebook App.
     * @param {object} config Valid Endpoint configuration to override the defaults.
     * @return {object} Returns the added endpoint.
     */
    registerFacebookAuth(clientId: string, overrides?: IEndpoint): void;
    /**
     * Helper to generate the OAuth login url.
     *
     * @param {object} config Valid Endpoint configuration.
     * @return {object} Returns the added endpoint.
     */
    static getLoginUrl(endpointConfig: IEndpoint): string;
}
