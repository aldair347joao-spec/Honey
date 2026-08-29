/*
============================================================
HONEY PAY
PAYMENT SERVICE
V1.0.0
============================================================

PROCESSAMENTO DE PAGAMENTOS / COMPROVATIVOS

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Registar intenção de pagamento
- Receber metadados do comprovativo
- Gerar SHA-256 do ficheiro
- Impedir reutilização do mesmo comprovativo
- Associar comprovativo à fatura correta
- Validar valor declarado
- Validar conta bancária selecionada
- Controlar estados de pagamento
- Permitir confirmação manual pelo comerciante
- Permitir rejeição do pagamento
- Criar histórico de segurança
- Preparar integração WhatsApp
- Preparar Honey Shield

------------------------------------------------------------
IMPORTANTE
------------------------------------------------------------

A V1 NÃO afirma que o dinheiro entrou no banco apenas
porque existe um comprovativo.

O sistema distingue:

PENDING_REVIEW
    ↓
CONFIRMED
    ↓
REJECTED

A confirmação final é feita pelo comerciante.

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
CONSTANTES
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
VALIDATE FILE
============================================================
*/

function validateReceiptFile(
    file
) {

    if (
        !file
    ) {

        const error =
            new Error(
                "É necessário enviar um comprovativo."
            );


        error.code =
            "RECEIPT_REQUIRED";


        error.statusCode =
            400;


        throw error;
    }


    if (
        !Buffer.isBuffer(
            file.buffer
        )
    ) {

        const error =
            new Error(
                "Ficheiro inválido."
            );


        error.code =
            "INVALID_RECEIPT_FILE";


        error.statusCode =
            400;


        throw error;
    }


    if (
        file.size >
        MAX_RECEIPT_SIZE
    ) {

        const error =
            new Error(
                "O comprovativo não pode ultrapassar 10 MB."
            );


        error.code =
            "RECEIPT_TOO_LARGE";


        error.statusCode =
            413;


        throw error;
    }


    if (
        !ALLOWED_RECEIPT_TYPES.has(
            file.mimetype
        )
    ) {

        const error =
            new Error(
                "Formato de comprovativo não suportado."
            );


        error.code =
            "INVALID_RECEIPT_TYPE";


        error.statusCode =
            415;


        throw error;
    }
}


/*
============================================================
VERIFY INVOICE
============================================================
*/

async function getPendingInvoice(
    publicId
) {

    if (
        typeof publicId !==
        "string"
    ) {

        const error =
            new Error(
                "Identificador da fatura inválido."
            );


        error.code =
            "INVALID_INVOICE_ID";


        error.statusCode =
            400;


        throw error;
    }


    const invoice =
        await Invoice
            .findOne({

                publicId:
                    publicId
                        .trim()
                        .toUpperCase()
            });


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
        "expired"
    ) {

        const error =
            new Error(
                "Esta fatura expirou."
            );


        error.code =
            "INVOICE_EXPIRED";


        error.statusCode =
            409;


        throw error;
    }


    if (
        invoice.status ===
        "cancelled"
    ) {

        const error =
            new Error(
                "Esta fatura foi cancelada."
            );


        error.code =
            "INVOICE_CANCELLED";


        error.statusCode =
            409;


        throw error;
    }


    if (
        invoice.status ===
        "paid"
    ) {

        const error =
            new Error(
                "Esta fatura já foi paga."
            );


        error.code =
            "INVOICE_ALREADY_PAID";


        error.statusCode =
            409;


        throw error;
    }


    if (
        invoice.status ===
        "payment_submitted"
    ) {

        const error =
            new Error(
                "Já existe um pagamento em análise para esta fatura."
            );


        error.code =
            "PAYMENT_ALREADY_SUBMITTED";


        error.statusCode =
            409;


        throw error;
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


    const validation =
        validateObjectId(
            selectedId,
            "bankAccountId"
        );


    if (
        validation
    ) {

        const error =
            new Error(
                validation.message
            );


        error.code =
            "INVALID_BANK_ACCOUNT_ID";


        error.statusCode =
            400;


        throw error;
    }


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

        const error =
            new Error(
                "A conta bancária selecionada não está disponível."
            );


        error.code =
            "BANK_ACCOUNT_NOT_AVAILABLE";


        error.statusCode =
            400;


        throw error;
    }


    return account;
}


/*
============================================================
DUPLICATE RECEIPT CHECK
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
    input,
    file,
    requestContext = {}
) {

    /*
    --------------------------------------------------------
    Validar input básico.
    --------------------------------------------------------
    */

    const validationErrors =
        validatePaymentSubmission(
            input
        );


    if (
        validationErrors.length
    ) {

        const error =
            new Error(
                "Dados do pagamento inválidos."
            );


        error.code =
            "VALIDATION_ERROR";


        error.statusCode =
            400;


        error.details =
            validationErrors;


        throw error;
    }


    /*
    --------------------------------------------------------
    Validar ficheiro.
    --------------------------------------------------------
    */

    validateReceiptFile(
        file
    );


    /*
    --------------------------------------------------------
    Buscar fatura.
    --------------------------------------------------------
    */

    const invoice =
        await getPendingInvoice(
            publicId
        );


    /*
    --------------------------------------------------------
    Verificar validade temporal.
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


        const error =
            new Error(
                "Esta fatura expirou."
            );


        error.code =
            "INVOICE_EXPIRED";


        error.statusCode =
            409;


        throw error;
    }


    /*
    --------------------------------------------------------
    Conta bancária.
    --------------------------------------------------------
    */

    const bankAccount =
        await verifyBankAccount(

            invoice,

            input.bankAccountId
        );


    /*
    --------------------------------------------------------
    Valor declarado.

    O cliente deve enviar o mesmo valor da fatura.
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

        const error =
            new Error(
                "Valor de pagamento inválido."
            );


        error.code =
            "INVALID_PAYMENT_AMOUNT";


        error.statusCode =
            400;


        throw error;
    }


    if (
        declaredAmount !==
        Number(
            invoice.amount
        )
    ) {

        const error =
            new Error(
                "O valor enviado não corresponde ao valor da fatura."
            );


        error.code =
            "PAYMENT_AMOUNT_MISMATCH";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Calcular hash do comprovativo.
    --------------------------------------------------------
    */

    const sha256 =
        calculateSha256(
            file.buffer
        );


    /*
    --------------------------------------------------------
    Honey Shield:

    procurar o mesmo ficheiro no histórico do comerciante.
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
            new Error(
                "Este comprovativo já foi utilizado anteriormente."
            );


        error.code =
            "DUPLICATE_RECEIPT";


        error.statusCode =
            409;


        error.security =
            {

                duplicateDetected:
                    true
            };


        throw error;
    }


    /*
    --------------------------------------------------------
    Criar pagamento.
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

                payer:
                    {

                        name:
                            input.payerName ||
                            "",

                        phone:
                            input.payerPhone ||
                            "",

                        reference:
                            input.reference ||
                            ""
                    },

                receipt:
                    {

                        originalName:
                            file.originalname ||
                            "receipt",

                        mimeType:
                            file.mimetype,

                        size:
                            file.size,

                        sha256,

                        storagePath:
                            null,

                        uploadedAt:
                            new Date()
                    },

                verification:
                    {

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

    catch (error) {

        /*
        ----------------------------------------------------
        Índice unique do hash protege contra duas requests
        simultâneas com o mesmo comprovativo.
        ----------------------------------------------------
        */

        if (
            error?.code ===
            11000
        ) {

            const duplicateError =
                new Error(
                    "Este comprovativo já foi utilizado anteriormente."
                );


            duplicateError.code =
                "DUPLICATE_RECEIPT";


            duplicateError.statusCode =
                409;


            throw duplicateError;
        }


        throw error;
    }


    /*
    --------------------------------------------------------
    Atualizar fatura.

    O ficheiro real será armazenado pelo módulo de storage.
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
                new Date(),

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
                file.size,

            sha256,

            submittedAt:
                new Date()
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


    await invoice.save();


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


    return {

        payment:
            publicPayment(
                payment
            ),

        invoice:
            publicInvoice(
                invoice
            ),

        verification:
            {

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

    const merchantValidation =
        validateObjectId(
            merchantId,
            "merchantId"
        );


    if (
        merchantValidation
    ) {

        const error =
            new Error(
                merchantValidation.message
            );


        error.code =
            "INVALID_MERCHANT_ID";


        error.statusCode =
            400;


        throw error;
    }


    const paymentValidation =
        validateObjectId(
            paymentId,
            "paymentId"
        );


    if (
        paymentValidation
    ) {

        const error =
            new Error(
                paymentValidation.message
            );


        error.code =
            "INVALID_PAYMENT_ID";


        error.statusCode =
            400;


        throw error;
    }


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

        const error =
            new Error(
                "Pagamento não encontrado."
            );


        error.code =
            "PAYMENT_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    return {

        payment:
            publicPayment(
                payment
            ),

        verification:
            {

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
                    payment
                        .verification
                        ?.riskScore ||
                    0,

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

    const page =
        Math.max(
            1,
            Number(
                options.page ||
                1
            )
        );


    const limit =
        Math.min(
            100,
            Math.max(
                1,
                Number(
                    options.limit ||
                    20
                )
            )
        );


    const filter = {

        merchantId
    };


    if (
        options.status
    ) {

        filter.status =
            options.status;
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

Esta é a confirmação definitiva na V1.

============================================================
*/

export async function confirmPayment(
    merchantId,
    paymentId,
    options = {}
) {

    const payment =
        await Payment.findOne({

            _id:
                paymentId,

            merchantId
        });


    if (
        !payment
    ) {

        const error =
            new Error(
                "Pagamento não encontrado."
            );


        error.code =
            "PAYMENT_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
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

        const error =
            new Error(
                "Este pagamento não está disponível para confirmação."
            );


        error.code =
            "PAYMENT_CANNOT_BE_CONFIRMED";


        error.statusCode =
            409;


        throw error;
    }


    payment.status =
        "confirmed";


    payment.confirmedAt =
        new Date();


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
    Atualizar fatura.
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

        invoice.status =
            "paid";


        invoice.paidAt =
            new Date();


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

                confirmedAt:
                    payment.confirmedAt
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
    }


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
            invoice
                ? publicInvoice(
                    invoice
                )
                : null
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

    const payment =
        await Payment.findOne({

            _id:
                paymentId,

            merchantId
        });


    if (
        !payment
    ) {

        const error =
            new Error(
                "Pagamento não encontrado."
            );


        error.code =
            "PAYMENT_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    if (
        payment.status ===
        "confirmed"
    ) {

        const error =
            new Error(
                "Um pagamento confirmado não pode ser rejeitado."
            );


        error.code =
            "PAYMENT_ALREADY_CONFIRMED";


        error.statusCode =
            409;


        throw error;
    }


    if (
        payment.status !==
        "pending_review"
    ) {

        const error =
            new Error(
                "Este pagamento não está disponível para rejeição."
            );


        error.code =
            "PAYMENT_CANNOT_BE_REJECTED";


        error.statusCode =
            409;


        throw error;
    }


    const cleanReason =
        String(
            reason || ""
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


    const invoice =
        await Invoice.findOne({

            _id:
                payment.invoiceId,

            merchantId
        });


    if (
        invoice
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
