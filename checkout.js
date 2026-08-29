/*
============================================================
HONEY PAY
PUBLIC CHECKOUT SERVICE
V1.0.0
============================================================

CHECKOUT PÚBLICO DE FATURAS

------------------------------------------------------------
OBJETIVO
------------------------------------------------------------

Criar uma experiência de pagamento simples para o cliente
final:

1. Abrir o link da fatura.
2. Ver o comerciante.
3. Ver o valor.
4. Escolher uma conta bancária.
5. Copiar o IBAN.
6. Efetuar a transferência.
7. Enviar o comprovativo.

------------------------------------------------------------
CARACTERÍSTICAS
------------------------------------------------------------

- Não exige conta ao comprador.
- Não expõe documentos internos.
- Mostra somente contas bancárias ativas.
- Permite múltiplas contas bancárias.
- Usa token público da fatura.
- Não permite alterar o valor através do cliente.
- Não aceita merchantId vindo do cliente para determinar
  propriedade da fatura.
- O checkout é somente leitura.
- O estado do pagamento é controlado pelo servidor.

============================================================
*/

import crypto from "node:crypto";
import { ObjectId } from "mongodb";


import {
    getDatabase
} from "./database.js";


import {
    getPublicBankAccounts
} from "./bank-accounts.js";


/*
============================================================
COLLECTIONS
============================================================
*/

const INVOICES_COLLECTION =
    "invoices";


const MERCHANTS_COLLECTION =
    "merchants";


/*
============================================================
LIMITS
============================================================
*/

const MAX_TOKEN_LENGTH =
    200;

const MAX_PUBLIC_TEXT_LENGTH =
    500;

const MAX_ITEMS =
    100;


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
        details !== null
    ) {

        error.details =
            details;
    }


    return error;
}


/*
============================================================
STRING NORMALIZATION
============================================================
*/

function cleanString(
    value,
    maxLength
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
        .slice(
            0,
            maxLength
        );
}


/*
============================================================
OBJECT ID
============================================================
*/

function normalizeObjectId(
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


/*
============================================================
PUBLIC TOKEN NORMALIZATION
============================================================
*/

function normalizePublicToken(
    token
) {

    const normalized =
        cleanString(
            token,
            MAX_TOKEN_LENGTH
        );


    if (
        !normalized
    ) {

        throw createError(
            "Link de pagamento inválido.",
            "INVALID_CHECKOUT_TOKEN",
            400
        );
    }


    /*
    --------------------------------------------------------
    Aceitamos apenas caracteres seguros para tokens públicos.
    --------------------------------------------------------
    */

    if (
        !/^[A-Za-z0-9_-]+$/.test(
            normalized
        )
    ) {

        throw createError(
            "Link de pagamento inválido.",
            "INVALID_CHECKOUT_TOKEN",
            400
        );
    }


    return normalized;
}


/*
============================================================
TOKEN HASH
============================================================

O token público pode existir no documento como hash.

Também mantemos suporte para documentos que tenham
publicToken diretamente.

============================================================
*/

function hashPublicToken(
    token
) {

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            token,
            "utf8"
        )
        .digest(
            "hex"
        );
}


/*
============================================================
DECIMAL MONEY
============================================================

O dinheiro nunca é calculado com floating point.

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
            ) ||
            value < 0
        ) {

            throw createError(
                "Valor da fatura inválido.",
                "INVALID_INVOICE_AMOUNT",
                500
            );
        }


        return Math.round(
            value *
            100
        );
    }


    if (
        typeof value ===
        "string"
    ) {

        const normalized =
            value
                .trim()
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
                "Valor da fatura inválido.",
                "INVALID_INVOICE_AMOUNT",
                500
            );
        }


        const [
            whole,
            decimal = ""
        ] =
            normalized.split(
                "."
            );


        return (
            Number(
                whole
            ) *
            100
        ) +
        Number(
            decimal.padEnd(
                2,
                "0"
            )
        );
    }


    throw createError(
        "Valor da fatura inválido.",
        "INVALID_INVOICE_AMOUNT",
        500
    );
}


/*
============================================================
FORMAT MONEY
============================================================
*/

function formatAmount(
    cents,
    currency
) {

    const safeCents =
        Number(
            cents
        );


    if (
        !Number.isSafeInteger(
            safeCents
        ) ||
        safeCents < 0
    ) {

        throw createError(
            "Valor monetário inválido.",
            "INVALID_MONEY_VALUE",
            500
        );
    }


    const amount =
        safeCents /
        100;


    return {

        value:
            amount,

        currency:
            currency,

        formatted:
            new Intl.NumberFormat(
                "pt-PT",
                {

                    minimumFractionDigits:
                        2,

                    maximumFractionDigits:
                        2
                }
            ).format(
                amount
            ) +
            " " +
            currency
    };
}


/*
============================================================
INVOICE STATUS
============================================================
*/

function normalizeInvoiceStatus(
    invoice
) {

    const raw =
        String(
            invoice?.status ||
            invoice?.state ||
            invoice?.paymentStatus ||
            "pending"
        )
            .trim()
            .toLowerCase();


    if (
        [
            "paid",
            "approved",
            "completed",
            "success",
            "settled"
        ].includes(
            raw
        )
    ) {

        return "paid";
    }


    if (
        [
            "cancelled",
            "canceled",
            "expired",
            "void"
        ].includes(
            raw
        )
    ) {

        return "cancelled";
    }


    if (
        [
            "processing",
            "review",
            "under_review"
        ].includes(
            raw
        )
    ) {

        return "review";
    }


    return "pending";
}


/*
============================================================
INVOICE EXPIRATION
============================================================
*/

function getExpirationDate(
    invoice
) {

    const value =
        invoice?.expiresAt ||
        invoice?.expirationDate ||
        invoice?.dueDate ||
        null;


    if (
        !value
    ) {

        return null;
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

        return null;
    }


    return date;
}


/*
============================================================
IS EXPIRED
============================================================
*/

function isInvoiceExpired(
    invoice
) {

    const expiration =
        getExpirationDate(
            invoice
        );


    if (
        !expiration
    ) {

        return false;
    }


    return expiration.getTime() <
        Date.now();
}


/*
============================================================
INVOICE ACTIVE
============================================================
*/

function isInvoicePayable(
    invoice
) {

    if (
        !invoice
    ) {

        return false;
    }


    const status =
        normalizeInvoiceStatus(
            invoice
        );


    if (
        status ===
        "paid"
    ) {

        return false;
    }


    if (
        status ===
        "cancelled"
    ) {

        return false;
    }


    if (
        isInvoiceExpired(
            invoice
        )
    ) {

        return false;
    }


    if (
        invoice.active ===
        false
    ) {

        return false;
    }


    return true;
}


/*
============================================================
MERCHANT DISPLAY NAME
============================================================
*/

function getMerchantName(
    merchant
) {

    const candidates = [

        merchant?.businessName,

        merchant?.storeName,

        merchant?.shopName,

        merchant?.companyName,

        merchant?.name,

        merchant?.business?.name,

        merchant?.profile?.businessName

    ];


    for (
        const candidate
        of candidates
    ) {

        const value =
            cleanString(
                candidate,
                160
            );


        if (
            value
        ) {

            return value;
        }
    }


    return "Comerciante";
}


/*
============================================================
MERCHANT LOGO
============================================================
*/

function getMerchantLogo(
    merchant
) {

    const candidates = [

        merchant?.logoUrl,

        merchant?.logo,

        merchant?.business?.logoUrl,

        merchant?.profile?.logoUrl

    ];


    for (
        const candidate
        of candidates
    ) {

        const value =
            cleanString(
                candidate,
                1000
            );


        if (
            value
        ) {

            return value;
        }
    }


    return null;
}


/*
============================================================
MERCHANT SLUG
============================================================
*/

function getMerchantSlug(
    merchant
) {

    const candidates = [

        merchant?.businessSlug,

        merchant?.storeSlug,

        merchant?.shopSlug,

        merchant?.slug,

        merchant?.business?.slug

    ];


    for (
        const candidate
        of candidates
    ) {

        const value =
            cleanString(
                candidate,
                160
            );


        if (
            value
        ) {

            return value
                .toLowerCase()
                .replace(
                    /[^a-z0-9-]/g,
                    "-"
                )
                .replace(
                    /-+/g,
                    "-"
                )
                .replace(
                    /^-|-$/g,
                    ""
                );
        }
    }


    return null;
}


/*
============================================================
INVOICE NUMBER
============================================================
*/

function getInvoiceNumber(
    invoice
) {

    const candidates = [

        invoice?.invoiceNumber,

        invoice?.number,

        invoice?.reference,

        invoice?.code,

        invoice?.invoiceCode

    ];


    for (
        const candidate
        of candidates
    ) {

        const value =
            cleanString(
                candidate,
                120
            );


        if (
            value
        ) {

            return value;
        }
    }


    return null;
}


/*
============================================================
INVOICE DESCRIPTION
============================================================
*/

function getInvoiceDescription(
    invoice
) {

    const candidates = [

        invoice?.description,

        invoice?.title,

        invoice?.summary,

        invoice?.notes

    ];


    for (
        const candidate
        of candidates
    ) {

        const value =
            cleanString(
                candidate,
                MAX_PUBLIC_TEXT_LENGTH
            );


        if (
            value
        ) {

            return value;
        }
    }


    return "Pagamento";
}


/*
============================================================
INVOICE ITEMS
============================================================
*/

function getInvoiceItems(
    invoice
) {

    const rawItems =
        Array.isArray(
            invoice?.items
        )
            ? invoice.items
            : [];


    return rawItems
        .slice(
            0,
            MAX_ITEMS
        )
        .map(
            item => {

                if (
                    !item ||
                    typeof item !==
                    "object"
                ) {

                    return null;
                }


                const name =
                    cleanString(
                        item.name ||
                        item.title ||
                        item.description ||
                        "Item",
                        200
                    );


                const quantityRaw =
                    Number(
                        item.quantity ??
                        1
                    );


                const quantity =
                    Number.isFinite(
                        quantityRaw
                    ) &&
                    quantityRaw > 0

                        ? Math.min(
                            quantityRaw,
                            100000
                        )

                        : 1;


                let amountCents =
                    null;


                try {

                    if (
                        item.amountCents !==
                        undefined
                    ) {

                        amountCents =
                            normalizeAmount(
                                Number(
                                    item.amountCents
                                ) /
                                100
                            );

                    }

                    else if (
                        item.amount !==
                        undefined
                    ) {

                        amountCents =
                            normalizeAmount(
                                item.amount
                            );
                    }

                }

                catch (
                    error
                ) {

                    amountCents =
                        null;
                }


                return {

                    name,

                    quantity,

                    amount:
                        amountCents !== null
                            ? amountCents /
                              100
                            : null
                };
            }
        )
        .filter(
            Boolean
        );
}


/*
============================================================
FIND INVOICE BY PUBLIC TOKEN
============================================================
*/

async function findInvoiceByPublicToken(
    token
) {

    const db =
        await getDatabase();


    const collection =
        db.collection(
            INVOICES_COLLECTION
        );


    /*
    --------------------------------------------------------
    Primeiro procuramos pelo token em texto.

    --------------------------------------------------------
    */

    let invoice =
        await collection.findOne(
            {

                publicToken:
                    token
            }
        );


    if (
        invoice
    ) {

        return invoice;
    }


    /*
    --------------------------------------------------------
    Suporte para token armazenado como hash.
    --------------------------------------------------------
    */

    const tokenHash =
        hashPublicToken(
            token
        );


    invoice =
        await collection.findOne(
            {

                publicTokenHash:
                    tokenHash
            }
        );


    if (
        invoice
    ) {

        return invoice;
    }


    /*
    --------------------------------------------------------
    Algumas versões podem utilizar checkoutToken.
    --------------------------------------------------------
    */

    invoice =
        await collection.findOne(
            {

                checkoutToken:
                    token
            }
        );


    if (
        invoice
    ) {

        return invoice;
    }


    return null;
}


/*
============================================================
GET MERCHANT
============================================================
*/

async function findMerchant(
    merchantId
) {

    const normalizedId =
        normalizeObjectId(
            merchantId
        );


    if (
        !normalizedId
    ) {

        return null;
    }


    const db =
        await getDatabase();


    return db
        .collection(
            MERCHANTS_COLLECTION
        )
        .findOne(
            {

                _id:
                    normalizedId
            }
        );
}


/*
============================================================
EXTRACT MERCHANT ID
============================================================
*/

function extractMerchantId(
    invoice
) {

    const candidates = [

        invoice?.merchantId,

        invoice?.merchant?._id,

        invoice?.merchant?.id,

        invoice?.ownerId,

        invoice?.userId

    ];


    for (
        const candidate
        of candidates
    ) {

        const normalized =
            normalizeObjectId(
                candidate
            );


        if (
            normalized
        ) {

            return normalized;
        }
    }


    return null;
}


/*
============================================================
EXTRACT AMOUNT
============================================================
*/

function extractInvoiceAmount(
    invoice
) {

    const candidates = [

        invoice?.amount,

        invoice?.total,

        invoice?.totalAmount,

        invoice?.grandTotal,

        invoice?.value

    ];


    for (
        const candidate
        of candidates
    ) {

        if (
            candidate !==
            undefined &&
            candidate !==
            null
        ) {

            return normalizeAmount(
                candidate
            );
        }
    }


    if (
        invoice?.amountCents !==
        undefined
    ) {

        const cents =
            Number(
                invoice.amountCents
            );


        if (
            Number.isSafeInteger(
                cents
            ) &&
            cents >= 0
        ) {

            return cents;
        }
    }


    throw createError(
        "A fatura não possui um valor válido.",
        "INVOICE_AMOUNT_MISSING",
        500
    );
}


/*
============================================================
EXTRACT CURRENCY
============================================================
*/

function extractCurrency(
    invoice
) {

    const currency =
        cleanString(
            invoice?.currency ||
            invoice?.currencyCode ||
            "AOA",
            3
        )
            .toUpperCase();


    if (
        !/^[A-Z]{3}$/.test(
            currency
        )
    ) {

        return "AOA";
    }


    return currency;
}


/*
============================================================
CHECKOUT STATUS
============================================================
*/

function getCheckoutStatus(
    invoice
) {

    const status =
        normalizeInvoiceStatus(
            invoice
        );


    if (
        status ===
        "paid"
    ) {

        return {

            code:
                "paid",

            title:
                "Pagamento recebido",

            message:
                "Esta fatura já foi marcada como paga.",

            payable:
                false
        };
    }


    if (
        status ===
        "cancelled"
    ) {

        return {

            code:
                "cancelled",

            title:
                "Fatura indisponível",

            message:
                "Esta fatura foi cancelada.",

            payable:
                false
        };
    }


    if (
        isInvoiceExpired(
            invoice
        )
    ) {

        return {

            code:
                "expired",

            title:
                "Fatura expirada",

            message:
                "O prazo desta fatura terminou.",

            payable:
                false
        };
    }


    if (
        status ===
        "review"
    ) {

        return {

            code:
                "review",

            title:
                "Pagamento em análise",

            message:
                "Existe um pagamento associado a esta fatura que está em análise.",

            payable:
                false
        };
    }


    return {

        code:
            "pending",

        title:
            "Pagamento pendente",

        message:
            "Efetue a transferência e envie o comprovativo.",

        payable:
            true
    };
}


/*
============================================================
PUBLIC CHECKOUT OBJECT
============================================================
*/

function buildCheckout(
    invoice,
    merchant,
    bankAccounts
) {

    const amountCents =
        extractInvoiceAmount(
            invoice
        );


    const currency =
        extractCurrency(
            invoice
        );


    const money =
        formatAmount(
            amountCents,
            currency
        );


    const status =
        getCheckoutStatus(
            invoice
        );


    const expiration =
        getExpirationDate(
            invoice
        );


    const merchantName =
        getMerchantName(
            merchant
        );


    const merchantSlug =
        getMerchantSlug(
            merchant
        );


    return {

        checkoutVersion:
            "1.0.0",

        type:
            "invoice_checkout",

        invoice: {

            id:
                invoice.publicId ||
                invoice.publicInvoiceId ||
                invoice.invoicePublicId ||
                String(
                    invoice._id
                ),

            number:
                getInvoiceNumber(
                    invoice
                ),

            description:
                getInvoiceDescription(
                    invoice
                ),

            amount:
                money.value,

            currency:
                money.currency,

            formattedAmount:
                money.formatted,

            items:
                getInvoiceItems(
                    invoice
                ),

            createdAt:
                invoice.createdAt ||
                null,

            expiresAt:
                expiration
                    ? expiration.toISOString()
                    : null
        },

        merchant: {

            name:
                merchantName,

            slug:
                merchantSlug,

            logoUrl:
                getMerchantLogo(
                    merchant
                )
        },

        payment: {

            status:
                status.code,

            title:
                status.title,

            message:
                status.message,

            payable:
                status.payable,

            method:
                "bank_transfer"
        },

        bankAccounts:
            status.payable
                ? bankAccounts
                : [],

        proof: {

            accepted:
                status.payable,

            endpoint:
                "/api/pay",

            fieldName:
                "proof"
        }
    };
}


/*
============================================================
GET PUBLIC CHECKOUT
============================================================
*/

export async function getPublicCheckout(
    publicToken
) {

    const token =
        normalizePublicToken(
            publicToken
        );


    const invoice =
        await findInvoiceByPublicToken(
            token
        );


    if (
        !invoice
    ) {

        throw createError(
            "A fatura não foi encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );
    }


    const merchantId =
        extractMerchantId(
            invoice
        );


    if (
        !merchantId
    ) {

        throw createError(
            "A fatura não possui um comerciante válido.",
            "INVOICE_MERCHANT_MISSING",
            500
        );
    }


    const merchant =
        await findMerchant(
            merchantId
        );


    if (
        !merchant
    ) {

        throw createError(
            "O comerciante associado à fatura não foi encontrado.",
            "MERCHANT_NOT_FOUND",
            404
        );
    }


    const bankAccounts =
        await getPublicBankAccounts(
            merchantId
        );


    /*
    --------------------------------------------------------
    Uma fatura só pode ser apresentada para pagamento se
    existir pelo menos uma conta bancária ativa.
    --------------------------------------------------------
    */

    const checkout =
        buildCheckout(

            invoice,

            merchant,

            bankAccounts
        );


    if (
        checkout.payment.payable &&
        checkout.bankAccounts.length ===
        0
    ) {

        checkout.payment.payable =
            false;


        checkout.payment.status =
            "unavailable";


        checkout.payment.title =
            "Pagamento temporariamente indisponível";


        checkout.payment.message =
            "O comerciante ainda não possui uma conta bancária disponível para este pagamento.";
    }


    return checkout;
}


/*
============================================================
PUBLIC CHECKOUT BY INVOICE ID
============================================================

Utilitário interno.

Não deve ser exposto diretamente sem uma camada de
autorização pública apropriada.

============================================================
*/

export async function getCheckoutByInvoiceId(
    invoiceId
) {

    const normalizedId =
        normalizeObjectId(
            invoiceId
        );


    if (
        !normalizedId
    ) {

        throw createError(
            "Identificador da fatura inválido.",
            "INVALID_INVOICE_ID",
            400
        );
    }


    const db =
        await getDatabase();


    const invoice =
        await db
            .collection(
                INVOICES_COLLECTION
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
            "A fatura não foi encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );
    }


    const merchantId =
        extractMerchantId(
            invoice
        );


    if (
        !merchantId
    ) {

        throw createError(
            "A fatura não possui um comerciante válido.",
            "INVOICE_MERCHANT_MISSING",
            500
        );
    }


    const merchant =
        await findMerchant(
            merchantId
        );


    if (
        !merchant
    ) {

        throw createError(
            "O comerciante associado à fatura não foi encontrado.",
            "MERCHANT_NOT_FOUND",
            404
        );
    }


    const bankAccounts =
        await getPublicBankAccounts(
            merchantId
        );


    return buildCheckout(

        invoice,

        merchant,

        bankAccounts
    );
}


/*
============================================================
CHECKOUT TOKEN GENERATOR
============================================================

Utilizado quando uma nova fatura precisar de um token
público.

============================================================
*/

export function generateCheckoutToken() {

    return crypto
        .randomBytes(
            24
        )
        .toString(
            "base64url"
        );
}


/*
============================================================
CHECKOUT TOKEN HASH
============================================================
*/

export function generateCheckoutTokenHash(
    token
) {

    const normalized =
        normalizePublicToken(
            token
        );


    return hashPublicToken(
        normalized
    );
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    getPublicCheckout,

    getCheckoutByInvoiceId,

    generateCheckoutToken,

    generateCheckoutTokenHash
};
