import { Storage } from '../helpers';
export interface IToken {
    provider: string;
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    state?: string;
    expires_in?: string;
    expires_at?: Date;
}
export interface ICode {
    provider: string;
    code: string;
    scope?: string;
    state?: string;
}
export interface IError {
    error: string;
    state?: string;
}
/**
 * Helper for caching and managing OAuth Tokens.
 */
export declare class TokenManager extends Storage<IToken> {
    /**
     * @constructor
    */
    constructor();
    /**
     * Compute the expiration date based on the expires_in field in a OAuth token.
     */
    setExpiry(token: IToken): void;
    /**
     * Extends Storage's default add method
     * Adds a new OAuth Token after settings its expiry
     *
     * @param {string} provider Unique name of the corresponding OAuth Endpoint.
     * @param {object} config valid Token
     * @see {@link IEndpoint}.
     * @return {object} Returns the added endpoint.
     */
    add(provider: string, value: IToken): IToken;
    /**
     * Extract the token from the URL
     *
     * @param {string} url The url to extract the token from.
     * @param {string} exclude Exclude a particlaur string from the url, such as a query param or specific substring.
     * @param {string} delimiter[optional] Delimiter used by OAuth provider to mark the beginning of token response. Defaults to #.
     * @return {object} Returns the extracted token.
     */
    static getToken(url: string, exclude?: string, delimiter?: string): ICode | IToken | IError;
    private static _extractParams(segment);
}
