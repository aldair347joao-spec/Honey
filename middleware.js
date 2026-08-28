import {
    extractBearerToken,
    verifyAccessToken
} from "./security.js";

import {
    Merchant,
    Subscription
} from "./models.js";

import {
    logSecurityEvent
} from "./logger.js";


/*
============================================================
HONEY PAY
MIDDLEWARE
V1.0.0
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Autenticação JWT
- Carregamento do comerciante autenticado
- Verificação de conta ativa
- Verificação de plano
- Proteção de rotas
- Tratamento de erros de autenticação

============================================================
*/


/*
============================================================
AUTHENTICATE
============================================================

Middleware principal de autenticação.

Esperado:

Authorization: Bearer TOKEN

Depois da validação:

req.user
req.merchant
req.subscription

ficarão disponíveis para as rotas protegidas.
============================================================
*/

export async function authenticate(
    req,
    res,
    next
) {

    try {

        const authorization =
            req.headers.authorization;


        const token =
            extractBearerToken(
                authorization
            );


        if (
            !token
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "AUTH_REQUIRED",

                        message:
                            "Autenticação necessária."
                    },

                    requestId:
                        req.requestId
                });
        }


        /*
        ----------------------------------------------------
        Validar JWT
        ----------------------------------------------------
        */

        let payload;


        try {

            payload =
                verifyAccessToken(
                    token
                );

        }

        catch (error) {

            logSecurityEvent(
                "invalid_jwt",
                {
                    requestId:
                        req.requestId,

                    ip:
                        req.ip
                }
            );


            return res
                .status(401)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "INVALID_TOKEN",

                        message:
                            "Sessão inválida ou expirada."
                    },

                    requestId:
                        req.requestId
                });
        }


        /*
        ----------------------------------------------------
        Validar identidade presente no token
        ----------------------------------------------------
        */

        const merchantId =
            payload?.merchantId;


        if (
            !merchantId
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "INVALID_TOKEN_PAYLOAD",

                        message:
                            "Token de autenticação inválido."
                    },

                    requestId:
                        req.requestId
                });
        }


        /*
        ----------------------------------------------------
        Procurar comerciante.

        passwordHash não é carregado.
        ----------------------------------------------------
        */

        const merchant =
            await Merchant
                .findById(
                    merchantId
                )
                .lean();


        if (
            !merchant
        ) {

            logSecurityEvent(
                "merchant_not_found_for_token",
                {
                    requestId:
                        req.requestId,

                    ip:
                        req.ip
                }
            );


            return res
                .status(401)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "ACCOUNT_NOT_FOUND",

                        message:
                            "Conta não encontrada."
                    },

                    requestId:
                        req.requestId
                });
        }


        /*
        ----------------------------------------------------
        Verificar estado da conta
        ----------------------------------------------------
        */

        if (
            merchant.status !==
            "active"
        ) {

            logSecurityEvent(
                "inactive_account_access",
                {
                    requestId:
                        req.requestId,

                    accountStatus:
                        merchant.status,

                    ip:
                        req.ip
                }
            );


            return res
                .status(403)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "ACCOUNT_INACTIVE",

                        message:
                            "Esta conta não está ativa."
                    },

                    requestId:
                        req.requestId
                });
        }


        /*
        ----------------------------------------------------
        Procurar subscription.
        ----------------------------------------------------
        */

        const subscription =
            await Subscription
                .findOne({
                    merchantId:
                        merchant._id
                })
                .lean();


        /*
        ----------------------------------------------------
        Disponibilizar contexto autenticado.
        ----------------------------------------------------
        */

        req.user = {

            id:
                merchant._id.toString(),

            merchantId:
                merchant._id.toString(),

            email:
                merchant.email,

            name:
                merchant.name,

            businessName:
                merchant.businessName,

            slug:
                merchant.slug
        };


        req.merchant =
            merchant;


        req.subscription =
            subscription || {

                plan:
                    "free",

                status:
                    "active",

                monthlyPriceKz:
                    0
            };


        next();

    }

    catch (error) {

        next(error);
    }
}


/*
============================================================
OPTIONAL AUTHENTICATION
============================================================

Útil para endpoints que funcionam tanto para visitantes
como para utilizadores autenticados.

Exemplo futuro:

Checkout público.

Se não houver token, a request continua normalmente.

Se houver token inválido, não ignoramos o erro: devolvemos
401 para evitar comportamento ambíguo.
============================================================
*/

export async function optionalAuthenticate(
    req,
    res,
    next
) {

    try {

        const authorization =
            req.headers.authorization;


        if (
            !authorization
        ) {

            return next();
        }


        const token =
            extractBearerToken(
                authorization
            );


        if (
            !token
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "INVALID_AUTHORIZATION",

                        message:
                            "Cabeçalho de autenticação inválido."
                    },

                    requestId:
                        req.requestId
                });
        }


        let payload;


        try {

            payload =
                verifyAccessToken(
                    token
                );

        }

        catch (error) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "INVALID_TOKEN",

                        message:
                            "Sessão inválida ou expirada."
                    },

                    requestId:
                        req.requestId
                });
        }


        const merchantId =
            payload?.merchantId;


        if (
            !merchantId
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "INVALID_TOKEN_PAYLOAD",

                        message:
                            "Token de autenticação inválido."
                    },

                    requestId:
                        req.requestId
                });
        }


        const merchant =
            await Merchant
                .findById(
                    merchantId
                )
                .lean();


        if (
            !merchant
        ) {

            return res
                .status(401)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "ACCOUNT_NOT_FOUND",

                        message:
                            "Conta não encontrada."
                    },

                    requestId:
                        req.requestId
                });
        }


        if (
            merchant.status !==
            "active"
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "ACCOUNT_INACTIVE",

                        message:
                            "Esta conta não está ativa."
                    },

                    requestId:
                        req.requestId
                });
        }


        const subscription =
            await Subscription
                .findOne({
                    merchantId:
                        merchant._id
                })
                .lean();


        req.user = {

            id:
                merchant._id.toString(),

            merchantId:
                merchant._id.toString(),

            email:
                merchant.email,

            name:
                merchant.name,

            businessName:
                merchant.businessName,

            slug:
                merchant.slug
        };


        req.merchant =
            merchant;


        req.subscription =
            subscription || {

                plan:
                    "free",

                status:
                    "active",

                monthlyPriceKz:
                    0
            };


        next();

    }

    catch (error) {

        next(error);
    }
}


/*
============================================================
REQUIRE PLAN
============================================================

Middleware para funcionalidades que exigem determinado
plano.

Exemplo:

requirePlan("pro")

============================================================
*/

export function requirePlan(
    requiredPlan
) {

    return (
        req,
        res,
        next
    ) => {

        const subscription =
            req.subscription;


        if (
            !subscription
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "SUBSCRIPTION_REQUIRED",

                        message:
                            "É necessário possuir um plano ativo."
                    },

                    requestId:
                        req.requestId
                });
        }


        if (
            subscription.status !==
            "active"
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "SUBSCRIPTION_INACTIVE",

                        message:
                            "O plano desta conta não está ativo."
                    },

                    requestId:
                        req.requestId
                });
        }


        /*
        ----------------------------------------------------
        V1 possui apenas:

        free
        pro

        Portanto, PRO também satisfaz qualquer recurso
        PRO.
        ----------------------------------------------------
        */

        if (
            requiredPlan ===
            "pro" &&

            subscription.plan !==
            "pro"
        ) {

            return res
                .status(402)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "PRO_PLAN_REQUIRED",

                        message:
                            "Esta funcionalidade está disponível no plano Profissional."
                    },

                    upgrade: {

                        plan:
                            "pro",

                        monthlyPriceKz:
                            7500
                    },

                    requestId:
                        req.requestId
                });
        }


        next();
    };
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
        !req.merchant
    ) {

        return res
            .status(401)
            .json({

                success:
                    false,

                error: {

                    code:
                        "AUTH_REQUIRED",

                    message:
                        "Autenticação necessária."
                },

                requestId:
                    req.requestId
            });
    }


    if (
        req.merchant.status !==
        "active"
    ) {

        return res
            .status(403)
            .json({

                success:
                    false,

                error: {

                    code:
                        "ACCOUNT_INACTIVE",

                    message:
                        "Esta conta não está ativa."
                },

                requestId:
                    req.requestId
            });
    }


    next();
}


/*
============================================================
OWNERSHIP HELPER
============================================================

Utilizado pelos controllers para garantir que um recurso
pertence ao comerciante autenticado.
============================================================
*/

export function assertMerchantOwnership(
    resourceMerchantId,
    merchantId
) {

    if (
        !resourceMerchantId ||
        !merchantId
    ) {

        return false;
    }


    return String(
        resourceMerchantId
    ) === String(
        merchantId
    );
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    authenticate,

    optionalAuthenticate,

    requirePlan,

    requireActiveAccount,

    assertMerchantOwnership
};
