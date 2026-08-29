/*
============================================================
HONEY PAY
PAYMENT PROOF ROUTES
V1.0.0
============================================================

ROTAS REAIS DE COMPROVATIVOS DE PAGAMENTO

------------------------------------------------------------
PUBLIC
------------------------------------------------------------

POST /api/pay/:publicToken/proof

O comprador utiliza esta rota para enviar o comprovativo.

------------------------------------------------------------
AUTHENTICATED
------------------------------------------------------------

GET  /api/proofs/:proofId
GET  /api/invoices/:invoiceId/proofs
GET  /api/proofs/:proofId/file
POST /api/proofs/:proofId/review
POST /api/proofs/:proofId/approve
POST /api/proofs/:proofId/reject
GET  /api/proofs/security/statistics

------------------------------------------------------------
SECURITY
------------------------------------------------------------

- Checkout público não exige JWT
- Operações administrativas exigem JWT
- Merchant ownership é sempre validado
- O ficheiro nunca é exposto através de URL pública
- Download é feito através de stream autorizado
- Upload é limitado pelo middleware de ficheiros
- Erros internos não são enviados ao cliente

============================================================
*/

import express from "express";
import multer from "multer";


import {
    authenticateRequest
} from "./middleware.js";


import {
    successResponse,
    errorResponse,
    normalizeError
} from "./utils.js";


import {
    createPaymentProof,
    getPaymentProof,
    listInvoiceProofs,
    getPaymentProofStream,
    reviewPaymentProof,
    approvePaymentProof,
    rejectPaymentProof,
    getProofSecurityStatistics
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
UPLOAD CONFIGURATION
============================================================

O arquivo é mantido apenas em memória durante o processamento.

Depois é enviado imediatamente para MongoDB GridFS.

NÃO utilizamos filesystem local do Render.

============================================================
*/

const upload =
    multer({

        storage:
            multer.memoryStorage(),

        limits:
            {

                fileSize:
                    10 *
                    1024 *
                    1024,

                files:
                    1
            },

        fileFilter:
            (
                req,
                file,
                callback
            ) => {

                const allowed =
                    new Set([

                        "image/jpeg",
                        "image/png",
                        "image/webp",
                        "application/pdf"

                    ]);


                if (
                    !allowed.has(
                        String(
                            file.mimetype ||
                            ""
                        ).toLowerCase()
                    )
                ) {

                    const error =
                        new Error(
                            "Formato de comprovativo não suportado."
                        );


                    error.code =
                        "PROOF_FILE_TYPE_NOT_ALLOWED";


                    error.statusCode =
                        415;


                    return callback(
                        error
                    );
                }


                return callback(
                    null,
                    true
                );
            }
    });


/*
============================================================
ERROR HELPER
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

        error?.details ||
        null
    );
}


/*
============================================================
MULTER ERROR NORMALIZATION
============================================================
*/

function normalizeUploadError(
    error
) {

    if (
        !error
    ) {

        return null;
    }


    if (
        error instanceof
        multer.MulterError
    ) {

        if (
            error.code ===
            "LIMIT_FILE_SIZE"
        ) {

            const normalized =
                new Error(
                    "O comprovativo não pode ultrapassar 10 MB."
                );


            normalized.code =
                "PROOF_FILE_TOO_LARGE";


            normalized.statusCode =
                413;


            return normalized;
        }


        if (
            error.code ===
            "LIMIT_FILE_COUNT"
        ) {

            const normalized =
                new Error(
                    "Só é permitido enviar um comprovativo de cada vez."
                );


            normalized.code =
                "PROOF_FILE_COUNT_LIMIT";


            normalized.statusCode =
                400;


            return normalized;
        }


        const normalized =
            new Error(
                "Não foi possível processar o ficheiro enviado."
            );


        normalized.code =
            "PROOF_UPLOAD_ERROR";


        normalized.statusCode =
            400;


        return normalized;
    }


    return error;
}


/*
============================================================
PUBLIC PROOF UPLOAD
============================================================

POST /api/pay/:publicToken/proof

Content-Type:
multipart/form-data

Campo obrigatório:

proof

Campos opcionais:

note

============================================================
*/

router.post(
    "/pay/:publicToken/proof",

    upload.single(
        "proof"
    ),

    async (
        req,
        res
    ) => {

        try {

            const publicToken =
                String(
                    req.params.publicToken ||
                    ""
                ).trim();


            if (
                !publicToken
            ) {

                const error =
                    new Error(
                        "Link de pagamento inválido."
                    );


                error.code =
                    "INVALID_PAYMENT_LINK";


                error.statusCode =
                    400;


                throw error;
            }


            if (
                !req.file
            ) {

                const error =
                    new Error(
                        "Envie o comprovativo de pagamento."
                    );


                error.code =
                    "PROOF_FILE_REQUIRED";


                error.statusCode =
                    400;


                throw error;
            }


            const result =
                await createPaymentProof(

                    {

                        publicToken,

                        file:
                            req.file,

                        ip:
                            req.ip,

                        userAgent:
                            req.get(
                                "user-agent"
                            ),

                        note:
                            req.body?.note ||
                            null
                    }
                );


            return successResponse(

                res,

                result,

                201
            );
        }

        catch (
            error
        ) {

            const normalized =
                normalizeUploadError(
                    error
                );


            return sendRouteError(

                res,

                normalized ||
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

Somente o comerciante dono do comprovativo.

============================================================
*/

router.get(
    "/proofs/:proofId",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const result =
                await getPaymentProof(

                    req.auth.merchantId,

                    req.params.proofId
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
LIST PROOFS OF INVOICE
============================================================

GET /api/invoices/:invoiceId/proofs

============================================================
*/

router.get(
    "/invoices/:invoiceId/proofs",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const result =
                await listInvoiceProofs(

                    req.auth.merchantId,

                    req.params.invoiceId
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
DOWNLOAD / VIEW PROOF
============================================================

GET /api/proofs/:proofId/file

O ficheiro só pode ser obtido pelo comerciante proprietário.

============================================================
*/

router.get(
    "/proofs/:proofId/file",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const result =
                await getPaymentProofStream(

                    req.auth.merchantId,

                    req.params.proofId
                );


            /*
            ------------------------------------------------
            Headers de segurança
            ------------------------------------------------
            */

            res.setHeader(

                "Content-Type",

                result.mimeType
            );


            res.setHeader(

                "Content-Length",

                String(
                    result.size
                )
            );


            res.setHeader(

                "Content-Disposition",

                `inline; filename="${String(
                    result.filename
                ).replace(
                    /["\\\r\n]/g,
                    "_"
                )}"`
            );


            res.setHeader(

                "X-Content-Type-Options",

                "nosniff"
            );


            res.setHeader(

                "Cache-Control",

                "private, no-store"
            );


            /*
            ------------------------------------------------
            Stream para o cliente.
            ------------------------------------------------
            */

            result.stream.on(
                "error",
                error => {

                    console.error(
                        "[HONEY PAY] Proof stream error:",
                        error
                    );


                    if (
                        !res.headersSent
                    ) {

                        return sendRouteError(

                            res,

                            error
                        );
                    }


                    try {

                        res.destroy();

                    }

                    catch (
                        destroyError
                    ) {

                        console.error(
                            "[HONEY PAY] Stream destroy error:",
                            destroyError
                        );
                    }
                }
            );


            result.stream.pipe(
                res
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
PUT PROOF INTO REVIEW
============================================================

POST /api/proofs/:proofId/review

============================================================
*/

router.post(
    "/proofs/:proofId/review",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const result =
                await reviewPaymentProof(

                    req.auth.merchantId,

                    req.params.proofId,

                    {

                        reviewer:
                            req.auth.merchantId
                                ? String(
                                    req.auth.merchantId
                                )
                                : "merchant"
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
APPROVE PROOF
============================================================

POST /api/proofs/:proofId/approve

Body opcional:

{
    "paymentReference": "ABC123"
}

============================================================
*/

router.post(
    "/proofs/:proofId/approve",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const paymentReference =
                typeof
                    req.body?.paymentReference ===
                    "string"

                    ? req.body.paymentReference
                        .trim()
                        .slice(
                            0,
                            200
                        )

                    : null;


            const result =
                await approvePaymentProof(

                    req.auth.merchantId,

                    req.params.proofId,

                    {

                        paymentReference
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
REJECT PROOF
============================================================

POST /api/proofs/:proofId/reject

Body:

{
    "reason": "Valor incorreto."
}

============================================================
*/

router.post(
    "/proofs/:proofId/reject",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const reason =
                typeof
                    req.body?.reason ===
                    "string"

                    ? req.body.reason
                        .trim()
                        .slice(
                            0,
                            1000
                        )

                    : "";


            const result =
                await rejectPaymentProof(

                    req.auth.merchantId,

                    req.params.proofId,

                    reason
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
SECURITY STATISTICS
============================================================

GET /api/proofs/security/statistics

============================================================
*/

router.get(
    "/proofs/security/statistics",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const result =
                await getProofSecurityStatistics(

                    req.auth.merchantId
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
ROUTE FALLBACK
============================================================
*/

router.use(
    (
        req,
        res
    ) => {

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
GLOBAL ROUTE ERROR HANDLER
============================================================
*/

router.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(

            "[HONEY PAY PROOF ROUTE ERROR]",

            error
        );


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
