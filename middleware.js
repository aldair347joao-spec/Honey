import {
    getMerchantById
} from "./auth.js";


import {
    verifyAccessToken,
    extractBearerToken
} from "./security.js";


/*
============================================================
HONEY PAY
AUTHENTICATION & AUTHORIZATION MIDDLEWARE
V2.0.0
============================================================

AUTENTICAÇÃO:
Google → Honey Pay JWT → API.

============================================================
*/


/*
============================================================
TOKEN
============================================================
*/

function extractToken(
    req
) {

    return extractBearerToken(

        req.get(
            "authorization"
        )

    );

}


/*
============================================================
AUTHENTICATE
============================================================
*/

export async function authenticate(
    req,
    res,
    next
) {

    try {

        const token =
            extractToken(
                req
            );


        if (
            !token
        ) {

            const error =
                new Error(
                    "Autenticação necessária."
                );


            error.code =
                "AUTHENTICATION_REQUIRED";


            error.statusCode =
                401;


            throw error;

        }


        const payload =
            verifyAccessToken(
                token
            );


        const merchantId =
            payload?.merchantId ||
            payload?.sub;


        if (
            !merchantId ||
            typeof merchantId !==
            "string"
        ) {

            const error =
                new Error(
                    "Sessão inválida."
                );


            error.code =
                "INVALID_AUTH_PAYLOAD";


            error.statusCode =
                401;


            throw error;

        }


        /*
        ----------------------------------------------------
        O JWT da API deve ter sido emitido pela Honey Pay.
        ----------------------------------------------------
        */

        if (
            payload?.authProvider &&
            payload.authProvider !==
                "google"
        ) {

            const error =
                new Error(
                    "Esta sessão não utiliza Google."
                );


            error.code =
                "INVALID_AUTH_PROVIDER";


            error.statusCode =
                401;


            throw error;

        }


        const merchant =
            await getMerchantById(
                merchantId
            );


        if (
            !merchant
        ) {

            const error =
                new Error(
                    "Conta não encontrada."
                );


            error.code =
                "MERCHANT_NOT_FOUND";


            error.statusCode =
                401;


            throw error;

        }


        const accountStatus =
            merchant.accountStatus ||
            merchant.status ||
            "active";


        if (
            accountStatus !==
            "active"
        ) {

            const error =
                new Error(
                    "A conta não está ativa."
                );


            error.code =
                "ACCOUNT_NOT_ACTIVE";


            error.statusCode =
                403;


            throw error;

        }


        req.auth = {

            merchantId,

            userId:
                merchantId,

            merchant,

            tokenPayload:
                payload

        };


        req.user =
            merchant;


        return next();

    }

    catch (
        error
    ) {

        const statusCode =
            Number.isInteger(
                error?.statusCode
            )
                ? error.statusCode
                : 401;


        return res
            .status(
                statusCode
            )
            .json({

                success:
                    false,

                code:
                    error?.code ||
                    "AUTHENTICATION_FAILED",

                message:
                    error?.message ||
                    "Não foi possível autenticar o pedido."

            });

    }

}


export const authenticateRequest =
    authenticate;


/*
============================================================
OPTIONAL AUTH
============================================================
*/

export async function optionalAuthenticate(
    req,
    res,
    next
) {

    try {

        const token =
            extractToken(
                req
            );


        if (
            !token
        ) {

            return next();

        }


        const payload =
            verifyAccessToken(
                token
            );


        const merchantId =
            payload?.merchantId ||
            payload?.sub;


        if (
            !merchantId
        ) {

            return next();

        }


        const merchant =
            await getMerchantById(
                merchantId
            );


        if (
            !merchant ||
            merchant.accountStatus !==
                "active"
        ) {

            return next();

        }


        req.auth = {

            merchantId,

            userId:
                merchantId,

            merchant,

            tokenPayload:
                payload

        };


        req.user =
            merchant;


        return next();

    }

    catch (
        error
    ) {

        return next();

    }

}


/*
============================================================
ACTIVE ACCOUNT
============================================================
*/

export function requireActiveAccount(
    req,
    res,
    next
) {

    if (
        !req.auth?.merchantId
    ) {

        return res
            .status(401)
            .json({

                success:
                    false,

                code:
                    "AUTHENTICATION_REQUIRED",

                message:
                    "Autenticação necessária."

            });

    }


    const status =
        req.auth.merchant?.accountStatus ||
        "active";


    if (
        status !==
        "active"
    ) {

        return res
            .status(403)
            .json({

                success:
                    false,

                code:
                    "ACCOUNT_NOT_ACTIVE",

                message:
                    "A conta não está ativa."

            });

    }


    return next();

}


/*
============================================================
PLAN
============================================================
*/

export function requirePlan(
    requiredPlans
) {

    const plans =
        Array.isArray(
            requiredPlans
        )
            ? requiredPlans
            : [
                requiredPlans
            ];


    return (
        req,
        res,
        next
    ) => {

        if (
            !req.auth?.merchantId
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    code:
                        "AUTHENTICATION_REQUIRED",

                    message:
                        "Autenticação necessária."

                });

        }


        const merchant =
            req.auth.merchant;


        const subscription =
            merchant?.subscription ||
            {};


        const plan =
            String(

                subscription.plan ||
                merchant.plan ||
                "free"

            ).toLowerCase();


        if (
            !plans
                .map(
                    value =>
                        String(
                            value
                        )
                        .toLowerCase()
                )
                .includes(
                    plan
                )
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    code:
                        "PLAN_REQUIRED",

                    message:
                        "O plano atual não permite esta operação.",

                    requiredPlans:
                        plans

                });

        }


        return next();

    };

}


/*
============================================================
OWNERSHIP
============================================================
*/

export function assertMerchantOwnership(
    req,
    resource
) {

    const authenticatedMerchantId =
        req?.auth?.merchantId;


    if (
        !authenticatedMerchantId
    ) {

        const error =
            new Error(
                "Autenticação necessária."
            );


        error.code =
            "AUTHENTICATION_REQUIRED";


        error.statusCode =
            401;


        throw error;

    }


    const resourceMerchantId =
        resource?.merchantId ||
        resource?.ownerId ||
        resource?.userId;


    if (
        !resourceMerchantId
    ) {

        const error =
            new Error(
                "Não foi possível verificar a propriedade do recurso."
            );


        error.code =
            "OWNERSHIP_UNVERIFIABLE";


        error.statusCode =
            403;


        throw error;

    }


    if (
        String(
            resourceMerchantId
        ) !==
        String(
            authenticatedMerchantId
        )
    ) {

        const error =
            new Error(
                "Não tem permissão para aceder a este recurso."
            );


        error.code =
            "RESOURCE_FORBIDDEN";


        error.statusCode =
            403;


        throw error;

    }


    return true;

}


/*
============================================================
OWNERSHIP MIDDLEWARE
============================================================
*/

export function requireMerchantOwnership(
    req,
    res,
    next
) {

    try {

        const authenticatedMerchantId =
            req?.auth?.merchantId;


        if (
            !authenticatedMerchantId
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    code:
                        "AUTHENTICATION_REQUIRED",

                    message:
                        "Autenticação necessária."

                });

        }


        const suppliedMerchantId =
            req.params?.merchantId ||
            req.body?.merchantId ||
            req.query?.merchantId;


        if (
            !suppliedMerchantId
        ) {

            req.merchantId =
                authenticatedMerchantId;


            return next();

        }


        if (
            String(
                suppliedMerchantId
            ) !==
            String(
                authenticatedMerchantId
            )
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    code:
                        "RESOURCE_FORBIDDEN",

                    message:
                        "Não tem permissão para aceder a este recurso."

                });

        }


        req.merchantId =
            authenticatedMerchantId;


        return next();

    }

    catch (
        error
    ) {

        return res
            .status(403)
            .json({

                success:
                    false,

                code:
                    error?.code ||
                    "RESOURCE_FORBIDDEN",

                message:
                    error?.message ||
                    "Não tem permissão para aceder a este recurso."

            });

    }

}


export default {

    authenticate,

    authenticateRequest,

    optionalAuthenticate,

    requirePlan,

    requireActiveAccount,

    assertMerchantOwnership,

    requireMerchantOwnership

};
