/*
============================================================
HONEY PAY
PUBLIC CHECKOUT SERVICE
V1.0.1
============================================================

RESPONSABILIDADES

- Resolver faturas através do publicToken/publicId
- Expor checkout público seguro
- Mostrar dados mínimos necessários ao cliente
- Mostrar conta bancária de pagamento
- Criar intenção de pagamento
- Impedir acesso a faturas de outros comerciantes
- Evitar pagamentos duplicados
- Manter o checkout independente da área privada
- Utilizar a conexão central MongoDB/Mongoose

============================================================
*/

import mongoose from "mongoose";


import {
    Invoice,
    Payment,
    BankAccount,
    Merchant
} from "./models.js";


/*
============================================================
ERROR
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
PUBLIC INVOICE QUERY
============================================================
*/

function buildPublicInvoiceQuery(
    token
) {

    const value =
        String(
            token ||
            ""
        )
        .trim();


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
SAFE MERCHANT
============================================================
*/

function sanitizeMerchant(
    merchant
) {

    if (
        !merchant
    ) {

        return null;
    }


    return {

        businessName:
            merchant.businessName ||
            merchant.name ||
            null
    };
}


/*
============================================================
SAFE BANK ACCOUNT
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

        isPrimary:
            Boolean(
                account.isPrimary
            )
    };
}


/*
============================================================
SAFE INVOICE
============================================================
*/

function sanitizeInvoice(
    invoice,
    merchant,
    bankAccount
) {

    return {

        id:
            String(
                invoice._id
            ),

        invoiceNumber:
            invoice.invoiceNumber,

        publicId:
            invoice.publicId,

        publicToken:
            invoice.publicToken ||
            null,

        customerName:
            invoice.customerName ||
            null,

        description:
            invoice.description ||
            null,

        amount:
            Number(
                invoice.amount
            ),

        currency:
            invoice.currency ||
            "AOA",

        status:
            invoice.status,

        expiresAt:
            invoice.expiresAt ||
            null,

        merchant:
            sanitizeMerchant(
                merchant
            ),

        bankAccount:
            sanitizeBankAccount(
                bankAccount
            )
    };
}


/*
============================================================
RESOLVE INVOICE
============================================================
*/

export async function getPublicCheckout(
    publicToken
) {

    const query =
        buildPublicInvoiceQuery(
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
    Verificar expiração
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


        invoice.status =
            "expired";
    }


    /*
    --------------------------------------------------------
    Fatura cancelada
    --------------------------------------------------------
    */

    if (
        invoice.status ===
        "cancelled"
    ) {

        throw createError(

            "Esta fatura foi cancelada.",

            "INVOICE_CANCELLED",

            410
        );
    }


    /*
    --------------------------------------------------------
    Comerciante
    --------------------------------------------------------
    */

    const merchant =
        await Merchant
            .findById(
                invoice.merchantId
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


    /*
    --------------------------------------------------------
    Conta bancária

    Primeiro procura a conta associada à fatura.

    Caso não exista, utiliza a principal ativa.
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
                )
                .lean();
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
                )
                .lean();
    }


    if (
        !bankAccount
    ) {

        throw createError(

            "O comerciante ainda não possui uma conta bancária de recebimento ativa.",

            "BANK_ACCOUNT_UNAVAILABLE",

            409
        );
    }


    /*
    --------------------------------------------------------
    Pagamento existente
    --------------------------------------------------------
    */

    const existingPayment =
        await Payment
            .findOne(
                {

                    invoiceId:
                        invoice._id,

                    status:
                        {
                            $in: [
                                "pending",
                                "confirmed"
                            ]
                        }
                }
            )
            .sort(
                {
                    createdAt:
                        -1
                }
            )
            .lean();


    return {

        available:
            invoice.status ===
            "pending",

        invoice:
            sanitizeInvoice(
                invoice,
                merchant,
                bankAccount
            ),

        payment:
            existingPayment
                ? {

                    id:
                        String(
                            existingPayment._id
                        ),

                    status:
                        existingPayment.status,

                    amount:
                        existingPayment.amount,

                    currency:
                        existingPayment.currency,

                    transactionReference:
                        existingPayment.transactionReference ||
                        null,

                    createdAt:
                        existingPayment.createdAt,

                    paidAt:
                        existingPayment.paidAt ||
                        null
                }
                : null
    };
}


/*
============================================================
CREATE PAYMENT INTENT
============================================================

Cria uma intenção de pagamento.

Não marca a fatura como paga.

A confirmação só deve acontecer depois de validação do
pagamento/comprovativo.

============================================================
*/

export async function createPaymentIntent(
    publicToken,
    data = {}
) {

    const query =
        buildPublicInvoiceQuery(
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
    Verificar estado
    --------------------------------------------------------
    */

    if (
        invoice.status ===
        "paid"
    ) {

        throw createError(

            "Esta fatura já foi paga.",

            "INVOICE_ALREADY_PAID",

            409
        );
    }


    if (
        invoice.status ===
        "cancelled"
    ) {

        throw createError(

            "Esta fatura foi cancelada.",

            "INVOICE_CANCELLED",

            410
        );
    }


    if (
        invoice.status ===
        "expired"
    ) {

        throw createError(

            "Esta fatura expirou.",

            "INVOICE_EXPIRED",

            410
        );
    }


    if (
        invoice.expiresAt &&
        new Date(
            invoice.expiresAt
        ).getTime() <=
        Date.now()
    ) {

        invoice.status =
            "expired";


        await invoice.save();


        throw createError(

            "Esta fatura expirou.",

            "INVOICE_EXPIRED",

            410
        );
    }


    /*
    --------------------------------------------------------
    Conta bancária ativa
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
    Evitar múltiplas intenções abertas
    --------------------------------------------------------
    */

    const existingPayment =
        await Payment
            .findOne(
                {

                    invoiceId:
                        invoice._id,

                    status:
                        "pending"
                }
            )
            .sort(
                {
                    createdAt:
                        -1
                }
            );


    if (
        existingPayment
    ) {

        return {

            created:
                false,

            payment: {

                id:
                    String(
                        existingPayment._id
                    ),

                status:
                    existingPayment.status,

                amount:
                    existingPayment.amount,

                currency:
                    existingPayment.currency,

                createdAt:
                    existingPayment.createdAt
            }
        };
    }


    /*
    --------------------------------------------------------
    Dados do cliente
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
            : invoice.customerName ||
              null;


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
            : invoice.customerEmail ||
              null;


    /*
    --------------------------------------------------------
    Criar pagamento
    --------------------------------------------------------
    */

    const payment =
        await Payment.create(

            {

                merchantId:
                    invoice.merchantId,

                invoiceId:
                    invoice._id,

                amount:
                    invoice.amount,

                currency:
                    invoice.currency ||
                    "AOA",

                status:
                    "pending",

                method:
                    "manual_bank_transfer",

                metadata: {

                    customerName,

                    customerEmail,

                    bankAccountId:
                        String(
                            bankAccount._id
                        )
                }
            }
        );


    return {

        created:
            true,

        payment: {

            id:
                String(
                    payment._id
                ),

            status:
                payment.status,

            amount:
                payment.amount,

            currency:
                payment.currency,

            bankAccount:
                sanitizeBankAccount(
                    bankAccount
                ),

            createdAt:
                payment.createdAt
        }
    };
}


/*
============================================================
GET PAYMENT STATUS
============================================================
*/

export async function getPublicPaymentStatus(
    publicToken,
    paymentId
) {

    const query =
        buildPublicInvoiceQuery(
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


    if (
        !isValidObjectId(
            paymentId
        )
    ) {

        throw createError(

            "Pagamento inválido.",

            "INVALID_PAYMENT_ID",

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


    const payment =
        await Payment
            .findOne(
                {

                    _id:
                        new mongoose.Types.ObjectId(
                            paymentId
                        ),

                    invoiceId:
                        invoice._id
                }
            )
            .lean();


    if (
        !payment
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

        paymentId:
            String(
                payment._id
            ),

        status:
            payment.status,

        amount:
            payment.amount,

        currency:
            payment.currency,

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
MARK PAYMENT CONFIRMED
============================================================

Uso interno.

Não deve ser exposto diretamente como endpoint público.

============================================================
*/

export async function confirmPayment(
    paymentId,
    transactionReference = null
) {

    if (
        !isValidObjectId(
            paymentId
        )
    ) {

        throw createError(

            "Pagamento inválido.",

            "INVALID_PAYMENT_ID",

            400
        );
    }


    const payment =
        await Payment.findById(
            paymentId
        );


    if (
        !payment
    ) {

        throw createError(

            "Pagamento não encontrado.",

            "PAYMENT_NOT_FOUND",

            404
        );
    }


    if (
        payment.status ===
        "confirmed"
    ) {

        return payment;
    }


    if (
        payment.status !==
        "pending"
    ) {

        throw createError(

            "Este pagamento não pode ser confirmado.",

            "PAYMENT_NOT_CONFIRMABLE",

            409
        );
    }


    const invoice =
        await Invoice.findById(
            payment.invoiceId
        );


    if (
        !invoice
    ) {

        throw createError(

            "Fatura associada não encontrada.",

            "INVOICE_NOT_FOUND",

            404
        );
    }


    if (
        invoice.status ===
        "paid"
    ) {

        payment.status =
            "confirmed";


        payment.paidAt =
            invoice.paidAt ||
            new Date();


        await payment.save();


        return payment;
    }


    payment.status =
        "confirmed";


    payment.transactionReference =
        transactionReference
            ? String(
                transactionReference
            )
            .trim()
            .slice(
                0,
                180
            )
            : null;


    payment.paidAt =
        new Date();


    await payment.save();


    invoice.status =
        "paid";


    invoice.paidAt =
        payment.paidAt;


    await invoice.save();


    return payment;
}


/*
============================================================
EXPORTS
============================================================
*/

export default {

    getPublicCheckout,

    createPaymentIntent,

    getPublicPaymentStatus,

    confirmPayment

};
