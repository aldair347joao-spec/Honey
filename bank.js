/*
============================================================
HONEY PAY
BANK ACCOUNT SERVICE
V1.0.0
============================================================

GESTÃO REAL DE CONTAS BANCÁRIAS

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Adicionar conta bancária
- Listar contas
- Atualizar conta
- Ativar / desativar conta
- Definir conta principal
- Remover conta
- Garantir isolamento por comerciante
- Preparar contas para checkout
- Suportar múltiplas contas bancárias
- Impedir remoção de conta utilizada em faturas
- Normalizar IBAN
- Não expor dados desnecessários

============================================================
*/

import {
    BankAccount,
    Invoice
} from "./models.js";


import {
    validateObjectId,
    validateBankAccountInput,
    sanitizeBankAccountInput
} from "./validators.js";


import {
    maskIban,
    publicBankAccount
} from "./utils.js";


import {
    logSecurityEvent
} from "./logger.js";


/*
============================================================
NORMALIZE IBAN
============================================================
*/

function normalizeIban(
    iban
) {

    return String(
        iban || ""
    )
        .replace(
            /\s+/g,
            ""
        )
        .trim()
        .toUpperCase();
}


/*
============================================================
ENSURE VALID MERCHANT
============================================================
*/

function ensureMerchantId(
    merchantId
) {

    const validation =
        validateObjectId(
            merchantId,
            "merchantId"
        );


    if (
        validation
    ) {

        const error =
            new Error(
                validation.message
            );


        error.code =
            "INVALID_MERCHANT_ID";


        error.statusCode =
            400;


        throw error;
    }
}


/*
============================================================
GET ACCOUNT
============================================================
*/

async function getAccount(
    merchantId,
    accountId
) {

    ensureMerchantId(
        merchantId
    );


    const validation =
        validateObjectId(
            accountId,
            "accountId"
        );


    if (
        validation
    ) {

        const error =
            new Error(
                validation.message
            );


        error.code =
            "INVALID_ACCOUNT_ID";


        error.statusCode =
            400;


        throw error;
    }


    const account =
        await BankAccount.findOne({

            _id:
                accountId,

            merchantId
        });


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
CHECK DUPLICATE IBAN
============================================================
*/

async function checkDuplicateIban(
    merchantId,
    iban,
    excludeAccountId = null
) {

    const normalizedIban =
        normalizeIban(
            iban
        );


    const query = {

        merchantId,

        iban:
            normalizedIban
    };


    if (
        excludeAccountId
    ) {

        query._id = {

            $ne:
                excludeAccountId
        };
    }


    const existing =
        await BankAccount
            .findOne(
                query
            )
            .select(
                "_id"
            )
            .lean();


    return Boolean(
        existing
    );
}


/*
============================================================
ENSURE DEFAULT ACCOUNT
============================================================
*/

async function ensureDefaultAccount(
    merchantId
) {

    const activeAccounts =
        await BankAccount
            .find({

                merchantId,

                isActive:
                    true
            })
            .sort({

                isDefault:
                    -1,

                displayOrder:
                    1,

                createdAt:
                    1
            });


    if (
        !activeAccounts.length
    ) {

        return null;
    }


    const hasDefault =
        activeAccounts.some(
            account =>
                account.isDefault ===
                true
        );


    if (
        hasDefault
    ) {

        return activeAccounts.find(
            account =>
                account.isDefault ===
                true
        );
    }


    const first =
        activeAccounts[0];


    first.isDefault =
        true;


    await first.save();


    return first;
}


/*
============================================================
ADD BANK ACCOUNT
============================================================
*/

export async function addBankAccount(
    merchantId,
    input
) {

    ensureMerchantId(
        merchantId
    );


    /*
    --------------------------------------------------------
    Validar.
    --------------------------------------------------------
    */

    const errors =
        validateBankAccountInput(
            input
        );


    if (
        errors.length
    ) {

        const error =
            new Error(
                "Dados da conta bancária inválidos."
            );


        error.code =
            "VALIDATION_ERROR";


        error.statusCode =
            400;


        error.details =
            errors;


        throw error;
    }


    const data =
        sanitizeBankAccountInput(
            input
        );


    const iban =
        normalizeIban(
            data.iban
        );


    /*
    --------------------------------------------------------
    Impedir IBAN duplicado para o mesmo comerciante.
    --------------------------------------------------------
    */

    const duplicate =
        await checkDuplicateIban(
            merchantId,
            iban
        );


    if (
        duplicate
    ) {

        const error =
            new Error(
                "Esta conta bancária já foi adicionada."
            );


        error.code =
            "BANK_ACCOUNT_ALREADY_EXISTS";


        error.statusCode =
            409;


        throw error;
    }


    /*
    --------------------------------------------------------
    Verificar se já existe uma conta ativa.
    --------------------------------------------------------
    */

    const existingCount =
        await BankAccount.countDocuments({

            merchantId
        });


    /*
    --------------------------------------------------------
    Criar conta.
    --------------------------------------------------------
    */

    const account =
        await BankAccount.create({

            merchantId,

            bankName:
                data.bankName,

            accountName:
                data.accountName,

            iban,

            accountType:
                data.accountType ||
                "bank",

            isActive:
                true,

            isDefault:
                existingCount ===
                0,

            displayOrder:
                existingCount,

            lastFour:
                iban.slice(
                    -4
                )
        });


    logSecurityEvent(
        "bank_account_added",
        {

            merchantId:
                merchantId.toString(),

            accountId:
                account._id.toString(),

            iban:
                maskIban(
                    iban
                )
        }
    );


    return {

        account:
            publicBankAccount(
                account,
                {
                    includeFullIban:
                        true
                }
            )
    };
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

    ensureMerchantId(
        merchantId
    );


    const filter = {

        merchantId
    };


    if (
        options.activeOnly
    ) {

        filter.isActive =
            true;
    }


    const accounts =
        await BankAccount
            .find(
                filter
            )
            .sort({

                isDefault:
                    -1,

                displayOrder:
                    1,

                createdAt:
                    1
            })
            .lean();


    return {

        accounts:
            accounts.map(
                account =>
                    publicBankAccount(
                        account,
                        {
                            includeFullIban:
                                true
                        }
                    )
            ),

        total:
            accounts.length
    };
}


/*
============================================================
GET ONE BANK ACCOUNT
============================================================
*/

export async function getBankAccount(
    merchantId,
    accountId
) {

    const account =
        await getAccount(
            merchantId,
            accountId
        );


    return {

        account:
            publicBankAccount(
                account,
                {
                    includeFullIban:
                        true
                }
            )
    };
}


/*
============================================================
UPDATE BANK ACCOUNT
============================================================
*/

export async function updateBankAccount(
    merchantId,
    accountId,
    input
) {

    const account =
        await getAccount(
            merchantId,
            accountId
        );


    const errors =
        validateBankAccountInput(
            input,
            {
                partial:
                    true
            }
        );


    if (
        errors.length
    ) {

        const error =
            new Error(
                "Dados da conta bancária inválidos."
            );


        error.code =
            "VALIDATION_ERROR";


        error.statusCode =
            400;


        error.details =
            errors;


        throw error;
    }


    const data =
        sanitizeBankAccountInput(
            input
        );


    /*
    --------------------------------------------------------
    IBAN
    --------------------------------------------------------
    */

    if (
        data.iban !==
        undefined
    ) {

        const iban =
            normalizeIban(
                data.iban
            );


        const duplicate =
            await checkDuplicateIban(

                merchantId,

                iban,

                accountId
            );


        if (
            duplicate
        ) {

            const error =
                new Error(
                    "Esta conta bancária já foi adicionada."
                );


            error.code =
                "BANK_ACCOUNT_ALREADY_EXISTS";


            error.statusCode =
                409;


            throw error;
        }


        account.iban =
            iban;


        account.lastFour =
            iban.slice(
                -4
            );
    }


    if (
        data.bankName !==
        undefined
    ) {

        account.bankName =
            data.bankName;
    }


    if (
        data.accountName !==
        undefined
    ) {

        account.accountName =
            data.accountName;
    }


    if (
        data.accountType !==
        undefined
    ) {

        account.accountType =
            data.accountType;
    }


    if (
        data.displayOrder !==
        undefined
    ) {

        account.displayOrder =
            data.displayOrder;
    }


    await account.save();


    logSecurityEvent(
        "bank_account_updated",
        {

            merchantId:
                merchantId.toString(),

            accountId:
                account._id.toString()
        }
    );


    return {

        account:
            publicBankAccount(
                account,
                {
                    includeFullIban:
                        true
                }
            )
    };
}


/*
============================================================
SET DEFAULT BANK ACCOUNT
============================================================
*/

export async function setDefaultBankAccount(
    merchantId,
    accountId
) {

    const account =
        await getAccount(
            merchantId,
            accountId
        );


    if (
        !account.isActive
    ) {

        const error =
            new Error(
                "Uma conta inativa não pode ser definida como principal."
            );


        error.code =
            "BANK_ACCOUNT_INACTIVE";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Remover default das outras contas.
    --------------------------------------------------------
    */

    await BankAccount.updateMany(

        {

            merchantId,

            _id:
                {
                    $ne:
                        account._id
                }
        },

        {

            $set:
                {
                    isDefault:
                        false
                }
        }
    );


    account.isDefault =
        true;


    await account.save();


    logSecurityEvent(
        "bank_account_default_changed",
        {

            merchantId:
                merchantId.toString(),

            accountId:
                account._id.toString()
        }
    );


    return {

        account:
            publicBankAccount(
                account,
                {
                    includeFullIban:
                        true
                }
            )
    };
}


/*
============================================================
TOGGLE ACTIVE
============================================================
*/

export async function setBankAccountStatus(
    merchantId,
    accountId,
    isActive
) {

    const account =
        await getAccount(
            merchantId,
            accountId
        );


    const nextState =
        Boolean(
            isActive
        );


    /*
    --------------------------------------------------------
    Impedir desativar a única conta ativa.
    --------------------------------------------------------
    */

    if (
        !nextState &&
        account.isActive
    ) {

        const activeCount =
            await BankAccount.countDocuments({

                merchantId,

                isActive:
                    true
            });


        if (
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
                400;


            throw error;
        }
    }


    account.isActive =
        nextState;


    /*
    --------------------------------------------------------
    Se a conta principal foi desativada, remove default.
    --------------------------------------------------------
    */

    if (
        !nextState
    ) {

        account.isDefault =
            false;
    }


    await account.save();


    /*
    --------------------------------------------------------
    Garantir que existe uma conta default ativa.
    --------------------------------------------------------
    */

    if (
        !nextState
    ) {

        await ensureDefaultAccount(
            merchantId
        );
    }


    logSecurityEvent(
        "bank_account_status_changed",
        {

            merchantId:
                merchantId.toString(),

            accountId:
                account._id.toString(),

            isActive:
                nextState
        }
    );


    return {

        account:
            publicBankAccount(
                account,
                {
                    includeFullIban:
                        true
                }
            )
    };
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

    const account =
        await getAccount(
            merchantId,
            accountId
        );


    /*
    --------------------------------------------------------
    Não apagar contas utilizadas por faturas.

    Isto preserva a integridade histórica dos pagamentos.
    --------------------------------------------------------
    */

    const invoiceCount =
        await Invoice.countDocuments({

            merchantId,

            bankAccountId:
                account._id
        });


    if (
        invoiceCount >
        0
    ) {

        const error =
            new Error(
                "Esta conta já foi utilizada em faturas e não pode ser eliminada. Desative-a em vez disso."
            );


        error.code =
            "BANK_ACCOUNT_IN_USE";


        error.statusCode =
            409;


        throw error;
    }


    const wasDefault =
        Boolean(
            account.isDefault
        );


    await BankAccount.deleteOne({

        _id:
            account._id,

        merchantId
    });


    /*
    --------------------------------------------------------
    Se era principal, escolhemos outra.
    --------------------------------------------------------
    */

    if (
        wasDefault
    ) {

        await ensureDefaultAccount(
            merchantId
        );
    }


    logSecurityEvent(
        "bank_account_deleted",
        {

            merchantId:
                merchantId.toString(),

            accountId:
                account._id.toString()
        }
    );


    return {

        deleted:
            true
    };
}


/*
============================================================
CHECKOUT ACCOUNTS
============================================================

Retorna somente contas ativas para o checkout público.
============================================================
*/

export async function getCheckoutBankAccounts(
    merchantId
) {

    ensureMerchantId(
        merchantId
    );


    const accounts =
        await BankAccount
            .find({

                merchantId,

                isActive:
                    true
            })
            .sort({

                isDefault:
                    -1,

                displayOrder:
                    1,

                createdAt:
                    1
            })
            .lean();


    return accounts.map(
        account => ({

            id:
                account._id.toString(),

            bankName:
                account.bankName,

            accountName:
                account.accountName,

            iban:
                account.iban,

            accountType:
                account.accountType,

            isDefault:
                Boolean(
                    account.isDefault
                )
        })
    );
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    addBankAccount,

    listBankAccounts,

    getBankAccount,

    updateBankAccount,

    setDefaultBankAccount,

    setBankAccountStatus,

    deleteBankAccount,

    getCheckoutBankAccounts
};
