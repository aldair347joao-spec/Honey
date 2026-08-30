/*
============================================================
HONEY PAY
PAYMENT PROOF ROUTES
V2.0.0
PRODUCTION FINANCIAL FLOW
============================================================

RESPONSABILIDADES
------------------------------------------------------------
PUBLIC
    POST /api/pay/:publicToken/proof

AUTHENTICATED
    GET   /api/proofs
    GET   /api/proofs/:proofId
    PATCH /api/proofs/:proofId/review

FLUXO FINANCEIRO
------------------------------------------------------------

CHECKOUT
    ↓
PaymentIntent
    ↓
Legacy Payment
    ↓
Proof
    ↓
Receipt
    ↓
PaymentIntent = processing
    ↓
Merchant Review
    ├── approved
    │      ↓
    │   Payment = confirmed
    │      ↓
    │   PaymentIntent = succeeded
    │      ↓
    │   Invoice = paid
    │
    └── rejected
           ↓
        Payment = rejected
           ↓
        PaymentIntent = failed
           ↓
        Invoice = pending

SEGURANÇA
------------------------------------------------------------
- publicToken identifica a Invoice
- merchantId nunca vem do cliente
- invoiceId nunca vem do cliente
- amount nunca vem do cliente
- status nunca vem do cliente
- paymentId é validado contra Invoice + Merchant
- proofId é resolvido através do Receipt
- comerciante só acede aos seus próprios dados
- confirmação exige JWT
- rejeição exige motivo
- Base64 é validado antes de criar Buffer
- tamanho real do ficheiro é validado
- MIME é validado
- SHA-256 é calculado pelo serviço
- erros internos não são expostos

============================================================
*/

import express from "express";
import mongoose from "mongoose";

import {
    Invoice,
    Payment,
    Receipt
} from "./models.js";

import {
    PaymentIntent
} from "./payment-core-models.js";

import {
    authenticateRequest
} from "./middleware.js";

import {
    successResponse,
    errorResponse,
    normalizeError
} from "./utils.js";

import {
    submitPaymentProof,
    listMerchantProofs,
    getMerchantProof,
    reviewPaymentProof
} from "./proof.js";


/*
============================================================
ROUTER
============================================================
*/

const router =
    express.Router();


/*
============================================================
CONSTANTS
============================================================
*/

const MAX_PROOF_SIZE =
    10 * 1024 * 1024;

const MAX_BASE64_LENGTH =
    Math.ceil(
        MAX_PROOF_SIZE * 1.38
    ) + 4096;

const ALLOWED_MIME_TYPES =
    new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ]);


/*
============================================================
SECURITY HEADERS
============================================================
*/

function applySecurityHeaders(res) {

    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
    );

    res.setHeader(
        "Pragma",
        "no-cache"
    );

    res.setHeader(
        "Expires",
        "0"
    );

    res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
    );

    res.setHeader(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
    );

}


/*
============================================================
ERROR FACTORY
============================================================
*/

function createRouteError(
    message,
    code,
    statusCode = 400,
    details = null
) {

    const error =
        new Error(message);

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
ERROR RESPONSE
============================================================
*/

function sendRouteError(
    res,
    error
) {

    const normalized =
        normalizeError(
            error
        );

    return errorResponse(
        res,
        normalized.statusCode,
        normalized.code,
        normalized.message,
        null
    );

}


/*
============================================================
BODY
============================================================
*/

function getBody(req) {

    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body)
    ) {

        return {};

    }

    return req.body;

}


/*
============================================================
OBJECT ID
============================================================
*/

function isValidObjectId(value) {

    return Boolean(
        value &&
        mongoose.Types.ObjectId.isValid(
            value
        )
    );

}


/*
============================================================
NORMALIZE OBJECT ID
============================================================
*/

function normalizeObjectId(
    value,
    field,
    code
) {

    if (
        typeof value !== "string"
    ) {

        throw createRouteError(
            `${field} inválido.`,
            code,
            400
        );

    }

    const normalized =
        value.trim();

    if (
        !isValidObjectId(
            normalized
        )
    ) {

        throw createRouteError(
            `${field} inválido.`,
            code,
            400
        );

    }

    return normalized;

}


/*
============================================================
PUBLIC TOKEN
============================================================
*/

function normalizePublicToken(
    value
) {

    if (
        typeof value !== "string"
    ) {

        throw createRouteError(
            "Link de pagamento inválido.",
            "INVALID_CHECKOUT_TOKEN",
            400
        );

    }

    const token =
        value.trim();

    if (
        !token ||
        token.length > 200
    ) {

        throw createRouteError(
            "Link de pagamento inválido.",
            "INVALID_CHECKOUT_TOKEN",
            400
        );

    }

    /*
    --------------------------------------------------------
    Aceitamos apenas tokens URL-safe.
    --------------------------------------------------------
    */

    if (
        !/^[A-Za-z0-9_-]+$/.test(
            token
        )
    ) {

        throw createRouteError(
            "Link de pagamento inválido.",
            "INVALID_CHECKOUT_TOKEN",
            400
        );

    }

    return token;

}


/*
============================================================
PUBLIC INVOICE LOOKUP
============================================================
*/

async function findInvoiceByPublicToken(
    publicToken
) {

    const token =
        normalizePublicToken(
            publicToken
        );

    const conditions = [
        {
            publicToken:
                token
        },
        {
            publicId:
                token
        }
    ];

    if (
        isValidObjectId(
            token
        )
    ) {

        conditions.push({
            _id:
                new mongoose.Types.ObjectId(
                    token
                )
        });

    }

    const invoice =
        await Invoice.findOne({
            $or:
                conditions
        });

    if (
        !invoice
    ) {

        throw createRouteError(
            "Fatura não encontrada.",
            "INVOICE_NOT_FOUND",
            404
        );

    }

    /*
    --------------------------------------------------------
    Validar estado da fatura.
    --------------------------------------------------------
    */

    if (
        invoice.status ===
        "paid"
    ) {

        throw createRouteError(
            "Esta fatura já foi paga.",
            "INVOICE_ALREADY_PAID",
            409
        );

    }

    if (
        invoice.status ===
        "cancelled"
    ) {

        throw createRouteError(
            "Esta fatura foi cancelada.",
            "INVOICE_CANCELLED",
            410
        );

    }

    if (
        invoice.status ===
        "expired"
    ) {

        throw createRouteError(
            "Esta fatura expirou.",
            "INVOICE_EXPIRED",
            410
        );

    }

    /*
    --------------------------------------------------------
    Verificação dinâmica da expiração.
    --------------------------------------------------------
    */

    if (
        invoice.expiresAt &&
        new Date(
            invoice.expiresAt
        ).getTime() <= Date.now()
    ) {

        invoice.status =
            "expired";

        invoice.expiredAt =
            new Date();

        await invoice.save();

        throw createRouteError(
            "Esta fatura expirou.",
            "INVOICE_EXPIRED",
            410
        );

    }

    return invoice;

}


/*
============================================================
BASE64 NORMALIZATION
============================================================

Aceita:

abc123...

ou:

data:image/jpeg;base64,abc123...

============================================================
*/

function normalizeBase64(
    value
) {

    if (
        typeof value !== "string"
    ) {

        throw createRouteError(
            "O comprovativo não foi enviado.",
            "PROOF_REQUIRED",
            400
        );

    }

    let data =
        value.trim();

    if (
        !data
    ) {

        throw createRouteError(
            "O comprovativo não foi enviado.",
            "PROOF_REQUIRED",
            400
        );

    }

    /*
    --------------------------------------------------------
    Data URI
    --------------------------------------------------------
    */

    if (
        data.startsWith(
            "data:"
        )
    ) {

        const separator =
            data.indexOf(
                ","
            );

        if (
            separator === -1
        ) {

            throw createRouteError(
                "O ficheiro Base64 é inválido.",
                "INVALID_PROOF_DATA",
                400
            );

        }

        const header =
            data
                .slice(
                    0,
                    separator
                )
                .toLowerCase();

        if (
            !header.includes(
                ";base64"
            )
        ) {

            throw createRouteError(
                "O comprovativo deve utilizar Base64.",
                "INVALID_PROOF_DATA",
                400
            );

        }

        data =
            data.slice(
                separator + 1
            );

    }

    /*
    --------------------------------------------------------
    Limite antes de descodificar.
    --------------------------------------------------------
    */

    if (
        data.length >
        MAX_BASE64_LENGTH
    ) {

        throw createRouteError(
            "O comprovativo não pode ultrapassar 10 MB.",
            "PROOF_TOO_LARGE",
            413
        );

    }

    /*
    --------------------------------------------------------
    Base64 estrito.
    --------------------------------------------------------
    */

    if (
        !/^[A-Za-z0-9+/]*={0,2}$/.test(
            data
        )
    ) {

        throw createRouteError(
            "Os dados do comprovativo são inválidos.",
            "INVALID_PROOF_DATA",
            400
        );

    }

    if (
        data.length % 4 !== 0
    ) {

        throw createRouteError(
            "Os dados do comprovativo são inválidos.",
            "INVALID_PROOF_DATA",
            400
        );

    }

    let buffer;

    try {

        buffer =
            Buffer.from(
                data,
                "base64"
            );

    }

    catch {

        throw createRouteError(
            "Não foi possível ler o comprovativo.",
            "INVALID_PROOF_DATA",
            400
        );

    }

    if (
        !Buffer.isBuffer(
            buffer
        ) ||
        buffer.length <= 0
    ) {

        throw createRouteError(
            "O comprovativo está vazio.",
            "INVALID_PROOF_SIZE",
            400
        );

    }

    if (
        buffer.length >
        MAX_PROOF_SIZE
    ) {

        throw createRouteError(
            "O comprovativo não pode ultrapassar 10 MB.",
            "PROOF_TOO_LARGE",
            413
        );

    }

    return buffer;

}


/*
============================================================
MIME TYPE
============================================================
*/

function normalizeMimeType(
    value
) {

    if (
        typeof value !== "string"
    ) {

        throw createRouteError(
            "O tipo do comprovativo é inválido.",
            "INVALID_PROOF_TYPE",
            415
        );

    }

    const mime =
        value
            .trim()
            .toLowerCase();

    if (
        !ALLOWED_MIME_TYPES.has(
            mime
        )
    ) {

        throw createRouteError(
            "Formato de comprovativo não suportado.",
            "INVALID_PROOF_TYPE",
            415
        );

    }

    return mime;

}


/*
============================================================
FILE NAME
============================================================
*/

function normalizeFileName(
    value
) {

    if (
        typeof value !== "string"
    ) {

        throw createRouteError(
            "Nome do comprovativo inválido.",
            "INVALID_PROOF_FILENAME",
            400
        );

    }

    const name =
        value
            .trim()
            .replace(
                /[\u0000-\u001F\u007F]/g,
                ""
            )
            .slice(
                0,
                255
            );

    if (
        !name
    ) {

        throw createRouteError(
            "Nome do comprovativo inválido.",
            "INVALID_PROOF_FILENAME",
            400
        );

    }

    return name;

}


/*
============================================================
PAYMENT LOOKUP FOR PUBLIC CHECKOUT
============================================================
*/

async function findPublicPayment(
    invoice,
    paymentId
) {

    const normalizedPaymentId =
        normalizeObjectId(
            paymentId,
            "paymentId",
            "INVALID_PAYMENT_ID"
        );

    const payment =
        await Payment.findOne({
            _id:
                normalizedPaymentId,

            invoiceId:
                invoice._id,

            merchantId:
                invoice.merchantId
        });

    if (
        !payment
    ) {

        throw createRouteError(
            "Pagamento não encontrado.",
            "PAYMENT_NOT_FOUND",
            404
        );

    }

    return payment;

}


/*
============================================================
PAYMENT INTENT LOOKUP
============================================================
*/

async function findPaymentIntentByPayment(
    payment
) {

    const intent =
        await PaymentIntent.findOne({
            merchantId:
                payment.merchantId,

            invoiceId:
                payment.invoiceId,

            "metadata.legacyPaymentId":
                String(
                    payment._id
                )
        });

    return intent;

}


/*
============================================================
UPDATE PAYMENT INTENT
============================================================
*/

async function updatePaymentIntentStatus(
    payment,
    status
) {

    const intent =
        await findPaymentIntentByPayment(
            payment
        );

    if (
        !intent
    ) {

        return null;

    }

    const previousStatus =
        intent.status;

    /*
    --------------------------------------------------------
    Só atualizar se necessário.
    --------------------------------------------------------
    */

    if (
        previousStatus !==
        status
    ) {

        intent.status =
            status;

        if (
            status ===
            "processing"
        ) {

            intent.processingAt =
                intent.processingAt ||
                new Date();

        }

        if (
            status ===
            "succeeded"
        ) {

            intent.succeededAt =
                new Date();

        }

        if (
            status ===
            "failed"
        ) {

            intent.failedAt =
                new Date();

        }

        await intent.save();

    }

    return intent;

}


/*
============================================================
UPDATE INVOICE AFTER PROOF SUBMISSION
============================================================
*/

async function markInvoicePaymentSubmitted(
    invoice,
    payment
) {

    if (
        invoice.status ===
        "paid"
    ) {

        return;

    }

    if (
        invoice.status ===
        "cancelled"
    ) {

        throw createRouteError(
            "Esta fatura foi cancelada.",
            "INVOICE_CANCELLED",
            409
        );

    }

    if (
        invoice.status ===
        "expired"
    ) {

        throw createRouteError(
            "Esta fatura expirou.",
            "INVOICE_EXPIRED",
            409
        );

    }

    invoice.status =
        "payment_submitted";

    invoice.payment =
        {
            ...(invoice.payment || {}),

            paymentId:
                payment._id,

            method:
                payment.method ||
                "bank_transfer",

            bankAccountId:
                payment.bankAccountId,

            submittedAt:
                payment.submittedAt ||
                new Date(),

            confirmedAt:
                null
        };

    invoice.paymentMethod =
        payment.method ||
        "bank_transfer";

    invoice.receipt =
        {
            ...(invoice.receipt || {}),

            status:
                "submitted",

            submittedAt:
                payment.submittedAt ||
                new Date()
        };

    invoice.fraudProtection =
        {
            ...(invoice.fraudProtection || {}),

            verificationStatus:
                "pending",

            duplicateDetected:
                false
        };

    await invoice.save();

}


/*
============================================================
UPDATE INVOICE AFTER REVIEW
============================================================
*/

async function finalizeInvoiceReview(
    invoice,
    payment,
    approved,
    reason
) {

    if (
        approved
    ) {

        invoice.status =
            "paid";

        invoice.paidAt =
            new Date();

        invoice.payment =
            {
                ...(invoice.payment || {}),

                paymentId:
                    payment._id,

                method:
                    payment.method ||
                    "bank_transfer",

                bankAccountId:
                    payment.bankAccountId,

                submittedAt:
                    payment.submittedAt ||
                    invoice.payment?.submittedAt ||
                    null,

                confirmedAt:
                    payment.confirmedAt ||
                    new Date()
            };

        invoice.receipt =
            {
                ...(invoice.receipt || {}),

                status:
                    "verified"
            };

        invoice.fraudProtection =
            {
                ...(invoice.fraudProtection || {}),

                verificationStatus:
                    "verified",

                duplicateDetected:
                    false
            };

        await invoice.save();

        await updatePaymentIntentStatus(
            payment,
            "succeeded"
        );

        return;

    }

    /*
    --------------------------------------------------------
    Rejeição:
    a fatura volta para pending para permitir uma nova
    tentativa de pagamento/comprovativo.
    --------------------------------------------------------
    */

    invoice.status =
        "pending";

    invoice.paidAt =
        null;

    invoice.payment =
        {
            ...(invoice.payment || {}),

            paymentId:
                payment._id,

            method:
                payment.method ||
                "bank_transfer",

            bankAccountId:
                payment.bankAccountId,

            submittedAt:
                payment.submittedAt ||
                null,

            confirmedAt:
                null
        };

    invoice.receipt =
        {
            ...(invoice.receipt || {}),

            status:
                "rejected"
        };

    invoice.fraudProtection =
        {
            ...(invoice.fraudProtection || {}),

            verificationStatus:
                "rejected",

            duplicateDetected:
                false
        };

    await invoice.save();

    await updatePaymentIntentStatus(
        payment,
        "failed"
    );

}


/*
============================================================
PUBLIC SUBMIT PROOF
============================================================

POST
/api/pay/:publicToken/proof

BODY

{
    paymentId: "...",
    fileName: "comprovativo.jpg",
    mimeType: "image/jpeg",
    fileData: "BASE64",
    payerName: "...",
    payerPhone: "...",
    reference: "...",
    note: "..."
}

============================================================
*/

router.post(
    "/pay/:publicToken/proof",

    async (
        req,
        res
    ) => {

        applySecurityHeaders(
            res
        );

        try {

            const invoice =
                await findInvoiceByPublicToken(
                    req.params.publicToken
                );

            const body =
                getBody(
                    req
                );

            /*
            ------------------------------------------------
            paymentId é obrigatório.
            ------------------------------------------------
            */

            const payment =
                await findPublicPayment(
                    invoice,
                    body.paymentId
                );

            /*
            ------------------------------------------------
            Nunca permitir novo upload para pagamento
            confirmado.
            ------------------------------------------------
            */

            if (
                payment.status ===
                "confirmed"
            ) {

                throw createRouteError(
                    "Este pagamento já foi confirmado.",
                    "PAYMENT_ALREADY_CONFIRMED",
                    409
                );

            }

            /*
            ------------------------------------------------
            Se já estiver em revisão, não aceitar outro
            comprovativo para o mesmo pagamento.
            ------------------------------------------------
            */

            if (
                payment.status ===
                "pending_review" &&
                payment.receipt?.sha256
            ) {

                throw createRouteError(
                    "Este pagamento já possui um comprovativo em análise.",
                    "PROOF_ALREADY_SUBMITTED",
                    409
                );

            }

            /*
            ------------------------------------------------
            Rejeitado pode voltar a enviar comprovativo.
            ------------------------------------------------
            */

            if (
                ![
                    "pending_review",
                    "rejected"
                ].includes(
                    payment.status
                )
            ) {

                throw createRouteError(
                    "Este pagamento não está disponível para envio de comprovativo.",
                    "PAYMENT_NOT_REVIEWABLE",
                    409
                );

            }

            /*
            ------------------------------------------------
            Ficheiro
            ------------------------------------------------
            */

            const fileName =
                normalizeFileName(
                    body.fileName
                );

            const mimeType =
                normalizeMimeType(
                    body.mimeType
                );

            const buffer =
                normalizeBase64(
                    body.fileData
                );

            /*
            ------------------------------------------------
            Garantir que o tamanho declarado, se fornecido,
            corresponde ao tamanho real.
            ------------------------------------------------
            */

            if (
                body.fileSize !==
                undefined &&
                body.fileSize !==
                null
            ) {

                const declaredSize =
                    Number(
                        body.fileSize
                    );

                if (
                    !Number.isSafeInteger(
                        declaredSize
                    ) ||
                    declaredSize <= 0
                ) {

                    throw createRouteError(
                        "Tamanho do comprovativo inválido.",
                        "INVALID_PROOF_SIZE",
                        400
                    );

                }

                if (
                    declaredSize !==
                    buffer.length
                ) {

                    throw createRouteError(
                        "O tamanho declarado não corresponde ao ficheiro enviado.",
                        "PROOF_SIZE_MISMATCH",
                        400
                    );

                }

            }

            /*
            ------------------------------------------------
            Encaminhar para o serviço financeiro oficial.
            ------------------------------------------------
            */

            const result =
                await submitPaymentProof(
                    String(
                        invoice.merchantId
                    ),
                    String(
                        payment._id
                    ),
                    {
                        originalname:
                            fileName,

                        mimetype:
                            mimeType,

                        size:
                            buffer.length,

                        buffer
                    },
                    {
                        ip:
                            req.ip ||
                            null,

                        userAgent:
                            req.get(
                                "user-agent"
                            ) ||
                            null,

                        payerName:
                            typeof body.payerName ===
                            "string"
                                ? body.payerName
                                    .trim()
                                    .slice(
                                        0,
                                        180
                                    )
                                : null,

                        payerPhone:
                            typeof body.payerPhone ===
                            "string"
                                ? body.payerPhone
                                    .trim()
                                    .slice(
                                        0,
                                        40
                                    )
                                : null,

                        reference:
                            typeof body.reference ===
                            "string"
                                ? body.reference
                                    .trim()
                                    .slice(
                                        0,
                                        180
                                    )
                                : null,

                        note:
                            typeof body.note ===
                            "string"
                                ? body.note
                                    .trim()
                                    .slice(
                                        0,
                                        1000
                                    )
                                : null,

                        source:
                            "public_checkout"
                    }
                );

            /*
            ------------------------------------------------
            Recarregar Payment.
            ------------------------------------------------
            */

            const updatedPayment =
                await Payment.findOne({
                    _id:
                        payment._id,

                    merchantId:
                        invoice.merchantId,

                    invoiceId:
                        invoice._id
                });

            if (
                !updatedPayment
            ) {

                throw createRouteError(
                    "O pagamento desapareceu durante o processamento.",
                    "PAYMENT_STATE_ERROR",
                    500
                );

            }

            /*
            ------------------------------------------------
            Atualizar Invoice.
            ------------------------------------------------
            */

            await markInvoicePaymentSubmitted(
                invoice,
                updatedPayment
            );

            /*
            ------------------------------------------------
            PaymentIntent = processing.
            ------------------------------------------------
            */

            await updatePaymentIntentStatus(
                updatedPayment,
                "processing"
            );

            return successResponse(
                res,
                {
                    ...result,

                    payment: {
                        id:
                            String(
                                updatedPayment._id
                            ),

                        status:
                            updatedPayment.status,

                        invoiceId:
                            String(
                                invoice._id
                            ),

                        invoiceStatus:
                            invoice.status,

                        paymentIntentStatus:
                            "processing"
                    }
                },
                201
            );

        }

        catch (
            error
        ) {

            return sendRouteError(
                res,
                error
            );

        }

    }

);


/*
============================================================
LIST MERCHANT PROOFS
============================================================

GET /api/proofs

============================================================
*/

router.get(
    "/proofs",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        applySecurityHeaders(
            res
        );

        try {

            const result =
                await listMerchantProofs(
                    req.auth.merchantId,
                    {
                        page:
                            req.query?.page,

                        limit:
                            req.query?.limit,

                        status:
                            req.query?.status,

                        search:
                            req.query?.search,

                        invoiceId:
                            req.query?.invoiceId
                    }
                );

            return successResponse(
                res,
                result
            );

        }

        catch (
            error
        ) {

            return sendRouteError(
                res,
                error
            );

        }

    }

);


/*
============================================================
GET SINGLE PROOF
============================================================

GET /api/proofs/:proofId

============================================================
*/

router.get(
    "/proofs/:proofId",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        applySecurityHeaders(
            res
        );

        try {

            const proofId =
                normalizeObjectId(
                    req.params.proofId,
                    "proofId",
                    "INVALID_PROOF_ID"
                );

            const result =
                await getMerchantProof(
                    req.auth.merchantId,
                    proofId
                );

            return successResponse(
                res,
                result
            );

        }

        catch (
            error
        ) {

            return sendRouteError(
                res,
                error
            );

        }

    }

);


/*
============================================================
REVIEW PROOF
============================================================

PATCH /api/proofs/:proofId/review

BODY:

{
    "decision": "approved"
}

ou:

{
    "decision": "rejected",
    "reason": "O comprovativo não corresponde."
}

============================================================
*/

router.patch(
    "/proofs/:proofId/review",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        applySecurityHeaders(
            res
        );

        try {

            const proofId =
                normalizeObjectId(
                    req.params.proofId,
                    "proofId",
                    "INVALID_PROOF_ID"
                );

            const body =
                getBody(
                    req
                );

            const decision =
                typeof body.decision ===
                "string"
                    ? body.decision
                        .trim()
                        .toLowerCase()
                    : "";

            if (
                ![
                    "approved",
                    "rejected"
                ].includes(
                    decision
                )
            ) {

                throw createRouteError(
                    "A decisão deve ser approved ou rejected.",
                    "INVALID_PROOF_DECISION",
                    400
                );

            }

            const reason =
                typeof body.reason ===
                "string"
                    ? body.reason
                        .trim()
                        .slice(
                            0,
                            1000
                        )
                    : "";

            if (
                decision ===
                "rejected" &&
                !reason
            ) {

                throw createRouteError(
                    "É obrigatório indicar o motivo da rejeição.",
                    "REJECTION_REASON_REQUIRED",
                    400
                );

            }

            /*
            ------------------------------------------------
            Resolver Proof → Receipt → Payment.
            ------------------------------------------------
            */

            const receipt =
                await Receipt.findOne({
                    _id:
                        proofId,

                    merchantId:
                        req.auth.merchantId
                });

            if (
                !receipt
            ) {

                throw createRouteError(
                    "Comprovativo não encontrado.",
                    "PROOF_NOT_FOUND",
                    404
                );

            }

            if (
                !receipt.paymentId
            ) {

                throw createRouteError(
                    "O comprovativo não está associado a um pagamento.",
                    "PAYMENT_NOT_FOUND",
                    409
                );

            }

            const payment =
                await Payment.findOne({
                    _id:
                        receipt.paymentId,

                    merchantId:
                        req.auth.merchantId,

                    invoiceId:
                        receipt.invoiceId
                });

            if (
                !payment
            ) {

                throw createRouteError(
                    "Pagamento associado ao comprovativo não encontrado.",
                    "PAYMENT_NOT_FOUND",
                    404
                );

            }

            const invoice =
                await Invoice.findOne({
                    _id:
                        receipt.invoiceId,

                    merchantId:
                        req.auth.merchantId
                });

            if (
                !invoice
            ) {

                throw createRouteError(
                    "Fatura associada ao comprovativo não encontrada.",
                    "INVOICE_NOT_FOUND",
                    404
                );

            }

            /*
            ------------------------------------------------
            Só permitir decisão quando existe comprovativo.
            ------------------------------------------------
            */

            if (
                !payment.receipt?.sha256
            ) {

                throw createRouteError(
                    "Este pagamento não possui um comprovativo válido.",
                    "PROOF_NOT_FOUND",
                    409
                );

            }

            /*
            ------------------------------------------------
            Impedir segunda decisão.
            ------------------------------------------------
            */

            if (
                payment.status ===
                "confirmed"
            ) {

                throw createRouteError(
                    "Este pagamento já foi confirmado.",
                    "PAYMENT_ALREADY_CONFIRMED",
                    409
                );

            }

            if (
                payment.status ===
                "rejected" &&
                decision ===
                "rejected"
            ) {

                throw createRouteError(
                    "Este pagamento já foi rejeitado.",
                    "PAYMENT_ALREADY_REJECTED",
                    409
                );

            }

            /*
            ------------------------------------------------
            Executar revisão no serviço oficial.
            ------------------------------------------------
            */

            const result =
                await reviewPaymentProof(
                    String(
                        req.auth.merchantId
                    ),
                    String(
                        payment._id
                    ),
                    decision ===
                        "approved",
                    {
                        reviewerId:
                            req.auth.merchantId,

                        notes:
                            reason ||
                            null,

                        ip:
                            req.ip ||
                            null,

                        userAgent:
                            req.get(
                                "user-agent"
                            ) ||
                            null
                    }
                );

            /*
            ------------------------------------------------
            Recarregar estado real.
            ------------------------------------------------
            */

            const updatedPayment =
                await Payment.findOne({
                    _id:
                        payment._id,

                    merchantId:
                        req.auth.merchantId
                });

            if (
                !updatedPayment
            ) {

                throw createRouteError(
                    "Não foi possível confirmar o estado final do pagamento.",
                    "PAYMENT_STATE_ERROR",
                    500
                );

            }

            /*
            ------------------------------------------------
            Finalizar Invoice + PaymentIntent.
            ------------------------------------------------
            */

            await finalizeInvoiceReview(
                invoice,
                updatedPayment,
                decision ===
                    "approved",
                reason
            );

            /*
            ------------------------------------------------
            Atualizar Receipt final.
            ------------------------------------------------
            */

            await Receipt.updateMany(
                {
                    merchantId:
                        req.auth.merchantId,

                    paymentId:
                        updatedPayment._id
                },
                {
                    $set: {
                        status:
                            decision ===
                            "approved"
                                ? "approved"
                                : "rejected"
                    }
                }
            );

            /*
            ------------------------------------------------
            Resposta pública da operação administrativa.
            ------------------------------------------------
            */

            return successResponse(
                res,
                {
                    ...result,

                    paymentId:
                        String(
                            updatedPayment._id
                        ),

                    invoiceId:
                        String(
                            invoice._id
                        ),

                    paymentStatus:
                        updatedPayment.status,

                    invoiceStatus:
                        decision ===
                        "approved"
                            ? "paid"
                            : "pending",

                    paymentIntentStatus:
                        decision ===
                        "approved"
                            ? "succeeded"
                            : "failed"
                }
            );

        }

        catch (
            error
        ) {

            return sendRouteError(
                res,
                error
            );

        }

    }

);


/*
============================================================
404
============================================================
*/

router.use(
    (
        req,
        res
    ) => {

        applySecurityHeaders(
            res
        );

        return errorResponse(
            res,
            404,
            "PROOF_ROUTE_NOT_FOUND",
            "A rota de comprovativo solicitada não existe."
        );

    }
);


/*
============================================================
FINAL ERROR HANDLER
============================================================
*/

router.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }

        return sendRouteError(
            res,
            error
        );

    }
);


/*
============================================================
EXPORT
============================================================
*/

export default router;
