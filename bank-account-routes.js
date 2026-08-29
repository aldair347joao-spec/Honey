/*
============================================================
HONEY PAY
BANK ACCOUNT ROUTES
V1.0.0
============================================================

ROTAS REAIS PARA GESTÃO DAS CONTAS BANCÁRIAS

------------------------------------------------------------
AUTHENTICATED
------------------------------------------------------------

GET    /api/bank-accounts
POST   /api/bank-accounts
GET    /api/bank-accounts/:accountId
PUT    /api/bank-accounts/:accountId
PATCH  /api/bank-accounts/:accountId/status
PATCH  /api/bank-accounts/:accountId/primary
DELETE /api/bank-accounts/:accountId

------------------------------------------------------------
PUBLIC
------------------------------------------------------------

GET /api/public/merchants/:merchantId/bank-accounts

------------------------------------------------------------
SECURITY
------------------------------------------------------------

- Todas as operações administrativas exigem autenticação.
- O merchantId nunca vem do body.
- O merchantId é obtido exclusivamente do JWT.
- Um comerciante não pode manipular contas de outro.
- O checkout público recebe apenas contas ativas.
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
    createBankAccount,
    listBankAccounts,
    getBankAccount,
    updateBankAccount,
    setPrimaryBankAccount,
    setBankAccountStatus,
    deleteBankAccount,
    getPublicBankAccounts
} from "./bank-accounts.js";


/*
============================================================
ROUTER
============================================================
*/

const router =
    express.Router();


/*
============================================================
ERROR RESPONSE HELPER
============================================================
*/

function sendError(
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
VALIDATE BODY
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
GET BANK ACCOUNTS
============================================================

GET /api/bank-accounts

Lista todas as contas do comerciante autenticado.

============================================================
*/

router.get(
    "/bank-accounts",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const activeOnly =
                String(
                    req.query?.activeOnly ||
                    ""
                )
                    .toLowerCase() ===
                "true";


            const result =
                await listBankAccounts(

                    req.auth.merchantId,

                    {
                        activeOnly
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

            return sendError(
                res,
                error
            );
        }
    }
);


/*
============================================================
CREATE BANK ACCOUNT
============================================================

POST /api/bank-accounts

Body:

{
    "bankName": "BAI",
    "accountName": "Conta Principal",
    "holderName": "Nome da Empresa",
    "iban": "AO06004400006743537110146",
    "currency": "AOA",
    "active": true,
    "isPrimary": true,
    "displayOrder": 0
}

============================================================
*/

router.post(
    "/bank-accounts",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const body =
                getBody(
                    req
                );


            const result =
                await createBankAccount(

                    req.auth.merchantId,

                    body
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

            return sendError(
                res,
                error
            );
        }
    }
);


/*
============================================================
GET SINGLE BANK ACCOUNT
============================================================

GET /api/bank-accounts/:accountId

============================================================
*/

router.get(
    "/bank-accounts/:accountId",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const result =
                await getBankAccount(

                    req.auth.merchantId,

                    req.params.accountId
                );


            return successResponse(

                res,

                result
            );
        }

        catch (
            error
        ) {

            return sendError(
                res,
                error
            );
        }
    }
);


/*
============================================================
UPDATE BANK ACCOUNT
============================================================

PUT /api/bank-accounts/:accountId

Todos os campos são opcionais, mas os campos enviados
são validados pelo serviço.

============================================================
*/

router.put(
    "/bank-accounts/:accountId",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const body =
                getBody(
                    req
                );


            const result =
                await updateBankAccount(

                    req.auth.merchantId,

                    req.params.accountId,

                    body
                );


            return successResponse(

                res,

                result
            );
        }

        catch (
            error
        ) {

            return sendError(
                res,
                error
            );
        }
    }
);


/*
============================================================
SET ACCOUNT STATUS
============================================================

PATCH /api/bank-accounts/:accountId/status

Body:

{
    "active": true
}

ou

{
    "active": false
}

============================================================
*/

router.patch(
    "/bank-accounts/:accountId/status",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const body =
                getBody(
                    req
                );


            if (
                typeof body.active !==
                "boolean"
            ) {

                const error =
                    new Error(
                        "O campo active deve ser true ou false."
                    );


                error.code =
                    "INVALID_ACCOUNT_STATUS";


                error.statusCode =
                    400;


                throw error;
            }


            const result =
                await setBankAccountStatus(

                    req.auth.merchantId,

                    req.params.accountId,

                    body.active
                );


            return successResponse(

                res,

                result
            );
        }

        catch (
            error
        ) {

            return sendError(
                res,
                error
            );
        }
    }
);


/*
============================================================
SET PRIMARY ACCOUNT
============================================================

PATCH /api/bank-accounts/:accountId/primary

Não necessita body.

============================================================
*/

router.patch(
    "/bank-accounts/:accountId/primary",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const result =
                await setPrimaryBankAccount(

                    req.auth.merchantId,

                    req.params.accountId
                );


            return successResponse(

                res,

                result
            );
        }

        catch (
            error
        ) {

            return sendError(
                res,
                error
            );
        }
    }
);


/*
============================================================
DELETE BANK ACCOUNT
============================================================

DELETE /api/bank-accounts/:accountId

============================================================
*/

router.delete(
    "/bank-accounts/:accountId",

    authenticateRequest,

    async (
        req,
        res
    ) => {

        try {

            const result =
                await deleteBankAccount(

                    req.auth.merchantId,

                    req.params.accountId
                );


            return successResponse(

                res,

                result
            );
        }

        catch (
            error
        ) {

            return sendError(
                res,
                error
            );
        }
    }
);


/*
============================================================
PUBLIC CHECKOUT BANK ACCOUNTS
============================================================

GET /api/public/merchants/:merchantId/bank-accounts

Esta rota é utilizada pelo checkout público.

IMPORTANTE:

O checkout recebe somente:

- contas ativas;
- banco;
- nome da conta;
- titular;
- IBAN;
- moeda;
- ordem;
- conta principal.

Não recebe:

- merchantId interno;
- timestamps;
- dados administrativos;
- campos internos do MongoDB.

============================================================
*/

router.get(
    "/public/merchants/:merchantId/bank-accounts",

    async (
        req,
        res
    ) => {

        try {

            const merchantId =
                String(
                    req.params.merchantId ||
                    ""
                ).trim();


            if (
                !merchantId
            ) {

                const error =
                    new Error(
                        "Comerciante inválido."
                    );


                error.code =
                    "INVALID_MERCHANT_ID";


                error.statusCode =
                    400;


                throw error;
            }


            const accounts =
                await getPublicBankAccounts(

                    merchantId
                );


            return successResponse(

                res,

                {

                    items:
                        accounts,

                    total:
                        accounts.length
                }
            );
        }

        catch (
            error
        ) {

            return sendError(
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

        return errorResponse(

            res,

            404,

            "BANK_ACCOUNT_ROUTE_NOT_FOUND",

            "A rota de conta bancária solicitada não existe."
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

            "[HONEY PAY BANK ACCOUNT ROUTE ERROR]",

            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }


        return sendError(

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
