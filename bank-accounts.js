/*
============================================================
HONEY PAY
BANK ACCOUNTS SERVICE
V1.0.1
============================================================

RESPONSABILIDADES

- Criar contas bancárias
- Listar contas do comerciante
- Consultar conta individual
- Atualizar conta
- Ativar / desativar conta
- Definir conta principal
- Remover conta
- Garantir isolamento por merchantId
- Normalizar IBAN
- Nunca devolver informação desnecessariamente sensível

============================================================
*/

import mongoose from "mongoose";


import {
    BankAccount
} from "./models.js";


/*
============================================================
CONSTANTES
============================================================
*/

const MAX_BANK_ACCOUNTS =
    20;


const ALLOWED_ACCOUNT_TYPES = [

    "bank",

    "iban",

    "current",

    "savings",

    "business"

];


/*
============================================================
ERROR HELPER
============================================================
*/

function createError(
    message,
    code,
    statusCode
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
MERCHANT ID VALIDATION
============================================================
*/

function validateMerchantId(
    merchantId
) {

    if (
        !merchantId ||
        !mongoose.Types.ObjectId.isValid(
            merchantId
        )
    ) {

        throw createError(

            "Identificador de comerciante inválido.",

            "INVALID_MERCHANT_ID",

            400
        );
    }


    return new mongoose.Types.ObjectId(
        merchantId
    );
}


/*
============================================================
ACCOUNT ID VALIDATION
============================================================
*/

function validateAccountId(
    accountId
) {

    if (
        !accountId ||
        !mongoose.Types.ObjectId.isValid(
            accountId
        )
    ) {

        throw createError(

            "Identificador de conta bancária inválido.",

            "INVALID_BANK_ACCOUNT_ID",

            400
        );
    }


    return new mongoose.Types.ObjectId(
        accountId
    );
}


/*
============================================================
NORMALIZE IBAN
============================================================
*/

function normalizeIban(
    iban
) {

    if (
        typeof iban !==
        "string"
    ) {

        return "";
    }


    return iban
        .replace(
            /\s+/g,
            ""
        )
        .trim()
        .toUpperCase();
}


/*
============================================================
IBAN LAST FOUR
============================================================
*/

function getIbanLast4(
    iban
) {

    if (
        !iban ||
        iban.length <
        4
    ) {

        return null;
    }


    return iban.slice(
        -4
    );
}


/*
============================================================
NORMALIZE STRING
============================================================
*/

function normalizeString(
    value,
    maxLength
) {

    if (
        typeof value !==
        "string"
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
SANITIZE BANK ACCOUNT
============================================================
*/

function sanitizeBankAccount(
    account
) {

    if (
        !account
    ) {

        return null;
    }


    return {

        id:
            account._id
                ? String(
                    account._id
                )
                : null,

        merchantId:
            account.merchantId
                ? String(
                    account.merchantId
                )
                : null,

        bankName:
            account.bankName,

        accountName:
            account.accountName,

        iban:
            account.iban,

        ibanLast4:
            account.ibanLast4,

        accountNumber:
            account.accountNumber,

        accountType:
            account.accountType,

        currency:
            account.currency,

        isActive:
            Boolean(
                account.isActive
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

    const merchantObjectId =
        validateMerchantId(
            merchantId
        );


    const existingCount =
        await BankAccount.countDocuments(
            {
                merchantId:
                    merchantObjectId
            }
        );


    if (
        existingCount >=
        MAX_BANK_ACCOUNTS
    ) {

        throw createError(

            "O comerciante atingiu o limite de contas bancárias.",

            "BANK_ACCOUNT_LIMIT_REACHED",

            400
        );
    }


    const bankName =
        normalizeString(
            data.bankName,
            160
        );


    const accountName =
        normalizeString(
            data.accountName,
            160
        );


    const iban =
        normalizeIban(
            data.iban
        );


    const accountNumber =
        normalizeString(
            data.accountNumber,
            80
        );


    const accountType =
        normalizeString(
            data.accountType ||
            "bank",
            30
        )
        .toLowerCase();


    const currency =
        normalizeString(
            data.currency ||
            "AOA",
            10
        )
        .toUpperCase();


    if (
        !bankName
    ) {

        throw createError(

            "O nome do banco é obrigatório.",

            "BANK_NAME_REQUIRED",

            400
        );
    }


    if (
        !accountName
    ) {

        throw createError(

            "O nome da conta é obrigatório.",

            "ACCOUNT_NAME_REQUIRED",

            400
        );
    }


    if (
        !iban
    ) {

        throw createError(

            "O IBAN é obrigatório.",

            "IBAN_REQUIRED",

            400
        );
    }


    if (
        !ALLOWED_ACCOUNT_TYPES.includes(
            accountType
        )
    ) {

        throw createError(

            "Tipo de conta bancária inválido.",

            "INVALID_ACCOUNT_TYPE",

            400
        );
    }


    if (
        !/^[A-Z]{2}[0-9A-Z]{8,76}$/.test(
            iban
        )
    ) {

        throw createError(

            "O IBAN fornecido possui um formato inválido.",

            "INVALID_IBAN",

            400
        );
    }


    /*
    --------------------------------------------------------
    Evitar duplicação da mesma conta
    --------------------------------------------------------
    */

    const duplicate =
        await BankAccount.findOne(
            {

                merchantId:
                    merchantObjectId,

                iban
            }
        )
        .lean();


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
    Primeira conta torna-se principal automaticamente
    --------------------------------------------------------
    */

    const shouldBePrimary =
        existingCount ===
        0
        ? true
        : Boolean(
            data.isPrimary
        );


    if (
        shouldBePrimary
    ) {

        await BankAccount.updateMany(

            {
                merchantId:
                    merchantObjectId
            },

            {
                $set: {
                    isPrimary:
                        false
                }
            }
        );
    }


    const account =
        await BankAccount.create(

            {

                merchantId:
                    merchantObjectId,

                bankName,

                accountName,

                iban,

                ibanLast4:
                    getIbanLast4(
                        iban
                    ),

                accountNumber:
                    accountNumber ||
                    null,

                accountType,

                currency,

                isActive:
                    data.isActive !==
                    false,

                isPrimary:
                    shouldBePrimary,

                displayOrder:
                    Number.isFinite(
                        Number(
                            data.displayOrder
                        )
                    )
                        ? Math.max(
                            0,
                            Number(
                                data.displayOrder
                            )
                        )
                        : existingCount
            }
        );


    return sanitizeBankAccount(
        account
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

    const merchantObjectId =
        validateMerchantId(
            merchantId
        );


    const query = {

        merchantId:
            merchantObjectId
    };


    if (
        typeof options.isActive !==
        "undefined"
    ) {

        query.isActive =
            options.isActive ===
            true ||
            options.isActive ===
            "true";
    }


    const accounts =
        await BankAccount
            .find(
                query
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
            .lean();


    return accounts.map(
        sanitizeBankAccount
    );
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

    const merchantObjectId =
        validateMerchantId(
            merchantId
        );


    const accountObjectId =
        validateAccountId(
            accountId
        );


    const account =
        await BankAccount
            .findOne(

                {

                    _id:
                        accountObjectId,

                    merchantId:
                        merchantObjectId
                }
            )
            .lean();


    if (
        !account
    ) {

        throw createError(

            "Conta bancária não encontrada.",

            "BANK_ACCOUNT_NOT_FOUND",

            404
        );
    }


    return sanitizeBankAccount(
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

    const merchantObjectId =
        validateMerchantId(
            merchantId
        );


    const accountObjectId =
        validateAccountId(
            accountId
        );


    const account =
        await BankAccount.findOne(
            {

                _id:
                    accountObjectId,

                merchantId:
                    merchantObjectId
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
        Object.prototype.hasOwnProperty.call(
            data,
            "bankName"
        )
    ) {

        const value =
            normalizeString(
                data.bankName,
                160
            );


        if (
            !value
        ) {

            throw createError(

                "O nome do banco é obrigatório.",

                "BANK_NAME_REQUIRED",

                400
            );
        }


        account.bankName =
            value;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "accountName"
        )
    ) {

        const value =
            normalizeString(
                data.accountName,
                160
            );


        if (
            !value
        ) {

            throw createError(

                "O nome da conta é obrigatório.",

                "ACCOUNT_NAME_REQUIRED",

                400
            );
        }


        account.accountName =
            value;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "iban"
        )
    ) {

        const iban =
            normalizeIban(
                data.iban
            );


        if (
            !iban
        ) {

            throw createError(

                "O IBAN é obrigatório.",

                "IBAN_REQUIRED",

                400
            );
        }


        if (
            !/^[A-Z]{2}[0-9A-Z]{8,76}$/.test(
                iban
            )
        ) {

            throw createError(

                "O IBAN fornecido possui um formato inválido.",

                "INVALID_IBAN",

                400
            );
        }


        const duplicate =
            await BankAccount.findOne(

                {

                    merchantId:
                        merchantObjectId,

                    iban,

                    _id:
                        {
                            $ne:
                                accountObjectId
                        }
                }
            )
            .lean();


        if (
            duplicate
        ) {

            throw createError(

                "Esta conta bancária já está cadastrada.",

                "BANK_ACCOUNT_ALREADY_EXISTS",

                409
            );
        }


        account.iban =
            iban;


        account.ibanLast4 =
            getIbanLast4(
                iban
            );
    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "accountNumber"
        )
    ) {

        account.accountNumber =
            normalizeString(
                data.accountNumber,
                80
            ) ||
            null;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "accountType"
        )
    ) {

        const accountType =
            normalizeString(
                data.accountType,
                30
            )
            .toLowerCase();


        if (
            !ALLOWED_ACCOUNT_TYPES.includes(
                accountType
            )
        ) {

            throw createError(

                "Tipo de conta bancária inválido.",

                "INVALID_ACCOUNT_TYPE",

                400
            );
        }


        account.accountType =
            accountType;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "currency"
        )
    ) {

        const currency =
            normalizeString(
                data.currency,
                10
            )
            .toUpperCase();


        if (
            !currency
        ) {

            throw createError(

                "A moeda da conta é obrigatória.",

                "CURRENCY_REQUIRED",

                400
            );
        }


        account.currency =
            currency;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "displayOrder"
        )
    ) {

        const displayOrder =
            Number(
                data.displayOrder
            );


        if (
            !Number.isFinite(
                displayOrder
            ) ||
            displayOrder <
            0
        ) {

            throw createError(

                "displayOrder inválido.",

                "INVALID_DISPLAY_ORDER",

                400
            );
        }


        account.displayOrder =
            displayOrder;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "isActive"
        )
    ) {

        account.isActive =
            data.isActive ===
            true;
    }


    if (
        Object.prototype.hasOwnProperty.call(
            data,
            "isPrimary"
        ) &&
        data.isPrimary ===
        true
    ) {

        await BankAccount.updateMany(

            {

                merchantId:
                    merchantObjectId,

                _id:
                    {
                        $ne:
                            accountObjectId
                    }
            },

            {

                $set: {

                    isPrimary:
                        false
                }
            }
        );


        account.isPrimary =
            true;
    }


    await account.save();


    /*
    --------------------------------------------------------
    Garantir que existe uma conta principal ativa quando
    possível.
    --------------------------------------------------------
    */

    if (
        account.isPrimary &&
        !account.isActive
    ) {

        account.isPrimary =
            false;


        await account.save();
    }


    return sanitizeBankAccount(
        account
    );
}


/*
============================================================
SET ACTIVE STATUS
============================================================
*/

export async function setBankAccountStatus(
    merchantId,
    accountId,
    isActive
) {

    const merchantObjectId =
        validateMerchantId(
            merchantId
        );


    const accountObjectId =
        validateAccountId(
            accountId
        );


    const account =
        await BankAccount.findOne(
            {

                _id:
                    accountObjectId,

                merchantId:
                    merchantObjectId
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


    const active =
        isActive ===
        true ||
        isActive ===
        "true";


    account.isActive =
        active;


    /*
    --------------------------------------------------------
    Uma conta inativa não pode continuar como principal.
    --------------------------------------------------------
    */

    if (
        !active
    ) {

        account.isPrimary =
            false;
    }


    await account.save();


    /*
    --------------------------------------------------------
    Se a conta principal foi desativada, escolher outra
    conta ativa automaticamente.
    --------------------------------------------------------
    */

    if (
        !active
    ) {

        const replacement =
            await BankAccount
                .findOne(
                    {

                        merchantId:
                            merchantObjectId,

                        isActive:
                            true,

                        _id:
                            {
                                $ne:
                                    accountObjectId
                            }
                    }
                )
                .sort(
                    {
                        displayOrder:
                            1,

                        createdAt:
                            1
                    }
                );


        if (
            replacement
        ) {

            replacement.isPrimary =
                true;


            await replacement.save();
        }
    }


    return sanitizeBankAccount(
        account
    );
}


/*
============================================================
SET PRIMARY
============================================================
*/

export async function setPrimaryBankAccount(
    merchantId,
    accountId
) {

    const merchantObjectId =
        validateMerchantId(
            merchantId
        );


    const accountObjectId =
        validateAccountId(
            accountId
        );


    const account =
        await BankAccount.findOne(
            {

                _id:
                    accountObjectId,

                merchantId:
                    merchantObjectId
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
        !account.isActive
    ) {

        throw createError(

            "Uma conta bancária inativa não pode ser definida como principal.",

            "INACTIVE_BANK_ACCOUNT",

            400
        );
    }


    await BankAccount.updateMany(

        {

            merchantId:
                merchantObjectId
        },

        {

            $set: {

                isPrimary:
                    false
            }
        }
    );


    account.isPrimary =
        true;


    await account.save();


    return sanitizeBankAccount(
        account
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

    const merchantObjectId =
        validateMerchantId(
            merchantId
        );


    const accountObjectId =
        validateAccountId(
            accountId
        );


    const account =
        await BankAccount.findOne(
            {

                _id:
                    accountObjectId,

                merchantId:
                    merchantObjectId
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


    const wasPrimary =
        Boolean(
            account.isPrimary
        );


    await BankAccount.deleteOne(
        {
            _id:
                accountObjectId,

            merchantId:
                merchantObjectId
        }
    );


    /*
    --------------------------------------------------------
    Se removemos a principal, escolher outra ativa.
    --------------------------------------------------------
    */

    if (
        wasPrimary
    ) {

        const replacement =
            await BankAccount
                .findOne(
                    {

                        merchantId:
                            merchantObjectId,

                        isActive:
                            true
                    }
                )
                .sort(
                    {

                        displayOrder:
                            1,

                        createdAt:
                            1
                    }
                );


        if (
            replacement
        ) {

            replacement.isPrimary =
                true;


            await replacement.save();
        }
    }


    return {

        deleted:
            true,

        accountId:
            String(
                accountObjectId
            )
    };
}


/*
============================================================
GET PRIMARY BANK ACCOUNT
============================================================
*/

export async function getPrimaryBankAccount(
    merchantId
) {

    const merchantObjectId =
        validateMerchantId(
            merchantId
        );


    const account =
        await BankAccount
            .findOne(
                {

                    merchantId:
                        merchantObjectId,

                    isActive:
                        true,

                    isPrimary:
                        true
                }
            )
            .lean();


    if (
        !account
    ) {

        return null;
    }


    return sanitizeBankAccount(
        account
    );
}


/*
============================================================
EXPORTS
============================================================
*/

export default {

    createBankAccount,

    listBankAccounts,

    getBankAccount,

    updateBankAccount,

    setBankAccountStatus,

    setPrimaryBankAccount,

    deleteBankAccount,

    getPrimaryBankAccount

};
