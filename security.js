import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import config from "./config.js";


/*
============================================================
HONEY PAY
SECURITY
V2.0.0
============================================================

AUTENTICAÇÃO PRINCIPAL:
Google OAuth + JWT Honey Pay.

Password functions remain only for compatibility with
legacy records. They are NOT part of the new login flow.

============================================================
*/


const BCRYPT_ROUNDS = 12;


/*
============================================================
PASSWORD COMPATIBILITY
============================================================
*/

export async function hashPassword(
    password
) {

    if (
        typeof password !== "string" ||
        password.length < 8
    ) {

        throw new Error(
            "A password deve possuir pelo menos 8 caracteres."
        );

    }


    return bcrypt.hash(
        password,
        BCRYPT_ROUNDS
    );

}


export async function comparePassword(
    password,
    passwordHash
) {

    if (
        typeof password !== "string" ||
        typeof passwordHash !== "string"
    ) {

        return false;

    }


    return bcrypt.compare(
        password,
        passwordHash
    );

}


/*
============================================================
EMAIL
============================================================
*/

export function normalizeEmail(
    email
) {

    if (
        typeof email !== "string"
    ) {

        return "";

    }


    return email
        .trim()
        .toLowerCase();

}


/*
============================================================
PHONE
============================================================
*/

export function normalizePhone(
    phone
) {

    if (
        typeof phone !== "string"
    ) {

        return "";

    }


    return phone
        .trim()
        .replace(
            /\D/g,
            ""
        );

}


/*
============================================================
IBAN
============================================================
*/

export function normalizeIban(
    iban
) {

    if (
        typeof iban !== "string"
    ) {

        return "";

    }


    return iban
        .replace(
            /\s+/g,
            ""
        )
        .toUpperCase();

}


export function getIbanLast4(
    iban
) {

    const normalized =
        normalizeIban(
            iban
        );


    if (
        normalized.length < 4
    ) {

        return "";

    }


    return normalized.slice(
        -4
    );

}


/*
============================================================
SHA256
============================================================
*/

export function sha256(
    value
) {

    if (
        value === undefined ||
        value === null
    ) {

        throw new Error(
            "Valor inválido para SHA-256."
        );

    }


    return crypto
        .createHash(
            "sha256"
        )
        .update(
            String(value),
            "utf8"
        )
        .digest(
            "hex"
        );

}


/*
============================================================
BUFFER HASH
============================================================
*/

export function hashBuffer(
    buffer
) {

    if (
        !Buffer.isBuffer(buffer)
    ) {

        throw new TypeError(
            "hashBuffer espera um Buffer."
        );

    }


    return crypto
        .createHash(
            "sha256"
        )
        .update(
            buffer
        )
        .digest(
            "hex"
        );

}


/*
============================================================
HMAC
============================================================
*/

export function hmacSha256(
    value,
    secret = config.auth.jwtSecret
) {

    if (
        !secret
    ) {

        throw new Error(
            "Secret não configurado para HMAC."
        );

    }


    return crypto
        .createHmac(
            "sha256",
            secret
        )
        .update(
            String(value),
            "utf8"
        )
        .digest(
            "hex"
        );

}


/*
============================================================
SECURE RANDOM
============================================================
*/

export function generateSecureToken(
    bytes = 32
) {

    if (
        !Number.isInteger(bytes) ||
        bytes < 16 ||
        bytes > 128
    ) {

        throw new Error(
            "Quantidade de bytes inválida."
        );

    }


    return crypto
        .randomBytes(
            bytes
        )
        .toString(
            "hex"
        );

}


/*
============================================================
PUBLIC ID
============================================================
*/

export function generatePublicId(
    prefix = "HNY"
) {

    const cleanPrefix =
        String(prefix)
            .replace(
                /[^A-Za-z0-9]/g,
                ""
            )
            .toUpperCase()
            .slice(
                0,
                8
            );


    const randomPart =
        crypto
            .randomBytes(
                8
            )
            .toString(
                "base64url"
            )
            .toUpperCase();


    return `${cleanPrefix}-${randomPart}`;

}


/*
============================================================
INVOICE NUMBER
============================================================
*/

export function generateInvoiceNumber() {

    const timestamp =
        Date.now()
            .toString(
                36
            )
            .toUpperCase();


    const random =
        crypto
            .randomBytes(
                3
            )
            .toString(
                "hex"
            )
            .toUpperCase();


    return `INV-${timestamp}-${random}`;

}


/*
============================================================
JWT
============================================================
*/

export function createAccessToken(
    payload,
    options = {}
) {

    if (
        !config.auth.jwtSecret
    ) {

        throw new Error(
            "JWT_SECRET não configurada."
        );

    }


    const {

        expiresIn =
            "7d"

    } = options;


    return jwt.sign(
        payload,
        config.auth.jwtSecret,
        {

            expiresIn,

            issuer:
                "honey-pay",

            audience:
                "honey-pay-client"

        }
    );

}


/*
============================================================
JWT VERIFY
============================================================
*/

export function verifyAccessToken(
    token
) {

    if (
        typeof token !== "string" ||
        !token.trim()
    ) {

        throw new Error(
            "Token de autenticação inválido."
        );

    }


    if (
        !config.auth.jwtSecret
    ) {

        throw new Error(
            "JWT_SECRET não configurada."
        );

    }


    return jwt.verify(
        token,
        config.auth.jwtSecret,
        {

            issuer:
                "honey-pay",

            audience:
                "honey-pay-client",

            algorithms: [
                "HS256"
            ]

        }
    );

}


/*
============================================================
BEARER
============================================================
*/

export function extractBearerToken(
    authorizationHeader
) {

    if (
        typeof authorizationHeader !==
        "string"
    ) {

        return null;

    }


    const parts =
        authorizationHeader
            .trim()
            .split(
                /\s+/
            );


    if (
        parts.length !== 2
    ) {

        return null;

    }


    if (
        parts[0].toLowerCase() !==
        "bearer"
    ) {

        return null;

    }


    const token =
        parts[1];


    if (
        !token ||
        token.length < 20
    ) {

        return null;

    }


    return token;

}


/*
============================================================
SAFE STRING
============================================================
*/

export function sanitizeString(
    value,
    options = {}
) {

    const {

        maxLength =
            500

    } = options;


    if (
        typeof value !== "string"
    ) {

        return "";

    }


    return value
        .trim()
        .slice(
            0,
            maxLength
        );

}


/*
============================================================
INTEGER
============================================================
*/

export function parsePositiveInteger(
    value
) {

    const parsed =
        Number(
            value
        );


    if (
        !Number.isInteger(parsed) ||
        parsed <= 0
    ) {

        return null;

    }


    return parsed;

}


/*
============================================================
AMOUNT
============================================================
*/

export function parseAmountKz(
    value
) {

    if (
        typeof value === "number"
    ) {

        if (
            !Number.isFinite(value) ||
            value <= 0 ||
            !Number.isInteger(value)
        ) {

            return null;

        }


        return value;

    }


    if (
        typeof value !== "string"
    ) {

        return null;

    }


    const normalized =
        value
            .trim()
            .replace(
                /\s/g,
                ""
            )
            .replace(
                /\./g,
                ""
            )
            .replace(
                ",",
                "."
            );


    const parsed =
        Number(
            normalized
        );


    if (
        !Number.isFinite(parsed) ||
        parsed <= 0 ||
        !Number.isInteger(parsed)
    ) {

        return null;

    }


    return parsed;

}


/*
============================================================
SECURE EQUAL
============================================================
*/

export function secureEqual(
    first,
    second
) {

    if (
        typeof first !== "string" ||
        typeof second !== "string"
    ) {

        return false;

    }


    const firstBuffer =
        Buffer.from(
            first,
            "utf8"
        );


    const secondBuffer =
        Buffer.from(
            second,
            "utf8"
        );


    if (
        firstBuffer.length !==
        secondBuffer.length
    ) {

        return false;

    }


    return crypto.timingSafeEqual(
        firstBuffer,
        secondBuffer
    );

}


/*
============================================================
OAUTH STATE
============================================================

State assinado pelo JWT_SECRET.

Não depende de sessão em memória.

============================================================
*/

export function createOAuthState(
    payload = {}
) {

    if (
        !config.auth.jwtSecret
    ) {

        throw new Error(
            "JWT_SECRET não configurada."
        );

    }


    return jwt.sign(

        {

            ...payload,

            purpose:
                "google-oauth-state"

        },

        config.auth.jwtSecret,

        {

            expiresIn:
                "10m",

            issuer:
                "honey-pay",

            audience:
                "honey-pay-google-oauth"

        }

    );

}


export function verifyOAuthState(
    token
) {

    if (
        typeof token !== "string" ||
        !token
    ) {

        throw new Error(
            "OAuth state inválido."
        );

    }


    return jwt.verify(

        token,

        config.auth.jwtSecret,

        {

            issuer:
                "honey-pay",

            audience:
                "honey-pay-google-oauth",

            algorithms: [
                "HS256"
            ]

        }

    );

}


export default {

    hashPassword,

    comparePassword,

    normalizeEmail,

    normalizePhone,

    normalizeIban,

    getIbanLast4,

    sha256,

    hashBuffer,

    hmacSha256,

    generateSecureToken,

    generatePublicId,

    generateInvoiceNumber,

    createAccessToken,

    verifyAccessToken,

    extractBearerToken,

    sanitizeString,

    parsePositiveInteger,

    parseAmountKz,

    secureEqual,

    createOAuthState,

    verifyOAuthState

};
