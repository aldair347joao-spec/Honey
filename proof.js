/*
============================================================
HONEY PAY
PROOF SERVICE
V1.1.0
============================================================

SERVIÇO DE COMPROVATIVOS

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Validar comprovativos
- Calcular SHA-256
- Verificar duplicação
- Associar comprovativo ao pagamento
- Consultar comprovativos
- Validar propriedade do comerciante
- Atualizar estado de verificação
- Manter integridade do fluxo Payment → Invoice
- Impedir acesso entre comerciantes

------------------------------------------------------------
FLUXO
------------------------------------------------------------

Receipt
   ↓
SHA-256
   ↓
Duplicate Check
   ↓
Payment
   ↓
Invoice
   ↓
Verification

============================================================
*/

import crypto from "node:crypto";


import {
    Invoice,
    Payment,
    Receipt
} from "./models.js";


import {
    validateObjectId
} from "./validators.js";


import {
    logSecurityEvent
} from "./logger.js";


/*
============================================================
CONSTANTS
============================================================
*/

const MAX_PROOF_SIZE =
    10 * 1024 * 1024;


const ALLOWED_PROOF_TYPES =
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
OBJECT ID
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
SHA-256
============================================================
*/

export function calculateProofSha256(

    buffer

) {

    if (
        !Buffer.isBuffer(
            buffer
        )
    ) {

        throw createError(

            "O conteúdo do comprovativo deve ser um Buffer.",

            "INVALID_PROOF_BUFFER",

            400

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
VALIDATE PROOF
============================================================
*/

export function validateProofFile(

    file

) {

    if (
        !file
    ) {

        throw createError(

            "É necessário enviar um comprovativo.",

            "PROOF_REQUIRED",

            400

        );
    }


    if (
        !Buffer.isBuffer(
            file.buffer
        )
    ) {

        throw createError(

            "O comprovativo enviado é inválido.",

            "INVALID_PROOF_FILE",

            400

        );
    }


    const size =
        Number(

            file.size ??
            file.buffer.length

        );


    if (
        !Number.isFinite(
            size
        ) ||
        size <=
        0
    ) {

        throw createError(

            "O comprovativo está vazio.",

            "INVALID_PROOF_SIZE",

            400

        );
    }


    if (
        size >
        MAX_PROOF_SIZE
    ) {

        throw createError(

            "O comprovativo não pode ultrapassar 10 MB.",

            "PROOF_TOO_LARGE",

            413

        );
    }


    if (
        !ALLOWED_PROOF_TYPES.has(
            file.mimetype
        )
    ) {

        throw createError(

            "Formato de comprovativo não suportado.",

            "INVALID_PROOF_TYPE",

            415

        );
    }


    return {

        size,

        sha256:
            calculateProofSha256(
                file.buffer
            )

    };
}


/*
============================================================
FIND DUPLICATE
============================================================
*/

export async function findDuplicateProof(

    merchantId,

    sha256

) {

    assertObjectId(

        merchantId,

        "merchantId",

        "INVALID_MERCHANT_ID"

    );


    if (
        typeof sha256 !==
        "string" ||
        !/^[a-f0-9]{64}$/i.test(
            sha256
        )
    ) {

        throw createError(

            "SHA-256 do comprovativo inválido.",

            "INVALID_PROOF_HASH",

            400

        );
    }


    const normalizedHash =
        sha256.toLowerCase();


    const duplicate =
        await Payment

            .findOne({

                merchantId,

                "receipt.sha256":
                    normalizedHash

            })

            .select(

                "_id invoiceId status receipt.sha256 createdAt"

            )

            .lean();


    return duplicate;
}


/*
============================================================
GET PROOF BY PAYMENT
============================================================
*/

export async function getProofByPayment(

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

            .select(

                "_id merchantId invoiceId bankAccountId status amount currency payer receipt verification submittedAt confirmedAt confirmedBy rejectedAt rejectionReason createdAt updatedAt"

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


    if (
        !payment.receipt
    ) {

        throw createError(

            "Este pagamento não possui comprovativo.",

            "PROOF_NOT_FOUND",

            404

        );
    }


    return {

        paymentId:
            payment._id,

        invoiceId:
            payment.invoiceId,

        merchantId:
            payment.merchantId,

        status:
            payment.status,

        amount:
            payment.amount,

        currency:
            payment.currency,

        receipt: {

            originalName:
                payment
                    .receipt
                    .originalName,

            mimeType:
                payment
                    .receipt
                    .mimeType,

            size:
                payment
                    .receipt
                    .size,

            sha256:
                payment
                    .receipt
                    .sha256,

            storagePath:
                payment
                    .receipt
                    .storagePath,

            uploadedAt:
                payment
                    .receipt
                    .uploadedAt

        },

        verification:
            payment.verification,

        submittedAt:
            payment.submittedAt,

        confirmedAt:
            payment.confirmedAt,

        confirmedBy:
            payment.confirmedBy,

        rejectedAt:
            payment.rejectedAt,

        rejectionReason:
            payment.rejectionReason

    };
}


/*
============================================================
CREATE RECEIPT RECORD
============================================================

Este método cria um registo separado em Receipt quando o
fluxo de armazenamento precisar de uma entidade própria.

O Payment continua sendo a fonte do estado financeiro.

============================================================
*/

export async function createProofRecord(

    merchantId,

    invoiceId,

    paymentId,

    file,

    metadata = {}

) {

    assertObjectId(

        merchantId,

        "merchantId",

        "INVALID_MERCHANT_ID"

    );


    assertObjectId(

        invoiceId,

        "invoiceId",

        "INVALID_INVOICE_ID"

    );


    assertObjectId(

        paymentId,

        "paymentId",

        "INVALID_PAYMENT_ID"

    );


    const validated =
        validateProofFile(
            file
        );


    /*
    --------------------------------------------------------
    PAYMENT
    --------------------------------------------------------
    */

    const payment =
        await Payment.findOne({

            _id:
                paymentId,

            merchantId,

            invoiceId

        });


    if (
        !payment
    ) {

        throw createError(

            "Pagamento não encontrado para este comprovativo.",

            "PAYMENT_NOT_FOUND",

            404

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
                invoiceId,

            merchantId

        });


    if (
        !invoice
    ) {

        throw createError(

            "Fatura não encontrada para este comprovativo.",

            "INVOICE_NOT_FOUND",

            404

        );
    }


    /*
    --------------------------------------------------------
    DUPLICATE
    --------------------------------------------------------
    */

    const duplicate =
        await findDuplicateProof(

            merchantId,

            validated.sha256

        );


    if (
        duplicate &&
        duplicate._id.toString() !==
        payment._id.toString()
    ) {

        logSecurityEvent(

            "duplicate_proof_detected",

            {

                merchantId:
                    merchantId.toString(),

                invoiceId:
                    invoiceId.toString(),

                paymentId:
                    paymentId.toString(),

                duplicatePaymentId:
                    duplicate._id.toString()

            }

        );


        throw createError(

            "Este comprovativo já foi utilizado.",

            "DUPLICATE_PROOF",

            409

        );
    }


    /*
    --------------------------------------------------------
    CREATE RECEIPT
    --------------------------------------------------------
    */

    let receipt;


    try {

        receipt =
            await Receipt.create({

                merchantId,

                invoiceId,

                paymentId,

                fileId:
                    metadata.fileId ||
                    null,

                fileName:
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

                sha256:
                    validated.sha256,

                size:
                    validated.size,

                storagePath:
                    metadata.storagePath ||
                    null,

                status:
                    "pending",

                metadata

            });

    }

    catch (
        error
    ) {

        if (
            error?.code ===
            11000
        ) {

            throw createError(

                "Este comprovativo já foi registado.",

                "DUPLICATE_PROOF",

                409

            );
        }


        throw error;
    }


    /*
    --------------------------------------------------------
    LINK PAYMENT
    --------------------------------------------------------
    */

    payment.receipt =
        {

            ...(
                payment.receipt ||
                {}
            ),

            originalName:
                receipt.fileName,

            mimeType:
                receipt.mimeType,

            size:
                receipt.size,

            sha256:
                receipt.sha256,

            storagePath:
                receipt.storagePath,

            uploadedAt:
                receipt.createdAt

        };


    await payment.save();


    /*
    --------------------------------------------------------
    LINK INVOICE
    --------------------------------------------------------
    */

    invoice.receipt =
        {

            ...(
                invoice.receipt ||
                {}
            ),

            status:
                "submitted",

            fileId:
                receipt.fileId,

            originalName:
                receipt.fileName,

            mimeType:
                receipt.mimeType,

            size:
                receipt.size,

            sha256:
                receipt.sha256,

            submittedAt:
                receipt.createdAt

        };


    await invoice.save();


    return {

        receipt: {

            id:
                receipt._id,

            paymentId:
                receipt.paymentId,

            invoiceId:
                receipt.invoiceId,

            status:
                receipt.status,

            fileName:
                receipt.fileName,

            mimeType:
                receipt.mimeType,

            size:
                receipt.size,

            sha256:
                receipt.sha256,

            createdAt:
                receipt.createdAt

        }

    };
}


/*
============================================================
VERIFY PROOF
============================================================
*/

export async function verifyProof(

    merchantId,

    paymentId,

    approved,

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


    if (
        typeof approved !==
        "boolean"
    ) {

        throw createError(

            "O estado de verificação é inválido.",

            "INVALID_VERIFICATION_STATUS",

            400

        );
    }


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
        !payment.receipt ||
        !payment.receipt.sha256
    ) {

        throw createError(

            "Este pagamento não possui um comprovativo válido.",

            "PROOF_NOT_FOUND",

            404

        );
    }


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

            "Fatura associada não encontrada.",

            "INVOICE_NOT_FOUND",

            404

        );
    }


    if (
        approved
    ) {

        payment.verification =
            {

                ...(
                    payment.verification ||
                    {}
                ),

                status:
                    "confirmed",

                duplicateDetected:
                    false,

                notes:
                    Array.isArray(

                        payment
                            .verification
                            ?.notes

                    )

                        ? payment
                            .verification
                            .notes

                        : []

            };


        await payment.save();


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
                    "verified",

                duplicateDetected:
                    false

            };


        await invoice.save();


        /*
        ----------------------------------------------------
        Receipt
        ----------------------------------------------------
        */

        await Receipt.updateMany(

            {

                merchantId,

                paymentId:
                    payment._id

            },

            {

                $set: {

                    status:
                        "approved"

                }

            }

        );


    }

    else {

        payment.verification =
            {

                ...(
                    payment.verification ||
                    {}
                ),

                status:
                    "rejected",

                duplicateDetected:
                    false,

                notes:
                    Array.isArray(

                        payment
                            .verification
                            ?.notes

                    )

                        ? payment
                            .verification
                            .notes

                        : []

            };


        await payment.save();


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


        await Receipt.updateMany(

            {

                merchantId,

                paymentId:
                    payment._id

            },

            {

                $set: {

                    status:
                        "rejected"

                }

            }

        );

    }


    logSecurityEvent(

        approved
            ? "proof_verified"
            : "proof_rejected",

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

        paymentId:
            payment._id,

        invoiceId:
            payment.invoiceId,

        verification:

            payment.verification,

        receiptStatus:

            invoice
                .receipt
                ?.status ||

            null

    };
}


/*
============================================================
GET PROOF BY ID
============================================================
*/

export async function getProof(

    merchantId,

    proofId

) {

    assertObjectId(

        merchantId,

        "merchantId",

        "INVALID_MERCHANT_ID"

    );


    assertObjectId(

        proofId,

        "proofId",

        "INVALID_PROOF_ID"

    );


    const receipt =
        await Receipt.findOne({

            _id:
                proofId,

            merchantId

        }).lean();


    if (
        !receipt
    ) {

        throw createError(

            "Comprovativo não encontrado.",

            "PROOF_NOT_FOUND",

            404

        );
    }


    return {

        id:
            receipt._id,

        merchantId:
            receipt.merchantId,

        invoiceId:
            receipt.invoiceId,

        paymentId:
            receipt.paymentId,

        fileName:
            receipt.fileName,

        mimeType:
            receipt.mimeType,

        size:
            receipt.size,

        sha256:
            receipt.sha256,

        storagePath:
            receipt.storagePath,

        status:
            receipt.status,

        createdAt:
            receipt.createdAt,

        updatedAt:
            receipt.updatedAt

    };
}


/*
============================================================
LIST PROOFS
============================================================
*/

export async function listProofs(

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
                "pending",
                "approved",
                "rejected"
            ].includes(
                status
            )
        ) {

            throw createError(

                "Estado de comprovativo inválido.",

                "INVALID_PROOF_STATUS",

                400

            );
        }


        filter.status =
            status;
    }


    if (
        options.paymentId
    ) {

        assertObjectId(

            options.paymentId,

            "paymentId",

            "INVALID_PAYMENT_ID"

        );


        filter.paymentId =
            options.paymentId;
    }


    if (
        options.invoiceId
    ) {

        assertObjectId(

            options.invoiceId,

            "invoiceId",

            "INVALID_INVOICE_ID"

        );


        filter.invoiceId =
            options.invoiceId;
    }


    const skip =
        (
            page -
            1
        ) *
        limit;


    const [

        receipts,

        total

    ] =
        await Promise.all([

            Receipt

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

            Receipt.countDocuments(
                filter
            )

        ]);


    return {

        items:
            receipts.map(

                receipt => ({

                    id:
                        receipt._id,

                    invoiceId:
                        receipt.invoiceId,

                    paymentId:
                        receipt.paymentId,

                    fileName:
                        receipt.fileName,

                    mimeType:
                        receipt.mimeType,

                    size:
                        receipt.size,

                    sha256:
                        receipt.sha256,

                    status:
                        receipt.status,

                    createdAt:
                        receipt.createdAt,

                    updatedAt:
                        receipt.updatedAt

                })

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
EXPORT
============================================================
*/

export default {

    calculateProofSha256,

    validateProofFile,

    findDuplicateProof,

    getProofByPayment,

    createProofRecord,

    verifyProof,

    getProof,

    listProofs

};
