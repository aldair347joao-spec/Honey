/*
============================================================
HONEY PAY
INVOICE SERVICE
V1.0.0
============================================================

GESTÃO DE FATURAS / COBRANÇAS

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Criar faturas
- Listar faturas do comerciante
- Consultar fatura
- Atualizar fatura enquanto editável
- Cancelar fatura
- Controlar estados da cobrança
- Associar múltiplas contas bancárias
- Gerar referência pública segura
- Preparar checkout público
- Controlar limite gratuito de 10 faturas
- Registrar datas e alterações

------------------------------------------------------------
ESTADOS

DRAFT
PENDING
PROOF_SUBMITTED
UNDER_REVIEW
PAID
REJECTED
EXPIRED
CANCELLED

============================================================
*/

import crypto from "node:crypto";
import { ObjectId } from "mongodb";

import {
    getDatabase
} from "./database.js";

import {
    getPlanSummary
} from "./plans.js";

import {
    getCheckoutBankAccounts
} from "./bank.js";


/*
============================================================
CONFIGURAÇÃO
============================================================
*/

const COLLECTION =
    "invoices";

const FREE_INVOICE_LIMIT =
    10;

const MAX_CUSTOMER_NAME_LENGTH =
    160;

const MAX_CUSTOMER_PHONE_LENGTH =
    40;

const MAX_CUSTOMER_EMAIL_LENGTH =
    180;

const MAX_DESCRIPTION_LENGTH =
    1000;

const MAX_REFERENCE_LENGTH =
    100;

const MAX_ITEMS =
    100;

const MAX_ITEM_NAME_LENGTH =
    240;

const MAX_NOTES_LENGTH =
    1000;

const DEFAULT_EXPIRATION_HOURS =
    48;


/*
============================================================
STATUS
============================================================
*/

export const INVOICE_STATUS = Object.freeze({

    DRAFT:
        "DRAFT",

    PENDING:
        "PENDING",

    PROOF_SUBMITTED:
        "PROOF_SUBMITTED",

    UNDER_REVIEW:
        "UNDER_REVIEW",

    PAID:
        "PAID",

    REJECTED:
        "REJECTED",

    EXPIRED:
        "EXPIRED",

    CANCELLED:
        "CANCELLED"
});


const EDITABLE_STATUSES =
    new Set([
        INVOICE_STATUS.DRAFT,
        INVOICE_STATUS.PENDING
    ]);


const ACTIVE_STATUSES =
    new Set([
        INVOICE_STATUS.PENDING,
        INVOICE_STATUS.PROOF_SUBMITTED,
        INVOICE_STATUS.UNDER_REVIEW
    ]);


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


function getMerchantId(
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
        details
    ) {

        error.details =
            details;
    }


    return error;
}


/*
============================================================
MONEY
============================================================

Valores monetários são armazenados em Kz como inteiros.

Exemplo:

1500 Kz

é armazenado como:

1500

Não usamos floating point.

============================================================
*/

function normalizeAmount(
    value
) {

    if (
        typeof value ===
        "number"
    ) {

        if (
            !Number.isFinite(
                value
            )
        ) {

            throw createError(
                "Valor da fatura inválido.",
                "INVALID_INVOICE_AMOUNT"
            );
        }


        value =
            String(
                value
            );
    }


    const normalized =
        String(
            value ?? ""
        )
            .trim()
            .replace(
                /\s/g,
                ""
            )
            .replace(
                ",",
                "."
            );


    if (
        !/^\d+(?:\.\d{1,2})?$/.test(
            normalized
        )
    ) {

        throw createError(
            "O valor da fatura deve ser um número positivo.",
            "INVALID_INVOICE_AMOUNT"
        );
    }


    const amount =
        Number(
            normalized
        );


    if (
        !Number.isSafeInteger(
            Math.round(
                amount
            )
        ) ||
        amount <=
        0
    ) {

        throw createError(
            "O valor da fatura deve ser superior a zero.",
            "INVALID_INVOICE_AMOUNT"
        );
    }


    /*
    --------------------------------------------------------
    A V1 trabalha em Kz sem casas decimais.
    --------------------------------------------------------
    */

    if (
        !Number.isInteger(
            amount
        )
    ) {

        throw createError(
            "O valor da fatura deve ser informado em Kz inteiros.",
            "INVALID_INVOICE_AMOUNT"
        );
    }


    return amount;
}


/*
============================================================
ITEMS
============================================================
*/

function normalizeItems(
    items,
    fallbackDescription,
    totalAmount
) {

    if (
        items ===
        undefined ||
        items ===
        null
    ) {

        return [

            {

                name:
                    fallbackDescription ||
                    "Produto ou serviço",

                quantity:
                    1,

                unitPrice:
                    totalAmount,

                total:
                    totalAmount
            }
        ];
    }


    if (
        !Array.isArray(
            items
        ) ||
        items.length ===
        0
    ) {

        throw createError(
            "A lista de itens da fatura é inválida.",
            "INVALID_INVOICE_ITEMS"
        );
    }


    if (
        items.length >
        MAX_ITEMS
    ) {

        throw createError(
            `A fatura não pode ter mais de ${MAX_ITEMS} itens.`,
            "TOO_MANY_INVOICE_ITEMS"
        );
    }


    let calculatedTotal =
        0;


    const normalized =
        items.map(
            (
                item,
                index
            ) => {

                const name =
                    cleanString(
                        item?.name ||
                        item?.description,
                        MAX_ITEM_NAME_LENGTH
                    );


                if (
                    !name
                ) {

                    throw createError(
                        `O item ${index + 1} não possui nome.`,
                        "INVALID_INVOICE_ITEM"
                    );
                }


                const quantity =
                    Number(
                        item?.quantity ??
                        1
                    );


                if (
                    !Number.isFinite(
                        quantity
                    ) ||
                    quantity <=
                    0
                ) {

                    throw createError(
                        `A quantidade do item ${index + 1} é inválida.`,
                        "INVALID_INVOICE_ITEM"
                    );
                }


                if (
                    !Number.isInteger(
                        quantity
                    )
                ) {

                    throw createError(
                        `A quantidade do item ${index + 1} deve ser inteira.`,
                        "INVALID_INVOICE_ITEM"
                    );
                }


                const unitPrice =
                    normalizeAmount(
                        item?.unitPrice ??
                        item?.price ??
                        0
                    );


                const total =
                    quantity *
                    unitPrice;


                if (
                    !Number.isSafeInteger(
                        total
                    )
                ) {

                    throw createError(
                        `O total do item ${index + 1} é demasiado grande.`,
                        "INVALID_INVOICE_ITEM"
                    );
                }


                calculatedTotal +=
                    total;


                return {

                    name,

                    quantity,

                    unitPrice,

                    total
                };
            }
        );


    if (
        calculatedTotal !==
        totalAmount
    ) {

        throw createError(
            "A soma dos itens não corresponde ao valor total da fatura.",
            "INVOICE_TOTAL_MISMATCH",
            400,
            {

                calculatedTotal,

                declaredTotal:
                    totalAmount
            }
        );
    }


    return normalized;
}


/*
============================================================
PUBLIC TOKEN
============================================================
*/

function generatePublicToken() {

    return crypto
        .randomBytes(
            24
        )
        .toString(
            "base64url"
        );
}


function generateInvoiceNumber() {

    const date =
        new Date();


    const year =
        date.getUTCFullYear();


    const random =
        crypto
            .randomBytes(
                5
            )
            .toString(
                "hex"
            )
            .toUpperCase();


    return `HP-${year}-${random}`;
}


/*
============================================================
CUSTOMER DATA
============================================================
*/

function normalizeCustomer(
    customer = {}
) {

    return {

        name:
            cleanString(
                customer.name,
                MAX_CUSTOMER_NAME_LENGTH
            ) || null,

        phone:
            cleanString(
                customer.phone,
                MAX_CUSTOMER_PHONE_LENGTH
            ) || null,

        email:
            cleanString(
                customer.email,
                MAX_CUSTOMER_EMAIL_LENGTH
            )
            .toLowerCase() ||
            null
    };
}


/*
============================================================
EXPIRATION
============================================================
*/

function calculateExpiration(
    value
) {

    if (
        value ===
        null ||
        value ===
        undefined
    ) {

        return new Date(
            Date.now() +
            DEFAULT_EXPIRATION_HOURS *
            60 *
            60 *
            1000
        );
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw createError(
            "Data de expiração inválida.",
            "INVALID_EXPIRATION_DATE"
        );
    }


    if (
        date.getTime() <=
        Date.now()
    ) {

        throw createError(
            "A data de expiração deve estar no futuro.",
            "INVALID_EXPIRATION_DATE"
        );
    }


    return date;
}


/*
============================================================
FREE PLAN LIMIT
============================================================
*/

async function checkInvoiceLimit(
    db,
    merchantId
) {

    /*
    --------------------------------------------------------
    Procuramos primeiro pelo resumo do plano.

    Se o módulo de planos já informar que é PRO, não há
    limite gratuito.

    --------------------------------------------------------
    */

    let planSummary = null;


    try {

        planSummary =
            await getPlanSummary(
                merchantId
            );

    }

    catch (
        error
    ) {

        /*
        ----------------------------------------------------
        Não ignoramos erros reais do sistema.

        Apenas continuamos para a contagem caso o serviço
        de planos ainda não tenha informação completa.
        ----------------------------------------------------
        */

        if (
            error?.statusCode >=
            500
        ) {

            throw error;
        }
    }


    const planName =
        String(
            planSummary?.plan ||
            planSummary?.name ||
            planSummary?.planName ||
            ""
        )
            .toUpperCase();


    const isPro =
        planName ===
        "PRO" ||
        planName ===
        "PROFESSIONAL" ||
        planName ===
        "PROFISSIONAL";


    if (
        isPro
    ) {

        return {

            allowed:
                true,

            used:
                0,

            remaining:
                null,

            limit:
                null,

            unlimited:
                true
        };
    }


    const count =
        await db
            .collection(
                COLLECTION
            )
            .countDocuments(
                {

                    merchantId,

                    status:
                        {
                            $ne:
                                INVOICE_STATUS.CANCELLED
                        }
                }
            );


    const allowed =
        count <
        FREE_INVOICE_LIMIT;


    return {

        allowed,

        used:
            count,

        remaining:
            Math.max(
                0,
                FREE_INVOICE_LIMIT -
                count
            ),

        limit:
            FREE_INVOICE_LIMIT,

        unlimited:
            false
    };
}


/*
============================================================
GET INVOICE
============================================================
*/

async function findMerchantInvoice(
    db,
    merchantId,
    invoiceId
) {

    const normalizedId =
        normalizeId(
            invoiceId
        );


    if (
        !normalizedId
    ) {

        throw createError(
            "Identificador da fatura inválido.",
            "INVALID_INVOICE_ID"
        );
    }


    const invoice =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {

                    _id:
                        normalizedId,

                    merchantId
                }
            );


    if (
        !invoice
    ) {

        throw createError(
            "Fatura não encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );
    }


    return invoice;
}


/*
============================================================
SANITIZE
============================================================
*/

function sanitizeInvoice(
    invoice,
    options = {}
) {

    if (
        !invoice
    ) {

        return null;
    }


    const includePrivate =
        options.includePrivate ===
        true;


    const result = {

        id:
            String(
                invoice._id
            ),

        invoiceNumber:
            invoice.invoiceNumber,

        status:
            invoice.status,

        amount:
            invoice.amount,

        currency:
            invoice.currency,

        description:
            invoice.description,

        items:
            invoice.items || [],

        customer:
            invoice.customer || null,

        reference:
            invoice.reference ||
            null,

        expirationAt:
            invoice.expirationAt,

        createdAt:
            invoice.createdAt,

        updatedAt:
            invoice.updatedAt,

        paidAt:
            invoice.paidAt ||
            null,

        cancelledAt:
            invoice.cancelledAt ||
            null,

        rejectedAt:
            invoice.rejectedAt ||
            null,

        proofSubmittedAt:
            invoice.proofSubmittedAt ||
            null,

        bankAccounts:
            invoice.bankAccounts ||
            [],

        checkoutToken:
            invoice.publicToken,

        checkoutPath:
            `/pay/${invoice.publicToken}`
    };


    if (
        includePrivate
    ) {

        result.merchantId =
            String(
                invoice.merchantId
            );

        result.notes =
            invoice.notes ||
            null;

        result.internalReference =
            invoice.internalReference ||
            null;

        result.createdBy =
            invoice.createdBy ||
            null;

        result.updatedBy =
            invoice.updatedBy ||
            null;
    }


    return result;
}


/*
============================================================
CREATE INVOICE
============================================================
*/

export async function createInvoice(
    merchantId,
    data = {}
) {

    const normalizedMerchantId =
        getMerchantId(
            merchantId
        );


    const db =
        await getDatabase();


    const limit =
        await checkInvoiceLimit(

            db,

            normalizedMerchantId
        );


    if (
        !limit.allowed
    ) {

        throw createError(

            "O limite de 10 faturas gratuitas foi atingido. Ative o plano Profissional para continuar a emitir faturas.",

            "FREE_INVOICE_LIMIT_REACHED",

            402,

            {

                used:
                    limit.used,

                limit:
                    limit.limit,

                remaining:
                    limit.remaining,

                upgradeRequired:
                    true,

                planPrice:
                    7500
            }
        );
    }


    const amount =
        normalizeAmount(
            data.amount
        );


    const description =
        cleanString(
            data.description,
            MAX_DESCRIPTION_LENGTH
        );


    if (
        !description
    ) {

        throw createError(
            "A descrição da fatura é obrigatória.",
            "INVOICE_DESCRIPTION_REQUIRED"
        );
    }


    const customer =
        normalizeCustomer(
            data.customer
        );


    const items =
        normalizeItems(

            data.items,

            description,

            amount
        );


    /*
    --------------------------------------------------------
    Contas bancárias.

    O comerciante pode escolher várias.

    Se não informar nenhuma, usamos a conta padrão/ativa.
    --------------------------------------------------------
    */

    let requestedBankAccountIds =
        data.bankAccountIds;


    if (
        requestedBankAccountIds ===
        undefined &&
        data.bankAccountId
    ) {

        requestedBankAccountIds =
            [
                data.bankAccountId
            ];
    }


    let bankAccounts =
        await getCheckoutBankAccounts(

            normalizedMerchantId,

            Array.isArray(
                requestedBankAccountIds
            )
                ? requestedBankAccountIds
                : []
        );


    if (
        !bankAccounts.length
    ) {

        throw createError(
            "O comerciante precisa ter pelo menos uma conta bancária ativa para criar uma fatura.",
            "BANK_ACCOUNT_REQUIRED",
            409
        );
    }


    /*
    --------------------------------------------------------
    Se foram solicitadas contas específicas, garantir que
    todas existem e estão ativas.
    --------------------------------------------------------
    */

    if (
        Array.isArray(
            requestedBankAccountIds
        ) &&
        requestedBankAccountIds.length
    ) {

        const requestedIds =
            requestedBankAccountIds
                .map(
                    normalizeId
                )
                .filter(
                    Boolean
                );


        if (
            requestedIds.length !==
            requestedBankAccountIds.length
        ) {

            throw createError(
                "Uma ou mais contas bancárias selecionadas são inválidas.",
                "INVALID_BANK_ACCOUNT_SELECTION"
            );
        }


        if (
            bankAccounts.length !==
            requestedIds.length
        ) {

            throw createError(
                "Uma ou mais contas bancárias selecionadas não estão disponíveis.",
                "BANK_ACCOUNT_SELECTION_INVALID",
                409
            );
        }
    }


    /*
    --------------------------------------------------------
    Snapshot das contas.

    Guardamos os dados bancários usados na cobrança para
    que uma alteração futura da conta não modifique uma
    fatura histórica.
    --------------------------------------------------------
    */

    const bankAccountSnapshot =
        bankAccounts.map(
            account => ({

                id:
                    account.id,

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
                    account.currency,

                alias:
                    account.alias ||
                    null
            })
        );


    const now =
        new Date();


    const expirationAt =
        calculateExpiration(
            data.expirationAt
        );


    const reference =
        cleanString(
            data.reference,
            MAX_REFERENCE_LENGTH
        ) ||
        generateInvoiceNumber();


    const invoiceNumber =
        generateInvoiceNumber();


    const publicToken =
        generatePublicToken();


    const invoice = {

        merchantId:
            normalizedMerchantId,

        invoiceNumber,

        publicToken,

        status:
            INVOICE_STATUS.PENDING,

        amount,

        currency:
            "AOA",

        description,

        items,

        customer,

        reference,

        expirationAt,

        bankAccounts:
            bankAccountSnapshot,

        notes:
            cleanString(
                data.notes,
                MAX_NOTES_LENGTH
            ) ||
            null,

        internalReference:
            cleanString(
                data.internalReference,
                MAX_REFERENCE_LENGTH
            ) ||
            null,

        createdAt:
            now,

        updatedAt:
            now,

        paidAt:
            null,

        cancelledAt:
            null,

        rejectedAt:
            null,

        proofSubmittedAt:
            null,

        reviewAt:
            null,

        createdBy:
            "merchant",

        updatedBy:
            "merchant"
    };


    const result =
        await db
            .collection(
                COLLECTION
            )
            .insertOne(
                invoice
            );


    invoice._id =
        result.insertedId;


    return {

        invoice:
            sanitizeInvoice(
                invoice
            ),

        limit
    };
}


/*
============================================================
LIST INVOICES
============================================================
*/

export async function listInvoices(
    merchantId,
    options = {}
) {

    const normalizedMerchantId =
        getMerchantId(
            merchantId
        );


    const db =
        await getDatabase();


    const filter = {

        merchantId:
            normalizedMerchantId
    };


    if (
        options.status
    ) {

        const statuses =
            Array.isArray(
                options.status
            )
                ? options.status
                : [
                    options.status
                ];


        filter.status =
            {
                $in:
                    statuses
            };
    }


    const limit =
        Math.min(
            Math.max(
                Number(
                    options.limit ||
                    50
                ),
                1
            ),
            100
        );


    const skip =
        Math.max(
            Number(
                options.skip ||
                0
            ),
            0
        );


    const documents =
        await db
            .collection(
                COLLECTION
            )
            .find(
                filter
            )
            .sort(
                {
                    createdAt:
                        -1
                }
            )
            .skip(
                skip
            )
            .limit(
                limit
            )
            .toArray();


    const total =
        await db
            .collection(
                COLLECTION
            )
            .countDocuments(
                filter
            );


    return {

        items:
            documents.map(
                invoice =>
                    sanitizeInvoice(
                        invoice
                    )
            ),

        pagination: {

            total,

            limit,

            skip,

            hasMore:
                skip +
                documents.length <
                total
        }
    };
}


/*
============================================================
GET MERCHANT INVOICE
============================================================
*/

export async function getInvoice(
    merchantId,
    invoiceId
) {

    const normalizedMerchantId =
        getMerchantId(
            merchantId
        );


    const db =
        await getDatabase();


    const invoice =
        await findMerchantInvoice(

            db,

            normalizedMerchantId,

            invoiceId
        );


    /*
    --------------------------------------------------------
    Marcar automaticamente como expirada se passou o prazo.
    --------------------------------------------------------
    */

    if (
        ACTIVE_STATUSES.has(
            invoice.status
        ) &&
        invoice.expirationAt &&
        new Date(
            invoice.expirationAt
        ).getTime() <=
        Date.now()
    ) {

        await db
            .collection(
                COLLECTION
            )
            .updateOne(

                {
                    _id:
                        invoice._id,

                    merchantId:
                        normalizedMerchantId,

                    status:
                        {
                            $in:
                                Array.from(
                                    ACTIVE_STATUSES
                                )
                        }
                },

                {

                    $set:
                        {

                            status:
                                INVOICE_STATUS.EXPIRED,

                            updatedAt:
                                new Date()
                        }
                }
            );


        invoice.status =
            INVOICE_STATUS.EXPIRED;
    }


    return sanitizeInvoice(
        invoice
    );
}


/*
============================================================
UPDATE INVOICE
============================================================
*/

export async function updateInvoice(
    merchantId,
    invoiceId,
    data = {}
) {

    const normalizedMerchantId =
        getMerchantId(
            merchantId
        );


    const db =
        await getDatabase();


    const invoice =
        await findMerchantInvoice(

            db,

            normalizedMerchantId,

            invoiceId
        );


    if (
        !EDITABLE_STATUSES.has(
            invoice.status
        )
    ) {

        throw createError(
            "Esta fatura já não pode ser editada.",
            "INVOICE_NOT_EDITABLE",
            409
        );
    }


    const update =
        {

            $set:
                {

                    updatedAt:
                        new Date(),

                    updatedBy:
                        "merchant"
                }
        };


    if (
        data.amount !==
        undefined
    ) {

        update.$set.amount =
            normalizeAmount(
                data.amount
            );
    }


    if (
        data.description !==
        undefined
    ) {

        const description =
            cleanString(
                data.description,
                MAX_DESCRIPTION_LENGTH
            );


        if (
            !description
        ) {

            throw createError(
                "A descrição da fatura não pode ficar vazia.",
                "INVOICE_DESCRIPTION_REQUIRED"
            );
        }


        update.$set.description =
            description;
    }


    if (
        data.customer !==
        undefined
    ) {

        update.$set.customer =
            normalizeCustomer(
                data.customer
            );
    }


    if (
        data.reference !==
        undefined
    ) {

        update.$set.reference =
            cleanString(
                data.reference,
                MAX_REFERENCE_LENGTH
            );
    }


    if (
        data.notes !==
        undefined
    ) {

        update.$set.notes =
            cleanString(
                data.notes,
                MAX_NOTES_LENGTH
            ) ||
            null;
    }


    if (
        data.expirationAt !==
        undefined
    ) {

        update.$set.expirationAt =
            calculateExpiration(
                data.expirationAt
            );
    }


    if (
        data.items !==
        undefined
    ) {

        const amount =
            update.$set.amount ??
            invoice.amount;


        update.$set.items =
            normalizeItems(

                data.items,

                update.$set.description ??
                invoice.description,

                amount
            );
    }


    if (
        data.bankAccountIds !==
        undefined
    ) {

        const requestedIds =
            Array.isArray(
                data.bankAccountIds
            )
                ? data.bankAccountIds
                : [];


        if (
            !requestedIds.length
        ) {

            throw createError(
                "Selecione pelo menos uma conta bancária.",
                "BANK_ACCOUNT_REQUIRED"
            );
        }


        const accounts =
            await getCheckoutBankAccounts(

                normalizedMerchantId,

                requestedIds
            );


        if (
            accounts.length !==
            requestedIds.length
        ) {

            throw createError(
                "Uma ou mais contas bancárias selecionadas não estão disponíveis.",
                "BANK_ACCOUNT_SELECTION_INVALID",
                409
            );
        }


        update.$set.bankAccounts =
            accounts.map(
                account => ({

                    id:
                        account.id,

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
                        account.currency,

                    alias:
                        account.alias ||
                        null
                })
            );
    }


    /*
    --------------------------------------------------------
    Se amount mudou mas items não foram fornecidos, não
    podemos manter itens incompatíveis com o novo total.
    --------------------------------------------------------
    */

    if (
        data.amount !==
        undefined &&
        data.items ===
        undefined
    ) {

        update.$set.items =
            [

                {

                    name:
                        update.$set.description ??
                        invoice.description,

                    quantity:
                        1,

                    unitPrice:
                        update.$set.amount,

                    total:
                        update.$set.amount
                }
            ];
    }


    const result =
        await db
            .collection(
                COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        invoice._id,

                    merchantId:
                        normalizedMerchantId,

                    status:
                        {
                            $in:
                                Array.from(
                                    EDITABLE_STATUSES
                                )
                        }
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

        throw createError(
            "A fatura não pôde ser atualizada.",
            "INVOICE_UPDATE_FAILED",
            500
        );
    }


    return sanitizeInvoice(
        updated
    );
}


/*
============================================================
CANCEL INVOICE
============================================================
*/

export async function cancelInvoice(
    merchantId,
    invoiceId
) {

    const normalizedMerchantId =
        getMerchantId(
            merchantId
        );


    const db =
        await getDatabase();


    const invoice =
        await findMerchantInvoice(

            db,

            normalizedMerchantId,

            invoiceId
        );


    if (
        invoice.status ===
        INVOICE_STATUS.PAID
    ) {

        throw createError(
            "Uma fatura paga não pode ser cancelada.",
            "PAID_INVOICE_CANNOT_BE_CANCELLED",
            409
        );
    }


    if (
        invoice.status ===
        INVOICE_STATUS.CANCELLED
    ) {

        return sanitizeInvoice(
            invoice
        );
    }


    const now =
        new Date();


    const result =
        await db
            .collection(
                COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        invoice._id,

                    merchantId:
                        normalizedMerchantId,

                    status:
                        {
                            $nin:
                                [
                                    INVOICE_STATUS.PAID,
                                    INVOICE_STATUS.CANCELLED
                                ]
                        }
                },

                {

                    $set:
                        {

                            status:
                                INVOICE_STATUS.CANCELLED,

                            cancelledAt:
                                now,

                            updatedAt:
                                now,

                            updatedBy:
                                "merchant"
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


    const cancelled =
        result?.value ||
        result;


    if (
        !cancelled
    ) {

        throw createError(
            "A fatura não pôde ser cancelada.",
            "INVOICE_CANCEL_FAILED",
            500
        );
    }


    return sanitizeInvoice(
        cancelled
    );
}


/*
============================================================
PUBLIC CHECKOUT
============================================================

Esta função não exige autenticação.

O acesso é feito através do publicToken.

============================================================
*/

export async function getPublicInvoice(
    publicToken
) {

    const token =
        cleanString(
            publicToken,
            200
        );


    if (
        !token ||
        token.length <
        20
    ) {

        throw createError(
            "Link de pagamento inválido.",
            "INVALID_PAYMENT_LINK",
            400
        );
    }


    const db =
        await getDatabase();


    const invoice =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {
                    publicToken:
                        token
                }
            );


    if (
        !invoice
    ) {

        throw createError(
            "Link de pagamento não encontrado.",
            "PAYMENT_LINK_NOT_FOUND",
            404
        );
    }


    /*
    --------------------------------------------------------
    Atualização automática da validade.
    --------------------------------------------------------
    */

    if (
        ACTIVE_STATUSES.has(
            invoice.status
        ) &&
        invoice.expirationAt &&
        new Date(
            invoice.expirationAt
        ).getTime() <=
        Date.now()
    ) {

        await db
            .collection(
                COLLECTION
            )
            .updateOne(

                {
                    _id:
                        invoice._id,

                    status:
                        {
                            $in:
                                Array.from(
                                    ACTIVE_STATUSES
                                )
                        }
                },

                {

                    $set:
                        {

                            status:
                                INVOICE_STATUS.EXPIRED,

                            updatedAt:
                                new Date()
                        }
                }
            );


        invoice.status =
            INVOICE_STATUS.EXPIRED;
    }


    /*
    --------------------------------------------------------
    Nunca devolver merchantId, notas internas ou dados
    internos no checkout público.
    --------------------------------------------------------
    */

    return {

        id:
            String(
                invoice._id
            ),

        invoiceNumber:
            invoice.invoiceNumber,

        status:
            invoice.status,

        amount:
            invoice.amount,

        currency:
            invoice.currency,

        description:
            invoice.description,

        items:
            invoice.items || [],

        customer:
            invoice.customer || null,

        reference:
            invoice.reference,

        expirationAt:
            invoice.expirationAt,

        bankAccounts:
            invoice.bankAccounts || [],

        createdAt:
            invoice.createdAt,

        paidAt:
            invoice.paidAt ||
            null,

        checkoutToken:
            invoice.publicToken
    };
}


/*
============================================================
MARK PROOF SUBMITTED
============================================================

Será utilizado pelo módulo de comprovativos.

============================================================
*/

export async function markProofSubmitted(
    invoiceId
) {

    const normalizedId =
        normalizeId(
            invoiceId
        );


    if (
        !normalizedId
    ) {

        throw createError(
            "Identificador da fatura inválido.",
            "INVALID_INVOICE_ID"
        );
    }


    const db =
        await getDatabase();


    const invoice =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {
                    _id:
                        normalizedId
                }
            );


    if (
        !invoice
    ) {

        throw createError(
            "Fatura não encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );
    }


    if (
        invoice.status ===
        INVOICE_STATUS.PAID
    ) {

        throw createError(
            "Esta fatura já foi paga.",
            "INVOICE_ALREADY_PAID",
            409
        );
    }


    if (
        invoice.status ===
        INVOICE_STATUS.CANCELLED
    ) {

        throw createError(
            "Esta fatura foi cancelada.",
            "INVOICE_CANCELLED",
            409
        );
    }


    if (
        invoice.expirationAt &&
        new Date(
            invoice.expirationAt
        ).getTime() <=
        Date.now()
    ) {

        await db
            .collection(
                COLLECTION
            )
            .updateOne(

                {
                    _id:
                        invoice._id
                },

                {

                    $set:
                        {

                            status:
                                INVOICE_STATUS.EXPIRED,

                            updatedAt:
                                new Date()
                        }
                }
            );


        throw createError(
            "Esta fatura expirou.",
            "INVOICE_EXPIRED",
            409
        );
    }


    const now =
        new Date();


    const result =
        await db
            .collection(
                COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        invoice._id,

                    status:
                        {
                            $in:
                                [
                                    INVOICE_STATUS.PENDING,
                                    INVOICE_STATUS.REJECTED
                                ]
                        }
                },

                {

                    $set:
                        {

                            status:
                                INVOICE_STATUS.PROOF_SUBMITTED,

                            proofSubmittedAt:
                                now,

                            updatedAt:
                                now,

                            updatedBy:
                                "customer"
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


    return (
        result?.value ||
        result
    );
}


/*
============================================================
MARK UNDER REVIEW
============================================================
*/

export async function markInvoiceUnderReview(
    invoiceId
) {

    const normalizedId =
        normalizeId(
            invoiceId
        );


    if (
        !normalizedId
    ) {

        throw createError(
            "Identificador da fatura inválido.",
            "INVALID_INVOICE_ID"
        );
    }


    const db =
        await getDatabase();


    const result =
        await db
            .collection(
                COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        normalizedId,

                    status:
                        INVOICE_STATUS.PROOF_SUBMITTED
                },

                {

                    $set:
                        {

                            status:
                                INVOICE_STATUS.UNDER_REVIEW,

                            reviewAt:
                                new Date(),

                            updatedAt:
                                new Date(),

                            updatedBy:
                                "system"
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
            "A fatura não está pronta para revisão.",
            "INVOICE_NOT_READY_FOR_REVIEW",
            409
        );
    }


    return sanitizeInvoice(
        updated
    );
}


/*
============================================================
MARK PAID
============================================================

A confirmação final será usada pelo módulo de revisão.

============================================================
*/

export async function markInvoicePaid(
    invoiceId,
    options = {}
) {

    const normalizedId =
        normalizeId(
            invoiceId
        );


    if (
        !normalizedId
    ) {

        throw createError(
            "Identificador da fatura inválido.",
            "INVALID_INVOICE_ID"
        );
    }


    const db =
        await getDatabase();


    const invoice =
        await db
            .collection(
                COLLECTION
            )
            .findOne(
                {
                    _id:
                        normalizedId
                }
            );


    if (
        !invoice
    ) {

        throw createError(
            "Fatura não encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );
    }


    if (
        invoice.status ===
        INVOICE_STATUS.PAID
    ) {

        return sanitizeInvoice(
            invoice
        );
    }


    if (
        invoice.status ===
        INVOICE_STATUS.CANCELLED
    ) {

        throw createError(
            "Uma fatura cancelada não pode ser marcada como paga.",
            "CANCELLED_INVOICE",
            409
        );
    }


    const now =
        new Date();


    const result =
        await db
            .collection(
                COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        normalizedId,

                    status:
                        {
                            $in:
                                [
                                    INVOICE_STATUS.UNDER_REVIEW,
                                    INVOICE_STATUS.PROOF_SUBMITTED,
                                    INVOICE_STATUS.PENDING
                                ]
                        }
                },

                {

                    $set:
                        {

                            status:
                                INVOICE_STATUS.PAID,

                            paidAt:
                                now,

                            updatedAt:
                                now,

                            updatedBy:
                                options.updatedBy ||
                                "system",

                            paymentReference:
                                cleanString(
                                    options.paymentReference,
                                    MAX_REFERENCE_LENGTH
                                ) ||
                                null
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


    const paid =
        result?.value ||
        result;


    if (
        !paid
    ) {

        throw createError(
            "A fatura não pôde ser marcada como paga.",
            "INVOICE_PAYMENT_UPDATE_FAILED",
            409
        );
    }


    return sanitizeInvoice(
        paid
    );
}


/*
============================================================
MARK REJECTED
============================================================
*/

export async function rejectInvoice(
    invoiceId,
    reason = null
) {

    const normalizedId =
        normalizeId(
            invoiceId
        );


    if (
        !normalizedId
    ) {

        throw createError(
            "Identificador da fatura inválido.",
            "INVALID_INVOICE_ID"
        );
    }


    const db =
        await getDatabase();


    const result =
        await db
            .collection(
                COLLECTION
            )
            .findOneAndUpdate(

                {

                    _id:
                        normalizedId,

                    status:
                        {
                            $in:
                                [
                                    INVOICE_STATUS.PROOF_SUBMITTED,
                                    INVOICE_STATUS.UNDER_REVIEW
                                ]
                        }
                },

                {

                    $set:
                        {

                            status:
                                INVOICE_STATUS.REJECTED,

                            rejectedAt:
                                new Date(),

                            rejectionReason:
                                cleanString(
                                    reason,
                                    MAX_NOTES_LENGTH
                                ) ||
                                null,

                            updatedAt:
                                new Date(),

                            updatedBy:
                                "system"
                        }
                },

                {

                    returnDocument:
                        "after"
                }
            );


    const rejected =
        result?.value ||
        result;


    if (
        !rejected
    ) {

        throw createError(
            "A fatura não pôde ser rejeitada.",
            "INVOICE_REJECTION_FAILED",
            409
        );
    }


    return sanitizeInvoice(
        rejected
    );
}


/*
============================================================
STATISTICS
============================================================
*/

export async function getInvoiceStatistics(
    merchantId
) {

    const normalizedMerchantId =
        getMerchantId(
            merchantId
        );


    const db =
        await getDatabase();


    const invoices =
        db.collection(
            COLLECTION
        );


    const result =
        await invoices
            .aggregate(
                [

                    {
                        $match:
                            {
                                merchantId:
                                    normalizedMerchantId
                            }
                    },

                    {
                        $group:
                            {

                                _id:
                                    null,

                                total:
                                    {
                                        $sum:
                                            1
                                    },

                                paid:
                                    {
                                        $sum:
                                            {
                                                $cond:
                                                    [
                                                        {
                                                            $eq:
                                                                [
                                                                    "$status",
                                                                    INVOICE_STATUS.PAID
                                                                ]
                                                        },
                                                        1,
                                                        0
                                                    ]
                                            }
                                    },

                                pending:
                                    {
                                        $sum:
                                            {
                                                $cond:
                                                    [
                                                        {
                                                            $in:
                                                                [
                                                                    "$status",
                                                                    [
                                                                        INVOICE_STATUS.PENDING,
                                                                        INVOICE_STATUS.PROOF_SUBMITTED,
                                                                        INVOICE_STATUS.UNDER_REVIEW
                                                                    ]
                                                                ]
                                                        },
                                                        1,
                                                        0
                                                    ]
                                            }
                                    },

                                cancelled:
                                    {
                                        $sum:
                                            {
                                                $cond:
                                                    [
                                                        {
                                                            $eq:
                                                                [
                                                                    "$status",
                                                                    INVOICE_STATUS.CANCELLED
                                                                ]
                                                        },
                                                        1,
                                                        0
                                                    ]
                                            }
                                    },

                                totalPaidAmount:
                                    {
                                        $sum:
                                            {
                                                $cond:
                                                    [
                                                        {
                                                            $eq:
                                                                [
                                                                    "$status",
                                                                    INVOICE_STATUS.PAID
                                                                ]
                                                        },
                                                        "$amount",
                                                        0
                                                    ]
                                            }
                                    },

                                totalIssuedAmount:
                                    {
                                        $sum:
                                            "$amount"
                                    }
                            }
                    }
                ]
            )
            .toArray();


    return (

        result[0] ||

        {

            total:
                0,

            paid:
                0,

            pending:
                0,

            cancelled:
                0,

            totalPaidAmount:
                0,

            totalIssuedAmount:
                0
        }
    );
}


/*
============================================================
INDEX SETUP
============================================================

Pode ser chamado durante a inicialização da aplicação.

============================================================
*/

export async function ensureInvoiceIndexes() {

    const db =
        await getDatabase();


    const invoices =
        db.collection(
            COLLECTION
        );


    await invoices.createIndex(
        {

            merchantId:
                1,

            createdAt:
                -1
        }
    );


    await invoices.createIndex(
        {

            merchantId:
                1,

            status:
                1,

            createdAt:
                -1
        }
    );


    await invoices.createIndex(
        {

            publicToken:
                1
        },
        {

            unique:
                true
        }
    );


    await invoices.createIndex(
        {

            invoiceNumber:
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

    createInvoice,

    listInvoices,

    getInvoice,

    updateInvoice,

    cancelInvoice,

    getPublicInvoice,

    markProofSubmitted,

    markInvoiceUnderReview,

    markInvoicePaid,

    rejectInvoice,

    getInvoiceStatistics,

    ensureInvoiceIndexes,

    INVOICE_STATUS
};
