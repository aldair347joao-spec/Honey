/*
============================================================
HONEY PAY
AUTHENTICATION + API ROUTES
V1.1.0
============================================================

RESPONSABILIDADES
------------------------------------------------------------

- Registo de comerciantes
- Login
- JWT
- Perfil autenticado
- Alteração de password
- Consulta de comerciante
- Consulta de subscrição
- Rotas /api/auth/*
- Health check

IMPORTANTE
------------------------------------------------------------

A autenticação da Honey Pay pertence à plataforma.

BITPAY NÃO É UTILIZADO NESTE ARQUIVO.

Os pagamentos da subscrição serão tratados pelo fluxo
SubscriptionPayment + BitPay.

Os pagamentos dos clientes dos comerciantes continuam
separados através de Invoice + Payment + BankAccount +
Receipt.

============================================================
*/


import express from "express";


/*
============================================================
MODELS
============================================================
*/

import {
    Merchant,
    Subscription
} from "./models.js";


/*
============================================================
SECURITY
============================================================
*/

import {
    hashPassword,
    comparePassword,
    normalizeEmail,
    normalizePhone,
    createAccessToken
} from "./security.js";


/*
============================================================
VALIDATORS
============================================================
*/

import {
    validateRegistrationInput,
    validateLoginInput,
    sanitizeRegistrationInput
} from "./validators.js";


/*
============================================================
PLANS
============================================================
*/

import {
    PLAN_FREE,
    getPlan,
    getPlanSummary
} from "./plans.js";


/*
============================================================
MIDDLEWARE
============================================================
*/

import {
    authenticate
} from "./middleware.js";


/*
============================================================
UTILS
============================================================
*/

import {
    successResponse,
    errorResponse,
    normalizeError,
    publicMerchant
} from "./utils.js";


/*
============================================================
DATABASE
============================================================
*/

import {
    getDatabaseStatus
} from "./database.js";


/*
============================================================
LOGGER
============================================================
*/

import {
    logSecurityEvent,
    logBusinessEvent
} from "./logger.js";


/*
============================================================
ROUTER
============================================================
*/

const router =
    express.Router();


/*
============================================================
ERROR FACTORY
============================================================
*/

function createAuthError(
    message,
    code,
    statusCode = 400
) {

    const error =
        new Error(
            message
        );

    error.code =
        code;

    error.statusCode =
        statusCode;

    return error;

}


/*
============================================================
GET MERCHANT BY ID
============================================================

Esta função existe como export nomeado porque outros módulos
da aplicação podem utilizá-la diretamente.

Nunca devolve passwordHash.

============================================================
*/

export async function getMerchantById(

    merchantId

) {

    if (
        !merchantId
    ) {

        throw createAuthError(

            "merchantId é obrigatório.",

            "MERCHANT_ID_REQUIRED",

            400

        );

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

        throw createAuthError(

            "Comerciante não encontrado.",

            "MERCHANT_NOT_FOUND",

            404

        );

    }


    return merchant;

}


/*
============================================================
GET MERCHANT BY EMAIL
============================================================
*/

export async function getMerchantByEmail(

    email

) {

    const normalizedEmail =
        normalizeEmail(
            email
        );


    if (
        !normalizedEmail
    ) {

        throw createAuthError(

            "Email inválido.",

            "INVALID_EMAIL",

            400

        );

    }


    return Merchant
        .findOne({

            email:
                normalizedEmail

        })
        .select(
            "+passwordHash"
        );

}


/*
============================================================
GET MERCHANT SUBSCRIPTION
============================================================
*/

export async function getMerchantSubscription(

    merchantId

) {

    if (
        !merchantId
    ) {

        throw createAuthError(

            "merchantId é obrigatório.",

            "MERCHANT_ID_REQUIRED",

            400

        );

    }


    return Subscription
        .findOne({

            merchantId

        });

}


/*
============================================================
CREATE DEFAULT SUBSCRIPTION
============================================================

Todas as contas começam no plano FREE.

IMPORTANTE:

FREE não significa pagamento BitPay.

A subscrição FREE é criada internamente.

============================================================
*/

export async function ensureMerchantSubscription(

    merchantId

) {

    if (
        !merchantId
    ) {

        throw createAuthError(

            "merchantId é obrigatório.",

            "MERCHANT_ID_REQUIRED",

            400

        );

    }


    let subscription =
        await Subscription
            .findOne({

                merchantId

            });


    if (
        subscription
    ) {

        return subscription;

    }


    subscription =
        await Subscription.create({

            merchantId,

            plan:
                PLAN_FREE,

            status:
                "active",

            startedAt:
                new Date(),

            expiresAt:
                null,

            cancelledAt:
                null

        });


    return subscription;

}


/*
============================================================
BUILD AUTH RESPONSE
============================================================
*/

export async function buildAuthResponse(

    merchant,

    subscription = null

) {

    if (
        !merchant
    ) {

        throw createAuthError(

            "Comerciante não encontrado.",

            "MERCHANT_NOT_FOUND",

            404

        );

    }


    const currentSubscription =
        subscription ||
        await ensureMerchantSubscription(

            merchant._id

        );


    const plan =
        getPlan(

            currentSubscription?.plan ||
            PLAN_FREE

        );


    const token =
        createAccessToken({

            merchantId:
                merchant._id.toString(),

            email:
                merchant.email,

            role:
                merchant.role ||
                "merchant"

        });


    return {

        token,

        accessToken:
            token,

        merchant:
            publicMerchant(
                merchant
            ),

        subscription: {

            id:
                currentSubscription?._id
                    ? currentSubscription._id.toString()
                    : null,

            plan:
                currentSubscription?.plan ||
                PLAN_FREE,

            status:
                currentSubscription?.status ||
                "active",

            startedAt:
                currentSubscription?.startedAt ||
                null,

            expiresAt:
                currentSubscription?.expiresAt ||
                null

        },

        plan: {

            id:
                plan.id,

            name:
                plan.name,

            priceKz:
                plan.priceKz,

            billing:
                plan.billing

        }

    };

}


/*
============================================================
REGISTER MERCHANT
============================================================
*/

export async function registerMerchant(

    input = {}

) {

    const validationErrors =
        validateRegistrationInput(
            input
        );


    if (
        validationErrors.length > 0
    ) {

        const error =
            createAuthError(

                "Dados de registo inválidos.",

                "VALIDATION_ERROR",

                400

            );

        error.details =
            validationErrors;

        throw error;

    }


    const data =
        sanitizeRegistrationInput(
            input
        );


    const email =
        normalizeEmail(
            data.email
        );


    /*
    --------------------------------------------------------
    VERIFICAR EMAIL
    --------------------------------------------------------
    */

    const existingMerchant =
        await Merchant
            .findOne({

                email

            });


    if (
        existingMerchant
    ) {

        logSecurityEvent(

            "duplicate_registration",

            {

                email

            }

        );


        throw createAuthError(

            "Já existe uma conta com este email.",

            "EMAIL_ALREADY_REGISTERED",

            409

        );

    }


    /*
    --------------------------------------------------------
    PASSWORD
    --------------------------------------------------------
    */

    const passwordHash =
        await hashPassword(

            data.password

        );


    /*
    --------------------------------------------------------
    PHONE
    --------------------------------------------------------
    */

    const phone =
        normalizePhone(
            data.phone
        );


    /*
    --------------------------------------------------------
    MERCHANT
    --------------------------------------------------------
    */

    const merchant =
        await Merchant.create({

            name:
                data.name,

            email,

            passwordHash,

            phone,

            businessName:
                data.businessName,

            accountStatus:
                "active",

            role:
                "merchant"

        });


    /*
    --------------------------------------------------------
    SUBSCRIPTION FREE
    --------------------------------------------------------
    */

    const subscription =
        await ensureMerchantSubscription(

            merchant._id

        );


    /*
    --------------------------------------------------------
    BUSINESS LOG
    --------------------------------------------------------
    */

    logBusinessEvent(

        "merchant_registered",

        {

            merchantId:
                merchant._id.toString(),

            plan:
                PLAN_FREE

        }

    );


    /*
    --------------------------------------------------------
    RESPONSE
    --------------------------------------------------------
    */

    return buildAuthResponse(

        merchant,

        subscription

    );

}


/*
============================================================
LOGIN MERCHANT
============================================================
*/

export async function loginMerchant(

    input = {},

    context = {}

) {

    const validationErrors =
        validateLoginInput(
            input
        );


    if (
        validationErrors.length > 0
    ) {

        const error =
            createAuthError(

                "Dados de login inválidos.",

                "VALIDATION_ERROR",

                400

            );

        error.details =
            validationErrors;

        throw error;

    }


    const email =
        normalizeEmail(
            input.email
        );


    /*
    --------------------------------------------------------
    PROCURAR CONTA
    --------------------------------------------------------
    */

    const merchant =
        await getMerchantByEmail(

            email

        );


    if (
        !merchant
    ) {

        logSecurityEvent(

            "login_failed",

            {

                reason:
                    "merchant_not_found",

                ip:
                    context.ip ||
                    null

            }

        );


        throw createAuthError(

            "Email ou password incorretos.",

            "INVALID_CREDENTIALS",

            401

        );

    }


    /*
    --------------------------------------------------------
    PASSWORD
    --------------------------------------------------------
    */

    const validPassword =
        await comparePassword(

            input.password,

            merchant.passwordHash

        );


    if (
        !validPassword
    ) {

        logSecurityEvent(

            "login_failed",

            {

                merchantId:
                    merchant._id.toString(),

                reason:
                    "invalid_password",

                ip:
                    context.ip ||
                    null

            }

        );


        throw createAuthError(

            "Email ou password incorretos.",

            "INVALID_CREDENTIALS",

            401

        );

    }


    /*
    --------------------------------------------------------
    ACCOUNT STATUS
    --------------------------------------------------------
    */

    if (
        merchant.accountStatus !==
        "active"
    ) {

        logSecurityEvent(

            "login_blocked",

            {

                merchantId:
                    merchant._id.toString(),

                accountStatus:
                    merchant.accountStatus,

                ip:
                    context.ip ||
                    null

            }

        );


        throw createAuthError(

            "Esta conta não está ativa.",

            "ACCOUNT_INACTIVE",

            403

        );

    }


    /*
    --------------------------------------------------------
    UPDATE LAST LOGIN
    --------------------------------------------------------
    */

    await Merchant
        .updateOne(

            {

                _id:
                    merchant._id

            },

            {

                $set: {

                    lastLoginAt:
                        new Date(),

                    lastLoginIp:
                        context.ip ||
                        null

                }

            }

        );


    /*
    --------------------------------------------------------
    SUBSCRIPTION
    --------------------------------------------------------
    */

    const subscription =
        await ensureMerchantSubscription(

            merchant._id

        );


    /*
    --------------------------------------------------------
    BUSINESS LOG
    --------------------------------------------------------
    */

    logBusinessEvent(

        "merchant_login",

        {

            merchantId:
                merchant._id.toString(),

            ip:
                context.ip ||
                null

        }

    );


    return buildAuthResponse(

        merchant,

        subscription

    );

}


/*
============================================================
GET AUTHENTICATED PROFILE
============================================================
*/

export async function getAuthenticatedProfile(

    merchantId

) {

    const merchant =
        await getMerchantById(

            merchantId

        );


    const subscription =
        await ensureMerchantSubscription(

            merchant._id

        );


    const plan =
        getPlan(

            subscription.plan

        );


    return {

        merchant:
            publicMerchant(
                merchant
            ),

        subscription: {

            id:
                subscription._id.toString(),

            plan:
                subscription.plan,

            status:
                subscription.status,

            startedAt:
                subscription.startedAt,

            expiresAt:
                subscription.expiresAt,

            cancelledAt:
                subscription.cancelledAt

        },

        plan: {

            id:
                plan.id,

            name:
                plan.name,

            priceKz:
                plan.priceKz,

            billing:
                plan.billing

        }

    };

}


/*
============================================================
CHANGE MERCHANT PASSWORD
============================================================
*/

export async function changeMerchantPassword(

    merchantId,

    currentPassword,

    newPassword

) {

    if (
        !merchantId
    ) {

        throw createAuthError(

            "merchantId é obrigatório.",

            "MERCHANT_ID_REQUIRED",

            400

        );

    }


    if (
        typeof currentPassword !==
        "string" ||

        typeof newPassword !==
        "string"

    ) {

        throw createAuthError(

            "Password inválida.",

            "INVALID_PASSWORD_REQUEST",

            400

        );

    }


    const merchant =
        await Merchant
            .findById(
                merchantId
            )
            .select(
                "+passwordHash"
            );


    if (
        !merchant
    ) {

        throw createAuthError(

            "Comerciante não encontrado.",

            "MERCHANT_NOT_FOUND",

            404

        );

    }


    const validCurrentPassword =
        await comparePassword(

            currentPassword,

            merchant.passwordHash

        );


    if (
        !validCurrentPassword
    ) {

        logSecurityEvent(

            "password_change_failed",

            {

                merchantId:
                    merchant._id.toString()

            }

        );


        throw createAuthError(

            "A password atual está incorreta.",

            "INVALID_CURRENT_PASSWORD",

            401

        );

    }


    if (
        newPassword.length <
        8
    ) {

        throw createAuthError(

            "A nova password deve possuir pelo menos 8 caracteres.",

            "PASSWORD_TOO_SHORT",

            400

        );

    }


    if (
        newPassword.length >
        128
    ) {

        throw createAuthError(

            "A nova password é demasiado longa.",

            "PASSWORD_TOO_LONG",

            400

        );

    }


    const newPasswordHash =
        await hashPassword(

            newPassword

        );


    await Merchant
        .updateOne(

            {

                _id:
                    merchant._id

            },

            {

                $set: {

                    passwordHash:
                        newPasswordHash

                }

            }

        );


    logSecurityEvent(

        "password_changed",

        {

            merchantId:
                merchant._id.toString()

        }

    );


    return {

        changed:
            true

    };

}


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


            const operational =
                database?.connected ===
                true;


            return successResponse(

                res,

                {

                    service:
                        "Honey Pay API",

                    version:
                        "1.1.0",

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
REGISTER ROUTE
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
LOGIN ROUTE
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
*/

router.get(

    "/auth/me",

    authenticate,

    async (

        req,
        res

    ) => {

        try {

            const result =
                await getAuthenticatedProfile(

                    req.user.merchantId

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
*/

router.get(

    "/auth/plan",

    authenticate,

    async (

        req,
        res

    ) => {

        try {

            const result =
                await getPlanSummary(

                    req.user.merchantId

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
CHANGE PASSWORD ROUTE
============================================================
*/

router.post(

    "/auth/change-password",

    authenticate,

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

                throw createAuthError(

                    "A password atual e a nova password são obrigatórias.",

                    "INVALID_PASSWORD_REQUEST",

                    400

                );

            }


            const result =
                await changeMerchantPassword(

                    req.user.merchantId,

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
*/

router.use(

    (
        error,
        req,
        res,
        next

    ) => {

        console.error(

            "[AUTH ROUTER ERROR]",

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
NAMED EXPORTS
============================================================
*/

export {

    router

};


/*
============================================================
DEFAULT EXPORT
============================================================
*/

export default router;
