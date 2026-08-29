/*
============================================================
HONEY PAY
INVOICE ROUTES
V1.0.0
============================================================

ROTAS DE FATURAS / COBRANÇAS

------------------------------------------------------------
AUTHENTICATED
------------------------------------------------------------

POST   /api/invoices
GET    /api/invoices
GET    /api/invoices/statistics
GET    /api/invoices/:invoiceId
PATCH  /api/invoices/:invoiceId
POST   /api/invoices/:invoiceId/cancel

------------------------------------------------------------
PUBLIC CHECKOUT
------------------------------------------------------------

GET    /api/pay/:publicToken

------------------------------------------------------------
SECURITY
------------------------------------------------------------

- Rotas privadas exigem JWT
- Faturas pertencem ao comerciante autenticado
- Checkout público usa token aleatório
- Nunca expõe merchantId no checkout
- Erros normalizados
- Nenhuma stack trace é enviada ao cliente

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
    createInvoice,
    listInvoices,
    getInvoice,
    updateInvoice,
    cancelInvoice,
    getPublicInvoice,
    getInvoiceStatistics
} from "./invoice.js";


/*
============================================================
ROUTER
============================================================
*/

const router =
    express.Router();


/*
============================================================
LOCAL ERROR HANDLER
============================================================
*/

function handleRouteError(
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
CREATE INVOICE
============================================================

POST /api/invoices

BODY:

{
    "amount": 15000,
    "description": "Produto X",
    "customer": {
        "name": "Cliente",
        "phone": "+244900000000",
        "email": "cliente@email.com"
    },
    "bankAccountIds": [
        "..."
    ]
}

============================================================
*/

router.post(
    "/invoices",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await createInvoice(

                    req.auth.merchantId,

                    req.body ||
                    {}
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

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
LIST INVOICES
============================================================

GET /api/invoices

Query:

?status=PAID
?limit=50
?skip=0

============================================================
*/

router.get(
    "/invoices",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await listInvoices(

                    req.auth.merchantId,

                    {

                        status:
                            req.query.status,

                        limit:
                            req.query.limit,

                        skip:
                            req.query.skip
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

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
INVOICE STATISTICS
============================================================

GET /api/invoices/statistics

============================================================
*/

router.get(
    "/invoices/statistics",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getInvoiceStatistics(

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

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
GET SINGLE INVOICE
============================================================

GET /api/invoices/:invoiceId

============================================================
*/

router.get(
    "/invoices/:invoiceId",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getInvoice(

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

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
UPDATE INVOICE
============================================================

PATCH /api/invoices/:invoiceId

Apenas faturas ainda editáveis podem ser alteradas.

============================================================
*/

router.patch(
    "/invoices/:invoiceId",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await updateInvoice(

                    req.auth.merchantId,

                    req.params.invoiceId,

                    req.body ||
                    {}
                );


            return successResponse(

                res,

                result
            );
        }

        catch (
            error
        ) {

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
CANCEL INVOICE
============================================================

POST /api/invoices/:invoiceId/cancel

============================================================
*/

router.post(
    "/invoices/:invoiceId/cancel",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await cancelInvoice(

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

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
PUBLIC PAYMENT CHECKOUT
============================================================

GET /api/pay/:publicToken

Não exige autenticação.

Este endpoint é utilizado pelo comprador.

============================================================
*/

router.get(
    "/pay/:publicToken",
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getPublicInvoice(

                    req.params.publicToken
                );


            return successResponse(

                res,

                result
            );
        }

        catch (
            error
        ) {

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
ROUTE 404
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

            "INVOICE_ROUTE_NOT_FOUND",

            "A rota de fatura solicitada não existe."
        );
    }
);


/*
============================================================
ERROR HANDLER
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

            "[HONEY PAY INVOICE ROUTE ERROR]",

            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }


        return handleRouteError(

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
