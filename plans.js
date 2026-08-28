import {
    Merchant,
    Subscription
} from "./models.js";


/*
============================================================
HONEY PAY
PLANS
V1.0.0
============================================================

REGRAS COMERCIAIS DA V1
------------------------------------------------------------

FREE
------------------------------------------------------------
Preço:
0 Kz

Limite:
10 faturas vitalícias

Inclui:
- Criação de faturas
- Links de pagamento
- QR Code
- Contas bancárias
- Checkout público
- Upload de comprovativo
- Recursos básicos do Honey Shield
- WhatsApp básico quando configurado

Marca:
Honey Pay presente

------------------------------------------------------------

PRO
------------------------------------------------------------
Preço:
7.500 Kz / mês

Limite:
Ilimitado

Inclui:
- Faturas ilimitadas
- Links ilimitados
- Recursos avançados
- WhatsApp avançado
- Honey Shield avançado
- White-label
- Remoção da marca Honey Pay

============================================================
*/


/*
============================================================
PLAN CONSTANTS
============================================================
*/

export const PLAN_FREE =
    "free";


export const PLAN_PRO =
    "pro";


export const FREE_INVOICE_LIMIT =
    10;


export const PRO_MONTHLY_PRICE_KZ =
    7500;


/*
============================================================
PLAN DEFINITIONS
============================================================
*/

export const PLANS = {

    [PLAN_FREE]: {

        id:
            PLAN_FREE,

        name:
            "Gratuito",

        priceKz:
            0,

        billing:
            "lifetime",

        invoiceLimit:
            FREE_INVOICE_LIMIT,

        unlimitedInvoices:
            false,

        branding:
            true,

        advancedWhatsapp:
            false,

        advancedShield:
            false,

        whiteLabel:
            false
    },


    [PLAN_PRO]: {

        id:
            PLAN_PRO,

        name:
            "Profissional",

        priceKz:
            PRO_MONTHLY_PRICE_KZ,

        billing:
            "monthly",

        invoiceLimit:
            null,

        unlimitedInvoices:
            true,

        branding:
            false,

        advancedWhatsapp:
            true,

        advancedShield:
            true,

        whiteLabel:
            true
    }
};


/*
============================================================
GET PLAN
============================================================
*/

export function getPlan(
    planId
) {

    return (
        PLANS[
            planId
        ] ||
        PLANS[
            PLAN_FREE
        ]
    );
}


/*
============================================================
CHECK PLAN
============================================================
*/

export function isValidPlan(
    planId
) {

    return (
        planId ===
        PLAN_FREE ||

        planId ===
        PLAN_PRO
    );
}


/*
============================================================
GET SUBSCRIPTION
============================================================

Se por algum motivo uma conta antiga ainda não possuir
Subscription, consideramos FREE.

============================================================
*/

export async function getMerchantSubscription(
    merchantId
) {

    const subscription =
        await Subscription
            .findOne({
                merchantId
            });


    if (
        subscription
    ) {

        return subscription;
    }


    return null;
}


/*
============================================================
GET EFFECTIVE PLAN
============================================================
*/

export async function getEffectivePlan(
    merchantId
) {

    const subscription =
        await getMerchantSubscription(
            merchantId
        );


    if (
        !subscription
    ) {

        return PLAN_FREE;
    }


    /*
    --------------------------------------------------------
    Um plano cancelado/expirado deixa de conceder recursos
    PRO.
    --------------------------------------------------------
    */

    if (
        subscription.status !==
        "active"
    ) {

        return PLAN_FREE;
    }


    if (
        !isValidPlan(
            subscription.plan
        )
    ) {

        return PLAN_FREE;
    }


    return subscription.plan;
}


/*
============================================================
IS PRO
============================================================
*/

export async function isPro(
    merchantId
) {

    const plan =
        await getEffectivePlan(
            merchantId
        );


    return (
        plan ===
        PLAN_PRO
    );
}


/*
============================================================
IS FREE
============================================================
*/

export async function isFree(
    merchantId
) {

    const plan =
        await getEffectivePlan(
            merchantId
        );


    return (
        plan ===
        PLAN_FREE
    );
}


/*
============================================================
INVOICE LIMIT
============================================================
*/

export function getInvoiceLimit(
    planId
) {

    const plan =
        getPlan(
            planId
        );


    return plan.invoiceLimit;
}


/*
============================================================
HAS INVOICE CAPACITY
============================================================

Recebe a quantidade de faturas já utilizadas.

FREE:
0 → pode criar
9 → pode criar a 10ª
10 → bloqueado

PRO:
sempre pode criar
============================================================
*/

export function hasInvoiceCapacity(
    planId,
    invoiceCount
) {

    const plan =
        getPlan(
            planId
        );


    if (
        plan.unlimitedInvoices
    ) {

        return true;
    }


    const count =
        Number(
            invoiceCount
        );


    if (
        !Number.isFinite(
            count
        ) ||
        count < 0
    ) {

        return false;
    }


    return (
        count <
        plan.invoiceLimit
    );
}


/*
============================================================
REMAINING FREE INVOICES
============================================================
*/

export function getRemainingFreeInvoices(
    invoiceCount
) {

    const count =
        Number(
            invoiceCount
        );


    if (
        !Number.isFinite(
            count
        )
    ) {

        return FREE_INVOICE_LIMIT;
    }


    return Math.max(
        0,
        FREE_INVOICE_LIMIT -
        count
    );
}


/*
============================================================
PLAN FEATURE
============================================================
*/

export function planHasFeature(
    planId,
    feature
) {

    const plan =
        getPlan(
            planId
        );


    if (
        !Object.prototype.hasOwnProperty.call(
            plan,
            feature
        )
    ) {

        return false;
    }


    return Boolean(
        plan[
            feature
        ]
    );
}


/*
============================================================
REQUIRE PRO
============================================================

Função reutilizável para controllers.

Não depende de req/res para poder ser utilizada também
em serviços internos.
============================================================
*/

export async function requirePro(
    merchantId
) {

    const plan =
        await getEffectivePlan(
            merchantId
        );


    if (
        plan !==
        PLAN_PRO
    ) {

        const error =
            new Error(
                "Plano Profissional necessário."
            );


        error.code =
            "PRO_PLAN_REQUIRED";


        error.statusCode =
            402;


        error.upgrade = {

            plan:
                PLAN_PRO,

            monthlyPriceKz:
                PRO_MONTHLY_PRICE_KZ
        };


        throw error;
    }


    return true;
}


/*
============================================================
CAN CREATE INVOICE
============================================================
*/

export async function canCreateInvoice(
    merchantId
) {

    /*
    --------------------------------------------------------
    Procuramos o comerciante diretamente.

    Isso permite que esta função seja utilizada tanto em
    requests autenticadas como em serviços internos.
    --------------------------------------------------------
    */

    const merchant =
        await Merchant
            .findById(
                merchantId
            )
            .select(
                "invoiceCount freeInvoiceCount status"
            )
            .lean();


    if (
        !merchant
    ) {

        return {

            allowed:
                false,

            reason:
                "ACCOUNT_NOT_FOUND"
        };
    }


    if (
        merchant.status !==
        "active"
    ) {

        return {

            allowed:
                false,

            reason:
                "ACCOUNT_INACTIVE"
        };
    }


    const plan =
        await getEffectivePlan(
            merchantId
        );


    /*
    --------------------------------------------------------
    PRO
    --------------------------------------------------------
    */

    if (
        plan ===
        PLAN_PRO
    ) {

        return {

            allowed:
                true,

            plan,

            remaining:
                null,

            unlimited:
                true
        };
    }


    /*
    --------------------------------------------------------
    FREE
    --------------------------------------------------------
    */

    const invoiceCount =
        Number(
            merchant.invoiceCount ||
            0
        );


    const remaining =
        getRemainingFreeInvoices(
            invoiceCount
        );


    if (
        !hasInvoiceCapacity(
            PLAN_FREE,
            invoiceCount
        )
    ) {

        return {

            allowed:
                false,

            plan:
                PLAN_FREE,

            remaining:
                0,

            unlimited:
                false,

            reason:
                "FREE_INVOICE_LIMIT_REACHED",

            upgrade: {

                plan:
                    PLAN_PRO,

                monthlyPriceKz:
                    PRO_MONTHLY_PRICE_KZ
            }
        };
    }


    return {

        allowed:
            true,

        plan:
            PLAN_FREE,

        remaining,

        unlimited:
            false
    };
}


/*
============================================================
GET PLAN SUMMARY
============================================================
*/

export async function getPlanSummary(
    merchantId
) {

    const merchant =
        await Merchant
            .findById(
                merchantId
            )
            .select(
                "invoiceCount freeInvoiceCount"
            )
            .lean();


    if (
        !merchant
    ) {

        throw new Error(
            "Comerciante não encontrado."
        );
    }


    const plan =
        await getEffectivePlan(
            merchantId
        );


    const definition =
        getPlan(
            plan
        );


    const invoiceCount =
        Number(
            merchant.invoiceCount ||
            0
        );


    let remaining =
        null;


    if (
        !definition.unlimitedInvoices
    ) {

        remaining =
            getRemainingFreeInvoices(
                invoiceCount
            );
    }


    return {

        plan: {

            id:
                definition.id,

            name:
                definition.name,

            priceKz:
                definition.priceKz,

            billing:
                definition.billing
        },


        invoices: {

            used:
                invoiceCount,

            limit:
                definition.invoiceLimit,

            remaining,

            unlimited:
                definition.unlimitedInvoices
        },


        features: {

            branding:
                definition.branding,

            advancedWhatsapp:
                definition.advancedWhatsapp,

            advancedShield:
                definition.advancedShield,

            whiteLabel:
                definition.whiteLabel
        }
    };
}


/*
============================================================
11TH INVOICE CONVERSION TRIGGER
============================================================

A 11ª tentativa de criação é exatamente o momento em que
o FREE deixa de permitir novas faturas.

A função não cria nada nem altera dados.

Ela apenas determina se devemos mostrar a transição
comercial para o PRO.
============================================================
*/

export function shouldShowUpgradeAfterLimit(
    planId,
    invoiceCount
) {

    if (
        planId !==
        PLAN_FREE
    ) {

        return false;
    }


    return (
        Number(
            invoiceCount
        ) >=
        FREE_INVOICE_LIMIT
    );
}


/*
============================================================
UPGRADE RESPONSE
============================================================
*/

export function getUpgradeOffer() {

    return {

        available:
            true,

        plan:
            PLAN_PRO,

        name:
            PLANS[
                PLAN_PRO
            ].name,

        priceKz:
            PRO_MONTHLY_PRICE_KZ,

        billing:
            "monthly",

        message:
            "Desbloqueie faturas ilimitadas e todos os recursos profissionais."
    };
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    PLAN_FREE,

    PLAN_PRO,

    FREE_INVOICE_LIMIT,

    PRO_MONTHLY_PRICE_KZ,

    PLANS,

    getPlan,

    isValidPlan,

    getMerchantSubscription,

    getEffectivePlan,

    isPro,

    isFree,

    getInvoiceLimit,

    hasInvoiceCapacity,

    getRemainingFreeInvoices,

    planHasFeature,

    requirePro,

    canCreateInvoice,

    getPlanSummary,

    shouldShowUpgradeAfterLimit,

    getUpgradeOffer
};
