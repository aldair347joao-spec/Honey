/*
============================================================
HONEY PAY
CHECKOUT PAYMENT INTENT BRIDGE
V1.0.0
============================================================

BRIDGE ENTRE:

CHECKOUT PÚBLICO
        ↓
PAYMENT INTENT CORE
        ↓
PAYMENT LEGACY
        ↓
COMPROVATIVO

IMPORTANTE
------------------------------------------------------------
O Payment legado continua temporariamente activo para
preservar compatibilidade com o sistema actual de
comprovativos.

O novo PaymentIntent passa a ser a autoridade financeira
principal.

A migração completa do modelo Payment será feita numa etapa
posterior.
============================================================
*/

import mongoose from "mongoose";

import {
    Invoice,
    Payment,
    BankAccount
} from "./models.js";

import {
    PaymentIntent
} from "./payment-core-models.js";

import {
    createPaymentIntent as createCorePaymentIntent
} from "./payment-intent.js";


/*
============================================================
ERROR
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
OBJECT ID
============================================================
*/

function isValidObjectId(
    value
) {

    return Boolean(
        value &&
        mongoose.Types.ObjectId.isValid(
            value
        )
    );

}


/*
============================================================
PUBLIC TOKEN QUERY
============================================================
*/

function buildInvoiceQuery(
    publicToken
) {

    const value =
        String(
            publicToken ||
            ""
        ).trim();


    if (
        !value
    ) {

        return null;

    }


    const conditions = [

        {
            publicToken:
                value
        },

        {
            publicId:
                value
        }

    ];


    if (
        isValidObjectId(
            value
        )
    ) {

        conditions.push(
            {
                _id:
                    new mongoose.Types.ObjectId(
                        value
                    )
            }
        );

    }


    return {
        $or:
            conditions
    };

}


/*
============================================================
LEGACY PAYMENT RESPONSE
============================================================
*/

function serializeLegacyPayment(
    payment
) {

    if (
        !payment
    ) {

        return null;

    }


    return {

        id:
            String(
                payment._id
            ),

        status:
            payment.status,

        amount:
            Number(
                payment.amount
            ),

        currency:
            payment.currency ||
            "AOA",

        transactionReference:
            payment.transactionReference ||
            null,

        createdAt:
            payment.createdAt,

        paidAt:
            payment.paidAt ||
            null

    };

}


/*
============================================================
CORE PAYMENT INTENT RESPONSE
============================================================
*/

function serializePaymentIntent(
    paymentIntent
) {

    if (
        !paymentIntent
    ) {

        return null;

    }


    return {

        id:
            paymentIntent.publicId,

        object:
            "payment_intent",

        amountMinor:
            paymentIntent.amountMinor,

        currency:
            paymentIntent.currency,

        status:
            paymentIntent.status,

        paymentMethod:
            paymentIntent.paymentMethod,

        checkoutToken:
            paymentIntent.checkoutToken,

        checkoutExpiresAt:
            paymentIntent.checkoutExpiresAt,

        createdAt:
            paymentIntent.createdAt,

        updatedAt:
            paymentIntent.updatedAt

    };

}


/*
============================================================
FIND EXISTING CORE INTENT
============================================================
*/

async function findExistingIntent(
    merchantId,
    invoiceId
) {

    return PaymentIntent
        .findOne(
            {
                merchantId,

                invoiceId,

                status:
                    {
                        $in: [
                            "requires_payment",
                            "processing"
                        ]
                    }
            }
        )
        .sort(
            {
                createdAt:
                    -1
            }
        );

}


/*
============================================================
CREATE CHECKOUT PAYMENT INTENT
============================================================
*/

export async function createCheckoutPaymentIntent(
    publicToken,
    data = {},
    options = {}
) {

    const query =
        buildInvoiceQuery(
            publicToken
        );


    if (
        !query
    ) {

        throw createError(
            "Link de pagamento inválido.",
            "INVALID_PUBLIC_TOKEN",
            400
        );

    }


    const invoice =
        await Invoice
            .findOne(
                query
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


    /*
    --------------------------------------------------------
    EXPIRAÇÃO
    --------------------------------------------------------
    */

    if (
        invoice.expiresAt &&
        new Date(
            invoice.expiresAt
        ).getTime() <=
        Date.now() &&
        invoice.status ===
        "pending"
    ) {

        await Invoice.updateOne(
            {
                _id:
                    invoice._id,

                status:
                    "pending"
            },

            {
                $set: {
                    status:
                        "expired"
                }
            }
        );


        throw createError(
            "Esta cobrança expirou.",
            "INVOICE_EXPIRED",
            410
        );

    }


    /*
    --------------------------------------------------------
    ESTADO
    --------------------------------------------------------
    */

    if (
        invoice.status !==
        "pending"
    ) {

        if (
            invoice.status ===
            "paid"
        ) {

            throw createError(
                "Esta cobrança já foi paga.",
                "INVOICE_ALREADY_PAID",
                409
            );

        }


        if (
            invoice.status ===
            "cancelled"
        ) {

            throw createError(
                "Esta cobrança foi cancelada.",
                "INVOICE_CANCELLED",
                410
            );

        }


        if (
            invoice.status ===
            "expired"
        ) {

            throw createError(
                "Esta cobrança expirou.",
                "INVOICE_EXPIRED",
                410
            );

        }


        throw createError(
            "Esta cobrança não está disponível para pagamento.",
            "INVOICE_NOT_PAYABLE",
            409
        );

    }


    /*
    --------------------------------------------------------
    CONTA BANCÁRIA
    --------------------------------------------------------
    */

    let bankAccount =
        null;


    if (
        invoice.bankAccountId &&
        isValidObjectId(
            invoice.bankAccountId
        )
    ) {

        bankAccount =
            await BankAccount
                .findOne(
                    {
                        _id:
                            invoice.bankAccountId,

                        merchantId:
                            invoice.merchantId,

                        isActive:
                            true
                    }
                );

    }


    if (
        !bankAccount
    ) {

        bankAccount =
            await BankAccount
                .findOne(
                    {
                        merchantId:
                            invoice.merchantId,

                        isActive:
                            true,

                        isPrimary:
                            true
                    }
                );

    }


    if (
        !bankAccount
    ) {

        throw createError(
            "Nenhuma conta bancária de recebimento está disponível.",
            "BANK_ACCOUNT_UNAVAILABLE",
            409
        );

    }


    /*
    --------------------------------------------------------
    EXISTING CORE INTENT
    --------------------------------------------------------
    */

    const existingIntent =
        await findExistingIntent(
            invoice.merchantId,
            invoice._id
        );


    if (
        existingIntent
    ) {

        const legacyPaymentId =
            existingIntent
                ?.metadata
                ?.legacyPaymentId;


        let legacyPayment =
            null;


        if (
            legacyPaymentId &&
            isValidObjectId(
                legacyPaymentId
            )
        ) {

            legacyPayment =
                await Payment
                    .findOne(
                        {
                            _id:
                                legacyPaymentId,

                            merchantId:
                                invoice.merchantId,

                            invoiceId:
                                invoice._id
                        }
                    );

        }


        return {

            created:
                false,

            paymentIntent:
                serializePaymentIntent(
                    existingIntent
                ),

            payment:
                serializeLegacyPayment(
                    legacyPayment
                ),

            bankAccountId:
                String(
                    bankAccount._id
                )

        };

    }


    /*
    --------------------------------------------------------
    CUSTOMER DATA
    --------------------------------------------------------
    */

    const customerName =
        typeof data.customerName ===
        "string"

            ? data.customerName
                .trim()
                .slice(
                    0,
                    180
                )

            : (
                invoice.customerName ||
                null
            );


    const customerEmail =
        typeof data.customerEmail ===
        "string"

            ? data.customerEmail
                .trim()
                .toLowerCase()
                .slice(
                    0,
                    180
                )

            : (
                invoice.customerEmail ||
                null
            );


    const customerPhone =
        typeof data.customerPhone ===
        "string"

            ? data.customerPhone
                .trim()
                .slice(
                    0,
                    40
                )

            : (
                invoice.customerPhone ||
                null
            );


    /*
    --------------------------------------------------------
    LEGACY PAYMENT
    --------------------------------------------------------

    Mantemos este registo porque o fluxo actual de
    comprovativos ainda depende dele.

    --------------------------------------------------------
    */

    const legacyPayment =
        await Payment.create(
            {

                merchantId:
                    invoice.merchantId,

                invoiceId:
                    invoice._id,

                bankAccountId:
                    bankAccount._id,

                amount:
                    Number(
                        invoice.amount
                    ),

                currency:
                    invoice.currency ||
                    "AOA",

                status:
                    "pending_review",

                method:
                    "bank_transfer",

                payer: {

                    name:
                        customerName ||
                        "",

                    phone:
                        customerPhone ||
                        "",

                    reference:
                        invoice.invoiceNumber ||
                        invoice.publicId ||
                        ""

                },

                metadata: {

                    source:
                        "honey_pay_checkout",

                    checkoutVersion:
                        "2",

                    bankAccountId:
                        String(
                            bankAccount._id
                        )

                }

            }
        );


    /*
    --------------------------------------------------------
    CORE PAYMENT INTENT
    --------------------------------------------------------
    */

    let coreResult;


    try {

        coreResult =
            await createCorePaymentIntent(

                String(
                    invoice.merchantId
                ),

                {

                    amountMinor:
                        Number(
                            invoice.amount
                        ),

                    currency:
                        invoice.currency ||
                        "AOA",

                    description:
                        invoice.description ||
                        `Pagamento ${invoice.invoiceNumber || invoice.publicId}`,

                    externalReference:
                        invoice.invoiceNumber ||
                        invoice.publicId,

                    customer: {

                        name:
                            customerName,

                        email:
                            customerEmail,

                        phone:
                            customerPhone

                    },

                    paymentMethod:
                        "bank_transfer",

                    metadata: {

                        invoiceId:
                            String(
                                invoice._id
                            ),

                        invoicePublicId:
                            invoice.publicId ||
                            null,

                        legacyPaymentId:
                            String(
                                legacyPayment._id
                            ),

                        bankAccountId:
                            String(
                                bankAccount._id
                            )

                    }

                },

                {

                    idempotencyKey:
                        options.idempotencyKey ||
                        `checkout:${String(invoice._id)}`,

                    requestId:
                        options.requestId ||
                        null,

                    source:
                        "checkout"

                }

            );

    }

    catch (
        error
    ) {

        /*
        ----------------------------------------------------
        COMPENSATING ACTION
        ----------------------------------------------------
        */

        await Payment.deleteOne(
            {
                _id:
                    legacyPayment._id,

                status:
                    "pending_review"
            }
        );


        throw error;

    }


    /*
    --------------------------------------------------------
    FINAL RESPONSE
    --------------------------------------------------------
    */

    return {

        created:
            !coreResult.idempotentReplay,

        paymentIntent:
            coreResult.paymentIntent,

        payment:
            serializeLegacyPayment(
                legacyPayment
            ),

        bankAccountId:
            String(
                bankAccount._id
            ),

        idempotentReplay:
            Boolean(
                coreResult.idempotentReplay
            )

    };

}


/*
============================================================
GET CHECKOUT PAYMENT STATUS
============================================================
*/

export async function getCheckoutPaymentStatus(
    publicToken,
    paymentId
) {

    const query =
        buildInvoiceQuery(
            publicToken
        );


    if (
        !query
    ) {

        throw createError(
            "Link de pagamento inválido.",
            "INVALID_PUBLIC_TOKEN",
            400
        );

    }


    const invoice =
        await Invoice
            .findOne(
                query
            )
            .lean();


    if (
        !invoice
    ) {

        throw createError(
            "Fatura não encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );

    }


    /*
    --------------------------------------------------------
    CORE PAYMENT INTENT
    --------------------------------------------------------
    */

    const paymentIntent =
        await PaymentIntent
            .findOne(
                {
                    merchantId:
                        invoice.merchantId,

                    $or: [

                        {
                            publicId:
                                paymentId
                        },

                        {
                            "metadata.legacyPaymentId":
                                paymentId
                        }

                    ],

                    invoiceId:
                        invoice._id
                }
            )
            .lean();


    if (
        paymentIntent
    ) {

        const legacyPaymentId =
            paymentIntent
                ?.metadata
                ?.legacyPaymentId;


        let legacyPayment =
            null;


        if (
            legacyPaymentId &&
            isValidObjectId(
                legacyPaymentId
            )
        ) {

            legacyPayment =
                await Payment
                    .findOne(
                        {
                            _id:
                                legacyPaymentId,

                            merchantId:
                                invoice.merchantId,

                            invoiceId:
                                invoice._id
                        }
                    )
                    .lean();

        }


        return {

            invoiceId:
                String(
                    invoice._id
                ),

            paymentIntentId:
                paymentIntent.publicId,

            paymentId:
                legacyPayment
                    ? String(
                        legacyPayment._id
                    )
                    : null,

            status:
                paymentIntent.status,

            amount:
                Number(
                    invoice.amount
                ),

            amountMinor:
                paymentIntent.amountMinor,

            currency:
                paymentIntent.currency,

            transactionReference:
                legacyPayment
                    ?.transactionReference ||
                null,

            createdAt:
                paymentIntent.createdAt,

            paidAt:
                legacyPayment
                    ?.paidAt ||
                null

        };

    }


    /*
    --------------------------------------------------------
    LEGACY FALLBACK
    --------------------------------------------------------
    */

    if (
        !isValidObjectId(
            paymentId
        )
    ) {

        throw createError(
            "Pagamento não encontrado.",
            "PAYMENT_NOT_FOUND",
            404
        );

    }


    const legacyPayment =
        await Payment
            .findOne(
                {

                    _id:
                        new mongoose.Types.ObjectId(
                            paymentId
                        ),

                    merchantId:
                        invoice.merchantId,

                    invoiceId:
                        invoice._id

                }
            )
            .lean();


    if (
        !legacyPayment
    ) {

        throw createError(
            "Pagamento não encontrado.",
            "PAYMENT_NOT_FOUND",
            404
        );

    }


    return {

        invoiceId:
            String(
                invoice._id
            ),

        paymentIntentId:
            null,

        paymentId:
            String(
                legacyPayment._id
            ),

        status:
            legacyPayment.status,

        amount:
            legacyPayment.amount,

        amountMinor:
            legacyPayment.amount,

        currency:
            legacyPayment.currency,

        transactionReference:
            legacyPayment.transactionReference ||
            null,

        createdAt:
            legacyPayment.createdAt,

        paidAt:
            legacyPayment.paidAt ||
            null

    };

}
