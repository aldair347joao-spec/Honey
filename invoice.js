/*
============================================================
HONEY PAY
INVOICE SERVICE
V1.0.0
============================================================

MÓDULO DE FATURAS E LINKS DE PAGAMENTO

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Criar faturas
- Gerar números únicos
- Gerar identificadores públicos seguros
- Gerar links públicos
- Controlar limite do plano gratuito
- Permitir faturas ilimitadas no Pro
- Associar contas bancárias
- Guardar dados do comprador
- Consultar faturas privadas
- Consultar faturas públicas
- Cancelar faturas
- Preparar QR Code para checkout

------------------------------------------------------------
PLANOS
------------------------------------------------------------

FREE
10 faturas vitalícias

PRO
7.500 Kz / mês
Faturas ilimitadas

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


/*
============================================================
CONFIGURAÇÃO
============================================================
*/

const FREE_INVOICE_LIMIT =
    10;

const PRO_PLAN_IDS =
    new Set([
        "pro",
        "professional"
    ]);

const CURRENCY =
    "AOA";

const PUBLIC_ID_BYTES =
    18;

const MAX_DESCRIPTION_LENGTH =
    1000;

const MAX_CUSTOMER_NAME_LENGTH =
    160;

const MAX_CUSTOMER_PHONE_LENGTH =
    40;

const MAX_CUSTOMER_EMAIL_LENGTH =
    180;

const MAX_REFERENCE_LENGTH =
    160;

const MAX_AMOUNT =
    999999999999;

const DEFAULT_EXPIRY_DAYS =
    30;


/*
============================================================
COLLECTION NAMES
============================================================
*/

const INVOICES_COLLECTION =
    "invoices";

const BANK_ACCOUNTS_COLLECTION =
    "bank_accounts";

const MERCHANTS_COLLECTION =
    "merchants";


/*
============================================================
UTIL
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


function createPublicId() {

    return crypto
        .randomBytes(
            PUBLIC_ID_BYTES
        )
        .toString(
            "base64url"
        );
}


function createInvoiceNumber() {

    const date =
        new Date();


    const year =
        date.getUTCFullYear();


    const month =
        String(
            date.getUTCMonth() + 1
        )
            .padStart(
                2,
                "0"
            );


    const day =
        String(
            date.getUTCDate()
        )
            .padStart(
                2,
                "0"
            );


    const random =
        crypto
            .randomBytes(
                4
            )
            .toString(
                "hex"
            )
            .toUpperCase();


    return (
        `HP-${year}${month}${day}-${random}`
    );
}


/*
============================================================
AMOUNT
============================================================
*/

function normalizeAmount(
    value
) {

    const amount =
        Number(
            value
        );


    if (
        !Number.isFinite(
            amount
        ) ||
        amount <= 0
    ) {

        const error =
            new Error(
                "O valor da fatura deve ser superior a zero."
            );


        error.code =
            "INVALID_INVOICE_AMOUNT";


        error.statusCode =
            400;


        throw error;
    }


    if (
        amount >
        MAX_AMOUNT
    ) {

        const error =
            new Error(
                "O valor da fatura ultrapassa o limite permitido."
            );


        error.code =
            "INVOICE_AMOUNT_TOO_LARGE";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Valores monetários são armazenados com duas casas.
    --------------------------------------------------------
    */

    return Math.round(
        amount *
        100
    ) / 100;
}


/*
============================================================
PLAN
============================================================
*/

async function resolveMerchantPlan(
    merchantId
) {

    try {

        const summary =
            await getPlanSummary(
                merchantId
            );


        const planId =
            String(
                summary?.planId ||
                summary?.plan ||
                summary?.id ||
                "free"
            )
                .trim()
                .toLowerCase();


        const isPro =
            PRO_PLAN_IDS.has(
                planId
            );


        return {

            planId,

            isPro
        };

    }

    catch {

        /*
        ----------------------------------------------------
        Fail-safe:
        se não conseguirmos confirmar o plano,
        tratamos como Free.

        Isto evita que um erro de leitura desbloqueie
        faturas ilimitadas.
        ----------------------------------------------------
        */

        return {

            planId:
                "free",

            isPro:
                false
        };
    }
}


/*
============================================================
INVOICE COUNT
============================================================
*/

async function countMerchantInvoices(
    invoices,
    merchantId
) {

    return invoices.countDocuments({

        merchantId
    });
}


/*
============================================================
FREE LIMIT
============================================================
*/

async function enforceInvoiceLimit(
    invoices,
    merchantId
) {

    const plan =
        await resolveMerchantPlan(
            merchantId
        );


    if (
        plan.isPro
    ) {

        return {

            allowed:
                true,

            planId:
                plan.planId,

            invoiceCount:
                await countMerchantInvoices(
                    invoices,
                    merchantId
                ),

            limit:
                null,

            remaining:
                null
        };
    }


    const count =
        await countMerchantInvoices(
            invoices,
            merchantId
        );


    if (
        count >=
        FREE_INVOICE_LIMIT
    ) {

        const error =
            new Error(
                "O plano gratuito atingiu o limite de 10 faturas. Ative o Plano Profissional por 7.500 Kz/mês para continuar."
            );


        error.code =
            "FREE_INVOICE_LIMIT_REACHED";


        error.statusCode =
            402;


        error.details =
            {

                plan:
                    "free",

                limit:
                    FREE_INVOICE_LIMIT,

                used:
                    count,

                remaining:
                    0,

                upgradeRequired:
                    true,

                proPrice:
                    7500
            };


        throw error;
    }


    return {

        allowed:
            true,

        planId:
            plan.planId,

        invoiceCount:
            count,

        limit:
            FREE_INVOICE_LIMIT,

        remaining:
            Math.max(
                0,
                FREE_INVOICE_LIMIT -
                count -
                1
            )
    };
}


/*
============================================================
MERCHANT
============================================================
*/

async function getMerchant(
    db,
    merchantId
) {

    const merchants =
        db.collection(
            MERCHANTS_COLLECTION
        );


    const merchant =
        await merchants.findOne(
            {
                _id:
                    merchantId
            }
        );


    if (
        !merchant
    ) {

        const error =
            new Error(
                "Comerciante não encontrado."
            );


        error.code =
            "MERCHANT_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    return merchant;
}


/*
============================================================
BUSINESS NAME
============================================================
*/

function getBusinessName(
    merchant
) {

    return cleanString(

        merchant?.businessName ||

        merchant?.storeName ||

        merchant?.shopName ||

        merchant?.name ||

        "Loja",

        160
    );
}


/*
============================================================
SLUG
============================================================
*/

function slugify(
    value
) {

    const normalized =
        cleanString(
            value,
            160
        )
            .toLowerCase()
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .replace(
                /[^a-z0-9]+/g,
                "-"
            )
            .replace(
                /^-+|-+$/g,
                ""
            )
            .slice(
                0,
                80
            );


    return (
        normalized ||
        "loja"
    );
}


/*
============================================================
PAYMENT SLUG
============================================================
*/

async function buildPaymentSlug(
    invoices,
    merchantId,
    merchant
) {

    const base =
        slugify(
            getBusinessName(
                merchant
            )
        );


    let slug =
        base;


    const existing =
        await invoices.findOne(
            {
                merchantId,
                paymentSlug:
                    slug
            }
        );


    if (
        !existing
    ) {

        return slug;
    }


    slug =
        `${base}-${crypto
            .randomBytes(3)
            .toString("hex")}`;


    return slug;
}


/*
============================================================
BANK ACCOUNTS
============================================================
*/

async function resolveBankAccounts(
    db,
    merchantId,
    requestedBankAccountIds
) {

    const banks =
        db.collection(
            BANK_ACCOUNTS_COLLECTION
        );


    const requested =
        Array.isArray(
            requestedBankAccountIds
        )
            ? requestedBankAccountIds
            : [];


    /*
    --------------------------------------------------------
    Se nenhuma conta específica for indicada,
    todas as contas ativas do comerciante ficam disponíveis
    para o checkout.
    --------------------------------------------------------
    */

    if (
        !requested.length
    ) {

        const accounts =
            await banks
                .find(
                    {

                        merchantId,

                        active:
                            {
                                $ne:
                                    false
                            }
                    },
                    {

                        projection:
                            {
                                _id:
                                    1,

                                bankName:
                                    1,

                                bankCode:
                                    1,

                                accountName:
                                    1,

                                accountNumber:
                                    1,

                                iban:
                                    1,

                                currency:
                                    1,

                                active:
                                    1,

                                isDefault:
                                    1
                            }
                    }
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


        return accounts;
    }


    const ids =
        requested
            .map(
                normalizeId
            )
            .filter(
                Boolean
            );


    if (
        ids.length !==
        requested.length
    ) {

        const error =
            new Error(
                "Uma ou mais contas bancárias são inválidas."
            );


        error.code =
            "INVALID_BANK_ACCOUNT_ID";


        error.statusCode =
            400;


        throw error;
    }


    const accounts =
        await banks
            .find(
                {

                    _id:
                        {
                            $in:
                                ids
                        },

                    merchantId,

                    active:
                        {
                            $ne:
                                false
                        }
                },
                {

                    projection:
                        {
                            _id:
                                1,

                            bankName:
                                1,

                            bankCode:
                                1,

                            accountName:
                                1,

                            accountNumber:
                                1,

                            iban:
                                1,

                            currency:
                                1,

                            active:
                                1,

                            isDefault:
                                1
                        }
                }
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


    if (
        accounts.length !==
        ids.length
    ) {

        const error =
            new Error(
                "Uma ou mais contas bancárias não pertencem ao comerciante ou estão inativas."
            );


        error.code =
            "BANK_ACCOUNT_ACCESS_DENIED";


        error.statusCode =
            403;


        throw error;
    }


    return accounts;
}


/*
============================================================
PUBLIC BANK ACCOUNT DATA
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
            cleanString(
                account.bankName,
                120
            ),

        bankCode:
            cleanString(
                account.bankCode,
                30
            ),

        accountName:
            cleanString(
                account.accountName,
                160
            ),

        accountNumber:
            cleanString(
                account.accountNumber,
                80
            ),

        iban:
            cleanString(
                account.iban,
                80
            ),

        currency:
            cleanString(
                account.currency ||
                CURRENCY,
                10
            ),

        isDefault:
            Boolean(
                account.isDefault
            )
    };
}


/*
============================================================
SANITIZE INVOICE
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

        publicId:
            invoice.publicId,

        paymentSlug:
            invoice.paymentSlug,

        paymentUrl:
            invoice.paymentUrl,

        amount:
            invoice.amount,

        currency:
            invoice.currency,

        description:
            invoice.description,

        status:
            invoice.status,

        createdAt:
            invoice.createdAt,

        expiresAt:
            invoice.expiresAt,

        paidAt:
            invoice.paidAt ||
            null,

        cancelledAt:
            invoice.cancelledAt ||
            null,

        paymentCount:
            Number(
                invoice.paymentCount ||
                0
            ),

        merchant:
            {

                businessName:
                    invoice.merchantSnapshot
                        ?.businessName ||
                    null
            },

        bankAccounts:
            Array.isArray(
                invoice.bankAccountsSnapshot
            )
                ? invoice
                    .bankAccountsSnapshot
                    .map(
                        sanitizeBankAccount
                    )
                : []
    };


    if (
        includePrivate
    ) {

        result.merchantId =
            String(
                invoice.merchantId
            );


        result.customer =
            invoice.customer ||
            null;


        result.metadata =
            invoice.metadata ||
            {};


        result.updatedAt =
            invoice.updatedAt ||
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
        normalizeId(
            merchantId
        );


    if (
        !normalizedMerchantId
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


    const db =
        await getDatabase();


    const invoices =
        db.collection(
            INVOICES_COLLECTION
        );


    const merchant =
        await getMerchant(
            db,
            normalizedMerchantId
        );


    /*
    --------------------------------------------------------
    Verificar limite antes de criar.
    --------------------------------------------------------
    */

    const quota =
        await enforceInvoiceLimit(

            invoices,

            normalizedMerchantId
        );


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

        const error =
            new Error(
                "A descrição da fatura é obrigatória."
            );


        error.code =
            "INVOICE_DESCRIPTION_REQUIRED";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Contas bancárias.
    --------------------------------------------------------
    */

    const requestedBankAccounts =
        data.bankAccountIds;


    const bankAccounts =
        await resolveBankAccounts(

            db,

            normalizedMerchantId,

            requestedBankAccounts
        );


    if (
        !bankAccounts.length
    ) {

        const error =
            new Error(
                "Configure pelo menos uma conta bancária antes de criar uma fatura."
            );


        error.code =
            "BANK_ACCOUNT_REQUIRED";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Cliente opcional.
    --------------------------------------------------------
    */

    const customer = {

        name:
            cleanString(
                data.customer?.name ||
                data.customerName,
                MAX_CUSTOMER_NAME_LENGTH
            ) || null,

        phone:
            cleanString(
                data.customer?.phone ||
                data.customerPhone,
                MAX_CUSTOMER_PHONE_LENGTH
            ) || null,

        email:
            cleanString(
                data.customer?.email ||
                data.customerEmail,
                MAX_CUSTOMER_EMAIL_LENGTH
            )
                .toLowerCase() ||
            null
    };


    /*
    --------------------------------------------------------
    Validação de referência.
    --------------------------------------------------------
    */

    const reference =
        cleanString(
            data.reference,
            MAX_REFERENCE_LENGTH
        ) || null;


    /*
    --------------------------------------------------------
    Expiração.
    --------------------------------------------------------
    */

    let expiryDays =
        Number(
            data.expiryDays
        );


    if (
        !Number.isFinite(
            expiryDays
        )
    ) {

        expiryDays =
            DEFAULT_EXPIRY_DAYS;
    }


    expiryDays =
        Math.min(
            365,
            Math.max(
                1,
                Math.floor(
                    expiryDays
                )
            )
        );


    const now =
        new Date();


    const expiresAt =
        new Date(
            now.getTime() +
            expiryDays *
            24 *
            60 *
            60 *
            1000
        );


    /*
    --------------------------------------------------------
    Identificadores.
    --------------------------------------------------------
    */

    let publicId =
        createPublicId();


    let invoiceNumber =
        createInvoiceNumber();


    let paymentSlug =
        await buildPaymentSlug(

            invoices,

            normalizedMerchantId,

            merchant
        );


    /*
    --------------------------------------------------------
    Link público.
    --------------------------------------------------------
    */

    const baseUrl =
        String(
            process.env.PUBLIC_APP_URL ||
            process.env.APP_URL ||
            ""
        )
            .trim()
            .replace(
                /\/+$/,
                ""
            );


    /*
    --------------------------------------------------------
    Se não existir domínio configurado, utilizamos
    caminho relativo. Isto funciona no mesmo domínio
    do Render e evita inventar domínio.
    --------------------------------------------------------
    */

    const paymentPath =
        `/p/${encodeURIComponent(
            paymentSlug
        )}/${encodeURIComponent(
            publicId
        )}`;


    const paymentUrl =
        baseUrl
            ? `${baseUrl}${paymentPath}`
            : paymentPath;


    const bankAccountsSnapshot =
        bankAccounts.map(
            sanitizeBankAccount
        );


    /*
    --------------------------------------------------------
    Documento.
    --------------------------------------------------------
    */

    const invoice = {

        merchantId:
            normalizedMerchantId,

        invoiceNumber,

        publicId,

        paymentSlug,

        paymentUrl,

        amount,

        currency:
            CURRENCY,

        description,

        reference,

        status:
            "pending",

        customer,

        merchantSnapshot:
            {

                businessName:
                    getBusinessName(
                        merchant
                    )
            },

        bankAccountsSnapshot,

        bankAccountIds:
            bankAccounts.map(
                account =>
                    account._id
            ),

        paymentCount:
            0,

        createdAt:
            now,

        updatedAt:
            now,

        expiresAt,

        paidAt:
            null,

        cancelledAt:
            null,

        metadata:
            {

                source:
                    "dashboard",

                planAtCreation:
                    quota.planId
            }
    };


    /*
    --------------------------------------------------------
    Tentamos inserir com identificadores únicos.

    Os índices definitivos serão criados no database.js
    quando fecharmos a camada de inicialização.
    --------------------------------------------------------
    */

    for (
        let attempt = 0;
        attempt < 3;
        attempt++
    ) {

        try {

            const result =
                await invoices.insertOne(
                    invoice
                );


            invoice._id =
                result.insertedId;


            break;

        }

        catch (error) {

            if (
                error?.code ===
                11000
            ) {

                publicId =
                    createPublicId();


                invoiceNumber =
                    createInvoiceNumber();


                invoice.publicId =
                    publicId;


                invoice.invoiceNumber =
                    invoiceNumber;


                continue;
            }


            throw error;
        }
    }


    if (
        !invoice._id
    ) {

        const error =
            new Error(
                "Não foi possível criar uma fatura única."
            );


        error.code =
            "INVOICE_UNIQUE_ID_ERROR";


        error.statusCode =
            500;


        throw error;
    }


    /*
    --------------------------------------------------------
    Resultado.
    --------------------------------------------------------
    */

    return {

        invoice:
            sanitizeInvoice(
                invoice,
                {
                    includePrivate:
                        true
                }
            ),

        quota:
            {

                plan:
                    quota.planId,

                used:
                    quota.invoiceCount +
                    1,

                limit:
                    quota.limit,

                remaining:
                    quota.remaining
            }
    };
}


/*
============================================================
GET INVOICE
============================================================
*/

export async function getInvoice(
    merchantId,
    invoiceId
) {

    const normalizedMerchantId =
        normalizeId(
            merchantId
        );


    const normalizedInvoiceId =
        normalizeId(
            invoiceId
        );


    if (
        !normalizedMerchantId ||
        !normalizedInvoiceId
    ) {

        const error =
            new Error(
                "Identificador de fatura inválido."
            );


        error.code =
            "INVALID_INVOICE_ID";


        error.statusCode =
            400;


        throw error;
    }


    const db =
        await getDatabase();


    const invoices =
        db.collection(
            INVOICES_COLLECTION
        );


    const invoice =
        await invoices.findOne(
            {

                _id:
                    normalizedInvoiceId,

                merchantId:
                    normalizedMerchantId
            }
        );


    if (
        !invoice
    ) {

        const error =
            new Error(
                "Fatura não encontrada."
            );


        error.code =
            "INVOICE_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    return sanitizeInvoice(
        invoice,
        {
            includePrivate:
                true
        }
    );
}


/*
============================================================
PUBLIC INVOICE
============================================================
*/

export async function getPublicInvoice(
    publicId
) {

    const normalizedPublicId =
        cleanString(
            publicId,
            100
        );


    if (
        !normalizedPublicId ||
        normalizedPublicId.length <
            20
    ) {

        const error =
            new Error(
                "Link de pagamento inválido."
            );


        error.code =
            "INVALID_PUBLIC_INVOICE_ID";


        error.statusCode =
            400;


        throw error;
    }


    const db =
        await getDatabase();


    const invoices =
        db.collection(
            INVOICES_COLLECTION
        );


    const invoice =
        await invoices.findOne(
            {

                publicId:
                    normalizedPublicId
            }
        );


    if (
        !invoice
    ) {

        const error =
            new Error(
                "Fatura não encontrada."
            );


        error.code =
            "PUBLIC_INVOICE_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    /*
    --------------------------------------------------------
    Verificar expiração.
    --------------------------------------------------------
    */

    const now =
        new Date();


    if (
        invoice.status ===
            "pending" &&
        invoice.expiresAt &&
        new Date(
            invoice.expiresAt
        ) <= now
    ) {

        await invoices.updateOne(

            {
                _id:
                    invoice._id,

                status:
                    "pending"
            },

            {

                $set:
                    {

                        status:
                            "expired",

                        updatedAt:
                            now
                    }
            }
        );


        invoice.status =
            "expired";

        invoice.updatedAt =
            now;
    }


    /*
    --------------------------------------------------------
    Não expor dados internos do comerciante.
    --------------------------------------------------------
    */

    return sanitizeInvoice(
        invoice,
        {
            includePrivate:
                false
        }
    );
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
        normalizeId(
            merchantId
        );


    if (
        !normalizedMerchantId
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


    const db =
        await getDatabase();


    const invoices =
        db.collection(
            INVOICES_COLLECTION
        );


    let page =
        Number(
            options.page
        );


    let limit =
        Number(
            options.limit
        );


    if (
        !Number.isFinite(
            page
        ) ||
        page < 1
    ) {

        page =
            1;
    }


    if (
        !Number.isFinite(
            limit
        ) ||
        limit < 1
    ) {

        limit =
            20;
    }


    page =
        Math.floor(
            page
        );


    limit =
        Math.min(
            100,
            Math.floor(
                limit
            )
        );


    const filter = {

        merchantId:
            normalizedMerchantId
    };


    const status =
        cleanString(
            options.status,
            30
        )
            .toLowerCase();


    if (
        status &&
        [
            "pending",
            "paid",
            "expired",
            "cancelled"
        ]
            .includes(
                status
            )
    ) {

        filter.status =
            status;
    }


    const skip =
        (
            page -
            1
        ) *
        limit;


    const [
        documents,
        total
    ] =
        await Promise.all([

            invoices
                .find(
                    filter,
                    {

                        projection:
                            {

                                merchantId:
                                    0,

                                metadata:
                                    0,

                                customer:
                                    0
                            }
                    }
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
                .toArray(),

            invoices.countDocuments(
                filter
            )
        ]);


    return {

        invoices:
            documents.map(
                invoice =>
                    sanitizeInvoice(
                        invoice,
                        {
                            includePrivate:
                                false
                        }
                    )
            ),

        pagination:
            {

                page,

                limit,

                total,

                pages:
                    Math.ceil(
                        total /
                        limit
                    )
            }
    };
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
        normalizeId(
            merchantId
        );


    const normalizedInvoiceId =
        normalizeId(
            invoiceId
        );


    if (
        !normalizedMerchantId ||
        !normalizedInvoiceId
    ) {

        const error =
            new Error(
                "Identificador de fatura inválido."
            );


        error.code =
            "INVALID_INVOICE_ID";


        error.statusCode =
            400;


        throw error;
    }


    const db =
        await getDatabase();


    const invoices =
        db.collection(
            INVOICES_COLLECTION
        );


    const invoice =
        await invoices.findOne(
            {

                _id:
                    normalizedInvoiceId,

                merchantId:
                    normalizedMerchantId
            }
        );


    if (
        !invoice
    ) {

        const error =
            new Error(
                "Fatura não encontrada."
            );


        error.code =
            "INVOICE_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    if (
        invoice.status ===
        "paid"
    ) {

        const error =
            new Error(
                "Uma fatura paga não pode ser cancelada."
            );


        error.code =
            "PAID_INVOICE_CANNOT_BE_CANCELLED";


        error.statusCode =
            409;


        throw error;
    }


    if (
        invoice.status ===
        "cancelled"
    ) {

        return sanitizeInvoice(
            invoice,
            {
                includePrivate:
                    true
            }
        );
    }


    const now =
        new Date();


    const result =
        await invoices.findOneAndUpdate(

            {

                _id:
                    normalizedInvoiceId,

                merchantId:
                    normalizedMerchantId,

                status:
                    {
                        $in:
                            [
                                "pending",
                                "expired"
                            ]
                    }
            },

            {

                $set:
                    {

                        status:
                            "cancelled",

                        cancelledAt:
                            now,

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

        const error =
            new Error(
                "A fatura não pôde ser cancelada."
            );


        error.code =
            "INVOICE_CANCEL_FAILED";


        error.statusCode =
            409;


        throw error;
    }


    return sanitizeInvoice(
        updated,
        {
            includePrivate:
                true
        }
    );
}


/*
============================================================
INCREMENT PAYMENT COUNT
============================================================

Utilizado pelo payment.js quando um novo comprovativo
é recebido.

============================================================
*/

export async function incrementInvoicePaymentCount(
    invoiceId
) {

    const normalizedInvoiceId =
        normalizeId(
            invoiceId
        );


    if (
        !normalizedInvoiceId
    ) {

        const error =
            new Error(
                "Identificador de fatura inválido."
            );


        error.code =
            "INVALID_INVOICE_ID";


        error.statusCode =
            400;


        throw error;
    }


    const db =
        await getDatabase();


    const invoices =
        db.collection(
            INVOICES_COLLECTION
        );


    const result =
        await invoices.findOneAndUpdate(

            {
                _id:
                    normalizedInvoiceId,

                status:
                    "pending"
            },

            {

                $inc:
                    {

                        paymentCount:
                            1
                    },

                $set:
                    {

                        updatedAt:
                            new Date()
                    }
            },

            {

                returnDocument:
                    "after"
            }
        );


    return (
        result?.value ||
        result ||
        null
    );
}


/*
============================================================
MARK PAID
============================================================
*/

export async function markInvoicePaid(
    invoiceId
) {

    const normalizedInvoiceId =
        normalizeId(
            invoiceId
        );


    if (
        !normalizedInvoiceId
    ) {

        const error =
            new Error(
                "Identificador de fatura inválido."
            );


        error.code =
            "INVALID_INVOICE_ID";


        error.statusCode =
            400;


        throw error;
    }


    const db =
        await getDatabase();


    const invoices =
        db.collection(
            INVOICES_COLLECTION
        );


    const now =
        new Date();


    const result =
        await invoices.findOneAndUpdate(

            {

                _id:
                    normalizedInvoiceId,

                status:
                    "pending"
            },

            {

                $set:
                    {

                        status:
                            "paid",

                        paidAt:
                            now,

                        updatedAt:
                            now
                    }
            },

            {

                returnDocument:
                    "after"
            }
        );


    return (
        result?.value ||
        result ||
        null
    );
}


/*
============================================================
INVOICE HEALTH
============================================================
*/

export async function invoiceHealthCheck() {

    try {

        const db =
            await getDatabase();


        await db
            .collection(
                INVOICES_COLLECTION
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
                INVOICES_COLLECTION,

            freeInvoiceLimit:
                FREE_INVOICE_LIMIT,

            proPrice:
                7500
        };

    }

    catch (error) {

        return {

            healthy:
                false,

            collection:
                INVOICES_COLLECTION,

            error:
                error?.message ||
                "Erro desconhecido."
        };
    }
}


/*
============================================================
EXPORT DEFAULT
============================================================
*/

export default {

    createInvoice,

    getInvoice,

    getPublicInvoice,

    listInvoices,

    cancelInvoice,

    incrementInvoicePaymentCount,

    markInvoicePaid,

    invoiceHealthCheck
};
