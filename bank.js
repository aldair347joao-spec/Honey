/*
============================================================
HONEY PAY
BANK ACCOUNT SERVICE
V1.0.0
============================================================

GESTÃO DE CONTAS BANCÁRIAS DOS COMERCIANTES

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Criar contas bancárias
- Listar contas do comerciante
- Atualizar contas
- Desativar contas
- Eliminar contas
- Definir conta padrão
- Validar IBAN
- Validar número de conta
- Impedir acesso entre comerciantes
- Preparar contas para o checkout público

------------------------------------------------------------
IMPORTANTE
------------------------------------------------------------

Um comerciante pode possuir várias contas.

Exemplo:

BFA
IBAN: AO06...

BIC
IBAN: AO06...

BAI
IBAN: AO06...

O cliente poderá escolher a conta no checkout.

============================================================
*/

import crypto from "node:crypto";
import { ObjectId } from "mongodb";

import {
    getDatabase
} from "./database.js";


/*
============================================================
CONFIGURAÇÃO
============================================================
*/

const COLLECTION =
    "bank_accounts";

const CURRENCY =
    "AOA";

const MAX_BANK_NAME_LENGTH =
    120;

const MAX_BANK_CODE_LENGTH =
    40;

const MAX_ACCOUNT_NAME_LENGTH =
    160;

const MAX_ACCOUNT_NUMBER_LENGTH =
    80;

const MAX_IBAN_LENGTH =
    80;

const MAX_ALIAS_LENGTH =
    100;

const MAX_NOTES_LENGTH =
    500;


/*
============================================================
HELPERS
============================================================
*/

function cleanString(
    value,
    maxLength = 500
) {

    if (
        value === null ||
        value === undefined
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
        .replace(
            /\s+/g,
            " "
        )
        .slice(
            0,
            maxLength
        );
}


function normalizeId(
    value
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

        return null;
    }


    const normalized =
        value.trim();


    if (
        !ObjectId.isValid(
            normalized
        )
    ) {

        return null;
    }


    return new ObjectId(
        normalized
    );
}


function merchantIdOrThrow(
    merchantId
) {

    const id =
        normalizeId(
            merchantId
        );


    if (
        !id
    ) {

        const error =
            new Error(
                "Identificador do comerciante inválido."
            );


        error.code =
            "INVALID_MERCHANT_ID";


        error.statusCode =
            400;


        throw error;
    }


    return id;
}


/*
============================================================
IBAN
============================================================

Validação estrutural.

Não significa que a conta exista.

Não fazemos consulta bancária externa.

============================================================
*/

function normalizeIBAN(
    value
) {

    return cleanString(
        value,
        MAX_IBAN_LENGTH
    )
        .replace(
            /\s+/g,
            ""
        )
        .toUpperCase();
}


function isValidIBAN(
    iban
) {

    if (
        !iban
    ) {

        return false;
    }


    /*
    --------------------------------------------------------
    Angola utiliza IBAN iniciado por AO.
    --------------------------------------------------------
    */

    if (
        !/^AO\d{2}[A-Z0-9]{20,30}$/.test(
            iban
        )
    ) {

        return false;
    }


    /*
    --------------------------------------------------------
    MOD-97.
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


    let numeric =
        "";


    for (
        const character of rearranged
    ) {

        if (
            /[A-Z]/.test(
                character
            )
        ) {

            numeric +=
                String(
                    character.charCodeAt(
                        0
                    ) -
                    55
                );

        }

        else {

            numeric +=
                character;
        }
    }


    let remainder =
        0;


    for (
        const digit of numeric
    ) {

        remainder =
            (
                remainder *
                10 +
                Number(
                    digit
                )
            ) %
            97;
    }


    return (
        remainder ===
        1
    );
}


/*
============================================================
ACCOUNT NUMBER
============================================================
*/

function normalizeAccountNumber(
    value
) {

    return cleanString(
        value,
        MAX_ACCOUNT_NUMBER_LENGTH
    )
        .replace(
            /\s+/g,
            ""
        );
}


/*
============================================================
CURRENCY
============================================================
*/

function normalizeCurrency(
    value
) {

    const currency =
        cleanString(
            value ||
            CURRENCY,
            10
        )
            .toUpperCase();


    if (
        !/^[A-Z]{3}$/.test(
            currency
        )
    ) {

        const error =
            new Error(
                "Moeda inválida."
            );


        error.code =
            "INVALID_CURRENCY";


        error.statusCode =
            400;


        throw error;
    }


    return currency;
}


/*
============================================================
BANK DATA VALIDATION
============================================================
*/

function validateBankData(
    data = {},
    options = {}
) {

    const partial =
        options.partial ===
        true;


    const result = {};


    if (
        !partial ||
        data.bankName !==
            undefined
    ) {

        result.bankName =
            cleanString(
                data.bankName,
                MAX_BANK_NAME_LENGTH
            );


        if (
            !result.bankName
        ) {

            const error =
                new Error(
                    "O nome do banco é obrigatório."
                );


            error.code =
                "BANK_NAME_REQUIRED";


            error.statusCode =
                400;


            throw error;
        }
    }


    if (
        !partial ||
        data.bankCode !==
            undefined
    ) {

        result.bankCode =
            cleanString(
                data.bankCode,
                MAX_BANK_CODE_LENGTH
            );


        if (
            !result.bankCode
        ) {

            result.bankCode =
                null;
        }
    }


    if (
        !partial ||
        data.accountName !==
            undefined
    ) {

        result.accountName =
            cleanString(
                data.accountName,
                MAX_ACCOUNT_NAME_LENGTH
            );


        if (
            !result.accountName
        ) {

            const error =
                new Error(
                    "O titular da conta é obrigatório."
                );


            error.code =
                "ACCOUNT_NAME_REQUIRED";


            error.statusCode =
                400;


            throw error;
        }
    }


    if (
        !partial ||
        data.accountNumber !==
            undefined
    ) {

        result.accountNumber =
            normalizeAccountNumber(
                data.accountNumber
            );


        if (
            !result.accountNumber
        ) {

            result.accountNumber =
                null;
        }
    }


    if (
        !partial ||
        data.iban !==
            undefined
    ) {

        result.iban =
            normalizeIBAN(
                data.iban
            );


        if (
            result.iban &&
            !isValidIBAN(
                result.iban
            )
        ) {

            const error =
                new Error(
                    "O IBAN informado não é válido."
                );


            error.code =
                "INVALID_IBAN";


            error.statusCode =
                400;


            throw error;
        }
    }


    if (
        !partial
    ) {

        if (
            !result.iban &&
            !result.accountNumber
        ) {

            const error =
                new Error(
                    "Informe o IBAN ou o número da conta."
                );


            error.code =
                "BANK_ACCOUNT_NUMBER_REQUIRED";


            error.statusCode =
                400;


            throw error;
        }
    }


    if (
        data.currency !==
        undefined
    ) {

        result.currency =
            normalizeCurrency(
                data.currency
            );
    }


    else if (
        !partial
    ) {

        result.currency =
            CURRENCY;
    }


    if (
        data.alias !==
        undefined
    ) {

        result.alias =
            cleanString(
                data.alias,
                MAX_ALIAS_LENGTH
            ) || null;
    }


    if (
        data.notes !==
        undefined
    ) {

        result.notes =
            cleanString(
                data.notes,
                MAX_NOTES_LENGTH
            ) || null;
    }


    if (
        data.isDefault !==
        undefined
    ) {

        result.isDefault =
            Boolean(
                data.isDefault
            );
    }


    if (
        data.active !==
        undefined
    ) {

        result.active =
            Boolean(
                data.active
            );
    }


    return result;
}


/*
============================================================
PUBLIC SANITIZATION
============================================================

Nunca devolveremos dados internos.

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
            String(
                account._id
            ),

        bankName:
            account.bankName,

        bankCode:
            account.bankCode ||
            null,

        accountName:
            account.accountName,

        accountNumber:
            account.accountNumber ||
            null,

        iban:
            account.iban ||
            null,

        currency:
            account.currency ||
            CURRENCY,

        alias:
            account.alias ||
            null,

        isDefault:
            Boolean(
                account.isDefault
            ),

        active:
            account.active !==
            false,

        createdAt:
            account.createdAt,

        updatedAt:
            account.updatedAt
    };
}


/*
============================================================
FIND ACCOUNT
============================================================
*/

async function findMerchantBankAccount(
    db,
    merchantId,
    bankAccountId
) {

    const normalizedMerchantId =
        merchantIdOrThrow(
            merchantId
        );


    const normalizedBankId =
        normalizeId(
            bankAccountId
        );


    if (
        !normalizedBankId
    ) {

        const error =
            new Error(
                "Identificador da conta bancária inválido."
            );


        error.code =
            "INVALID_BANK_ACCOUNT_ID";


        error.statusCode =
            400;


        throw error;
    }


    const accounts =
        db.collection(
            COLLECTION
        );


    const account =
        await accounts.findOne(
            {

                _id:
                    normalizedBankId,

                merchantId:
                    normalizedMerchantId
            }
        );


    if (
        !account
    ) {

        const error =
            new Error(
                "Conta bancária não encontrada."
            );


        error.code =
            "BANK_ACCOUNT_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    return account;
}


/*
============================================================
SET DEFAULT
============================================================
*/

async function unsetMerchantDefaults(
    accounts,
    merchantId,
    exceptId = null
) {

    const filter = {

        merchantId,

        isDefault:
            true
    };


    if (
        exceptId
    ) {

        filter._id =
            {
                $ne:
                    exceptId
            };
    }


    await accounts.updateMany(

        filter,

        {

            $set:
                {

                    isDefault:
                        false,

                    updatedAt:
                        new Date()
                }
        }
    );
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
        merchantIdOrThrow(
            merchantId
        );


    const db =
        await getDatabase();


    const accounts =
        db.collection(
            COLLECTION
        );


    const validated =
        validateBankData(
            data
        );


    /*
    --------------------------------------------------------
    Pelo menos uma identificação bancária.
    --------------------------------------------------------
    */

    const duplicateFilter = {

        merchantId:
            normalizedMerchantId,

        $or:
            []
    };


    if (
        validated.iban
    ) {

        duplicateFilter.$or.push(
            {
                iban:
                    validated.iban
            }
        );
    }


    if (
        validated.accountNumber
    ) {

        duplicateFilter.$or.push(
            {
                accountNumber:
                    validated.accountNumber
            }
        );
    }


    if (
        duplicateFilter.$or.length
    ) {

        const duplicate =
            await accounts.findOne(
                duplicateFilter
            );


        if (
            duplicate
        ) {

            const error =
                new Error(
                    "Esta conta bancária já está cadastrada."
                );


            error.code =
                "BANK_ACCOUNT_ALREADY_EXISTS";


            error.statusCode =
                409;


            throw error;
        }
    }


    const now =
        new Date();


    /*
    --------------------------------------------------------
    Primeira conta torna-se padrão automaticamente.
    --------------------------------------------------------
    */

    const existingCount =
        await accounts.countDocuments(
            {
                merchantId:
                    normalizedMerchantId,

                active:
                    {
                        $ne:
                            false
                    }
            }
        );


    const shouldBeDefault =
        validated.isDefault ===
        true ||
        existingCount ===
        0;


    if (
        shouldBeDefault
    ) {

        await unsetMerchantDefaults(
            accounts,
            normalizedMerchantId
        );
    }


    const account = {

        merchantId:
            normalizedMerchantId,

        bankName:
            validated.bankName,

        bankCode:
            validated.bankCode ||
            null,

        accountName:
            validated.accountName,

        accountNumber:
            validated.accountNumber ||
            null,

        iban:
            validated.iban ||
            null,

        currency:
            validated.currency ||
            CURRENCY,

        alias:
            validated.alias ||
            null,

        notes:
            validated.notes ||
            null,

        isDefault:
            shouldBeDefault,

        active:
            validated.active !==
            false,

        createdAt:
            now,

        updatedAt:
            now,

        publicKey:
            crypto
                .randomBytes(
                    12
                )
                .toString(
                    "hex"
                )
    };


    try {

        const result =
            await accounts.insertOne(
                account
            );


        account._id =
            result.insertedId;
    }

    catch (error) {

        if (
            error?.code ===
            11000
        ) {

            const duplicateError =
                new Error(
                    "Esta conta bancária já está cadastrada."
                );


            duplicateError.code =
                "BANK_ACCOUNT_ALREADY_EXISTS";


            duplicateError.statusCode =
                409;


            throw duplicateError;
        }


        throw error;
    }


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

    const normalizedMerchantId =
        merchantIdOrThrow(
            merchantId
        );


    const db =
        await getDatabase();


    const accounts =
        db.collection(
            COLLECTION
        );


    const includeInactive =
        options.includeInactive ===
        true;


    const filter = {

        merchantId:
            normalizedMerchantId
    };


    if (
        !includeInactive
    ) {

        filter.active =
            {
                $ne:
                    false
            };
    }


    const documents =
        await accounts
            .find(
                filter
            )
            .sort(
                {

                    isDefault:
                        -1,

                    createdAt:
                        1
                }
            )
            .toArray();


    return documents.map(
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
    bankAccountId
) {

    const db =
        await getDatabase();


    const account =
        await findMerchantBankAccount(

            db,

            merchantId,

            bankAccountId
        );


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
    bankAccountId,
    data = {}
) {

    const normalizedMerchantId =
        merchantIdOrThrow(
            merchantId
        );


    const db =
        await getDatabase();


    const accounts =
        db.collection(
            COLLECTION
        );


    const existing =
        await findMerchantBankAccount(

            db,

            normalizedMerchantId,

            bankAccountId
        );


    const validated =
        validateBankData(
            data,
            {
                partial:
                    true
            }
        );


    /*
    --------------------------------------------------------
    Verificar duplicação caso IBAN/número seja alterado.
    --------------------------------------------------------
    */

    const newIBAN =
        validated.iban !==
        undefined
            ? validated.iban
            : existing.iban;


    const newAccountNumber =
        validated.accountNumber !==
        undefined
            ? validated.accountNumber
            : existing.accountNumber;


    const duplicateConditions =
        [];


    if (
        newIBAN
    ) {

        duplicateConditions.push(
            {
                iban:
                    newIBAN
            }
        );
    }


    if (
        newAccountNumber
    ) {

        duplicateConditions.push(
            {
                accountNumber:
                    newAccountNumber
            }
        );
    }


    if (
        duplicateConditions.length
    ) {

        const duplicate =
            await accounts.findOne(
                {

                    merchantId:
                        normalizedMerchantId,

                    _id:
                        {
                            $ne:
                                existing._id
                        },

                    $or:
                        duplicateConditions
                }
            );


        if (
            duplicate
        ) {

            const error =
                new Error(
                    "Outra conta bancária já utiliza estes dados."
                );


            error.code =
                "BANK_ACCOUNT_ALREADY_EXISTS";


            error.statusCode =
                409;


            throw error;
        }
    }


    const update =
        {

            $set:
                {

                    ...validated,

                    updatedAt:
                        new Date()
                }
        };


    /*
    --------------------------------------------------------
    Nunca permitir alterar o merchantId.
    --------------------------------------------------------
    */

    delete update.$set.merchantId;

    delete update.$set.publicKey;

    delete update.$set.createdAt;


    const wantsDefault =
        validated.isDefault ===
        true;


    if (
        wantsDefault
    ) {

        await unsetMerchantDefaults(

            accounts,

            normalizedMerchantId,

            existing._id
        );
    }


    const result =
        await accounts.findOneAndUpdate(

            {

                _id:
                    existing._id,

                merchantId:
                    normalizedMerchantId
            },

            update,

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

        const error =
            new Error(
                "Não foi possível atualizar a conta bancária."
            );


        error.code =
            "BANK_ACCOUNT_UPDATE_FAILED";


        error.statusCode =
            500;


        throw error;
    }


    return sanitizeBankAccount(
        updated
    );
}


/*
============================================================
SET DEFAULT BANK ACCOUNT
============================================================
*/

export async function setDefaultBankAccount(
    merchantId,
    bankAccountId
) {

    const normalizedMerchantId =
        merchantIdOrThrow(
            merchantId
        );


    const db =
        await getDatabase();


    const accounts =
        db.collection(
            COLLECTION
        );


    const existing =
        await findMerchantBankAccount(

            db,

            normalizedMerchantId,

            bankAccountId
        );


    if (
        existing.active ===
        false
    ) {

        const error =
            new Error(
                "Uma conta inativa não pode ser definida como padrão."
            );


        error.code =
            "INACTIVE_BANK_ACCOUNT";


        error.statusCode =
            409;


        throw error;
    }


    await unsetMerchantDefaults(

        accounts,

        normalizedMerchantId,

        existing._id
    );


    const result =
        await accounts.findOneAndUpdate(

            {

                _id:
                    existing._id,

                merchantId:
                    normalizedMerchantId,

                active:
                    {
                        $ne:
                            false
                    }
            },

            {

                $set:
                    {

                        isDefault:
                            true,

                        updatedAt:
                            new Date()
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


    return sanitizeBankAccount(
        updated
    );
}


/*
============================================================
DEACTIVATE
============================================================
*/

export async function deactivateBankAccount(
    merchantId,
    bankAccountId
) {

    const normalizedMerchantId =
        merchantIdOrThrow(
            merchantId
        );


    const db =
        await getDatabase();


    const accounts =
        db.collection(
            COLLECTION
        );


    const existing =
        await findMerchantBankAccount(

            db,

            normalizedMerchantId,

            bankAccountId
        );


    const activeCount =
        await accounts.countDocuments(
            {

                merchantId:
                    normalizedMerchantId,

                active:
                    {
                        $ne:
                            false
                    }
            }
        );


    if (
        existing.active !==
        false &&
        activeCount <=
        1
    ) {

        const error =
            new Error(
                "O comerciante precisa manter pelo menos uma conta bancária ativa."
            );


        error.code =
            "LAST_ACTIVE_BANK_ACCOUNT";


        error.statusCode =
            409;


        throw error;
    }


    const wasDefault =
        Boolean(
            existing.isDefault
        );


    const result =
        await accounts.findOneAndUpdate(

            {

                _id:
                    existing._id,

                merchantId:
                    normalizedMerchantId
            },

            {

                $set:
                    {

                        active:
                            false,

                        isDefault:
                            false,

                        updatedAt:
                            new Date()
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


    /*
    --------------------------------------------------------
    Se a conta desativada era a padrão, escolher outra.
    --------------------------------------------------------
    */

    if (
        wasDefault
    ) {

        const replacement =
            await accounts.findOne(
                {

                    merchantId:
                        normalizedMerchantId,

                    active:
                        {
                            $ne:
                                false
                        }
                },
                {

                    sort:
                        {
                            createdAt:
                                1
                        }
                }
            );


        if (
            replacement
        ) {

            await accounts.updateOne(

                {
                    _id:
                        replacement._id
                },

                {

                    $set:
                        {

                            isDefault:
                                true,

                            updatedAt:
                                new Date()
                        }
                }
            );
        }
    }


    return sanitizeBankAccount(
        updated
    );
}


/*
============================================================
DELETE BANK ACCOUNT
============================================================

Por segurança, a operação pública recomendada é
desativação.

A eliminação física só será permitida quando a conta
não tiver histórico de utilização.

============================================================
*/

export async function deleteBankAccount(
    merchantId,
    bankAccountId
) {

    const normalizedMerchantId =
        merchantIdOrThrow(
            merchantId
        );


    const db =
        await getDatabase();


    const accounts =
        db.collection(
            COLLECTION
        );


    const existing =
        await findMerchantBankAccount(

            db,

            normalizedMerchantId,

            bankAccountId
        );


    /*
    --------------------------------------------------------
    Não apagar conta padrão se existirem outras contas.
    --------------------------------------------------------
    */

    if (
        existing.isDefault
    ) {

        const alternatives =
            await accounts.countDocuments(
                {

                    merchantId:
                        normalizedMerchantId,

                    _id:
                        {
                            $ne:
                                existing._id
                        },

                    active:
                        {
                            $ne:
                                false
                        }
                }
            );


        if (
            alternatives >
            0
        ) {

            const error =
                new Error(
                    "Defina outra conta como padrão antes de eliminar esta conta."
                );


            error.code =
                "DEFAULT_BANK_ACCOUNT_DELETE_BLOCKED";


            error.statusCode =
                409;


            throw error;
        }
    }


    /*
    --------------------------------------------------------
    Verificar utilização em faturas.

    Uma conta utilizada numa fatura fica preservada para
    manter a integridade histórica dos dados.

    --------------------------------------------------------
    */

    const invoices =
        db.collection(
            "invoices"
        );


    const usage =
        await invoices.findOne(
            {

                merchantId:
                    normalizedMerchantId,

                bankAccountIds:
                    existing._id
            },
            {

                projection:
                    {
                        _id:
                            1
                    }
            }
        );


    if (
        usage
    ) {

        const result =
            await accounts.findOneAndUpdate(

                {

                    _id:
                        existing._id,

                    merchantId:
                        normalizedMerchantId
                },

                {

                    $set:
                        {

                            active:
                                false,

                            isDefault:
                                false,

                            updatedAt:
                                new Date()
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


        return {

            deleted:
                false,

            deactivated:
                true,

            reason:
                "ACCOUNT_USED_IN_INVOICE",

            account:
                sanitizeBankAccount(
                    result?.value ||
                    result
                )
        };
    }


    const result =
        await accounts.deleteOne(
            {

                _id:
                    existing._id,

                merchantId:
                    normalizedMerchantId
            }
        );


    if (
        result.deletedCount !==
        1
    ) {

        const error =
            new Error(
                "Não foi possível eliminar a conta bancária."
            );


        error.code =
            "BANK_ACCOUNT_DELETE_FAILED";


        error.statusCode =
            500;


        throw error;
    }


    return {

        deleted:
            true,

        deactivated:
            false,

        accountId:
            String(
                existing._id
            )
    };
}


/*
============================================================
CHECKOUT ACCOUNTS
============================================================

Retorna somente contas ativas que podem ser exibidas ao
cliente no checkout.

============================================================
*/

export async function getCheckoutBankAccounts(
    merchantId,
    bankAccountIds = []
) {

    const normalizedMerchantId =
        merchantIdOrThrow(
            merchantId
        );


    const db =
        await getDatabase();


    const accounts =
        db.collection(
            COLLECTION
        );


    let filter = {

        merchantId:
            normalizedMerchantId,

        active:
            {
                $ne:
                    false
            }
    };


    if (
        Array.isArray(
            bankAccountIds
        ) &&
        bankAccountIds.length
    ) {

        const ids =
            bankAccountIds
                .map(
                    normalizeId
                )
                .filter(
                    Boolean
                );


        filter._id =
            {
                $in:
                    ids
            };
    }


    const documents =
        await accounts
            .find(
                filter
            )
            .sort(
                {

                    isDefault:
                        -1,

                    createdAt:
                        1
                }
            )
            .toArray();


    return documents.map(
        sanitizeBankAccount
    );
}


/*
============================================================
BANK HEALTH CHECK
============================================================
*/

export async function bankHealthCheck() {

    try {

        const db =
            await getDatabase();


        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {},
                {
                    projection:
                        {
                            _id:
                                1
                        }
                }
            );


        return {

            healthy:
                true,

            collection:
                COLLECTION
        };

    }

    catch (error) {

        return {

            healthy:
                false,

            collection:
                COLLECTION,

            error:
                error?.message ||
                "Erro desconhecido."
        };
    }
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

    setDefaultBankAccount,

    deactivateBankAccount,

    deleteBankAccount,

    getCheckoutBankAccounts,

    bankHealthCheck
};
