import "dotenv/config";

/*
============================================================
HONEY PAY
APPLICATION CONFIGURATION
V2.0.0
============================================================

AUTENTICAÇÃO:
- Google OAuth 2.0
- JWT interno Honey Pay

NÃO EXISTE LOGIN POR PASSWORD.

============================================================
*/


/*
============================================================
HELPERS
============================================================
*/

function getString(
    name,
    fallback = ""
) {

    const value =
        process.env[name];


    if (
        typeof value !== "string" ||
        value.trim() === ""
    ) {

        return fallback;

    }


    return value.trim();

}


function getInteger(
    name,
    fallback,
    minimum = Number.MIN_SAFE_INTEGER,
    maximum = Number.MAX_SAFE_INTEGER
) {

    const raw =
        process.env[name];


    if (
        raw === undefined ||
        raw === null ||
        raw === ""
    ) {

        return fallback;

    }


    const value =
        Number.parseInt(
            raw,
            10
        );


    if (
        !Number.isInteger(value)
    ) {

        return fallback;

    }


    if (
        value < minimum
    ) {

        return minimum;

    }


    if (
        value > maximum
    ) {

        return maximum;

    }


    return value;

}


function getBoolean(
    name,
    fallback = false
) {

    const value =
        process.env[name];


    if (
        value === undefined ||
        value === null
    ) {

        return fallback;

    }


    return [
        "true",
        "1",
        "yes",
        "on"
    ].includes(
        String(value)
            .trim()
            .toLowerCase()
    );

}


/*
============================================================
ENVIRONMENT
============================================================
*/

const NODE_ENV =
    getString(
        "NODE_ENV",
        "development"
    );


const isProduction =
    NODE_ENV ===
    "production";


const isDevelopment =
    NODE_ENV ===
    "development";


/*
============================================================
SERVER
============================================================
*/

const PORT =
    getInteger(
        "PORT",
        10000,
        1,
        65535
    );


/*
============================================================
DATABASE
============================================================
*/

const MONGODB_URI =
    getString(
        "MONGODB_URI"
    );


/*
============================================================
JWT
============================================================
*/

const JWT_SECRET =
    getString(
        "JWT_SECRET"
    );


/*
============================================================
GOOGLE AUTHENTICATION
============================================================

Render Environment Variables:

GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL

============================================================
*/

const GOOGLE_CLIENT_ID =
    getString(
        "GOOGLE_CLIENT_ID"
    );


const GOOGLE_CLIENT_SECRET =
    getString(
        "GOOGLE_CLIENT_SECRET"
    );


const GOOGLE_CALLBACK_URL =
    getString(
        "GOOGLE_CALLBACK_URL"
    );


/*
============================================================
CORS
============================================================
*/

const CORS_ORIGIN =
    getString(
        "CORS_ORIGIN",
        "*"
    );


/*
============================================================
REQUEST LIMITS
============================================================
*/

const MAX_JSON_SIZE =
    getString(
        "MAX_JSON_SIZE",
        "2mb"
    );


const MAX_URLENCODED_SIZE =
    getString(
        "MAX_URLENCODED_SIZE",
        "2mb"
    );


/*
============================================================
FILE UPLOADS
============================================================
*/

const MAX_UPLOAD_SIZE_MB =
    getInteger(
        "MAX_UPLOAD_SIZE_MB",
        10,
        1,
        50
    );


const UPLOAD_DIRECTORY =
    getString(
        "UPLOAD_DIRECTORY",
        "uploads"
    );


/*
============================================================
PUBLIC APPLICATION
============================================================
*/

const PUBLIC_APP_URL =
    getString(
        "PUBLIC_APP_URL",
        `http://localhost:${PORT}`
    );


/*
============================================================
BUSINESS PLANS
============================================================
*/

const FREE_INVOICE_LIMIT =
    getInteger(
        "FREE_INVOICE_LIMIT",
        10,
        1,
        1000
    );


const PRO_MONTHLY_PRICE_KZ =
    getInteger(
        "PRO_MONTHLY_PRICE_KZ",
        7500,
        0,
        100000000
    );


/*
============================================================
AUTH RATE LIMIT
============================================================
*/

const AUTH_RATE_LIMIT_WINDOW_MS =
    getInteger(
        "AUTH_RATE_LIMIT_WINDOW_MS",
        15 * 60 * 1000,
        1000,
        24 * 60 * 60 * 1000
    );


const AUTH_RATE_LIMIT_MAX =
    getInteger(
        "AUTH_RATE_LIMIT_MAX",
        20,
        1,
        1000
    );


/*
============================================================
UPLOAD RATE LIMIT
============================================================
*/

const UPLOAD_RATE_LIMIT_WINDOW_MS =
    getInteger(
        "UPLOAD_RATE_LIMIT_WINDOW_MS",
        15 * 60 * 1000,
        1000,
        24 * 60 * 60 * 1000
    );


const UPLOAD_RATE_LIMIT_MAX =
    getInteger(
        "UPLOAD_RATE_LIMIT_MAX",
        30,
        1,
        1000
    );


/*
============================================================
WHATSAPP
============================================================
*/

const WHATSAPP_ENABLED =
    getBoolean(
        "WHATSAPP_ENABLED",
        false
    );


const WHATSAPP_PROVIDER =
    getString(
        "WHATSAPP_PROVIDER"
    );


const WHATSAPP_API_URL =
    getString(
        "WHATSAPP_API_URL"
    );


const WHATSAPP_API_TOKEN =
    getString(
        "WHATSAPP_API_TOKEN"
    );


const WHATSAPP_WEBHOOK_SECRET =
    getString(
        "WHATSAPP_WEBHOOK_SECRET"
    );


/*
============================================================
FEATURES
============================================================
*/

const ENABLE_PUBLIC_CHECKOUT =
    getBoolean(
        "ENABLE_PUBLIC_CHECKOUT",
        true
    );


const ENABLE_QR_CODES =
    getBoolean(
        "ENABLE_QR_CODES",
        true
    );


const ENABLE_RECEIPTS =
    getBoolean(
        "ENABLE_RECEIPTS",
        true
    );


const ENABLE_HONEY_SHIELD =
    getBoolean(
        "ENABLE_HONEY_SHIELD",
        true
    );


/*
============================================================
VALIDATION
============================================================
*/

if (
    isProduction &&
    !MONGODB_URI
) {

    throw new Error(
        "MONGODB_URI é obrigatória em produção."
    );

}


if (
    isProduction &&
    !JWT_SECRET
) {

    throw new Error(
        "JWT_SECRET é obrigatória em produção."
    );

}


if (
    isProduction &&
    JWT_SECRET.length < 32
) {

    throw new Error(
        "JWT_SECRET deve possuir pelo menos 32 caracteres em produção."
    );

}


if (
    isProduction &&
    !GOOGLE_CLIENT_ID
) {

    throw new Error(
        "GOOGLE_CLIENT_ID é obrigatória em produção."
    );

}


if (
    isProduction &&
    !GOOGLE_CLIENT_SECRET
) {

    throw new Error(
        "GOOGLE_CLIENT_SECRET é obrigatória em produção."
    );

}


if (
    isProduction &&
    !GOOGLE_CALLBACK_URL
) {

    throw new Error(
        "GOOGLE_CALLBACK_URL é obrigatória em produção."
    );

}


/*
============================================================
PUBLIC CONFIGURATION
============================================================
*/

export const config = Object.freeze({

    app: {

        name:
            "Honey Pay",

        version:
            "2.0.0",

        environment:
            NODE_ENV,

        isProduction,

        isDevelopment,

        port:
            PORT,

        publicUrl:
            PUBLIC_APP_URL

    },


    database: {

        uri:
            MONGODB_URI

    },


    auth: {

        jwtSecret:
            JWT_SECRET

    },


    google: {

        clientId:
            GOOGLE_CLIENT_ID,

        clientSecret:
            GOOGLE_CLIENT_SECRET,

        callbackUrl:
            GOOGLE_CALLBACK_URL,

        scopes: [

            "openid",

            "email",

            "profile"

        ]

    },


    cors: {

        origin:
            CORS_ORIGIN

    },


    requests: {

        maxJsonSize:
            MAX_JSON_SIZE,

        maxUrlEncodedSize:
            MAX_URLENCODED_SIZE

    },


    uploads: {

        maxSizeMB:
            MAX_UPLOAD_SIZE_MB,

        directory:
            UPLOAD_DIRECTORY

    },


    plans: {

        free: {

            invoiceLimit:
                FREE_INVOICE_LIMIT

        },

        pro: {

            monthlyPriceKz:
                PRO_MONTHLY_PRICE_KZ

        }

    },


    rateLimits: {

        auth: {

            windowMs:
                AUTH_RATE_LIMIT_WINDOW_MS,

            max:
                AUTH_RATE_LIMIT_MAX

        },

        uploads: {

            windowMs:
                UPLOAD_RATE_LIMIT_WINDOW_MS,

            max:
                UPLOAD_RATE_LIMIT_MAX

        }

    },


    whatsapp: {

        enabled:
            WHATSAPP_ENABLED,

        provider:
            WHATSAPP_PROVIDER,

        apiUrl:
            WHATSAPP_API_URL,

        apiToken:
            WHATSAPP_API_TOKEN,

        webhookSecret:
            WHATSAPP_WEBHOOK_SECRET

    },


    features: {

        publicCheckout:
            ENABLE_PUBLIC_CHECKOUT,

        qrCodes:
            ENABLE_QR_CODES,

        receipts:
            ENABLE_RECEIPTS,

        honeyShield:
            ENABLE_HONEY_SHIELD

    }

});


export default config;
