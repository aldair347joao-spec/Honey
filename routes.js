import express from "express";


import {
    router as authRouter
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
HONEY PAY
MAIN API ROUTES
V2.0.0
============================================================

AUTHENTICATION:
Google ONLY.

============================================================
*/


/*
============================================================
HEALTH
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
                database?.connected === true;


            return successResponse(
                res,
                {

                    service:
                        "Honey Pay API",

                    version:
                        "2.0.0",

                    status:
                        operational
                            ? "operational"
                            : "degraded",

                    database,

                    authentication:
                        "google",

                    timestamp:
                        new Date()
                            .toISOString()

                }
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

                normalized.message

            );

        }

    }
);


/*
============================================================
GOOGLE AUTH ROUTES
============================================================

/api/auth/google
/api/auth/google/callback
/api/auth/me

============================================================
*/

router.use(
    authRouter
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

                normalized.message

            );

        }

    }
);


/*
============================================================
DEPRECATED PASSWORD ROUTES
============================================================

Bloqueamos explicitamente os antigos endpoints.

============================================================
*/

router.all(
    [
        "/auth/register",
        "/auth/login",
        "/auth/change-password"
    ],
    (
        req,
        res
    ) => {

        return errorResponse(

            res,

            410,

            "PASSWORD_AUTH_DISABLED",

            "A autenticação por email e password foi desativada. Entre exclusivamente com a sua conta Google."

        );

    }
);


/*
============================================================
API 404
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
ROUTE ERROR
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
            "[API ROUTE ERROR]",
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


export default router;
