/*
============================================================
HONEY PAY
PAYMENT PROOF ROUTES
V1.0.0
============================================================

ROTAS DO COMPROVATIVO DE PAGAMENTO

------------------------------------------------------------
PUBLIC
------------------------------------------------------------

POST /api/pay/:publicToken/proof

------------------------------------------------------------
AUTHENTICATED
------------------------------------------------------------

GET /api/proofs
GET /api/proofs/:proofId
PATCH /api/proofs/:proofId/review

------------------------------------------------------------
OBJETIVO
------------------------------------------------------------

Permitir que:

1. O cliente envie o comprovativo através do checkout.
2. O comprovativo fique associado à fatura correta.
3. O comerciante consulte os seus comprovativos.
4. O comerciante aprove ou rejeite um comprovativo.

------------------------------------------------------------
SEGURANÇA
------------------------------------------------------------

- O cliente não pode escolher o merchantId.
- O cliente não pode escolher a invoiceId.
- A fatura é identificada pelo publicToken.
- O valor da fatura não pode ser alterado pelo cliente.
- O comprovativo fica associado ao comerciante da fatura.
- O comerciante só pode consultar os seus próprios comprovativos.
- A decisão de aprovação/rejeição exige autenticação.
- Dados internos não são enviados para o cliente.
- Erros internos não expõem stack traces.

============================================================
*/

import express from "express";


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
SECURITY HEADERS
============================================================
*/

function applyProofSecurityHeaders(
    res
) {

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
ERROR HANDLER
============================================================
*/

function sendProofError(
    res,
    error
) {

    const normalized =
        normalizeError(
            error
        );


    /*
    --------------------------------------------------------
    Nunca devolver stack trace ou objeto de erro interno.
    --------------------------------------------------------
    */

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
BODY VALIDATION
============================================================
*/

function getBody(
    req
) {

    if (
        !req.body ||
        typeof req.body !==
        "object" ||
        Array.isArray(
            req.body
        )
    ) {

        return {};
    }


    return req.body;
}


/*
============================================================
PUBLIC TOKEN VALIDATION
============================================================
*/

function normalizePublicToken(
    value
) {

    if (
        typeof value !==
        "string"
    ) {

        const error =
            new Error(
                "Link de pagamento inválido."
            );


        error.code =
            "INVALID_CHECKOUT_TOKEN";


        error.statusCode =
            400;


        throw error;
    }


    const token =
        value.trim();


    if (
        !token ||
        token.length >
        200
    ) {

        const error =
            new Error(
                "Link de pagamento inválido."
            );


        error.code =
            "INVALID_CHECKOUT_TOKEN";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Token URL-safe.
    --------------------------------------------------------
    */

    if (
        !/^[A-Za-z0-9_-]+$/.test(
            token
        )
    ) {

        const error =
            new Error(
                "Link de pagamento inválido."
            );


        error.code =
            "INVALID_CHECKOUT_TOKEN";


        error.statusCode =
            400;


        throw error;
    }


    return token;
}


/*
============================================================
PROOF ID VALIDATION
============================================================
*/

function normalizeProofId(
    value
) {

    if (
        typeof value !==
        "string"
    ) {

        const error =
            new Error(
                "Comprovativo inválido."
            );


        error.code =
            "INVALID_PROOF_ID";


        error.statusCode =
            400;


        throw error;
    }


    const id =
        value.trim();


    if (
        !id ||
        id.length >
        200
    ) {

        const error =
            new Error(
                "Comprovativo inválido."
            );


        error.code =
            "INVALID_PROOF_ID";


        error.statusCode =
            400;


        throw error;
    }


    return id;
}


/*
============================================================
PUBLIC SUBMIT PAYMENT PROOF
============================================================

POST /api/pay/:publicToken/proof

------------------------------------------------------------
BODY ESPERADO
------------------------------------------------------------

{
    "fileName": "comprovativo.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 250000,
    "fileData": "...",
    "payerName": "Nome do cliente",
    "payerPhone": "+244...",
    "reference": "ABC123"
}

------------------------------------------------------------
IMPORTANTE
------------------------------------------------------------

O serviço `submitPaymentProof()` é responsável pelas
validações profundas do ficheiro e pelo armazenamento.

A rota apenas organiza e encaminha os dados.

============================================================
*/

router.post(
    "/pay/:publicToken/proof",

    async (
        req,
        res
    ) => {

        applyProofSecurityHeaders(
            res
        );


        try {

            const publicToken =
                normalizePublicToken(
                    req.params.publicToken
                );


            const body =
                getBody(
                    req
                );


            /*
            ------------------------------------------------
            Nunca permitir que o cliente injete:
            ------------------------------------------------

            merchantId
            invoiceId
            amount
            status
            approved
            reviewStatus
            ------------------------------------------------
            */

            const proofInput = {

                fileName:
                    body.fileName,

                mimeType:
                    body.mimeType,

                fileSize:
                    body.fileSize,

                fileData:
                    body.fileData,

                payerName:
                    body.payerName,

                payerPhone:
                    body.payerPhone,

                reference:
                    body.reference,

                note:
                    body.note

            };


            const result =
                await submitPaymentProof(

                    publicToken,

                    proofInput,

                    {

                        ip:
                            req.ip,

                        userAgent:
                            req.get(
                                "user-agent"
                            )
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

            return sendProofError(

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

Query:

?page=1
&limit=20
&status=pending
&search=...
&invoiceId=...

============================================================
*/

router.get(
    "/proofs",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        applyProofSecurityHeaders(
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

            return sendProofError(

                res,

                error
            );
        }
    }
);


/*
============================================================
GET SINGLE MERCHANT PROOF
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

        applyProofSecurityHeaders(
            res
        );


        try {

            const proofId =
                normalizeProofId(
                    req.params.proofId
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

            return sendProofError(

                res,

                error
            );
        }
    }
);


/*
============================================================
REVIEW PAYMENT PROOF
============================================================

PATCH /api/proofs/:proofId/review

------------------------------------------------------------
BODY
------------------------------------------------------------

{
    "decision": "approved"
}

ou

{
    "decision": "rejected",
    "reason": "Valor não corresponde ao pagamento."
}

------------------------------------------------------------
DECISÕES PERMITIDAS
------------------------------------------------------------

approved
rejected

============================================================
*/

router.patch(
    "/proofs/:proofId/review",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        applyProofSecurityHeaders(
            res
        );


        try {

            const proofId =
                normalizeProofId(
                    req.params.proofId
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
                decision !==
                    "approved" &&
                decision !==
                    "rejected"
            ) {

                const error =
                    new Error(
                        "A decisão deve ser approved ou rejected."
                    );


                error.code =
                    "INVALID_PROOF_DECISION";


                error.statusCode =
                    400;


                throw error;
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

                const error =
                    new Error(
                        "É obrigatório indicar o motivo da rejeição."
                    );


                error.code =
                    "REJECTION_REASON_REQUIRED";


                error.statusCode =
                    400;


                throw error;
            }


            const result =
                await reviewPaymentProof(

                    req.auth.merchantId,

                    proofId,

                    {

                        decision,

                        reason
                    },

                    {

                        ip:
                            req.ip,

                        userAgent:
                            req.get(
                                "user-agent"
                            )
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

            return sendProofError(

                res,

                error
            );
        }
    }
);


/*
============================================================
404 FALLBACK
============================================================
*/

router.use(
    (
        req,
        res
    ) => {

        applyProofSecurityHeaders(
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
GLOBAL ERROR HANDLER
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


        applyProofSecurityHeaders(
            res
        );


        return sendProofError(

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
