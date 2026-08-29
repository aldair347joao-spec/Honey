/*
============================================================
HONEY PAY
AUTHENTICATION & AUTHORIZATION MIDDLEWARE
V1.0.0
============================================================

RESPONSABILIDADES

- Validar JWT
- Identificar comerciante autenticado
- Proteger rotas privadas
- Verificar conta ativa
- Verificar plano
- Verificar propriedade de recursos
- Não expor informações sensíveis

============================================================
*/

import jwt from "jsonwebtoken";


import {
    getMerchantById
} from "./auth.js";


/*
============================================================
CONFIGURATION
============================================================
*/

const JWT_SECRET =
    process.env.JWT_SECRET ||
    "";


/*
============================================================
JWT VALIDATION
============================================================
*/

function validateJwtConfiguration() {

    if (
        !JWT_SECRET ||
        JWT_SECRET.length <
        32
    ) {

        const error =
            new Error(
                "JWT_SECRET não está configurado corretamente."
            );


        error.code =
            "AUTH_CONFIGURATION_ERROR";


        error.statusCode =
            500;


        throw error;
    }
}


/*
============================================================
TOKEN EXTRACTION
============================================================
*/

function extractBearerToken(
    req
) {

    const authorization =
        req.get(
            "authorization"
        );


    if (
        !authorization
    ) {

        return null;
    }


    const parts =
        authorization
            .trim()
            .split(
                /\s+/
            );


    if (
        parts.length !==
        2
    ) {

        return null;
    }


    if (
        parts[0].toLowerCase() !==
        "bearer"
    ) {

        return null;
    }


    return parts[1] || null;
}


/*
============================================================
VERIFY TOKEN
============================================================
*/

function verifyToken(
    token
) {

    validateJwtConfiguration();


    if (
        !token ||
        typeof token !==
        "string"
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


    try {

        return jwt.verify(
            token,
            JWT_SECRET,
            {

                algorithms: [
                    "HS256"
                ]
            }
        );
    }

    catch (
        error
    ) {

        const authError =
            new Error(
                "Sessão inválida ou expirada."
            );


        authError.code =
            "INVALID_TOKEN";


        authError.statusCode =
            401;


        throw authError;
    }
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
            extractBearerToken(
                req
            );


        const payload =
            verifyToken(
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


        /*
        ----------------------------------------------------
        Verificação de conta
        ----------------------------------------------------
        */

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


        /*
        ----------------------------------------------------
        Contexto autenticado
        ----------------------------------------------------
        */

        req.auth = {

            merchantId,

            userId:
                merchantId,

            merchant,

            tokenPayload:
                payload
        };


        /*
        ----------------------------------------------------
        Compatibilidade.

        Alguns módulos podem consultar req.user.
        ----------------------------------------------------
        */

        req.user =
            merchant;


        next();
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
            .json(
                {

                    success:
                        false,

                    code:
                        error?.code ||
                        "AUTHENTICATION_FAILED",

                    message:
                        error?.message ||
                        "Não foi possível autenticar o pedido."
                }
            );
    }
}


/*
============================================================
AUTHENTICATE REQUEST
============================================================

Nome oficial utilizado pelas rotas da API.

============================================================
*/

export const authenticateRequest =
    authenticate;


/*
============================================================
OPTIONAL AUTHENTICATION
============================================================

Permite continuar sem autenticação.

Se existir token válido, adiciona req.auth.

Se o token for inválido, não falha a request.

============================================================
*/

export async function optionalAuthenticate(
    req,
    res,
    next
) {

    try {

        const token =
            extractBearerToken(
                req
            );


        if (
            !token
        ) {

            return next();
        }


        const payload =
            verifyToken(
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
            !merchant
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
REQUIRE ACTIVE ACCOUNT
============================================================
*/

export function requireActiveAccount(
    req,
    res,
    next
) {

    if (
        !req.auth ||
        !req.auth.merchantId
    ) {

        return res
            .status(
                401
            )
            .json(
                {

                    success:
                        false,

                    code:
                        "AUTHENTICATION_REQUIRED",

                    message:
                        "Autenticação necessária."
                }
            );
    }


    const merchant =
        req.auth.merchant;


    const status =
        merchant?.accountStatus ||
        merchant?.status ||
        "active";


    if (
        status !==
        "active"
    ) {

        return res
            .status(
                403
            )
            .json(
                {

                    success:
                        false,

                    code:
                        "ACCOUNT_NOT_ACTIVE",

                    message:
                        "A conta não está ativa."
                }
            );
    }


    return next();
}


/*
============================================================
REQUIRE PLAN
============================================================

Uso:

requirePlan("pro")

ou:

requirePlan(["pro", "business"])

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
            !req.auth ||
            !req.auth.merchantId
        ) {

            return res
                .status(
                    401
                )
                .json(
                    {

                        success:
                            false,

                        code:
                            "AUTHENTICATION_REQUIRED",

                        message:
                            "Autenticação necessária."
                    }
                );
        }


        const merchant =
            req.auth.merchant;


        const subscription =
            merchant?.subscription ||
            {};


        const plan =
            (
                subscription.plan ||
                merchant.plan ||
                "free"
            )
            .toLowerCase();


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
                .status(
                    403
                )
                .json(
                    {

                        success:
                            false,

                        code:
                            "PLAN_REQUIRED",

                        message:
                            "O plano atual não permite esta operação.",

                        requiredPlans:
                            plans
                    }
                );
        }


        return next();
    };
}


/*
============================================================
MERCHANT OWNERSHIP
============================================================

Garante que um recurso pertence ao comerciante autenticado.

Pode receber:

- merchantId diretamente
- objeto com merchantId
- ownerId
- userId

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
REQUIRE MERCHANT OWNERSHIP MIDDLEWARE
============================================================

Permite proteger recursos quando o merchantId está:

- em req.params
- em req.body
- em req.query

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
                .status(
                    401
                )
                .json(
                    {

                        success:
                            false,

                        code:
                            "AUTHENTICATION_REQUIRED",

                        message:
                            "Autenticação necessária."
                    }
                );
        }


        const suppliedMerchantId =
            req.params?.merchantId ||
            req.body?.merchantId ||
            req.query?.merchantId;


        /*
        ----------------------------------------------------
        Se o endpoint não recebe merchantId do cliente,
        não há nada para comparar.

        O servidor deve utilizar req.auth.merchantId.
        ----------------------------------------------------
        */

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
                .status(
                    403
                )
                .json(
                    {

                        success:
                            false,

                        code:
                            "RESOURCE_FORBIDDEN",

                        message:
                            "Não tem permissão para aceder a este recurso."
                    }
                );
        }


        req.merchantId =
            authenticatedMerchantId;


        return next();
    }

    catch (
        error
    ) {

        return res
            .status(
                403
            )
            .json(
                {

                    success:
                        false,

                    code:
                        error?.code ||
                        "RESOURCE_FORBIDDEN",

                    message:
                        error?.message ||
                        "Não tem permissão para aceder a este recurso."
                }
            );
    }
}


/*
============================================================
EXPORT DEFAULT
============================================================
*/

export default {

    authenticate,

    authenticateRequest,

    optionalAuthenticate,

    requirePlan,

    requireActiveAccount,

    assertMerchantOwnership,

    requireMerchantOwnership
};
