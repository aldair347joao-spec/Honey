/*
============================================================
HONEY PAY
UTILS
V1.0.0
============================================================

UTILIDADES GERAIS DO BACKEND

------------------------------------------------------------
- Respostas HTTP padronizadas
- IDs de request
- Datas
- Slugs
- Paginação
- Formatação monetária
- Máscaras de dados sensíveis
- Normalização de erros
- Conversão segura de valores
- Helpers para URLs
============================================================
*/

import crypto from "node:crypto";


/*
============================================================
HTTP RESPONSE HELPERS
============================================================
*/

export function successResponse(
    res,
    data = {},
    statusCode = 200
) {

    return res
        .status(statusCode)
        .json({

            success:
                true,

            data,

            requestId:
                res.locals.requestId ||
                null
        });
}


export function errorResponse(
    res,
    statusCode,
    code,
    message,
    details = null
) {

    const response = {

        success:
            false,

        error: {

            code,

            message
        },

        requestId:
            res.locals.requestId ||
            null
    };


    if (
        details
    ) {

        response.error.details =
            details;
    }


    return res
        .status(statusCode)
        .json(
            response
        );
}


/*
============================================================
REQUEST ID
============================================================
*/

export function generateRequestId() {

    return crypto
        .randomUUID();
}


/*
============================================================
SAFE ERROR
============================================================

Nunca enviamos stack trace ou detalhes internos para
o cliente em produção.
============================================================
*/

export function normalizeError(
    error
) {

    if (
        !error
    ) {

        return {

            code:
                "UNKNOWN_ERROR",

            message:
                "Ocorreu um erro inesperado.",

            statusCode:
                500
        };
    }


    return {

        code:
            error.code ||
            "INTERNAL_ERROR",

        message:
            error.message ||
            "Ocorreu um erro inesperado.",

        statusCode:
            Number.isInteger(
                error.statusCode
            )
                ? error.statusCode
                : 500
    };
}


/*
============================================================
DATE HELPERS
============================================================
*/

export function now() {

    return new Date();
}


export function addMinutes(
    date,
    minutes
) {

    const result =
        new Date(
            date
        );


    result.setMinutes(
        result.getMinutes() +
        Number(
            minutes
        )
    );


    return result;
}


export function addHours(
    date,
    hours
) {

    return addMinutes(
        date,
        Number(hours) * 60
    );
}


export function addDays(
    date,
    days
) {

    const result =
        new Date(
            date
        );


    result.setDate(
        result.getDate() +
        Number(
            days
        )
    );


    return result;
}


export function isExpired(
    date
) {

    if (
        !date
    ) {

        return false;
    }


    const timestamp =
        new Date(
            date
        ).getTime();


    if (
        Number.isNaN(
            timestamp
        )
    ) {

        return true;
    }


    return (
        timestamp <=
        Date.now()
    );
}


/*
============================================================
SLUG
============================================================
*/

export function slugify(
    value
) {

    if (
        typeof value !==
        "string"
    ) {

        return "";
    }


    return value

        .normalize(
            "NFD"
        )

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .toLowerCase()

        .trim()

        .replace(
            /[^a-z0-9\s-]/g,
            ""
        )

        .replace(
            /\s+/g,
            "-"
        )

        .replace(
            /-+/g,
            "-"
        )

        .replace(
            /^-+|-+$/g,
            ""
        )

        .slice(
            0,
            100
        );
}


/*
============================================================
UNIQUE SLUG SUFFIX
============================================================
*/

export function appendSlugSuffix(
    slug
) {

    const suffix =
        crypto
            .randomBytes(
                3
            )
            .toString(
                "hex"
            );


    return `${slug}-${suffix}`;
}


/*
============================================================
MONEY
============================================================
*/

export function formatKz(
    amount
) {

    const numericAmount =
        Number(
            amount
        );


    if (
        !Number.isFinite(
            numericAmount
        )
    ) {

        return "0 Kz";
    }


    return new Intl.NumberFormat(
        "pt-PT",
        {

            maximumFractionDigits:
                0
        }
    ).format(
        numericAmount
    ) + " Kz";
}


/*
============================================================
INTEGER
============================================================
*/

export function toInteger(
    value,
    fallback = 0
) {

    const number =
        Number(
            value
        );


    if (
        !Number.isInteger(
            number
        )
    ) {

        return fallback;
    }


    return number;
}


/*
============================================================
POSITIVE INTEGER
============================================================
*/

export function toPositiveInteger(
    value,
    fallback = null
) {

    const number =
        Number(
            value
        );


    if (
        !Number.isInteger(
            number
        ) ||
        number <= 0
    ) {

        return fallback;
    }


    return number;
}


/*
============================================================
BOOLEAN
============================================================
*/

export function toBoolean(
    value,
    fallback = false
) {

    if (
        typeof value ===
        "boolean"
    ) {

        return value;
    }


    if (
        typeof value ===
        "string"
    ) {

        const normalized =
            value
                .trim()
                .toLowerCase();


        if (
            normalized ===
            "true"
        ) {

            return true;
        }


        if (
            normalized ===
            "false"
        ) {

            return false;
        }
    }


    return fallback;
}


/*
============================================================
MASK SENSITIVE VALUE
============================================================
*/

export function maskValue(
    value,
    visibleStart = 2,
    visibleEnd = 4
) {

    if (
        typeof value !==
        "string"
    ) {

        return "";
    }


    if (
        value.length <=
        visibleStart +
        visibleEnd
    ) {

        return "*".repeat(
            value.length
        );
    }


    const start =
        value.slice(
            0,
            visibleStart
        );


    const end =
        value.slice(
            -visibleEnd
        );


    const hiddenLength =
        Math.max(
            4,
            value.length -
            visibleStart -
            visibleEnd
        );


    return (
        start +
        "*".repeat(
            hiddenLength
        ) +
        end
    );
}


/*
============================================================
MASK IBAN
============================================================
*/

export function maskIban(
    iban
) {

    if (
        typeof iban !==
        "string"
    ) {

        return "";
    }


    const normalized =
        iban
            .replace(
                /\s+/g,
                ""
            )
            .toUpperCase();


    if (
        normalized.length <=
        8
    ) {

        return maskValue(
            normalized,
            2,
            2
        );
    }


    return (
        normalized.slice(
            0,
            4
        ) +
        " **** **** " +
        normalized.slice(
            -4
        )
    );
}


/*
============================================================
MASK PHONE
============================================================
*/

export function maskPhone(
    phone
) {

    if (
        typeof phone !==
        "string"
    ) {

        return "";
    }


    const digits =
        phone.replace(
            /\D/g,
            ""
        );


    if (
        digits.length <= 4
    ) {

        return "*".repeat(
            digits.length
        );
    }


    return (
        "*".repeat(
            Math.max(
                0,
                digits.length - 4
            )
        ) +
        digits.slice(
            -4
        )
    );
}


/*
============================================================
PAGINATION
============================================================
*/

export function buildPagination(
    page,
    limit,
    total
) {

    const normalizedPage =
        Math.max(
            1,
            toPositiveInteger(
                page,
                1
            )
        );


    const normalizedLimit =
        Math.min(
            100,
            Math.max(
                1,
                toPositiveInteger(
                    limit,
                    20
                )
            )
        );


    const normalizedTotal =
        Math.max(
            0,
            toInteger(
                total,
                0
            )
        );


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                normalizedTotal /
                normalizedLimit
            )
        );


    return {

        page:
            normalizedPage,

        limit:
            normalizedLimit,

        total:
            normalizedTotal,

        totalPages,

        hasNextPage:
            normalizedPage <
            totalPages,

        hasPreviousPage:
            normalizedPage >
            1
    };
}


/*
============================================================
PUBLIC MERCHANT DATA
============================================================

Evita devolver campos internos/sensíveis do comerciante.
============================================================
*/

export function publicMerchant(
    merchant
) {

    if (
        !merchant
    ) {

        return null;
    }


    return {

        id:
            merchant._id
                ? merchant._id.toString()
                : merchant.id,

        name:
            merchant.name,

        businessName:
            merchant.businessName,

        slug:
            merchant.slug,

        phone:
            merchant.phone || null,

        whatsappConnected:
            Boolean(
                merchant.whatsappConnected
            ),

        logoUrl:
            merchant.logoUrl || null,

        description:
            merchant.description || null,

        address:
            merchant.address || null,

        city:
            merchant.city || null,

        country:
            merchant.country || "AO"
    };
}


/*
============================================================
PUBLIC BANK ACCOUNT
============================================================

O IBAN completo só deve ser utilizado onde realmente for
necessário.

Este helper é destinado a respostas públicas ou listagens
do dashboard.
============================================================
*/

export function publicBankAccount(
    account,
    options = {}
) {

    if (
        !account
    ) {

        return null;
    }


    const {

        includeFullIban =
            false

    } = options;


    return {

        id:
            account._id
                ? account._id.toString()
                : account.id,

        bankName:
            account.bankName,

        accountName:
            account.accountName,

        iban:
            includeFullIban
                ? account.iban
                : undefined,

        ibanLast4:
            account.ibanLast4,

        accountType:
            account.accountType,

        isActive:
            Boolean(
                account.isActive
            ),

        displayOrder:
            account.displayOrder || 0
    };
}


/*
============================================================
PUBLIC INVOICE
============================================================
*/

export function publicInvoice(
    invoice
) {

    if (
        !invoice
    ) {

        return null;
    }


    return {

        id:
            invoice._id
                ? invoice._id.toString()
                : invoice.id,

        publicId:
            invoice.publicId,

        invoiceNumber:
            invoice.invoiceNumber,

        description:
            invoice.description,

        amount:
            invoice.amount,

        currency:
            invoice.currency || "AOA",

        status:
            invoice.status,

        expiresAt:
            invoice.expiresAt || null,

        paidAt:
            invoice.paidAt || null,

        createdAt:
            invoice.createdAt
    };
}


/*
============================================================
PUBLIC PAYMENT
============================================================
*/

export function publicPayment(
    payment
) {

    if (
        !payment
    ) {

        return null;
    }


    return {

        id:
            payment._id
                ? payment._id.toString()
                : payment.id,

        invoiceId:
            payment.invoiceId
                ? payment.invoiceId.toString()
                : null,

        amount:
            payment.amount,

        currency:
            payment.currency || "AOA",

        status:
            payment.status,

        submittedAt:
            payment.submittedAt || null,

        confirmedAt:
            payment.confirmedAt || null
    };
}


/*
============================================================
CHECKOUT URL
============================================================
*/

export function buildCheckoutPath(
    publicId
) {

    if (
        typeof publicId !==
        "string" ||
        !publicId
    ) {

        return null;
    }


    return `/pay/${encodeURIComponent(
        publicId
    )}`;
}


/*
============================================================
FULL URL
============================================================
*/

export function buildAbsoluteUrl(
    baseUrl,
    path
) {

    if (
        typeof baseUrl !==
        "string" ||
        typeof path !==
        "string"
    ) {

        return null;
    }


    try {

        return new URL(
            path,
            baseUrl
        ).toString();

    }

    catch {

        return null;
    }
}


/*
============================================================
ARRAY HELPERS
============================================================
*/

export function uniqueStrings(
    values
) {

    if (
        !Array.isArray(
            values
        )
    ) {

        return [];
    }


    return [
        ...new Set(

            values

                .filter(
                    value =>
                        typeof value ===
                        "string"
                )

                .map(
                    value =>
                        value.trim()
                )

                .filter(
                    Boolean
                )
        )
    ];
}


/*
============================================================
SLEEP
============================================================

Útil apenas para pequenas operações internas/testes.

Não deve ser utilizado para manter requests HTTP abertas
desnecessariamente.
============================================================
*/

export function sleep(
    milliseconds
) {

    const duration =
        Number(
            milliseconds
        );


    if (
        !Number.isFinite(
            duration
        ) ||
        duration <= 0
    ) {

        return Promise.resolve();
    }


    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                duration
            )
    );
}


/*
============================================================
SAFE JSON PARSE
============================================================
*/

export function safeJsonParse(
    value,
    fallback = null
) {

    if (
        typeof value !==
        "string"
    ) {

        return fallback;
    }


    try {

        return JSON.parse(
            value
        );

    }

    catch {

        return fallback;
    }
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    successResponse,

    errorResponse,

    generateRequestId,

    normalizeError,

    now,

    addMinutes,

    addHours,

    addDays,

    isExpired,

    slugify,

    appendSlugSuffix,

    formatKz,

    toInteger,

    toPositiveInteger,

    toBoolean,

    maskValue,

    maskIban,

    maskPhone,

    buildPagination,

    publicMerchant,

    publicBankAccount,

    publicInvoice,

    publicPayment,

    buildCheckoutPath,

    buildAbsoluteUrl,

    uniqueStrings,

    sleep,

    safeJsonParse
};
