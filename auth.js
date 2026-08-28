/*
============================================================
HONEY PAY
AUTH SERVICE
V1.0.0
============================================================

AUTENTICAÇÃO REAL DA PLATAFORMA

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Registo de comerciantes
- Login
- JWT
- Criação automática da Subscription FREE
- Verificação de email duplicado
- Geração de slug
- Proteção de password
- Atualização do último login
- Dados públicos seguros
- Logout lógico através da aplicação cliente

------------------------------------------------------------
IMPORTANTE
------------------------------------------------------------

A password NUNCA é armazenada em texto puro.

O JWT não contém password nem dados sensíveis.

============================================================
*/

import {
    Merchant,
    Subscription
} from "./models.js";


import {
    hashPassword,
    comparePassword,
    normalizeEmail,
    normalizePhone,
    createAccessToken
} from "./security.js";


import {
    validateRegistrationInput,
    validateLoginInput,
    sanitizeRegistrationInput
} from "./validators.js";


import {
    slugify,
    appendSlugSuffix,
    publicMerchant
} from "./utils.js";


import {
    PLAN_FREE
} from "./plans.js";


import {
    logSecurityEvent
} from "./logger.js";


/*
============================================================
CONSTANTES
============================================================
*/

const JWT_EXPIRES_IN =
    "7d";


/*
============================================================
CREATE UNIQUE SLUG
============================================================
*/

async function createUniqueSlug(
    businessName
) {

    let baseSlug =
        slugify(
            businessName
        );


    /*
    --------------------------------------------------------
    Fallback caso o nome contenha apenas caracteres que
    não possam ser transformados num slug.
    --------------------------------------------------------
    */

    if (
        !baseSlug
    ) {

        baseSlug =
            "loja";
    }


    /*
    --------------------------------------------------------
    Primeira tentativa:
    --------------------------------------------------------
    */

    const existing =
        await Merchant
            .findOne({
                slug:
                    baseSlug
            })
            .select(
                "_id"
            )
            .lean();


    if (
        !existing
    ) {

        return baseSlug;
    }


    /*
    --------------------------------------------------------
    Se já existir, adicionamos um sufixo aleatório.
    --------------------------------------------------------
    */

    for (
        let attempt = 0;
        attempt < 10;
        attempt++
    ) {

        const candidate =
            appendSlugSuffix(
                baseSlug
            );


        const duplicate =
            await Merchant
                .findOne({
                    slug:
                        candidate
                })
                .select(
                    "_id"
                )
                .lean();


        if (
            !duplicate
        ) {

            return candidate;
        }
    }


    /*
    --------------------------------------------------------
    Fallback final.
    --------------------------------------------------------
    */

    return appendSlugSuffix(
        baseSlug
    );
}


/*
============================================================
CREATE JWT PAYLOAD
============================================================
*/

function buildAuthPayload(
    merchant
) {

    return {

        merchantId:
            merchant._id.toString(),

        email:
            merchant.email,

        type:
            "merchant"
    };
}


/*
============================================================
AUTH RESPONSE
============================================================
*/

function buildAuthResponse(
    merchant,
    token,
    subscription
) {

    return {

        token,

        tokenType:
            "Bearer",

        expiresIn:
            JWT_EXPIRES_IN,

        merchant:
            publicMerchant(
                merchant
            ),

        subscription: {

            plan:
                subscription?.plan ||
                PLAN_FREE,

            status:
                subscription?.status ||
                "active",

            monthlyPriceKz:
                subscription?.monthlyPriceKz ||
                0
        }
    };
}


/*
============================================================
REGISTER
============================================================
*/

export async function registerMerchant(
    input
) {

    /*
    --------------------------------------------------------
    Validar antes de qualquer operação.
    --------------------------------------------------------
    */

    const validationErrors =
        validateRegistrationInput(
            input
        );


    if (
        validationErrors.length
    ) {

        const error =
            new Error(
                "Dados de registo inválidos."
            );


        error.code =
            "VALIDATION_ERROR";


        error.statusCode =
            400;


        error.details =
            validationErrors;


        throw error;
    }


    /*
    --------------------------------------------------------
    Sanitizar dados.
    --------------------------------------------------------
    */

    const data =
        sanitizeRegistrationInput(
            input
        );


    const email =
        normalizeEmail(
            data.email
        );


    const phone =
        normalizePhone(
            data.phone
        );


    /*
    --------------------------------------------------------
    Verificar email existente.

    Esta verificação é apenas uma camada de UX.

    O índice unique do MongoDB continua a ser a proteção
    definitiva contra concorrência.
    --------------------------------------------------------
    */

    const existingMerchant =
        await Merchant
            .findOne({
                email
            })
            .select(
                "_id"
            )
            .lean();


    if (
        existingMerchant
    ) {

        const error =
            new Error(
                "Este email já está registado."
            );


        error.code =
            "EMAIL_ALREADY_EXISTS";


        error.statusCode =
            409;


        throw error;
    }


    /*
    --------------------------------------------------------
    Criar slug.
    --------------------------------------------------------
    */

    const slug =
        await createUniqueSlug(
            data.businessName
        );


    /*
    --------------------------------------------------------
    Hash da password.
    --------------------------------------------------------
    */

    const passwordHash =
        await hashPassword(
            data.password
        );


    /*
    --------------------------------------------------------
    Criar comerciante.
    --------------------------------------------------------
    */

    let merchant;


    try {

        merchant =
            await Merchant.create({

                name:
                    data.name,

                businessName:
                    data.businessName,

                slug,

                email,

                passwordHash,

                phone,

                whatsappNumber:
                    phone,

                whatsappConnected:
                    false,

                country:
                    "AO",

                currency:
                    "AOA",

                invoiceCount:
                    0,

                freeInvoiceCount:
                    0,

                status:
                    "active",

                emailVerified:
                    false
            });

    }

    catch (error) {

        /*
        ----------------------------------------------------
        Race condition de email/slug.
        ----------------------------------------------------
        */

        if (
            error?.code ===
            11000
        ) {

            const duplicateField =
                Object.keys(
                    error.keyPattern ||
                    {}
                )[0];


            const duplicateError =
                new Error(

                    duplicateField ===
                    "email"

                        ? "Este email já está registado."

                        : "O nome da loja já está em utilização."
                );


            duplicateError.code =
                duplicateField ===
                "email"

                    ? "EMAIL_ALREADY_EXISTS"

                    : "SLUG_ALREADY_EXISTS";


            duplicateError.statusCode =
                409;


            throw duplicateError;
        }


        throw error;
    }


    /*
    --------------------------------------------------------
    Criar Subscription FREE automaticamente.
    --------------------------------------------------------
    */

    let subscription;


    try {

        subscription =
            await Subscription.create({

                merchantId:
                    merchant._id,

                plan:
                    PLAN_FREE,

                status:
                    "active",

                monthlyPriceKz:
                    0,

                currentPeriodStart:
                    null,

                currentPeriodEnd:
                    null,

                autoRenew:
                    false,

                activatedAt:
                    new Date()
            });

    }

    catch (error) {

        /*
        ----------------------------------------------------
        Se a subscription falhar, apagamos o comerciante
        recém-criado para não deixar uma conta incompleta.
        ----------------------------------------------------
        */

        await Merchant
            .deleteOne({
                _id:
                    merchant._id
            });


        throw error;
    }


    /*
    --------------------------------------------------------
    Gerar token.
    --------------------------------------------------------
    */

    const token =
        createAccessToken(
            buildAuthPayload(
                merchant
            ),
            {
                expiresIn:
                    JWT_EXPIRES_IN
            }
        );


    logSecurityEvent(
        "merchant_registered",
        {

            merchantId:
                merchant._id.toString(),

            ip:
                null
        }
    );


    return buildAuthResponse(
        merchant,
        token,
        subscription
    );
}


/*
============================================================
LOGIN
============================================================
*/

export async function loginMerchant(
    input,
    securityContext = {}
) {

    /*
    --------------------------------------------------------
    Validar input.
    --------------------------------------------------------
    */

    const validationErrors =
        validateLoginInput(
            input
        );


    if (
        validationErrors.length
    ) {

        const error =
            new Error(
                "Dados de login inválidos."
            );


        error.code =
            "VALIDATION_ERROR";


        error.statusCode =
            400;


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
    Password é usada diretamente e nunca é normalizada,
    pois qualquer alteração mudaria a password.
    --------------------------------------------------------
    */

    const password =
        input.password;


    /*
    --------------------------------------------------------
    Carregar passwordHash explicitamente porque o schema
    possui select:false.
    --------------------------------------------------------
    */

    const merchant =
        await Merchant
            .findOne({
                email
            })
            .select(
                "+passwordHash"
            );


    /*
    --------------------------------------------------------
    Não revelamos se o email existe.

    Isso reduz enumeração de contas.
    --------------------------------------------------------
    */

    if (
        !merchant
    ) {

        logSecurityEvent(
            "login_failed",
            {

                reason:
                    "invalid_credentials",

                ip:
                    securityContext.ip ||
                    null
            }
        );


        const error =
            new Error(
                "Email ou password incorretos."
            );


        error.code =
            "INVALID_CREDENTIALS";


        error.statusCode =
            401;


        throw error;
    }


    /*
    --------------------------------------------------------
    Verificar password.
    --------------------------------------------------------
    */

    const passwordValid =
        await comparePassword(
            password,
            merchant.passwordHash
        );


    if (
        !passwordValid
    ) {

        logSecurityEvent(
            "login_failed",
            {

                merchantId:
                    merchant._id.toString(),

                reason:
                    "invalid_password",

                ip:
                    securityContext.ip ||
                    null
            }
        );


        const error =
            new Error(
                "Email ou password incorretos."
            );


        error.code =
            "INVALID_CREDENTIALS";


        error.statusCode =
            401;


        throw error;
    }


    /*
    --------------------------------------------------------
    Verificar estado da conta.
    --------------------------------------------------------
    */

    if (
        merchant.status !==
        "active"
    ) {

        const error =
            new Error(
                "Esta conta não está ativa."
            );


        error.code =
            "ACCOUNT_INACTIVE";


        error.statusCode =
            403;


        throw error;
    }


    /*
    --------------------------------------------------------
    Atualizar último login.
    --------------------------------------------------------
    */

    merchant.lastLoginAt =
        new Date();


    await merchant.save();


    /*
    --------------------------------------------------------
    Carregar subscription.
    --------------------------------------------------------
    */

    let subscription =
        await Subscription
            .findOne({
                merchantId:
                    merchant._id
            });


    /*
    --------------------------------------------------------
    Compatibilidade com contas que eventualmente não
    tenham subscription.
    --------------------------------------------------------
    */

    if (
        !subscription
    ) {

        subscription =
            await Subscription.create({

                merchantId:
                    merchant._id,

                plan:
                    PLAN_FREE,

                status:
                    "active",

                monthlyPriceKz:
                    0,

                autoRenew:
                    false,

                activatedAt:
                    new Date()
            });
    }


    /*
    --------------------------------------------------------
    Gerar novo token.
    --------------------------------------------------------
    */

    const token =
        createAccessToken(
            buildAuthPayload(
                merchant
            ),
            {
                expiresIn:
                    JWT_EXPIRES_IN
            }
        );


    logSecurityEvent(
        "merchant_login",
        {

            merchantId:
                merchant._id.toString(),

            ip:
                securityContext.ip ||
                null
        }
    );


    return buildAuthResponse(
        merchant,
        token,
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
        await Merchant
            .findById(
                merchantId
            )
            .lean();


    if (
        !merchant
    ) {

        const error =
            new Error(
                "Conta não encontrada."
            );


        error.code =
            "ACCOUNT_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    const subscription =
        await Subscription
            .findOne({
                merchantId:
                    merchant._id
            })
            .lean();


    return {

        merchant:
            publicMerchant(
                merchant
            ),

        subscription: {

            plan:
                subscription?.plan ||
                PLAN_FREE,

            status:
                subscription?.status ||
                "active",

            monthlyPriceKz:
                subscription?.monthlyPriceKz ||
                0,

            currentPeriodStart:
                subscription?.currentPeriodStart ||
                null,

            currentPeriodEnd:
                subscription?.currentPeriodEnd ||
                null
        }
    };
}


/*
============================================================
CHANGE PASSWORD
============================================================*/

export async function changeMerchantPassword(
    merchantId,
    currentPassword,
    newPassword
) {

    if (
        typeof currentPassword !==
        "string" ||
        !currentPassword
    ) {

        const error =
            new Error(
                "Password atual é obrigatória."
            );


        error.code =
            "CURRENT_PASSWORD_REQUIRED";


        error.statusCode =
            400;


        throw error;
    }


    if (
        typeof newPassword !==
        "string" ||
        newPassword.length <
        8
    ) {

        const error =
            new Error(
                "A nova password deve possuir pelo menos 8 caracteres."
            );


        error.code =
            "INVALID_NEW_PASSWORD";


        error.statusCode =
            400;


        throw error;
    }


    if (
        newPassword.length >
        128
    ) {

        const error =
            new Error(
                "A nova password é demasiado longa."
            );


        error.code =
            "INVALID_NEW_PASSWORD";


        error.statusCode =
            400;


        throw error;
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

        const error =
            new Error(
                "Conta não encontrada."
            );


        error.code =
            "ACCOUNT_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    const currentPasswordValid =
        await comparePassword(
            currentPassword,
            merchant.passwordHash
        );


    if (
        !currentPasswordValid
    ) {

        const error =
            new Error(
                "A password atual está incorreta."
            );


        error.code =
            "INVALID_CURRENT_PASSWORD";


        error.statusCode =
            401;


        throw error;
    }


    /*
    --------------------------------------------------------
    Impedir que a nova password seja exatamente igual à
    atual.
    --------------------------------------------------------
    */

    const samePassword =
        await comparePassword(
            newPassword,
            merchant.passwordHash
        );


    if (
        samePassword
    ) {

        const error =
            new Error(
                "A nova password deve ser diferente da atual."
            );


        error.code =
            "PASSWORD_UNCHANGED";


        error.statusCode =
            400;


        throw error;
    }


    merchant.passwordHash =
        await hashPassword(
            newPassword
        );


    await merchant.save();


    logSecurityEvent(
        "password_changed",
        {

            merchantId:
                merchant._id.toString(),

            ip:
                null
        }
    );


    return {

        success:
            true
    };
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    registerMerchant,

    loginMerchant,

    getAuthenticatedProfile,

    changeMerchantPassword
};
