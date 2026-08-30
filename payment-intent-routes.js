/*
============================================================
HONEY PAY
PAYMENT INTENT ROUTES
V1.0.0
============================================================
*/

import express from "express";

import {
    authenticateRequest
} from "./middleware.js";

import {
    createPaymentIntent,
    getPaymentIntent,
    cancelPaymentIntent
} from "./payment-intent.js";

import {
    successResponse,
    errorResponse,
    normalizeError
} from "./utils.js";


const router =
    express.Router();


/*
============================================================
CREATE PAYMENT INTENT
============================================================

POST

/api/v1/payment-intents

Authorization:
Bearer JWT

Idempotency-Key:
obrigatória para integração de produção.

============================================================
*/

router.post(
    "/payment-intents",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await createPaymentIntent(
                    req.auth.merchantId,

                    req.body,

                    {

                        idempotencyKey:
                            req.get(
                                "Idempotency-Key"
                            ),

                        requestId:
                            req.requestId,

                        source:
                            "api",

                        actorId:
                            req.auth.merchantId

                    }
                );


            return successResponse(
                res,

                result,

                result.idempotentReplay
                    ? 200
                    : 201
            );

        }

        catch (
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

    }
);


/*
============================================================
GET PAYMENT INTENT
============================================================

GET

/api/v1/payment-intents/:publicId

============================================================
*/

router.get(
    "/payment-intents/:publicId",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getPaymentIntent(
                    req.auth.merchantId,

                    req.params.publicId
                );


            return successResponse(
                res,

                result
            );

        }

        catch (
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

    }
);


/*
============================================================
CANCEL PAYMENT INTENT
============================================================
*/

router.post(
    "/payment-intents/:publicId/cancel",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await cancelPaymentIntent(
                    req.auth.merchantId,

                    req.params.publicId,

                    {

                        requestId:
                            req.requestId,

                        source:
                            "merchant",

                        actorId:
                            req.auth.merchantId

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

    }
);


export default router;
