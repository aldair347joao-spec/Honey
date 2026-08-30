import express from "express";

import {
    google
} from "googleapis";


import {
    Merchant,
    Subscription
} from "./models.js";


import {
    normalizeEmail,
    createAccessToken,
    createOAuthState,
    verifyOAuthState
} from "./security.js";


import {
    PLAN_FREE,
    getPlan,
    getPlanSummary
} from "./plans.js";


import {
    authenticate
} from "./middleware.js";


import {
    successResponse,
    errorResponse,
    normalizeError,
    publicMerchant
} from "./utils.js";


import {
    getDatabaseStatus
} from "./database.js";


import {
    logSecurityEvent,
    logBusinessEvent
} from "./logger.js";


import config from "./config.js";


/*
============================================================
HONEY PAY
GOOGLE AUTHENTICATION
V2.0.0
============================================================

ÚNICA AUTENTICAÇÃO:
Google OAuth 2.0 / OpenID Connect.

Não existe login por password.

============================================================
*/


const router =
    express.Router();


/*
============================================================
GOOGLE CLIENT
============================================================
*/

function getGoogleClient() {

    if (
        !config.google.clientId ||
        !config.google.clientSecret ||
        !config.google.callbackUrl
    ) {

        const error =
            new Error(
                "Google OAuth não está configurado."
            );


        error.code =
            "GOOGLE_AUTH_NOT_CONFIGURED";


        error.statusCode =
            500;


        throw error;

    }


    return new google.auth.OAuth2(

        config.google.clientId,

        config.google.clientSecret,

        config.google.callbackUrl

    );

}


/*
============================================================
AUTH ERROR
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
GET MERCHANT
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
GET MERCHANT BY GOOGLE ID
============================================================
*/

export async function getMerchantByGoogleId(
    googleId
) {

    if (
        typeof googleId !== "string" ||
        !googleId.trim()
    ) {

        return null;

    }


    return Merchant.findOne({

        googleId:
            googleId.trim()

    });

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

        return null;

    }


    return Merchant.findOne({

        email:
            normalizedEmail

    });

}


/*
============================================================
SUBSCRIPTION
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


    return Subscription.findOne({

        merchantId

    });

}


/*
============================================================
ENSURE FREE SUBSCRIPTION
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
        await Subscription.findOne({

            merchantId

        });


    if (
        subscription
    ) {

        return subscription;

    }


    try {

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

    }

    catch (
        error
    ) {

        /*
        ----------------------------------------------------
        Concorrência: outra request pode ter criado a
        subscription entretanto.
        ----------------------------------------------------
        */

        if (
            error?.code === 11000
        ) {

            subscription =
                await Subscription.findOne({

                    merchantId

                });

        }
        else {

            throw error;

        }

    }


    return subscription;

}


/*
============================================================
AUTH RESPONSE
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
                "merchant",

            authProvider:
                "google"

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
GOOGLE AUTH URL
============================================================
*/

export function createGoogleAuthorizationUrl(
    context = {}
) {

    const state =
        createOAuthState({

            ip:
                context.ip ||
                null,

            userAgent:
                context.userAgent ||
                null

        });


    const client =
        getGoogleClient();


    return client.generateAuthUrl({

        access_type:
            "online",

        scope:
            config.google.scopes,

        include_granted_scopes:
            true,

        state,

        prompt:
            "select_account"

    });

}


/*
============================================================
GOOGLE CALLBACK
============================================================
*/

export async function authenticateWithGoogle(
    code,
    state,
    context = {}
) {

    if (
        typeof code !== "string" ||
        !code
    ) {

        throw createAuthError(
            "Código Google ausente.",
            "GOOGLE_CODE_MISSING",
            400
        );

    }


    if (
        typeof state !== "string" ||
        !state
    ) {

        throw createAuthError(
            "Estado OAuth ausente.",
            "GOOGLE_STATE_MISSING",
            400
        );

    }


    let statePayload;

    try {

        statePayload =
            verifyOAuthState(
                state
            );

    }

    catch (
        error
    ) {

        logSecurityEvent(
            "google_oauth_state_invalid",
            {
                ip:
                    context.ip ||
                    null
            }
        );


        throw createAuthError(
            "A sessão de autenticação Google é inválida ou expirou.",
            "GOOGLE_INVALID_STATE",
            401
        );

    }


    if (
        statePayload?.purpose !==
        "google-oauth-state"
    ) {

        throw createAuthError(
            "Estado OAuth inválido.",
            "GOOGLE_INVALID_STATE",
            401
        );

    }


    const client =
        getGoogleClient();


    let tokens;

    try {

        const tokenResponse =
            await client.getToken(
                code
            );


        tokens =
            tokenResponse.tokens;

    }

    catch (
        error
    ) {

        console.error(
            "[GOOGLE TOKEN EXCHANGE ERROR]",
            error?.message ||
            error
        );


        throw createAuthError(
            "Não foi possível concluir a autenticação Google.",
            "GOOGLE_TOKEN_EXCHANGE_FAILED",
            401
        );

    }


    if (
        !tokens?.id_token
    ) {

        throw createAuthError(
            "O Google não devolveu uma identidade válida.",
            "GOOGLE_ID_TOKEN_MISSING",
            401
        );

    }


    let ticket;

    try {

        ticket =
            await client.verifyIdToken({

                idToken:
                    tokens.id_token,

                audience:
                    config.google.clientId

            });

    }

    catch (
        error
    ) {

        console.error(
            "[GOOGLE ID TOKEN ERROR]",
            error?.message ||
            error
        );


        throw createAuthError(
            "A identidade Google não pôde ser validada.",
            "GOOGLE_IDENTITY_INVALID",
            401
        );

    }


    const payload =
        ticket.getPayload();


    const googleId =
        payload?.sub;


    const email =
        normalizeEmail(
            payload?.email
        );


    const emailVerified =
        payload?.email_verified === true;


    const name =
        typeof payload?.name === "string" &&
        payload.name.trim()
            ? payload.name.trim()
            : email.split("@")[0];


    const picture =
        typeof payload?.picture === "string"
            ? payload.picture
            : null;


    if (
        !googleId
    ) {

        throw createAuthError(
            "A conta Google não possui um identificador válido.",
            "GOOGLE_ID_MISSING",
            401
        );

    }


    if (
        !email
    ) {

        throw createAuthError(
            "A conta Google não possui um email válido.",
            "GOOGLE_EMAIL_MISSING",
            401
        );

    }


    if (
        !emailVerified
    ) {

        throw createAuthError(
            "O email da conta Google não está verificado.",
            "GOOGLE_EMAIL_NOT_VERIFIED",
            403
        );

    }


    /*
    --------------------------------------------------------
    PRIMEIRO: GOOGLE ID
    --------------------------------------------------------
    */

    let merchant =
        await getMerchantByGoogleId(
            googleId
        );


    let created =
        false;


    /*
    --------------------------------------------------------
    SE NÃO ENCONTRAR, PROCURAR PELO EMAIL
    --------------------------------------------------------
    */

    if (
        !merchant
    ) {

        merchant =
            await getMerchantByEmail(
                email
            );

        /*
        ----------------------------------------------------
        Conta antiga com o mesmo email.

        Vinculamos Google a ela.

        ----------------------------------------------------
        */

        if (
            merchant
        ) {

            if (
                merchant.googleId &&
                merchant.googleId !== googleId
            ) {

                throw createAuthError(
                    "Este email já está associado a outra identidade Google.",
                    "GOOGLE_ACCOUNT_CONFLICT",
                    409
                );

            }


            merchant.googleId =
                googleId;


            merchant.googleEmail =
                email;


            merchant.googlePicture =
                picture;


            merchant.googleEmailVerified =
                true;


            merchant.lastLoginProvider =
                "google";


            merchant.lastLoginAt =
                new Date();


            merchant.lastLoginIp =
                context.ip ||
                null;


            await merchant.save();

        }

    }


    /*
    --------------------------------------------------------
    CRIAR NOVO MERCHANT
    --------------------------------------------------------
    */

    if (
        !merchant
    ) {

        try {

            merchant =
                await Merchant.create({

                    name,

                    email,

                    googleId,

                    googleEmail:
                        email,

                    googlePicture:
                        picture,

                    googleEmailVerified:
                        true,

                    passwordHash:
                        null,

                    accountStatus:
                        "active",

                    role:
                        "merchant",

                    lastLoginAt:
                        new Date(),

                    lastLoginIp:
                        context.ip ||
                        null,

                    lastLoginProvider:
                        "google"

                });


            created =
                true;

        }

        catch (
            error
        ) {

            /*
            ------------------------------------------------
            Possível corrida entre duas autenticações.
            ------------------------------------------------
            */

            if (
                error?.code === 11000
            ) {

                merchant =
                    await getMerchantByGoogleId(
                        googleId
                    );

            }
            else {

                throw error;

            }

        }

    }


    if (
        !merchant
    ) {

        throw createAuthError(
            "Não foi possível criar ou localizar a conta Honey Pay.",
            "MERCHANT_AUTHENTICATION_FAILED",
            500
        );

    }


    /*
    --------------------------------------------------------
    CONTA ATIVA
    --------------------------------------------------------
    */

    const accountStatus =
        merchant.accountStatus ||
        "active";


    if (
        accountStatus !==
        "active"
    ) {

        logSecurityEvent(
            "google_login_blocked",
            {

                merchantId:
                    merchant._id.toString(),

                accountStatus,

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
    ATUALIZAR GOOGLE PROFILE
    --------------------------------------------------------
    */

    await Merchant.updateOne(

        {

            _id:
                merchant._id

        },

        {

            $set: {

                googleId,

                googleEmail:
                    email,

                googlePicture:
                    picture,

                googleEmailVerified:
                    true,

                lastLoginAt:
                    new Date(),

                lastLoginIp:
                    context.ip ||
                    null,

                lastLoginProvider:
                    "google"

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
    LOGS
    --------------------------------------------------------
    */

    logBusinessEvent(

        created
            ? "merchant_registered_google"
            : "merchant_login_google",

        {

            merchantId:
                merchant._id.toString(),

            ip:
                context.ip ||
                null

        }

    );


    const freshMerchant =
        await Merchant
            .findById(
                merchant._id
            )
            .lean();


    return buildAuthResponse(

        freshMerchant,

        subscription

    );

}


/*
============================================================
AUTHENTICATED PROFILE
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


            return successResponse(
                res,
                {

                    service:
                        "Honey Pay API",

                    version:
                        "2.0.0",

                    status:
                        database?.connected === true
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
GOOGLE LOGIN
============================================================
*/

router.get(

    "/auth/google",

    (
        req,
        res
    ) => {

        try {

            const url =
                createGoogleAuthorizationUrl({

                    ip:
                        req.ip,

                    userAgent:
                        req.get(
                            "user-agent"
                        )

                });


            return res.redirect(
                302,
                url
            );

        }

        catch (
            error
        ) {

            console.error(
                "[GOOGLE LOGIN START ERROR]",
                error
            );


            return res
                .status(500)
                .json({

                    success:
                        false,

                    code:
                        "GOOGLE_AUTH_START_FAILED",

                    message:
                        "Não foi possível iniciar o login Google."

                });

        }

    }

);


/*
============================================================
GOOGLE CALLBACK
============================================================
*/

router.get(

    "/auth/google/callback",

    async (
        req,
        res
    ) => {

        try {

            const {

                code,

                state,

                error:
                    googleError

            } =
                req.query;


            if (
                googleError
            ) {

                return res.redirect(
                    302,
                    "/login?error=google_access_denied"
                );

            }


            const result =
                await authenticateWithGoogle(

                    code,

                    state,

                    {

                        ip:
                            req.ip,

                        userAgent:
                            req.get(
                                "user-agent"
                            )

                    }

                );


            /*
            ------------------------------------------------
            IMPORTANTE

            O token vai no fragmento (#).

            O fragmento não é enviado ao servidor.

            ------------------------------------------------
            */

            const token =
                encodeURIComponent(
                    result.token
                );


            return res.redirect(

                302,

                `/#auth_token=${token}`

            );

        }

        catch (
            error
        ) {

            console.error(
                "[GOOGLE CALLBACK ERROR]",
                error
            );


            const normalized =
                normalizeError(
                    error
                );


            const errorCode =
                encodeURIComponent(
                    normalized.code ||
                    "GOOGLE_AUTH_FAILED"
                );


            return res.redirect(

                302,

                `/login?error=${errorCode}`

            );

        }

    }

);


/*
============================================================
AUTH ME
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
PLAN
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
ROUTER ERROR
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


export {

    router

};


export default router;
