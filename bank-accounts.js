/*
============================================================
HONEY PAY
BANK ACCOUNTS SERVICE
V1.0.0
============================================================

GESTÃO REAL DAS CONTAS BANCÁRIAS DO COMERCIANTE

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Criar contas bancárias
- Listar contas do comerciante
- Consultar uma conta
- Atualizar uma conta
- Ativar / desativar conta
- Definir conta principal
- Remover conta
- Validar IBAN
- Evitar duplicação de IBAN
- Preparar contas para o checkout público
- Isolar completamente os dados entre comerciantes

------------------------------------------------------------
DADOS SUPORTADOS
------------------------------------------------------------

- Nome do banco
- Nome da conta
- Titular
- IBAN
- Número da conta opcional
- Moeda
- Estado ativo
- Conta principal
- Ordem de apresentação

------------------------------------------------------------
SEGURANÇA
------------------------------------------------------------

O IBAN completo é armazenado no banco de dados, mas nunca
é exposto desnecessariamente no checkout ou em respostas
públicas.

O comerciante só pode manipular as próprias contas.

============================================================
*/

import crypto from "node:crypto";
import { ObjectId } from "mongodb";


import {
    getDatabase
} from "./database.js";


/*
============================================================
COLLECTION
============================================================
*/

const COLLECTION =
    "bankAccounts";


/*
============================================================
SUPPORTED CURRENCIES
============================================================
*/

const ALLOWED_CURRENCIES =
    new Set([

        "AOA",
        "USD",
        "EUR"

    ]);


/*
============================================================
LIMITS
============================================================
*/

const MAX_ACCOUNTS_PER_MERCHANT =
    20;


/*
============================================================
ERROR FACTORY
============================================================
*/

function createError(
    message,
    code,
    statusCode = 400,
    details = null
) {

    const error =
        new Error(
            message
        );


    error.code =
        code;


    error.statusCode =
        statusCode;


    if (
        details !==
        null
    ) {

        error.details =
            details;
    }


    return error;
}


/*
============================================================
OBJECT ID
============================================================
*/

function normalizeObjectId(
    value,
    code,
    message
) {

    if (
        value instanceof ObjectId
    ) {

        return value;
    }


    if (
        typeof value !==
        "string"
    ) {

        throw createError(
            message,
            code
        );
    }


    const normalized =
        value.trim();


    if (
        !ObjectId.isValid(
            normalized
        )
    ) {

        throw createError(
            message,
            code
        );
    }


    return new ObjectId(
        normalized
    );
}


/*
============================================================
STRING
============================================================
*/

function cleanString(
    value,
    maxLength
) {

    if (
        value ===
        null ||
        value ===
        undefined
    ) {

        return "";
    }


    return String(
        value
    )
        .normalize(
            "NFKC"
        )
        .replace(
            /[\u0000-\u001F\u007F]/g,
            ""
        )
        .trim()
        .slice(
            0,
            maxLength
        );
}


/*
============================================================
IBAN NORMALIZATION
============================================================
*/

function normalizeIBAN(
    iban
) {

    return cleanString(
        iban,
        64
    )
        .replace(
            /\s+/g,
            ""
        )
        .toUpperCase();
}


/*
============================================================
IBAN CHECKSUM
============================================================
*/

function validateIBANChecksum(
    iban
) {

    if (
        typeof iban !==
        "string"
    ) {

        return false;
    }


    if (
        !/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(
            iban
        )
    ) {

        return false;
    }


    if (
        iban.length <
        15 ||
        iban.length >
        34
    ) {

        return false;
    }


    /*
    --------------------------------------------------------
    IBAN MOD-97

    Não usamos Number() porque o valor pode ultrapassar
    o limite seguro de inteiros JavaScript.
    --------------------------------------------------------
    */

    const rearranged =
        iban.slice(
            4
        ) +
        iban.slice(
            0,
            4
        );


    let remainder =
        0;


    for (
        const character
        of rearranged
    ) {

        let numeric;


        if (
            character >=
            "0" &&
            character <=
            "9"
        ) {

            numeric =
                character.charCodeAt(
                    0
                ) -
                48;

        }

        else {

            numeric =
                character.charCodeAt(
                    0
                ) -
                55;
        }


        remainder =
            (
                remainder *
                10 +
                numeric
            ) %
            97;
    }


    return remainder ===
        1;
}


/*
============================================================
IBAN VALIDATION
============================================================
*/

function validateIBAN(
    iban
) {

    const normalized =
        normalizeIBAN(
            iban
        );


    if (
        !normalized
    ) {

        throw createError(
            "O IBAN é obrigatório.",
            "IBAN_REQUIRED"
        );
    }


    if (
        normalized.length >
        34
    ) {

        throw createError(
            "O IBAN informado é demasiado longo.",
            "INVALID_IBAN"
        );
    }


    if (
        !validateIBANChecksum(
            normalized
        )
    ) {

        throw createError(
            "O IBAN informado não é válido.",
            "INVALID_IBAN"
        );
    }


    return normalized;
}


/*
============================================================
IBAN MASK
============================================================
*/

function maskIBAN(
    iban
) {

    if (
        !iban
    ) {

        return null;
    }


    if (
        iban.length <=
        8
    ) {

        return "••••";
    }


    return (

        iban.slice(
            0,
            4
        ) +

        "••••••••" +

        iban.slice(
            -4
        )

    );
}


/*
============================================================
PUBLIC ACCOUNT ID
============================================================
*/

function generatePublicAccountId() {

    return crypto
        .randomBytes(
            16
        )
        .toString(
            "hex"
        );
}


/*
============================================================
PUBLIC RESPONSE
============================================================

Resposta destinada ao checkout.

O IBAN continua disponível para o cliente porque ele precisa
efetuar a transferência.

Dados internos do comerciante nunca são expostos.

============================================================
*/

function toPublicAccount(
    account
) {

    return {

        id:
            account.publicId,

        bankName:
            account.bankName,

        accountName:
            account.accountName,

        holderName:
            account.holderName,

        iban:
            account.iban,

        currency:
            account.currency,

        isPrimary:
            Boolean(
                account.isPrimary
            ),

        displayOrder:
            Number(
                account.displayOrder ||
                0
            )
    };
}


/*
============================================================
PRIVATE RESPONSE
============================================================
*/

function toPrivateAccount(
    account
) {

    return {

        id:
            String(
                account._id
            ),

        publicId:
            account.publicId,

        bankName:
            account.bankName,

        accountName:
            account.accountName,

        holderName:
            account.holderName,

        iban:
            account.iban,

        ibanMasked:
            maskIBAN(
                account.iban
            ),

        currency:
            account.currency,

        active:
            Boolean(
                account.active
            ),

        isPrimary:
            Boolean(
                account.isPrimary
            ),

        displayOrder:
            Number(
                account.displayOrder ||
                0
            ),

        createdAt:
            account.createdAt,

        updatedAt:
            account.updatedAt
    };
}


/*
============================================================
CREATE BANK ACCOUNT
============================================================
*/

export async function createBankAccount(
    merchantId,
    data = {}
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const bankName =
        cleanString(
            data.bankName,
            120
        );


    const accountName =
        cleanString(
            data.accountName,
            120
        );


    const holderName =
        cleanString(
            data.holderName,
            160
        );


    const iban =
        validateIBAN(
            data.iban
        );


    const currency =
        cleanString(
            data.currency ||
            "AOA",
            3
        )
            .toUpperCase();


    if (
        !bankName
    ) {

        throw createError(
            "O nome do banco é obrigatório.",
            "BANK_NAME_REQUIRED"
        );
    }


    if (
        !accountName
    ) {

        throw createError(
            "O nome da conta é obrigatório.",
            "ACCOUNT_NAME_REQUIRED"
        );
    }


    if (
        !holderName
    ) {

        throw createError(
            "O titular da conta é obrigatório.",
            "ACCOUNT_HOLDER_REQUIRED"
        );
    }


    if (
        !ALLOWED_CURRENCIES.has(
            currency
        )
    ) {

        throw createError(
            "A moeda selecionada não é suportada.",
            "UNSUPPORTED_CURRENCY"
        );
    }


    const db =
        await getDatabase();


    /*
    --------------------------------------------------------
    Limite de contas
    --------------------------------------------------------
    */

    const accountCount =
        await db
            .collection(
                COLLECTION
            )
            .countDocuments(
                {
                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        accountCount >=
        MAX_ACCOUNTS_PER_MERCHANT
    ) {

        throw createError(
            "O comerciante atingiu o limite de 20 contas bancárias.",
            "BANK_ACCOUNT_LIMIT_REACHED",
            409
        );
    }


    /*
    --------------------------------------------------------
    Não permitir IBAN duplicado para o mesmo comerciante.
    --------------------------------------------------------
    */

    const duplicate =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {

                    merchantId:
                        normalizedMerchantId,

                    iban
                }
            );


    if (
        duplicate
    ) {

        throw createError(
            "Esta conta bancária já está cadastrada.",
            "BANK_ACCOUNT_ALREADY_EXISTS",
            409
        );
    }


    /*
    --------------------------------------------------------
    Se for a primeira conta, ela será automaticamente
    principal.
    --------------------------------------------------------
    */

    const isFirstAccount =
        accountCount ===
        0;


    const requestedPrimary =
        data.isPrimary ===
        true;


    const isPrimary =
        isFirstAccount ||
        requestedPrimary;


    /*
    --------------------------------------------------------
    Se esta conta for principal, remover principalidade
    das outras.
    --------------------------------------------------------
    */

    const now =
        new Date();


    if (
        isPrimary
    ) {

        await db
            .collection(
                COLLECTION
            )
            .updateMany(

                {

                    merchantId:
                        normalizedMerchantId,

                    isPrimary:
                        true
                },

                {

                    $set:
                        {

                            isPrimary:
                                false,

                            updatedAt:
                                now
                        }
                }
            );
    }


    const displayOrder =
        Number.isInteger(
            data.displayOrder
        ) &&
        data.displayOrder >=
        0

            ? Math.min(
                data.displayOrder,
                999
            )

            : accountCount;


    const document = {

        merchantId:
            normalizedMerchantId,

        publicId:
            generatePublicAccountId(),

        bankName,

        accountName,

        holderName,

        iban,

        currency,

        active:
            data.active !==
            false,

        isPrimary,

        displayOrder,

        createdAt:
            now,

        updatedAt:
            now
    };


    const result =
        await db
            .collection(
                COLLECTION
            )
            .insertOne(
                document
            );


    document._id =
        result.insertedId;


    return toPrivateAccount(
        document
    );
}


/*
============================================================
LIST BANK ACCOUNTS
============================================================
*/

export async function listBankAccounts(
    merchantId,
    options = {}
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const db =
        await getDatabase();


    const filter = {

        merchantId:
            normalizedMerchantId
    };


    if (
        options.activeOnly ===
        true
    ) {

        filter.active =
            true;
    }


    const accounts =
        await db
            .collection(
                COLLECTION
            )
            .find(
                filter
            )
            .sort(
                {

                    isPrimary:
                        -1,

                    displayOrder:
                        1,

                    createdAt:
                        1
                }
            )
            .toArray();


    return {

        items:
            accounts.map(
                toPrivateAccount
            ),

        total:
            accounts.length
    };
}


/*
============================================================
GET BANK ACCOUNT
============================================================
*/

export async function getBankAccount(
    merchantId,
    accountId
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedAccountId =
        normalizeObjectId(

            accountId,

            "INVALID_BANK_ACCOUNT_ID",

            "Identificador da conta bancária inválido."
        );


    const db =
        await getDatabase();


    const account =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedAccountId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        !account
    ) {

        throw createError(
            "Conta bancária não encontrada.",
            "BANK_ACCOUNT_NOT_FOUND",
            404
        );
    }


    return toPrivateAccount(
        account
    );
}


/*
============================================================
UPDATE BANK ACCOUNT
============================================================
*/

export async function updateBankAccount(
    merchantId,
    accountId,
    data = {}
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedAccountId =
        normalizeObjectId(

            accountId,

            "INVALID_BANK_ACCOUNT_ID",

            "Identificador da conta bancária inválido."
        );


    const db =
        await getDatabase();


    const existing =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedAccountId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        !existing
    ) {

        throw createError(
            "Conta bancária não encontrada.",
            "BANK_ACCOUNT_NOT_FOUND",
            404
        );
    }


    const update =
        {};


    if (
        data.bankName !==
        undefined
    ) {

        const bankName =
            cleanString(
                data.bankName,
                120
            );


        if (
            !bankName
        ) {

            throw createError(
                "O nome do banco é obrigatório.",
                "BANK_NAME_REQUIRED"
            );
        }


        update.bankName =
            bankName;
    }


    if (
        data.accountName !==
        undefined
    ) {

        const accountName =
            cleanString(
                data.accountName,
                120
            );


        if (
            !accountName
        ) {

            throw createError(
                "O nome da conta é obrigatório.",
                "ACCOUNT_NAME_REQUIRED"
            );
        }


        update.accountName =
            accountName;
    }


    if (
        data.holderName !==
        undefined
    ) {

        const holderName =
            cleanString(
                data.holderName,
                160
            );


        if (
            !holderName
        ) {

            throw createError(
                "O titular da conta é obrigatório.",
                "ACCOUNT_HOLDER_REQUIRED"
            );
        }


        update.holderName =
            holderName;
    }


    if (
        data.currency !==
        undefined
    ) {

        const currency =
            cleanString(
                data.currency,
                3
            )
                .toUpperCase();


        if (
            !ALLOWED_CURRENCIES.has(
                currency
            )
        ) {

            throw createError(
                "A moeda selecionada não é suportada.",
                "UNSUPPORTED_CURRENCY"
            );
        }


        update.currency =
            currency;
    }


    if (
        data.iban !==
        undefined
    ) {

        const newIban =
            validateIBAN(
                data.iban
            );


        if (
            newIban !==
            existing.iban
        ) {

            const duplicate =
                await db
                    .collection(
                        COLLECTION
                    )
                    .findOne(
                        {

                            merchantId:
                                normalizedMerchantId,

                            iban:
                                newIban,

                            _id:
                                {
                                    $ne:
                                        normalizedAccountId
                                }
                        }
                    );


            if (
                duplicate
            ) {

                throw createError(
                    "Esta conta bancária já está cadastrada.",
                    "BANK_ACCOUNT_ALREADY_EXISTS",
                    409
                );
            }
        }


        update.iban =
            newIban;
    }


    if (
        data.active !==
        undefined
    ) {

        update.active =
            Boolean(
                data.active
            );
    }


    if (
        data.displayOrder !==
        undefined
    ) {

        const order =
            Number(
                data.displayOrder
            );


        if (
            !Number.isInteger(
                order
            ) ||
            order < 0
        ) {

            throw createError(
                "A ordem de apresentação é inválida.",
                "INVALID_DISPLAY_ORDER"
            );
        }


        update.displayOrder =
            Math.min(
                order,
                999
            );
    }


    const wantsPrimary =
        data.isPrimary ===
        true;


    const wantsNonPrimary =
        data.isPrimary ===
        false;


    const now =
        new Date();


    if (
        wantsPrimary
    ) {

        await db
            .collection(
                COLLECTION
            )
            .updateMany(

                {

                    merchantId:
                        normalizedMerchantId,

                    _id:
                        {
                            $ne:
                                normalizedAccountId
                        },

                    isPrimary:
                        true
                },

                {

                    $set:
                        {

                            isPrimary:
                                false,

                            updatedAt:
                                now
                        }
                }
            );


        update.isPrimary =
            true;
    }


    if (
        wantsNonPrimary
    ) {

        /*
        ----------------------------------------------------
        Uma conta pode deixar de ser principal somente se
        outra conta ativa assumir a função.
        ----------------------------------------------------
        */

        if (
            existing.isPrimary
        ) {

            const replacement =
                await db
                    .collection(
                        COLLECTION
                    )
                    .findOne(
                        {

                            merchantId:
                                normalizedMerchantId,

                            _id:
                                {
                                    $ne:
                                        normalizedAccountId
                                },

                            active:
                                true
                        },

                        {

                            sort:
                                {

                                    displayOrder:
                                        1,

                                    createdAt:
                                        1
                                }
                        }
                    );


            if (
                !replacement
            ) {

                throw createError(
                    "É necessário manter pelo menos uma conta ativa como principal.",
                    "PRIMARY_ACCOUNT_REQUIRED",
                    409
                );
            }


            await db
                .collection(
                    COLLECTION
                )
                .updateOne(

                    {

                        _id:
                            replacement._id,

                        merchantId:
                            normalizedMerchantId
                    },

                    {

                        $set:
                            {

                                isPrimary:
                                    true,

                                updatedAt:
                                    now
                            }
                    }
                );
        }


        update.isPrimary =
            false;
    }


    if (
        Object.keys(
            update
        ).length ===
        0
    ) {

        return toPrivateAccount(
            existing
        );
    }


    update.updatedAt =
        now;


    const result =
        await db
            .collection(
                COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        normalizedAccountId,

                    merchantId:
                        normalizedMerchantId
                },

                {

                    $set:
                        update
                },

                {

                    returnDocument:
                        "after"
                }
            );


    const updated =
        result?.value ||
        result;


    if (
        !updated
    ) {

        throw createError(
            "Não foi possível atualizar a conta bancária.",
            "BANK_ACCOUNT_UPDATE_FAILED",
            500
        );
    }


    return toPrivateAccount(
        updated
    );
}


/*
============================================================
SET PRIMARY ACCOUNT
============================================================
*/

export async function setPrimaryBankAccount(
    merchantId,
    accountId
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedAccountId =
        normalizeObjectId(

            accountId,

            "INVALID_BANK_ACCOUNT_ID",

            "Identificador da conta bancária inválido."
        );


    const db =
        await getDatabase();


    const account =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedAccountId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        !account
    ) {

        throw createError(
            "Conta bancária não encontrada.",
            "BANK_ACCOUNT_NOT_FOUND",
            404
        );
    }


    if (
        !account.active
    ) {

        throw createError(
            "Uma conta desativada não pode ser definida como principal.",
            "INACTIVE_ACCOUNT_CANNOT_BE_PRIMARY",
            409
        );
    }


    const now =
        new Date();


    await db
        .collection(
            COLLECTION
        )
        .updateMany(

            {

                merchantId:
                    normalizedMerchantId,

                isPrimary:
                    true,

                _id:
                    {
                        $ne:
                            normalizedAccountId
                    }
            },

            {

                $set:
                    {

                        isPrimary:
                            false,

                        updatedAt:
                            now
                    }
            }
        );


    const result =
        await db
            .collection(
                COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        normalizedAccountId,

                    merchantId:
                        normalizedMerchantId
                },

                {

                    $set:
                        {

                            isPrimary:
                                true,

                            updatedAt:
                                now
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


    const updated =
        result?.value ||
        result;


    if (
        !updated
    ) {

        throw createError(
            "Não foi possível definir a conta principal.",
            "PRIMARY_ACCOUNT_UPDATE_FAILED",
            500
        );
    }


    return toPrivateAccount(
        updated
    );
}


/*
============================================================
TOGGLE ACCOUNT
============================================================
*/

export async function setBankAccountStatus(
    merchantId,
    accountId,
    active
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedAccountId =
        normalizeObjectId(

            accountId,

            "INVALID_BANK_ACCOUNT_ID",

            "Identificador da conta bancária inválido."
        );


    const desiredStatus =
        Boolean(
            active
        );


    const db =
        await getDatabase();


    const account =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedAccountId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        !account
    ) {

        throw createError(
            "Conta bancária não encontrada.",
            "BANK_ACCOUNT_NOT_FOUND",
            404
        );
    }


    if (
        account.active ===
        desiredStatus
    ) {

        return toPrivateAccount(
            account
        );
    }


    const now =
        new Date();


    /*
    --------------------------------------------------------
    DESATIVAR
    --------------------------------------------------------
    */

    if (
        desiredStatus ===
        false
    ) {

        if (
            account.isPrimary
        ) {

            const replacement =
                await db
                    .collection(
                        COLLECTION
                    )
                    .findOne(
                        {

                            merchantId:
                                normalizedMerchantId,

                            _id:
                                {
                                    $ne:
                                        normalizedAccountId
                                },

                            active:
                                true
                        },

                        {

                            sort:
                                {

                                    displayOrder:
                                        1,

                                    createdAt:
                                        1
                                }
                        }
                    );


            if (
                !replacement
            ) {

                throw createError(
                    "Não é possível desativar a única conta ativa do comerciante.",
                    "LAST_ACTIVE_ACCOUNT",
                    409
                );
            }


            await db
                .collection(
                    COLLECTION
                )
                .updateOne(

                    {

                        _id:
                            replacement._id,

                        merchantId:
                            normalizedMerchantId
                    },

                    {

                        $set:
                            {

                                isPrimary:
                                    true,

                                updatedAt:
                                    now
                            }
                    }
                );
        }


        const result =
            await db
                .collection(
                    COLLECTION
                )
                .findOneAndUpdate(

                    {

                        _id:
                            normalizedAccountId,

                        merchantId:
                            normalizedMerchantId
                    },

                    {

                        $set:
                            {

                                active:
                                    false,

                                isPrimary:
                                    false,

                                updatedAt:
                                    now
                            }
                    },

                    {

                        returnDocument:
                            "after"
                    }
                );


        const updated =
            result?.value ||
            result;


        return toPrivateAccount(
            updated
        );
    }


    /*
    --------------------------------------------------------
    ATIVAR
    --------------------------------------------------------
    */

    const result =
        await db
            .collection(
                COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        normalizedAccountId,

                    merchantId:
                        normalizedMerchantId
                },

                {

                    $set:
                        {

                            active:
                                true,

                            updatedAt:
                                now
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


    const updated =
        result?.value ||
        result;


    if (
        !updated
    ) {

        throw createError(
            "Não foi possível ativar a conta bancária.",
            "BANK_ACCOUNT_ACTIVATION_FAILED",
            500
        );
    }


    return toPrivateAccount(
        updated
    );
}


/*
============================================================
DELETE BANK ACCOUNT
============================================================
*/

export async function deleteBankAccount(
    merchantId,
    accountId
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedAccountId =
        normalizeObjectId(

            accountId,

            "INVALID_BANK_ACCOUNT_ID",

            "Identificador da conta bancária inválido."
        );


    const db =
        await getDatabase();


    const account =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedAccountId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        !account
    ) {

        throw createError(
            "Conta bancária não encontrada.",
            "BANK_ACCOUNT_NOT_FOUND",
            404
        );
    }


    const accountCount =
        await db
            .collection(
                COLLECTION
            )
            .countDocuments(
                {
                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        accountCount <=
        1
    ) {

        throw createError(
            "O comerciante precisa manter pelo menos uma conta bancária cadastrada.",
            "LAST_BANK_ACCOUNT",
            409
        );
    }


    const result =
        await db
            .collection(
                COLLECTION
            )
            .deleteOne(
                {

                    _id:
                        normalizedAccountId,

                    merchantId:
                        normalizedMerchantId
                }
            );


    if (
        result.deletedCount !==
        1
    ) {

        throw createError(
            "Não foi possível remover a conta bancária.",
            "BANK_ACCOUNT_DELETE_FAILED",
            500
        );
    }


    /*
    --------------------------------------------------------
    Se removemos a principal, escolher outra conta ativa.
    --------------------------------------------------------
    */

    if (
        account.isPrimary
    ) {

        const replacement =
            await db
                .collection(
                    COLLECTION
                )
                .findOne(
                    {

                        merchantId:
                            normalizedMerchantId,

                        active:
                            true
                    },

                    {

                        sort:
                            {

                                displayOrder:
                                    1,

                                createdAt:
                                    1
                            }
                    }
                );


        if (
            replacement
        ) {

            await db
                .collection(
                    COLLECTION
                )
                .updateOne(

                    {

                        _id:
                            replacement._id,

                        merchantId:
                            normalizedMerchantId
                    },

                    {

                        $set:
                            {

                                isPrimary:
                                    true,

                                updatedAt:
                                    new Date()
                            }
                    }
                );
        }
    }


    return {

        deleted:
            true,

        id:
            String(
                normalizedAccountId
            )
    };
}


/*
============================================================
PUBLIC CHECKOUT ACCOUNTS
============================================================

Retorna somente contas ativas.

============================================================
*/

export async function getPublicBankAccounts(
    merchantId
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const db =
        await getDatabase();


    const accounts =
        await db
            .collection(
                COLLECTION
            )
            .find(
                {

                    merchantId:
                        normalizedMerchantId,

                    active:
                        true
                }
            )
            .sort(
                {

                    isPrimary:
                        -1,

                    displayOrder:
                        1,

                    createdAt:
                        1
                }
            )
            .toArray();


    return accounts.map(
        toPublicAccount
    );
}


/*
============================================================
GET ACCOUNT BY PUBLIC ID
============================================================
*/

export async function getPublicBankAccount(
    merchantId,
    publicId
) {

    const normalizedMerchantId =
        normalizeObjectId(

            merchantId,

            "INVALID_MERCHANT_ID",

            "Identificador do comerciante inválido."
        );


    const normalizedPublicId =
        cleanString(
            publicId,
            100
        );


    if (
        !normalizedPublicId
    ) {

        throw createError(
            "Conta bancária inválida.",
            "INVALID_BANK_ACCOUNT"
        );
    }


    const db =
        await getDatabase();


    const account =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {

                    merchantId:
                        normalizedMerchantId,

                    publicId:
                        normalizedPublicId,

                    active:
                        true
                }
            );


    if (
        !account
    ) {

        throw createError(
            "Conta bancária não encontrada.",
            "BANK_ACCOUNT_NOT_FOUND",
            404
        );
    }


    return toPublicAccount(
        account
    );
}


/*
============================================================
INDEXES
============================================================
*/

export async function ensureBankAccountIndexes() {

    const db =
        await getDatabase();


    const collection =
        db.collection(
            COLLECTION
        );


    await collection.createIndex(

        {

            merchantId:
                1,

            iban:
                1
        },

        {

            unique:
                true
        }
    );


    await collection.createIndex(

        {

            merchantId:
                1,

            active:
                1,

            isPrimary:
                -1,

            displayOrder:
                1
        }
    );


    await collection.createIndex(

        {

            merchantId:
                1,

            publicId:
                1
        },

        {

            unique:
                true
        }
    );


    return {

        collection:
            COLLECTION,

        indexes:
            "ready"
    };
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    createBankAccount,

    listBankAccounts,

    getBankAccount,

    updateBankAccount,

    setPrimaryBankAccount,

    setBankAccountStatus,

    deleteBankAccount,

    getPublicBankAccounts,

    getPublicBankAccount,

    ensureBankAccountIndexes
};
