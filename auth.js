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
GET  /api/auth/plan
POST /api/auth/change-password

------------------------------------------------------------
IMPORTANTE
------------------------------------------------------------

Este router NÃO possui fallback 404 próprio.

O fallback global é tratado pelo server.js depois de
todos os routers da API serem executados.

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


/*
============================================================
ROUTER
============================================================
*/

const router =
    express.Router();


/*
============================================================
HEALTH CHECK
============================================================

GET /api/health

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


            const operational =
                database?.connected ===
                true;


            return successResponse(

                res,

                {

                    service:
                        "Honey Pay API",

                    version:
                        "1.0.0",

                    status:
                        operational
                            ? "operational"
                            : "degraded",

                    database,

                    timestamp:
                        new Date()
                            .toISOString()
                }
            );

        }

        catch (
            error
        ) {

            console.error(
                "[API HEALTH ERROR]",
                error
            );


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

POST /api/auth/register

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

        catch (
            error
        ) {

            console.error(
                "[AUTH REGISTER ERROR]",
                error
            );


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
    }
);


/*
============================================================
LOGIN
============================================================

POST /api/auth/login

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

        catch (
            error
        ) {

            console.error(
                "[AUTH LOGIN ERROR]",
                error
            );


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
    }
);


/*
============================================================
AUTHENTICATED PROFILE
============================================================

GET /api/auth/me

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

        catch (
            error
        ) {

            console.error(
                "[AUTH PROFILE ERROR]",
                error
            );


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

GET /api/auth/plan

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

        catch (
            error
        ) {

            console.error(
                "[AUTH PLAN ERROR]",
                error
            );


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

POST /api/auth/change-password

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

            const body =
                req.body &&
                typeof req.body ===
                    "object" &&
                !Array.isArray(
                    req.body
                )

                    ? req.body

                    : {};


            const currentPassword =
                body.currentPassword;


            const newPassword =
                body.newPassword;


            if (
                typeof currentPassword !==
                "string" ||
                typeof newPassword !==
                "string"
            ) {

                const error =
                    new Error(
                        "A password atual e a nova password são obrigatórias."
                    );


                error.code =
                    "INVALID_PASSWORD_REQUEST";


                error.statusCode =
                    400;


                throw error;
            }


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

        catch (
            error
        ) {

            console.error(
                "[AUTH CHANGE PASSWORD ERROR]",
                error
            );


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
ROUTER ERROR HANDLER
============================================================

Trata erros lançados dentro deste router.

Não existe fallback 404 aqui.

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
            "[API ROUTES ERROR]",
            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }


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
);


/*
============================================================
EXPORT
============================================================
*/

export default router;
