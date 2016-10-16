import { Storage } from '../helpers/storage';
export declare const DefaultEndpoints: {
    Google: string;
    Microsoft: string;
    Facebook: string;
    AzureAD: string;
};
export interface IEndpoint {
    /**
     * Unique name for the Endpoint
     */
    provider?: string;
    /**
     * Registered OAuth ClientID
     */
    clientId?: string;
    /**
     * Base URL of the endpoint
     */
    baseUrl?: string;
    /**
     * URL segment for OAuth authorize endpoint.
     * The final authorize url is constructed as (baseUrl + '/' + authorizeUrl).
     */
    authorizeUrl?: string;
    /**
     * Registered OAuth redirect url.
     * Defaults to window.location.origin
     */
    redirectUrl?: string;
    /**
     * Optional token url to exchange a code with.
     * Not recommended if OAuth provider supports implicit flow.
     */
    tokenUrl?: string;
    /**
     * Registered OAuth scope.
     */
    scope?: string;
    /**
     * Resource paramater for the OAuth provider.
     */
    resource?: string;
    /**
     * Automatically generate a state? defaults to false.
     */
    state?: boolean;
    /**
     * Automatically generate a nonce? defaults to false.
     */
    nonce?: boolean;
    /**
     * OAuth responseType.
     */
    responseType?: string;
    /**
     * Additional '&' separated query parameters.
     */
    extraQueryParameters?: string;
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
    readonly currentHost: string;
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
     * Register AzureAD Implicit OAuth.
     * If overrides is left empty, the default scope is limited to basic profile information.
     *
     * @param {string} clientId ClientID for the AzureAD App.
     * @param {string} tenant Tenant for the AzureAD App.
     * @param {object} config Valid Endpoint configuration to override the defaults.
     * @return {object} Returns the added endpoint.
     */
    registerAzureADAuth(clientId: string, tenant: string, overrides?: IEndpoint): void;
    /**
     * Helper to generate the OAuth login url.
     *
     * @param {object} config Valid Endpoint configuration.
     * @return {object} Returns the added endpoint.
     */
    static getLoginParams(endpointConfig: IEndpoint): {
        url: string;
        state: number;
    };
    private static _generateCryptoSafeRandom();
}
