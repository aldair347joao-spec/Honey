/*
============================================================
HONEY PAY
MAIN SERVER
V2.1.0
============================================================

AUTENTICAÇÃO:
GOOGLE ONLY

RESPONSABILIDADES:
- Servir o frontend
- Rotas reais do frontend
- APIs
- Faturas
- Contas bancárias
- Checkout
- Comprovativos
- Autenticação
- Segurança
- MongoDB
============================================================
*/

import express from "express";

import cors from "cors";

import helmet from "helmet";

import rateLimit from "express-rate-limit";

import path from "node:path";

import crypto from "node:crypto";

import { fileURLToPath } from "node:url";


import router from "./routes.js";

import bankAccountRouter from "./bank-account-routes.js";

import checkoutRouter from "./checkout-routes.js";

import proofRouter from "./proof-routes.js";

import invoiceRouter from "./invoice-routes.js";


import {
    connectDatabase,
    closeDatabase,
    getDatabaseStatus
} from "./database.js";


/*
============================================================
PATH
============================================================
*/

const __filename =
    fileURLToPath(
        import.meta.url
    );


const __dirname =
    path.dirname(
        __filename
    );


const PROJECT_ROOT =
    __dirname;


const INDEX_FILE =
    path.join(
        PROJECT_ROOT,
        "index.html"
    );


const FRONTEND_DIR =
    PROJECT_ROOT;


/*
============================================================
ENVIRONMENT
============================================================
*/

const NODE_ENV =
    process.env.NODE_ENV ||
    "production";


const PORT =
    Number(
        process.env.PORT ||
        10000
    );


const HOST =
    process.env.HOST ||
    "0.0.0.0";


/*
============================================================
APP
============================================================
*/

const app =
    express();


app.disable(
    "x-powered-by"
);


app.set(
    "trust proxy",
    1
);


/*
============================================================
SECURITY
============================================================
*/

app.use(

    helmet({

        contentSecurityPolicy:
            false,

        crossOriginEmbedderPolicy:
            false,

        referrerPolicy: {

            policy:
                "strict-origin-when-cross-origin"

        },

        frameguard: {

            action:
                "sameorigin"

        }

    })

);


/*
============================================================
CORS
============================================================
*/

function getAllowedOrigins() {

    const raw =
        process.env.CORS_ORIGINS ||
        process.env.CORS_ORIGIN ||
        "";


    return raw
        .split(",")
        .map(
            origin =>
                origin.trim()
        )
        .filter(Boolean);

}


const allowedOrigins =
    getAllowedOrigins();


app.use(

    cors({

        origin(
            origin,
            callback
        ) {

            /*
            ------------------------------------------------
            Requests without Origin
            ------------------------------------------------
            */

            if (
                !origin
            ) {

                return callback(
                    null,
                    true
                );

            }


            /*
            ------------------------------------------------
            No explicit whitelist configured
            ------------------------------------------------
            */

            if (
                allowedOrigins.length ===
                0
            ) {

                return callback(
                    null,
                    true
                );

            }


            /*
            ------------------------------------------------
            Allowed origin
            ------------------------------------------------
            */

            if (
                allowedOrigins.includes(
                    origin
                )
            ) {

                return callback(
                    null,
                    true
                );

            }


            /*
            ------------------------------------------------
            Blocked origin
            ------------------------------------------------
            */

            return callback(
                new Error(
                    "Origem não autorizada pelo CORS."
                )
            );

        },

        credentials:
            true,

        methods: [

            "GET",

            "POST",

            "PUT",

            "PATCH",

            "DELETE",

            "HEAD",

            "OPTIONS"

        ],

        allowedHeaders: [

            "Content-Type",

            "Authorization",

            "Accept",

            "Origin",

            "X-Requested-With",

            "X-Request-ID",

            "Idempotency-Key"

        ],

        exposedHeaders: [

            "X-Request-ID"

        ]

    })

);


/*
============================================================
BODY
============================================================
*/

app.use(

    express.json({

        limit:
            process.env.MAX_JSON_SIZE ||
            "2mb",

        strict:
            true

    })

);


app.use(

    express.urlencoded({

        extended:
            false,

        limit:
            process.env.MAX_URLENCODED_SIZE ||
            "2mb"

    })

);


/*
============================================================
REQUEST ID
============================================================
*/

app.use(

    (
        req,
        res,
        next
    ) => {

        const incomingRequestId =
            req.get(
                "x-request-id"
            );


        const requestId =
            isValidRequestId(
                incomingRequestId
            )
                ? incomingRequestId
                : crypto.randomUUID();


        req.requestId =
            requestId;


        res.setHeader(
            "X-Request-ID",
            requestId
        );


        next();

    }

);


/*
============================================================
RATE LIMIT
============================================================
*/

const publicRateLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        limit:
            300,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        message: {

            success:
                false,

            code:
                "RATE_LIMIT_EXCEEDED",

            message:
                "Demasiados pedidos. Tente novamente mais tarde."

        },

        handler(
            req,
            res
        ) {

            return res
                .status(429)
                .json({

                    success:
                        false,

                    code:
                        "RATE_LIMIT_EXCEEDED",

                    message:
                        "Demasiados pedidos. Tente novamente mais tarde.",

                    requestId:
                        req.requestId ||
                        null

                });

        },

        skip(
            req
        ) {

            return (
                req.path ===
                "/health"
            );

        }

    });


app.use(
    "/api",
    publicRateLimiter
);


/*
============================================================
HTTP LOG
============================================================
*/

app.use(

    (
        req,
        res,
        next
    ) => {

        const startedAt =
            Date.now();


        res.on(
            "finish",
            () => {

                const duration =
                    Date.now() -
                    startedAt;


                console.log(

                    `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${req.requestId || "-"}`

                );

            }
        );


        next();

    }

);


/*
============================================================
HEALTH
============================================================
*/

app.get(

    "/health",

    async (
        req,
        res
    ) => {

        try {

            const database =
                getDatabaseStatus();


            const healthy =
                database?.connected ===
                true;


            return res
                .status(
                    healthy
                        ? 200
                        : 503
                )
                .json({

                    success:
                        healthy,

                    service:
                        "Honey Pay API",

                    version:
                        "2.1.0",

                    status:
                        healthy
                            ? "operational"
                            : "degraded",

                    authentication:
                        "google",

                    database,

                    frontend: {

                        available:
                            true,

                        entry:
                            "/"

                    },

                    requestId:
                        req.requestId ||
                        null,

                    timestamp:
                        new Date()
                            .toISOString()

                });

        }

        catch (
            error
        ) {

            console.error(
                "[HEALTH ERROR]",
                error
            );


            return res
                .status(503)
                .json({

                    success:
                        false,

                    service:
                        "Honey Pay API",

                    version:
                        "2.1.0",

                    status:
                        "degraded",

                    authentication:
                        "google",

                    database: {

                        connected:
                            false

                    },

                    frontend: {

                        available:
                            true

                    },

                    requestId:
                        req.requestId ||
                        null,

                    timestamp:
                        new Date()
                            .toISOString()

                });

        }

    }

);


/*
============================================================
API ROUTES
============================================================

ATENÇÃO:

A ORDEM DOS ROUTERS É CRÍTICA.

routes.js possui um middleware 404 interno.

Se routes.js for registado primeiro:

    /api/invoices
    /api/bank-accounts
    /api/checkout/...
    /api/proofs

podem ser interceptados pelo 404 de routes.js.

Por isso:

1. invoiceRouter
2. bankAccountRouter
3. checkoutRouter
4. proofRouter
5. router principal

============================================================
*/


/*
------------------------------------------------------------
INVOICES
------------------------------------------------------------

POST   /api/invoices
GET    /api/invoices
GET    /api/invoices/statistics
GET    /api/invoices/:invoiceId
PATCH  /api/invoices/:invoiceId
POST   /api/invoices/:invoiceId/cancel
GET    /api/pay/:publicToken

------------------------------------------------------------
*/

app.use(

    "/api",

    invoiceRouter

);


/*
------------------------------------------------------------
BANK ACCOUNTS
------------------------------------------------------------

GET    /api/bank-accounts
POST   /api/bank-accounts
GET    /api/bank-accounts/:accountId
PUT    /api/bank-accounts/:accountId
PATCH  /api/bank-accounts/:accountId/status
PATCH  /api/bank-accounts/:accountId/primary
DELETE /api/bank-accounts/:accountId

------------------------------------------------------------
*/

app.use(

    "/api",

    bankAccountRouter

);


/*
------------------------------------------------------------
CHECKOUT
------------------------------------------------------------

GET
/api/checkout/:publicToken

POST
/api/checkout/:publicToken/payment-intent

GET
/api/checkout/:publicToken/payment/:paymentId

------------------------------------------------------------
*/

app.use(

    "/api/checkout",

    checkoutRouter

);


/*
------------------------------------------------------------
PROOFS
------------------------------------------------------------

POST
/api/pay/:publicToken/proof

GET
/api/proofs

GET
/api/proofs/:proofId

PATCH
/api/proofs/:proofId/review

------------------------------------------------------------
*/

app.use(

    "/api",

    proofRouter

);


/*
------------------------------------------------------------
MAIN API
------------------------------------------------------------

Inclui:

/api/health

/api/auth/google

/api/auth/google/callback

/api/auth/me

/api/auth/plan

e restantes rotas principais.

IMPORTANTE:

É registado DEPOIS dos routers específicos porque
routes.js possui um 404 interno.
------------------------------------------------------------
*/

app.use(

    "/api",

    router

);


/*
============================================================
API 404 FINAL
============================================================

Só chega aqui quando nenhum router reconheceu
a rota.

============================================================
*/

app.use(

    "/api",

    (
        req,
        res
    ) => {

        return res
            .status(404)
            .json({

                success:
                    false,

                code:
                    "API_ROUTE_NOT_FOUND",

                message:
                    "A rota da API solicitada não existe.",

                method:
                    req.method,

                path:
                    req.originalUrl,

                requestId:
                    req.requestId ||
                    null

            });

    }

);


/*
============================================================
STATIC FRONTEND
============================================================
*/

app.use(

    express.static(

        FRONTEND_DIR,

        {

            index:
                false,

            fallthrough:
                true,

            etag:
                true,

            maxAge:
                NODE_ENV === "production"
                    ? "1h"
                    : 0

        }

    )

);


/*
============================================================
FRONTEND ROUTES
============================================================

A Honey Pay utiliza um único index.html como
shell da aplicação.

O frontend/app.js lê window.location.pathname
e apresenta a view correspondente.

ROTAS:

/
/dashboard
/merchant
/payments
/invoices
/bank-accounts
/proofs
/plans
/billing
/settings
/login

============================================================
*/

const FRONTEND_ROUTES = [

    "/",

    "/dashboard",

    "/merchant",

    "/payments",

    "/invoices",

    "/bank-accounts",

    "/proofs",

    "/plans",

    "/billing",

    "/settings",

    "/login"

];


app.get(

    FRONTEND_ROUTES,

    (
        req,
        res
    ) => {

        return res.sendFile(
            INDEX_FILE
        );

    }

);


/*
============================================================
PUBLIC CHECKOUT PAGE
============================================================

URL:

/pay/:token

O index.html detecta essa rota e carrega
frontend/checkout.js.

auth-ui.js NÃO é carregado.

============================================================
*/

app.get(

    "/pay/:token",

    (
        req,
        res
    ) => {

        return res.sendFile(
            INDEX_FILE
        );

    }

);


/*
============================================================
GLOBAL 404
============================================================
*/

app.use(

    (
        req,
        res
    ) => {

        return res
            .status(404)
            .json({

                success:
                    false,

                code:
                    "NOT_FOUND",

                message:
                    "O recurso solicitado não existe.",

                method:
                    req.method,

                path:
                    req.originalUrl,

                requestId:
                    req.requestId ||
                    null

            });

    }

);


/*
============================================================
GLOBAL ERROR
============================================================
*/

app.use(

    (
        error,
        req,
        res,
        next
    ) => {

        console.error(

            "[HONEY PAY GLOBAL ERROR]",

            {

                requestId:
                    req.requestId ||
                    null,

                method:
                    req.method,

                url:
                    req.originalUrl,

                error:
                    error?.message ||
                    error

            }

        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }


        /*
        ----------------------------------------------------
        INVALID JSON
        ----------------------------------------------------
        */

        if (
            error?.type ===
            "entity.parse.failed"
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    code:
                        "INVALID_JSON",

                    message:
                        "O corpo da requisição contém JSON inválido.",

                    requestId:
                        req.requestId ||
                        null

                });

        }


        /*
        ----------------------------------------------------
        PAYLOAD TOO LARGE
        ----------------------------------------------------
        */

        if (
            error?.type ===
            "entity.too.large"
        ) {

            return res
                .status(413)
                .json({

                    success:
                        false,

                    code:
                        "PAYLOAD_TOO_LARGE",

                    message:
                        "O pedido excede o tamanho permitido.",

                    requestId:
                        req.requestId ||
                        null

                });

        }


        /*
        ----------------------------------------------------
        CORS
        ----------------------------------------------------
        */

        if (
            error?.message ===
            "Origem não autorizada pelo CORS."
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    code:
                        "CORS_ORIGIN_NOT_ALLOWED",

                    message:
                        "Origem não autorizada.",

                    requestId:
                        req.requestId ||
                        null

                });

        }


        /*
        ----------------------------------------------------
        STATUS
        ----------------------------------------------------
        */

        const statusCode =
            Number.isInteger(
                error?.statusCode
            )
                ? error.statusCode
                : 500;


        const safeStatus =
            statusCode >= 400 &&
            statusCode < 600
                ? statusCode
                : 500;


        /*
        ----------------------------------------------------
        ERROR CODE
        ----------------------------------------------------
        */

        const errorCode =
            typeof error?.code ===
                "string" &&
            /^[A-Z0-9_:-]+$/.test(
                error.code
            )
                ? error.code
                : "INTERNAL_SERVER_ERROR";


        /*
        ----------------------------------------------------
        MESSAGE
        ----------------------------------------------------
        */

        const message =
            NODE_ENV !==
            "production"
                ? (
                    error?.message ||
                    "Ocorreu um erro interno no servidor."
                )
                : (
                    error?.expose === true &&
                    typeof error?.message ===
                        "string"
                        ? error.message
                        : "Ocorreu um erro interno no servidor."
                );


        return res
            .status(
                safeStatus
            )
            .json({

                success:
                    false,

                code:
                    errorCode,

                message,

                requestId:
                    req.requestId ||
                    null

            });

    }

);


/*
============================================================
HELPER
============================================================
*/

function isValidRequestId(
    value
) {

    if (
        typeof value !==
        "string"
    ) {

        return false;

    }


    if (
        value.length < 8 ||
        value.length > 128
    ) {

        return false;

    }


    return /^[a-zA-Z0-9._:-]+$/.test(
        value
    );

}


/*
============================================================
SERVER
============================================================
*/

let server =
    null;


let shuttingDown =
    false;


/*
============================================================
START
============================================================
*/

async function startServer() {

    try {

        console.log(
            "============================================================"
        );

        console.log(
            "HONEY PAY SERVER"
        );

        console.log(
            "============================================================"
        );


        console.log(
            "[HONEY PAY] Version: 2.1.0"
        );


        console.log(
            `[HONEY PAY] Environment: ${NODE_ENV}`
        );


        console.log(
            `[HONEY PAY] Project root: ${PROJECT_ROOT}`
        );


        console.log(
            `[HONEY PAY] Frontend: ${INDEX_FILE}`
        );


        console.log(
            `[HONEY PAY] Host: ${HOST}`
        );


        console.log(
            `[HONEY PAY] Port: ${PORT}`
        );


        /*
        ----------------------------------------------------
        FRONTEND
        ----------------------------------------------------
        */

        try {

            const fs =
                await import(
                    "node:fs/promises"
                );


            await fs.access(
                INDEX_FILE
            );


            console.log(
                "[HONEY PAY] index.html detected."
            );

        }

        catch (
            error
        ) {

            throw new Error(

                `Frontend entry file not found: ${INDEX_FILE}`

            );

        }


        /*
        ----------------------------------------------------
        DATABASE
        ----------------------------------------------------
        */

        await connectDatabase();


        console.log(
            "[HONEY PAY] MongoDB connected."
        );


        /*
        ----------------------------------------------------
        HTTP
        ----------------------------------------------------
        */

        server =
            app.listen(

                PORT,

                HOST,

                () => {

                    console.log(
                        "============================================================"
                    );


                    console.log(
                        `[HONEY PAY] Server listening on ${HOST}:${PORT}`
                    );


                    console.log(
                        "[HONEY PAY] Frontend: /"
                    );


                    console.log(
                        "[HONEY PAY] Frontend routes: /payments /invoices /bank-accounts /proofs /plans /settings"
                    );


                    console.log(
                        "[HONEY PAY] API: /api"
                    );


                    console.log(
                        "[HONEY PAY] Invoices: /api/invoices"
                    );


                    console.log(
                        "[HONEY PAY] Bank accounts: /api/bank-accounts"
                    );


                    console.log(
                        "[HONEY PAY] Checkout: /api/checkout/:publicToken"
                    );


                    console.log(
                        "[HONEY PAY] Proofs: /api/proofs"
                    );


                    console.log(
                        "[HONEY PAY] Google Login: /api/auth/google"
                    );


                    console.log(
                        "[HONEY PAY] Google Callback: /api/auth/google/callback"
                    );


                    console.log(
                        "[HONEY PAY] Public payment page: /pay/:token"
                    );


                    console.log(
                        "[HONEY PAY] Health: /health"
                    );


                    console.log(
                        "[HONEY PAY] BitPay remains backend-only."
                    );


                    console.log(
                        "============================================================"
                    );

                }

            );


        /*
        ----------------------------------------------------
        SERVER TIMEOUTS
        ----------------------------------------------------
        */

        server.requestTimeout =
            120000;


        server.headersTimeout =
            125000;


        server.keepAliveTimeout =
            65000;


        /*
        ----------------------------------------------------
        SERVER ERROR
        ----------------------------------------------------
        */

        server.on(

            "error",

            error => {

                console.error(
                    "[HONEY PAY] HTTP server error:",
                    error
                );


                if (
                    error?.code ===
                    "EADDRINUSE"
                ) {

                    process.exit(
                        1
                    );

                }

            }

        );

    }

    catch (
        error
    ) {

        console.error(
            "[HONEY PAY] Failed to start:",
            error
        );


        try {

            await closeDatabase();

        }

        catch (
            closeError
        ) {

            console.error(
                "[HONEY PAY] Database close failed:",
                closeError
            );

        }


        process.exit(
            1
        );

    }

}


/*
============================================================
SHUTDOWN
============================================================
*/

async function shutdown(
    signal
) {

    if (
        shuttingDown
    ) {

        return;

    }


    shuttingDown =
        true;


    console.log(
        `[HONEY PAY] ${signal} received. Shutting down...`
    );


    const forceShutdownTimer =
        setTimeout(

            () => {

                console.error(
                    "[HONEY PAY] Forced shutdown timeout reached."
                );


                process.exit(
                    1
                );

            },

            15000

        );


    forceShutdownTimer.unref();


    try {

        /*
        ----------------------------------------------------
        HTTP SERVER
        ----------------------------------------------------
        */

        if (
            server
        ) {

            await new Promise(

                (
                    resolve,
                    reject
                ) => {

                    server.close(
                        error => {

                            if (
                                error
                            ) {

                                return reject(
                                    error
                                );

                            }


                            resolve();

                        }
                    );

                }

            );


            console.log(
                "[HONEY PAY] HTTP server closed."
            );

        }


        /*
        ----------------------------------------------------
        DATABASE
        ----------------------------------------------------
        */

        await closeDatabase();


        console.log(
            "[HONEY PAY] MongoDB connection closed."
        );


        clearTimeout(
            forceShutdownTimer
        );


        process.exit(
            0
        );

    }

    catch (
        error
    ) {

        console.error(
            "[HONEY PAY] Shutdown error:",
            error
        );


        clearTimeout(
            forceShutdownTimer
        );


        process.exit(
            1
        );

    }

}


/*
============================================================
SIGNALS
============================================================
*/

process.once(
    "SIGTERM",
    () => shutdown("SIGTERM")
);


process.once(
    "SIGINT",
    () => shutdown("SIGINT")
);


/*
============================================================
UNHANDLED REJECTION
============================================================
*/

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "[HONEY PAY] Unhandled promise rejection:",
            error
        );

    }
);


/*
============================================================
UNCAUGHT EXCEPTION
============================================================
*/

process.on(
    "uncaughtException",
    error => {

        console.error(
            "[HONEY PAY] Uncaught exception:",
            error
        );


        shutdown(
            "UNCAUGHT_EXCEPTION"
        );

    }

);


/*
============================================================
START
============================================================
*/

startServer();


/*
============================================================
EXPORT
============================================================
*/

export default app;
