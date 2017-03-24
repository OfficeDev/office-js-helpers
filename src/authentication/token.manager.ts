/* Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license. */

import { Storage } from '../helpers/storage';

export interface IToken {
    provider: string;
    id_token?: string;
    access_token?: string;
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
export class TokenStorage extends Storage<IToken> {
    /**
     * @constructor
    */
    constructor() {
        super('OAuth2Tokens');
    }

    /**
     * Compute the expiration date based on the expires_in field in a OAuth token.
     */
    static setExpiry(token: IToken) {
        let expire = seconds => seconds == null ? null : new Date(new Date().getTime() + ~~seconds * 1000);
        if (!(token == null) && token.expires_at == null) {
            token.expires_at = expire(token.expires_in);
        }
    }

    /**
     * Check if an OAuth token has expired.
     */
    static hasExpired(token: IToken): boolean {
        if (token == null) {
            return true;
        }
        if (token.expires_at == null) {
            return false;
        }
        else {
            // If the token was stored, it's Date type property was stringified, so it needs to be converted back to Date.
            token.expires_at = token.expires_at instanceof Date ? token.expires_at : new Date(token.expires_at as any);
            return token.expires_at.getTime() - new Date().getTime() < 0;
        }
    }

    /**
     * Extends Storage's default get method
     * Gets an OAuth Token after checking its expiry
     *
     * @param {string} provider Unique name of the corresponding OAuth Token.
     * @return {object} Returns the token or null if its either expired or doesn't exist.
     */
    get(provider: string): IToken {
        let token = super.get(provider);
        if (token == null) {
            return token;
        }

        let expired = TokenStorage.hasExpired(token);
        if (expired) {
            super.remove(provider);
            return null;
        }
        else {
            return token;
        }
    }

    /**
     * Extends Storage's default add method
     * Adds a new OAuth Token after settings its expiry
     *
     * @param {string} provider Unique name of the corresponding OAuth Token.
     * @param {object} config valid Token
     * @see {@link IToken}.
     * @return {object} Returns the added token.
     */
    add(provider: string, value: IToken) {
        value.provider = provider;
        TokenStorage.setExpiry(value);
        return super.insert(provider, value);
    }
}
