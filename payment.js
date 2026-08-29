/*
============================================================
HONEY PAY
PAYMENT SERVICE
V1.1.0
============================================================

PROCESSAMENTO DE PAGAMENTOS / COMPROVATIVOS

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Registar pagamentos
- Validar faturas
- Validar contas bancárias
- Validar valores
- Receber comprovativos
- Gerar SHA-256
- Impedir reutilização de comprovativos
- Associar pagamento à fatura
- Controlar revisão do pagamento
- Confirmar pagamento manualmente
- Rejeitar pagamento
- Atualizar estado da fatura
- Registar eventos de segurança

------------------------------------------------------------
FLUXO
------------------------------------------------------------

pending
   ↓
payment_submitted
   ↓
pending_review
   ├──────────────→ confirmed
   │
   └──────────────→ rejected

============================================================
*/

import crypto from "node:crypto";


import {
    Invoice,
    Payment,
    BankAccount
} from "./models.js";


import {
    validateObjectId,
    validatePaymentSubmission
} from "./validators.js";


import {
    publicInvoice,
    publicPayment
} from "./utils.js";


import {
    logSecurityEvent
} from "./logger.js";


/*
============================================================
CONSTANTS
============================================================
*/

const MAX_RECEIPT_SIZE =
    10 * 1024 * 1024;


const ALLOWED_RECEIPT_TYPES =
    new Set([

        "image/jpeg",

        "image/png",

        "image/webp",

        "application/pdf"

    ]);


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
SHA-256
============================================================
*/

export function calculateSha256(
    buffer
) {

    if (
        !Buffer.isBuffer(
            buffer
        )
    ) {

        throw new TypeError(
            "O ficheiro deve ser um Buffer."
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
VALIDATE RECEIPT FILE
============================================================
*/

function validateReceiptFile(
    file
) {

    if (
        !file
    ) {

        throw createError(

            "É necessário enviar um comprovativo.",

            "RECEIPT_REQUIRED",

            400
        );
    }


    if (
        !Buffer.isBuffer(
            file.buffer
        )
    ) {

        throw createError(

            "Ficheiro inválido.",

            "INVALID_RECEIPT_FILE",

            400
        );
    }


    const actualSize =
        Number(
            file.size ??
            file.buffer.length
        );


    if (
        !Number.isFinite(
            actualSize
        ) ||
        actualSize <=
        0
    ) {

        throw createError(

            "O comprovativo está vazio.",

            "INVALID_RECEIPT_SIZE",

            400
        );
    }


    if (
        actualSize >
        MAX_RECEIPT_SIZE
    ) {

        throw createError(

            "O comprovativo não pode ultrapassar 10 MB.",

            "RECEIPT_TOO_LARGE",

            413
        );
    }


    if (
        !ALLOWED_RECEIPT_TYPES.has(
            file.mimetype
        )
    ) {

        throw createError(

            "Formato de comprovativo não suportado.",

            "INVALID_RECEIPT_TYPE",

            415
        );
    }


    return actualSize;
}


/*
============================================================
VALIDATE OBJECT ID
============================================================
*/

function assertObjectId(
    value,
    field,
    code
) {

    const validation =
        validateObjectId(
            value,
            field
        );


    if (
        validation
    ) {

        throw createError(

            validation.message,

            code,

            400
        );
    }
}


/*
============================================================
GET PENDING INVOICE
============================================================
*/

async function getPendingInvoice(
    publicId
) {

    if (
        typeof publicId !==
        "string" ||
        !publicId.trim()
    ) {

        throw createError(

            "Identificador da fatura inválido.",

            "INVALID_INVOICE_ID",

            400
        );
    }


    const invoice =
        await Invoice.findOne({

            publicId:
                publicId
                    .trim()
                    .toUpperCase()

        });


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
    EXPIRATION
    --------------------------------------------------------
    */

    if (
        invoice.expiresAt &&
        new Date(
            invoice.expiresAt
        ).getTime() <=
        Date.now()
    ) {

        invoice.status =
            "expired";


        invoice.expiredAt =
            new Date();


        await invoice.save();


        throw createError(

            "Esta fatura expirou.",

            "INVOICE_EXPIRED",

            409
        );
    }


    /*
    --------------------------------------------------------
    STATUS
    --------------------------------------------------------
    */

    if (
        invoice.status ===
        "expired"
    ) {

        throw createError(

            "Esta fatura expirou.",

            "INVOICE_EXPIRED",

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

            409
        );
    }


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
        "payment_submitted"
    ) {

        throw createError(

            "Já existe um pagamento em análise para esta fatura.",

            "PAYMENT_ALREADY_SUBMITTED",

            409
        );
    }


    return invoice;
}


/*
============================================================
VERIFY BANK ACCOUNT
============================================================
*/

async function verifyBankAccount(
    invoice,
    bankAccountId
) {

    const selectedId =
        bankAccountId ||
        invoice.bankAccountId;


    assertObjectId(

        selectedId,

        "bankAccountId",

        "INVALID_BANK_ACCOUNT_ID"
    );


    const account =
        await BankAccount
            .findOne({

                _id:
                    selectedId,

                merchantId:
                    invoice.merchantId,

                isActive:
                    true

            })
            .lean();


    if (
        !account
    ) {

        throw createError(

            "A conta bancária selecionada não está disponível.",

            "BANK_ACCOUNT_NOT_AVAILABLE",

            400
        );
    }


    return account;
}


/*
============================================================
DUPLICATE RECEIPT
============================================================
*/

async function findDuplicateReceipt(
    sha256,
    merchantId
) {

    return Payment
        .findOne({

            merchantId,

            "receipt.sha256":
                sha256

        })
        .select(
            "_id invoiceId status createdAt"
        )
        .lean();
}


/*
============================================================
SUBMIT PAYMENT
============================================================
*/

export async function submitPayment(

    publicId,

    input = {},

    file,

    requestContext = {}

) {

    /*
    --------------------------------------------------------
    INPUT
    --------------------------------------------------------
    */

    const validationErrors =
        validatePaymentSubmission(
            input
        );


    if (
        validationErrors.length
    ) {

        throw createError(

            "Dados do pagamento inválidos.",

            "VALIDATION_ERROR",

            400,

            validationErrors
        );
    }


    /*
    --------------------------------------------------------
    FILE
    --------------------------------------------------------
    */

    const fileSize =
        validateReceiptFile(
            file
        );


    /*
    --------------------------------------------------------
    INVOICE
    --------------------------------------------------------
    */

    const invoice =
        await getPendingInvoice(
            publicId
        );


    /*
    --------------------------------------------------------
    BANK ACCOUNT
    --------------------------------------------------------
    */

    const bankAccount =
        await verifyBankAccount(

            invoice,

            input.bankAccountId
        );


    /*
    --------------------------------------------------------
    AMOUNT
    --------------------------------------------------------
    */

    const declaredAmount =
        Number(
            input.amount
        );


    if (
        !Number.isFinite(
            declaredAmount
        ) ||
        declaredAmount <=
        0
    ) {

        throw createError(

            "Valor de pagamento inválido.",

            "INVALID_PAYMENT_AMOUNT",

            400
        );
    }


    const invoiceAmount =
        Number(
            invoice.amount
        );


    if (
        !Number.isFinite(
            invoiceAmount
        ) ||
        invoiceAmount <=
        0
    ) {

        throw createError(

            "A fatura possui um valor inválido.",

            "INVALID_INVOICE_AMOUNT",

            500
        );
    }


    if (
        Math.round(
            declaredAmount *
            100
        ) !==
        Math.round(
            invoiceAmount *
            100
        )
    ) {

        throw createError(

            "O valor enviado não corresponde ao valor da fatura.",

            "PAYMENT_AMOUNT_MISMATCH",

            400
        );
    }


    /*
    --------------------------------------------------------
    SHA-256
    --------------------------------------------------------
    */

    const sha256 =
        calculateSha256(
            file.buffer
        );


    /*
    --------------------------------------------------------
    DUPLICATE RECEIPT
    --------------------------------------------------------
    */

    const duplicate =
        await findDuplicateReceipt(

            sha256,

            invoice.merchantId
        );


    if (
        duplicate
    ) {

        logSecurityEvent(

            "duplicate_receipt_detected",

            {

                merchantId:
                    invoice.merchantId.toString(),

                invoiceId:
                    invoice._id.toString(),

                previousPaymentId:
                    duplicate._id.toString(),

                ip:
                    requestContext.ip ||
                    null

            }
        );


        const error =
            createError(

                "Este comprovativo já foi utilizado anteriormente.",

                "DUPLICATE_RECEIPT",

                409
            );


        error.security = {

            duplicateDetected:
                true

        };


        throw error;
    }


    /*
    --------------------------------------------------------
    CREATE PAYMENT
    --------------------------------------------------------
    */

    let payment;


    try {

        payment =
            await Payment.create({

                merchantId:
                    invoice.merchantId,

                invoiceId:
                    invoice._id,

                bankAccountId:
                    bankAccount._id,

                amount:
                    invoice.amount,

                currency:
                    invoice.currency ||
                    "AOA",

                status:
                    "pending_review",

                method:
                    "bank_transfer",

                payer: {

                    name:
                        String(
                            input.payerName ||
                            ""
                        )
                            .trim()
                            .slice(
                                0,
                                180
                            ),

                    phone:
                        String(
                            input.payerPhone ||
                            ""
                        )
                            .trim()
                            .slice(
                                0,
                                40
                            ),

                    reference:
                        String(
                            input.reference ||
                            ""
                        )
                            .trim()
                            .slice(
                                0,
                                180
                            )

                },

                receipt: {

                    originalName:
                        String(
                            file.originalname ||
                            "receipt"
                        )
                            .trim()
                            .slice(
                                0,
                                255
                            ),

                    mimeType:
                        file.mimetype,

                    size:
                        fileSize,

                    sha256,

                    storagePath:
                        null,

                    uploadedAt:
                        new Date()

                },

                verification: {

                    status:
                        "pending",

                    duplicateDetected:
                        false,

                    riskScore:
                        0,

                    notes:
                        []

                },

                submittedAt:
                    new Date(),

                ip:
                    requestContext.ip ||
                    null,

                userAgent:
                    requestContext.userAgent ||
                    null

            });

    }

    catch (
        error
    ) {

        /*
        ----------------------------------------------------
        DUPLICATE UNIQUE INDEX
        ----------------------------------------------------
        */

        if (
            error?.code ===
            11000
        ) {

            throw createError(

                "Este comprovativo já foi utilizado anteriormente.",

                "DUPLICATE_RECEIPT",

                409
            );
        }


        throw error;
    }


    /*
    --------------------------------------------------------
    UPDATE INVOICE
    --------------------------------------------------------
    */

    invoice.status =
        "payment_submitted";


    invoice.bankAccountId =
        bankAccount._id;


    invoice.payment =
        {

            paymentId:
                payment._id,

            method:
                "bank_transfer",

            bankAccountId:
                bankAccount._id,

            submittedAt:
                payment.submittedAt,

            confirmedAt:
                null

        };


    invoice.receipt =
        {

            status:
                "submitted",

            fileId:
                null,

            originalName:
                file.originalname ||
                "receipt",

            mimeType:
                file.mimetype,

            size:
                fileSize,

            sha256,

            submittedAt:
                payment.submittedAt

        };


    invoice.fraudProtection =
        {

            verificationStatus:
                "pending",

            duplicateDetected:
                false,

            riskScore:
                0,

            verificationAttempts:
                (
                    invoice
                        .fraudProtection
                        ?.verificationAttempts ||
                    0
                ) + 1

        };


    try {

        await invoice.save();

    }

    catch (
        error
    ) {

        /*
        ----------------------------------------------------
        COMPENSAÇÃO

        Se a criação da Payment foi bem sucedida mas a Invoice
        falhou, removemos o Payment recém-criado para evitar
        pagamento órfão.

        ----------------------------------------------------
        */

        try {

            await Payment.deleteOne({

                _id:
                    payment._id,

                merchantId:
                    invoice.merchantId

            });

        }

        catch (
            cleanupError
        ) {

            console.error(

                "[PAYMENT CLEANUP ERROR]",

                cleanupError
            );
        }


        throw error;
    }


    /*
    --------------------------------------------------------
    SECURITY LOG
    --------------------------------------------------------
    */

    logSecurityEvent(

        "payment_submitted",

        {

            merchantId:
                invoice.merchantId.toString(),

            invoiceId:
                invoice._id.toString(),

            paymentId:
                payment._id.toString(),

            ip:
                requestContext.ip ||
                null

        }
    );


    /*
    --------------------------------------------------------
    RESPONSE
    --------------------------------------------------------
    */

    return {

        payment:
            publicPayment(
                payment
            ),

        invoice:
            publicInvoice(
                invoice
            ),

        verification: {

            status:
                "pending_review",

            duplicateDetected:
                false,

            message:
                "Comprovativo recebido e enviado para análise."

        }

    };
}


/*
============================================================
GET PAYMENT
============================================================
*/

export async function getPayment(

    merchantId,

    paymentId

) {

    assertObjectId(

        merchantId,

        "merchantId",

        "INVALID_MERCHANT_ID"
    );


    assertObjectId(

        paymentId,

        "paymentId",

        "INVALID_PAYMENT_ID"
    );


    const payment =
        await Payment
            .findOne({

                _id:
                    paymentId,

                merchantId

            })
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

        payment:
            publicPayment(
                payment
            ),

        verification: {

            status:
                payment
                    .verification
                    ?.status ||
                "pending",

            duplicateDetected:
                Boolean(
                    payment
                        .verification
                        ?.duplicateDetected
                ),

            riskScore:
                Number(
                    payment
                        .verification
                        ?.riskScore ||
                    0
                ),

            notes:
                payment
                    .verification
                    ?.notes ||
                []

        }

    };
}


/*
============================================================
LIST PAYMENTS
============================================================
*/

export async function listPayments(

    merchantId,

    options = {}

) {

    assertObjectId(

        merchantId,

        "merchantId",

        "INVALID_MERCHANT_ID"
    );


    const page =
        Math.max(

            1,

            Math.floor(
                Number(
                    options.page ||
                    1
                )
            )

        );


    const limit =
        Math.min(

            100,

            Math.max(

                1,

                Math.floor(
                    Number(
                        options.limit ||
                        20
                    )
                )

            )

        );


    const filter = {

        merchantId

    };


    if (
        options.status
    ) {

        const status =
            String(
                options.status
            )
                .trim()
                .toLowerCase();


        if (
            ![
                "pending_review",
                "confirmed",
                "rejected"
            ].includes(
                status
            )
        ) {

            throw createError(

                "Estado de pagamento inválido.",

                "INVALID_PAYMENT_STATUS",

                400
            );
        }


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

        payments,

        total

    ] =
        await Promise.all([

            Payment
                .find(
                    filter
                )
                .sort({

                    createdAt:
                        -1

                })
                .skip(
                    skip
                )
                .limit(
                    limit
                )
                .lean(),

            Payment.countDocuments(
                filter
            )

        ]);


    return {

        items:
            payments.map(
                payment =>
                    publicPayment(
                        payment
                    )
            ),

        pagination: {

            page,

            limit,

            total,

            totalPages:
                Math.max(

                    1,

                    Math.ceil(

                        total /
                        limit

                    )

                )

        }

    };
}


/*
============================================================
CONFIRM PAYMENT
============================================================

AÇÃO MANUAL DO COMERCIANTE

Apenas pending_review pode ser confirmado.

============================================================
*/

export async function confirmPayment(

    merchantId,

    paymentId,

    options = {}

) {

    assertObjectId(

        merchantId,

        "merchantId",

        "INVALID_MERCHANT_ID"
    );


    assertObjectId(

        paymentId,

        "paymentId",

        "INVALID_PAYMENT_ID"
    );


    const payment =
        await Payment.findOne({

            _id:
                paymentId,

            merchantId

        });


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

        return {

            payment:
                publicPayment(
                    payment
                ),

            alreadyConfirmed:
                true

        };
    }


    if (
        payment.status !==
        "pending_review"
    ) {

        throw createError(

            "Este pagamento não está disponível para confirmação.",

            "PAYMENT_CANNOT_BE_CONFIRMED",

            409
        );
    }


    /*
    --------------------------------------------------------
    INVOICE
    --------------------------------------------------------
    */

    const invoice =
        await Invoice.findOne({

            _id:
                payment.invoiceId,

            merchantId

        });


    if (
        !invoice
    ) {

        throw createError(

            "A fatura associada ao pagamento não foi encontrada.",

            "INVOICE_NOT_FOUND",

            404
        );
    }


    if (
        invoice.status ===
        "paid"
    ) {

        throw createError(

            "A fatura já está marcada como paga.",

            "INVOICE_ALREADY_PAID",

            409
        );
    }


    if (
        invoice.status ===
        "cancelled" ||
        invoice.status ===
        "expired"
    ) {

        throw createError(

            "A fatura não pode ser confirmada.",

            "INVOICE_NOT_PAYABLE",

            409
        );
    }


    /*
    --------------------------------------------------------
    CONFIRM PAYMENT
    --------------------------------------------------------
    */

    const confirmedAt =
        new Date();


    payment.status =
        "confirmed";


    payment.confirmedAt =
        confirmedAt;


    payment.confirmedBy =
        options.confirmedBy ||
        merchantId;


    payment.verification =
        {

            status:
                "confirmed",

            duplicateDetected:
                false,

            riskScore:
                payment
                    .verification
                    ?.riskScore ||
                0,

            notes:
                payment
                    .verification
                    ?.notes ||
                []

        };


    await payment.save();


    /*
    --------------------------------------------------------
    UPDATE INVOICE
    --------------------------------------------------------
    */

    invoice.status =
        "paid";


    invoice.paidAt =
        confirmedAt;


    invoice.payment =
        {

            paymentId:
                payment._id,

            method:
                "bank_transfer",

            bankAccountId:
                payment.bankAccountId,

            submittedAt:
                payment.submittedAt,

            confirmedAt

        };


    invoice.receipt =
        {

            ...(
                invoice.receipt ||
                {}
            ),

            status:
                "verified"

        };


    invoice.fraudProtection =
        {

            ...(
                invoice.fraudProtection ||
                {}
            ),

            verificationStatus:
                "verified"

        };


    await invoice.save();


    /*
    --------------------------------------------------------
    SECURITY EVENT
    --------------------------------------------------------
    */

    logSecurityEvent(

        "payment_confirmed",

        {

            merchantId:
                merchantId.toString(),

            paymentId:
                payment._id.toString(),

            invoiceId:
                payment.invoiceId.toString()

        }
    );


    return {

        payment:
            publicPayment(
                payment
            ),

        invoice:
            publicInvoice(
                invoice
            )

    };
}


/*
============================================================
REJECT PAYMENT
============================================================
*/

export async function rejectPayment(

    merchantId,

    paymentId,

    reason = ""

) {

    assertObjectId(

        merchantId,

        "merchantId",

        "INVALID_MERCHANT_ID"
    );


    assertObjectId(

        paymentId,

        "paymentId",

        "INVALID_PAYMENT_ID"
    );


    const payment =
        await Payment.findOne({

            _id:
                paymentId,

            merchantId

        });


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

        throw createError(

            "Um pagamento confirmado não pode ser rejeitado.",

            "PAYMENT_ALREADY_CONFIRMED",

            409
        );
    }


    if (
        payment.status !==
        "pending_review"
    ) {

        throw createError(

            "Este pagamento não está disponível para rejeição.",

            "PAYMENT_CANNOT_BE_REJECTED",

            409
        );
    }


    const cleanReason =
        String(
            reason ||
            ""
        )
            .trim()
            .slice(
                0,
                1000
            );


    payment.status =
        "rejected";


    payment.rejectedAt =
        new Date();


    payment.rejectionReason =
        cleanReason ||
        "Pagamento rejeitado pelo comerciante.";


    payment.verification =
        {

            ...(
                payment.verification ||
                {}
            ),

            status:
                "rejected"

        };


    await payment.save();


    /*
    --------------------------------------------------------
    INVOICE
    --------------------------------------------------------
    */

    const invoice =
        await Invoice.findOne({

            _id:
                payment.invoiceId,

            merchantId

        });


    if (
        invoice
    ) {

        /*
        ----------------------------------------------------
        Só libertamos a fatura se ela estiver associada a
        este pagamento.
        ----------------------------------------------------
        */

        const currentPaymentId =
            invoice
                .payment
                ?.paymentId
                ?.toString();


        if (
            currentPaymentId ===
            payment._id.toString()
        ) {

            invoice.status =
                "pending";


            invoice.payment =
                {

                    paymentId:
                        null,

                    method:
                        "bank_transfer",

                    bankAccountId:
                        invoice.bankAccountId,

                    submittedAt:
                        null,

                    confirmedAt:
                        null

                };


            invoice.receipt =
                {

                    ...(
                        invoice.receipt ||
                        {}
                    ),

                    status:
                        "rejected"

                };


            invoice.fraudProtection =
                {

                    ...(
                        invoice.fraudProtection ||
                        {}
                    ),

                    verificationStatus:
                        "rejected"

                };


            await invoice.save();
        }
    }


    /*
    --------------------------------------------------------
    SECURITY EVENT
    --------------------------------------------------------
    */

    logSecurityEvent(

        "payment_rejected",

        {

            merchantId:
                merchantId.toString(),

            paymentId:
                payment._id.toString(),

            invoiceId:
                payment.invoiceId.toString()

        }
    );


    return {

        payment:
            publicPayment(
                payment
            ),

        invoice:
            invoice
                ? publicInvoice(
                    invoice
                )
                : null

    };
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    calculateSha256,

    submitPayment,

    getPayment,

    listPayments,

    confirmPayment,

    rejectPayment

};
