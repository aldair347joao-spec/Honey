import crypto from "node:crypto";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import config from "./config.js";


/*
============================================================
HONEY PAY
SECURITY
V1.0.0
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Hash de passwords
- Comparação de passwords
- Geração de JWT
- Verificação de JWT
- Hash de identificadores sensíveis
- Hash de arquivos
- Geração de IDs públicos
- Normalização de email
- Normalização de telefone
- Normalização de IBAN
- Comparações seguras

IMPORTANTE
------------------------------------------------------------
Nenhuma password é armazenada em texto puro.

Nenhum JWT deve ser colocado em logs.

IBANs completos não devem ser retornados para clientes
quando não forem necessários.

============================================================
*/


/*
============================================================
PASSWORD SECURITY
============================================================
*/

const BCRYPT_ROUNDS = 12;


/**
 * Cria um hash seguro para uma password.
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


/**
 * Compara uma password com o seu hash.
 */
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


    /*
    --------------------------------------------------------
    Mantemos somente números.

    Exemplo:

    +244 923 000 000

    vira:

    244923000000
    --------------------------------------------------------
    */

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


/**
 * Retorna apenas os últimos 4 caracteres de um IBAN.
 */
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
GENERIC SHA-256 HASH
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

Utilizado principalmente para comprovativos.

O mesmo arquivo produz o mesmo hash.

Isso permite detectar:

- reupload do mesmo arquivo
- duplicação
- reutilização de comprovativo
============================================================
*/

export function hashBuffer(
    buffer
) {

    if (
        !Buffer.isBuffer(
            buffer
        )
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
HMAC HASH
============================================================

Para dados que não queremos expor diretamente.

O resultado depende do segredo da aplicação.
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
SECURE RANDOM TOKEN
============================================================
*/

export function generateSecureToken(
    bytes = 32
) {

    if (
        !Number.isInteger(
            bytes
        ) ||
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

IDs públicos não utilizam diretamente o ObjectId do
MongoDB.

Isso torna os links de checkout mais limpos e evita
exposição desnecessária da estrutura interna do banco.
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

Número humano da cobrança.

Não substitui o publicId.
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
JWT VERIFICATION
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
                "honey-pay-client"
        }
    );
}


/*
============================================================
BEARER TOKEN
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


    const scheme =
        parts[0];


    const token =
        parts[1];


    if (
        scheme.toLowerCase() !==
        "bearer"
    ) {

        return null;
    }


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
SAFE INTEGER
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
        !Number.isInteger(
            parsed
        ) ||
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

Valores monetários são armazenados em Kz como número inteiro
na V1.

Exemplo:

1500 Kz

é armazenado como:

1500
============================================================
*/

export function parseAmountKz(
    value
) {

    if (
        typeof value === "number"
    ) {

        if (
            !Number.isFinite(
                value
            ) ||
            value <= 0
        ) {

            return null;
        }


        if (
            !Number.isInteger(
                value
            )
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
        !Number.isFinite(
            parsed
        ) ||
        parsed <= 0 ||
        !Number.isInteger(
            parsed
        )
    ) {

        return null;
    }


    return parsed;
}


/*
============================================================
SECURE EQUAL
============================================================

Comparação resistente a timing attacks para strings.

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
MODULE EXPORT
============================================================
*/

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

    secureEqual
};
