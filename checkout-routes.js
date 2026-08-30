/*
============================================================
HONEY PAY
CHECKOUT ROUTES
V2.0.0
============================================================

CHECKOUT PÚBLICO

GET
/api/checkout/:publicToken

POST
/api/checkout/:publicToken/payment-intent

GET
/api/checkout/:publicToken/payment/:paymentId

------------------------------------------------------------
ARQUITECTURA

Checkout
   ↓
PaymentIntent
   ↓
Transaction
   ↓
PaymentEvent
   ↓
Legacy Payment
   ↓
Proof / Verification

------------------------------------------------------------
IMPORTANTE

O cliente nunca recebe dados internos do comerciante.

Nenhuma rota pública permite confirmar directamente
um pagamento.
============================================================
*/

import express from "express";


import {
    getPublicCheckout
} from "./checkout.js";


import {
    createCheckoutPaymentIntent,
    getCheckoutPaymentStatus
} from "./checkout-payment-intent.js";


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
ERROR HANDLER
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
GET PUBLIC CHECKOUT
============================================================

GET

/api/checkout/:publicToken

============================================================
*/

router.get(

    "/:publicToken",

    async (
        req,
        res
    ) => {

        try {

            const result =
                await getPublicCheckout(

                    req.params
                        .publicToken

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
CREATE PAYMENT INTENT
============================================================

POST

/api/checkout/:publicToken/payment-intent

============================================================
*/

router.post(

    "/:publicToken/payment-intent",

    async (
        req,
        res
    ) => {

        try {

            const result =
                await createCheckoutPaymentIntent(

                    req.params
                        .publicToken,

                    req.body ||
                    {},

                    {

                        idempotencyKey:
                            req.get(
                                "Idempotency-Key"
                            ),

                        requestId:
                            req.requestId

                    }

                );


            return successResponse(

                res,

                result,

                result.created
                    ? 201
                    : 200

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
GET PAYMENT STATUS
============================================================

GET

/api/checkout/:publicToken/payment/:paymentId

============================================================

Aceita:

- PaymentIntent public ID
- Legacy Payment ObjectId

============================================================
*/

router.get(

    "/:publicToken/payment/:paymentId",

    async (
        req,
        res
    ) => {

        try {

            const result =
                await getCheckoutPaymentStatus(

                    req.params
                        .publicToken,

                    req.params
                        .paymentId

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
CHECKOUT 404
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
CHECKOUT ERROR HANDLER
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

            {

                requestId:
                    req.requestId ||
                    null,

                method:
                    req.method,

                url:
                    req.originalUrl,

                error

            }

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
