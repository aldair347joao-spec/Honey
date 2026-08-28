/*
============================================================
HONEY PAY
API ROUTES
V1.0.0
============================================================

ROTAS PRINCIPAIS DA API

------------------------------------------------------------
PUBLIC
------------------------------------------------------------
GET  /api/health
POST /api/auth/register
POST /api/auth/login

------------------------------------------------------------
AUTHENTICATED
------------------------------------------------------------
GET  /api/auth/me
POST /api/auth/change-password

============================================================
*/

import express from "express";


import {
    registerMerchant,
    loginMerchant,
    getAuthenticatedProfile,
    changeMerchantPassword
} from "./auth.js";


import {
    authenticateRequest
} from "./middleware.js";


import {
    successResponse,
    errorResponse,
    normalizeError
} from "./utils.js";


import {
    getPlanSummary
} from "./plans.js";


import {
    getDatabaseStatus
} from "./database.js";


const router =
    express.Router();


/*
============================================================
HEALTH CHECK
============================================================
*/

router.get(
    "/health",
    async (
        req,
        res
    ) => {

        try {

            const database =
                getDatabaseStatus();


            return successResponse(
                res,
                {

                    service:
                        "Honey Pay API",

                    version:
                        "1.0.0",

                    status:
                        "operational",

                    database,

                    timestamp:
                        new Date().toISOString()
                }
            );

        }

        catch (error) {

            const normalized =
                normalizeError(
                    error
                );


            return errorResponse(
                res,

                normalized.statusCode,

                normalized.code,

                normalized.message
            );
        }
    }
);


/*
============================================================
REGISTER
============================================================
*/

router.post(
    "/auth/register",
    async (
        req,
        res
    ) => {

        try {

            const result =
                await registerMerchant(
                    req.body
                );


            return successResponse(
                res,
                result,
                201
            );

        }

        catch (error) {

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
LOGIN
============================================================
*/

router.post(
    "/auth/login",
    async (
        req,
        res
    ) => {

        try {

            const result =
                await loginMerchant(
                    req.body,
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

        catch (error) {

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
AUTHENTICATED PROFILE
============================================================
*/

router.get(
    "/auth/me",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getAuthenticatedProfile(
                    req.auth.merchantId
                );


            return successResponse(
                res,
                result
            );

        }

        catch (error) {

            const normalized =
                normalizeError(
                    error
                );


            return errorResponse(
                res,

                normalized.statusCode,

                normalized.code,

                normalized.message
            );
        }
    }
);


/*
============================================================
PLAN SUMMARY
============================================================
*/

router.get(
    "/auth/plan",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const result =
                await getPlanSummary(
                    req.auth.merchantId
                );


            return successResponse(
                res,
                result
            );

        }

        catch (error) {

            const normalized =
                normalizeError(
                    error
                );


            return errorResponse(
                res,

                normalized.statusCode,

                normalized.code,

                normalized.message
            );
        }
    }
);


/*
============================================================
CHANGE PASSWORD
============================================================
*/

router.post(
    "/auth/change-password",
    authenticateRequest,
    async (
        req,
        res
    ) => {

        try {

            const {
                currentPassword,
                newPassword
            } =
                req.body || {};


            const result =
                await changeMerchantPassword(

                    req.auth.merchantId,

                    currentPassword,

                    newPassword
                );


            return successResponse(
                res,
                result
            );

        }

        catch (error) {

            const normalized =
                normalizeError(
                    error
                );


            return errorResponse(
                res,

                normalized.statusCode,

                normalized.code,

                normalized.message
            );
        }
    }
);


/*
============================================================
404 API FALLBACK
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

            "ROUTE_NOT_FOUND",

            "A rota solicitada não existe."
        );
    }
);


/*
============================================================
GLOBAL ROUTE ERROR HANDLER
============================================================

Esta função fica no final do router.

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
            "[API ERROR]",
            error
        );


        const normalized =
            normalizeError(
                error
            );


        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }


        return errorResponse(
            res,

            normalized.statusCode,

            normalized.code,

            normalized.message
        );
    }
);


/*
============================================================
EXPORT
============================================================
*/

export default router;
