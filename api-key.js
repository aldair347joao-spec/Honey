/*
============================================================
HONEY PAY
MERCHANT API KEY SERVICE
V1.0.0
============================================================
*/

import crypto from "node:crypto";

import mongoose from "mongoose";

import {
    MerchantApiKey
} from "./integration-models.js";

import {
    Merchant
} from "./models.js";


/*
============================================================
CONSTANTS
============================================================
*/

const KEY_PREFIX =
    "hny_live_";

const TEST_KEY_PREFIX =
    "hny_test_";


const DEFAULT_SCOPES = [

    "payment_intents:write",

    "payment_intents:read"

];


/*
============================================================
ERROR
============================================================
*/

function createError(

    message,

    code,

    statusCode = 400

) {

    const error =
        new Error(
            message
        );

    error.code =
        code;

    error.statusCode =
        statusCode;

    return error;

}


/*
============================================================
HASH
============================================================
*/

function hashSecret(
    value
) {

    return crypto

        .createHash(
            "sha256"
        )

        .update(
            value
        )

        .digest(
            "hex"
        );

}


/*
============================================================
RANDOM SECRET
============================================================
*/

function generateSecret(
    environment
) {

    const prefix =
        environment ===
        "test"

            ? TEST_KEY_PREFIX

            : KEY_PREFIX;


    return (

        prefix +

        crypto
            .randomBytes(
                32
            )
            .toString(
                "base64url"
            )

    );

}


/*
============================================================
KEY ID
============================================================
*/

function generateKeyId() {

    return (

        "key_hny_" +

        crypto
            .randomBytes(
                12
            )
            .toString(
                "hex"
            )

    );

}


/*
============================================================
CREATE API KEY
============================================================
*/

export async function createApiKey(

    merchantId,

    payload = {}

) {

    if (
        !mongoose.isValidObjectId(
            merchantId
        )
    ) {

        throw createError(

            "Merchant ID inválido.",

            "INVALID_MERCHANT_ID",

            400

        );

    }


    const merchant =
        await Merchant

            .findById(
                merchantId
            )

            .select(
                "_id accountStatus"
            )

            .lean();


    if (
        !merchant
    ) {

        throw createError(

            "Comerciante não encontrado.",

            "MERCHANT_NOT_FOUND",

            404

        );

    }


    if (
        merchant.accountStatus !==
        "active"
    ) {

        throw createError(

            "A conta do comerciante não está activa.",

            "MERCHANT_NOT_ACTIVE",

            403

        );

    }


    const name =
        String(
            payload.name ||
            ""
        )
            .trim();


    if (
        name.length <
        2
    ) {

        throw createError(

            "O nome da API Key é obrigatório.",

            "INVALID_API_KEY_NAME",

            400

        );

    }


    if (
        name.length >
        120
    ) {

        throw createError(

            "O nome da API Key é demasiado longo.",

            "INVALID_API_KEY_NAME",

            400

        );

    }


    const environment =
        payload.environment ===
        "test"

            ? "test"

            : "live";


    const allowedScopes = [

        "payment_intents:write",

        "payment_intents:read",

        "webhooks:read"

    ];


    const requestedScopes =
        Array.isArray(
            payload.scopes
        )

            ? payload.scopes

            : DEFAULT_SCOPES;


    const scopes =
        [
            ...new Set(
                requestedScopes
                    .map(
                        scope =>
                            String(
                                scope
                            )
                    )
                    .filter(
                        scope =>
                            allowedScopes.includes(
                                scope
                            )
                    )
            )
        ];


    if (
        scopes.length ===
        0
    ) {

        throw createError(

            "A API Key precisa de pelo menos um scope válido.",

            "INVALID_API_KEY_SCOPES",

            400

        );

    }


    let expiresAt =
        null;


    if (
        payload.expiresAt
    ) {

        const parsed =
            new Date(
                payload.expiresAt
            );


        if (
            Number.isNaN(
                parsed.getTime()
            ) ||
            parsed.getTime() <=
            Date.now()
        ) {

            throw createError(

                "A data de expiração da API Key é inválida.",

                "INVALID_API_KEY_EXPIRATION",

                400

            );

        }


        expiresAt =
            parsed;

    }


    const rawKey =
        generateSecret(
            environment
        );


    const keyHash =
        hashSecret(
            rawKey
        );


    const keyPrefix =
        rawKey.slice(
            0,
            environment ===
                "test"
                ? 14
                : 14
        );


    const apiKey =
        new MerchantApiKey({

            merchantId,

            keyId:
                generateKeyId(),

            keyPrefix,

            keyHash,

            name,

            environment,

            scopes,

            enabled:
                true,

            expiresAt,

            createdBy:
                merchantId

        });


    await apiKey.save();


    return {

        id:
            apiKey.keyId,

        name:
            apiKey.name,

        environment:
            apiKey.environment,

        scopes:
            apiKey.scopes,

        keyPrefix:
            apiKey.keyPrefix,

        secret:
            rawKey,

        expiresAt:
            apiKey.expiresAt,

        createdAt:
            apiKey.createdAt,

        warning:
            "Esta chave secreta só é apresentada uma vez. Guarde-a num local seguro."

    };

}


/*
============================================================
AUTHENTICATE API KEY
============================================================
*/

export async function authenticateApiKey(

    rawKey,

    options = {}

) {

    if (
        typeof rawKey !==
        "string" ||
        rawKey.length <
        20
    ) {

        throw createError(

            "API Key inválida.",

            "INVALID_API_KEY",

            401

        );

    }


    const keyHash =
        hashSecret(
            rawKey
        );


    const apiKey =
        await MerchantApiKey

            .findOne(
                {
                    keyHash
                }
            )

            .select(
                "+keyHash"
            );


    if (
        !apiKey
    ) {

        throw createError(

            "API Key inválida.",

            "INVALID_API_KEY",

            401

        );

    }


    if (
        !apiKey.enabled ||
        apiKey.revokedAt
    ) {

        throw createError(

            "API Key revogada ou desactivada.",

            "API_KEY_DISABLED",

            403

        );

    }


    if (
        apiKey.expiresAt &&
        apiKey.expiresAt.getTime() <=
        Date.now()
    ) {

        throw createError(

            "API Key expirada.",

            "API_KEY_EXPIRED",

            403

        );

    }


    const merchant =
        await Merchant

            .findById(
                apiKey.merchantId
            )

            .lean();


    if (
        !merchant
    ) {

        throw createError(

            "Comerciante não encontrado.",

            "MERCHANT_NOT_FOUND",

            401

        );

    }


    if (
        merchant.accountStatus !==
        "active"
    ) {

        throw createError(

            "A conta do comerciante não está activa.",

            "MERCHANT_NOT_ACTIVE",

            403

        );

    }


    apiKey.lastUsedAt =
        new Date();


    if (
        options.ip
    ) {

        apiKey.lastUsedIp =
            String(
                options.ip
            )
                .slice(
                    0,
                    100
                );

    }


    await apiKey.save();


    return {

        apiKey,

        merchant

    };

}


/*
============================================================
GET API KEYS
============================================================
*/

export async function listApiKeys(
    merchantId
) {

    const keys =
        await MerchantApiKey

            .find(
                {
                    merchantId
                }
            )

            .sort(
                {
                    createdAt:
                        -1
                }
            )

            .lean();


    return keys.map(
        key => ({

            id:
                key.keyId,

            name:
                key.name,

            keyPrefix:
                key.keyPrefix,

            environment:
                key.environment,

            scopes:
                key.scopes,

            enabled:
                key.enabled,

            expiresAt:
                key.expiresAt,

            lastUsedAt:
                key.lastUsedAt,

            createdAt:
                key.createdAt

        })
    );

}


/*
============================================================
REVOKE API KEY
============================================================
*/

export async function revokeApiKey(

    merchantId,

    keyId

) {

    const key =
        await MerchantApiKey

            .findOne(
                {
                    merchantId,

                    keyId
                }
            );


    if (
        !key
    ) {

        throw createError(

            "API Key não encontrada.",

            "API_KEY_NOT_FOUND",

            404

        );

    }


    if (
        key.revokedAt
    ) {

        return {

            id:
                key.keyId,

            revoked:
                true,

            revokedAt:
                key.revokedAt

        };

    }


    key.enabled =
        false;


    key.revokedAt =
        new Date();


    await key.save();


    return {

        id:
            key.keyId,

        revoked:
            true,

        revokedAt:
            key.revokedAt

    };

}


/*
============================================================
SCOPE CHECK
============================================================
*/

export function requireApiScope(
    req,
    scope
) {

    const scopes =
        req?.apiAuth?.apiKey?.scopes ||
        [];


    if (
        !scopes.includes(
            scope
        )
    ) {

        throw createError(

            "A API Key não possui permissão para esta operação.",

            "API_SCOPE_REQUIRED",

            403

        );

    }


    return true;

}
