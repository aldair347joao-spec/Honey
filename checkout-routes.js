/*
============================================================
HONEY PAY
CHECKOUT ROUTES
V1.0.1
============================================================

ROTAS PÚBLICAS DO CHECKOUT

------------------------------------------------------------
PUBLIC
------------------------------------------------------------

GET  /api/checkout/:publicToken
POST /api/checkout/:publicToken/payment-intent
GET  /api/checkout/:publicToken/payment/:paymentId

------------------------------------------------------------
INTERNAL
------------------------------------------------------------

A confirmação de pagamento NÃO é exposta através de uma
rota pública.

A confirmação deve ser executada pelo fluxo interno
autorizado da plataforma.

============================================================
*/

import express from "express";


import {
    getPublicCheckout,
    createPaymentIntent,
    getPublicPaymentStatus
} from "./checkout.js";


import {
    successResponse,
    errorResponse,
    normalizeError
} from "./utils.js";


/*
============================================================
ROUTER
============================================================
*/

const router =
    express.Router();


/*
============================================================
ERROR RESPONSE
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

        error.details ||
        null
    );
}


/*
============================================================
GET PUBLIC CHECKOUT
============================================================

GET

/api/checkout/:publicToken

Retorna somente os dados necessários para o cliente
visualizar e efetuar o pagamento.

Não exige autenticação.

============================================================
*/

router.get(

    "/:publicToken",

    async (
        req,
        res
    ) => {

        try {

            const {
                publicToken
            } =
                req.params;


            const result =
                await getPublicCheckout(
                    publicToken
                );


            return successResponse(

                res,

                result
            );
        }

        catch (error) {

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
CREATE PAYMENT INTENT
============================================================

POST

/api/checkout/:publicToken/payment-intent

Cria uma intenção de pagamento para a fatura.

Não confirma o pagamento.

============================================================
*/

router.post(

    "/:publicToken/payment-intent",

    async (
        req,
        res
    ) => {

        try {

            const {
                publicToken
            } =
                req.params;


            const result =
                await createPaymentIntent(

                    publicToken,

                    req.body ||
                    {}
                );


            return successResponse(

                res,

                result,

                result.created
                    ? 201
                    : 200
            );
        }

        catch (error) {

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
GET PAYMENT STATUS
============================================================

GET

/api/checkout/:publicToken/payment/:paymentId

Permite ao cliente consultar o estado do pagamento
associado à sua fatura pública.

============================================================
*/

router.get(

    "/:publicToken/payment/:paymentId",

    async (
        req,
        res
    ) => {

        try {

            const {

                publicToken,

                paymentId

            } =
                req.params;


            const result =
                await getPublicPaymentStatus(

                    publicToken,

                    paymentId
                );


            return successResponse(

                res,

                result
            );
        }

        catch (error) {

            return handleRouteError(

                res,

                error
            );
        }
    }
);


/*
============================================================
404 CHECKOUT FALLBACK
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

            "CHECKOUT_ROUTE_NOT_FOUND",

            "A rota de checkout solicitada não existe."
        );
    }
);


/*
============================================================
ROUTE ERROR HANDLER
============================================================

Erros inesperados não devem expor stack trace ao cliente.
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

            "[CHECKOUT API ERROR]",

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
