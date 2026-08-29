/*
============================================================
HONEY PAY
MAIN SERVER
V1.1.0
============================================================

SERVIDOR PRINCIPAL DA HONEY PAY

------------------------------------------------------------
ARQUITETURA
------------------------------------------------------------

Express
   │
   ├── Security
   │
   ├── CORS
   │
   ├── Rate Limiting
   │
   ├── FRONTEND
   │     ├── index.html
   │     ├── style.css
   │     └── app.js
   │
   ├── API Routes
   │
   ├── Bank Account Routes
   │
   ├── Checkout Routes
   │
   ├── Proof Routes
   │
   └── Error Handler

------------------------------------------------------------
AMBIENTE
------------------------------------------------------------

Compatível com:

- GitHub
- Render
- MongoDB Atlas
- Node.js ES Modules

------------------------------------------------------------
FRONTEND
------------------------------------------------------------

O frontend está na raiz do projeto:

Honey/
├── index.html
├── style.css
├── app.js
└── server.js

O Express serve esses arquivos diretamente.

------------------------------------------------------------
PAGAMENTOS
------------------------------------------------------------

BITPAY é utilizado exclusivamente para:

Honey Pay
    ↓
Subscrição do plano
    ↓
BitPay
    ↓
Pagamento da plataforma

Os pagamentos entre:

Comerciante
    ↓
Cliente do comerciante

não passam pelo BitPay.

Esses pagamentos são tratados pela própria Honey Pay
através das contas bancárias, transferências,
comprovativos e faturas configurados pelo comerciante.

============================================================
*/

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import path from "node:path";
import { fileURLToPath } from "node:url";

import router from "./routes.js";

import bankAccountRouter
    from "./bank-account-routes.js";

import checkoutRouter
    from "./checkout-routes.js";

import proofRouter
    from "./proof-routes.js";

import {
    connectDatabase,
    closeDatabase,
    getDatabaseStatus
} from "./database.js";


/*
============================================================
PATHS
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


/*
============================================================
FRONTEND DIRECTORY
============================================================

Como o index.html está na raiz do projeto, usamos o próprio
diretório onde server.js está localizado.

Isso evita problemas relacionados ao diretório de execução
do Render.

============================================================
*/

const FRONTEND_DIR =
    __dirname;


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
APPLICATION
============================================================
*/

const app =
    express();


/*
============================================================
TRUST PROXY
============================================================

Render fica atrás de proxy.

============================================================
*/

app.set(
    "trust proxy",
    1
);


/*
============================================================
SECURITY
============================================================
*/

app.disable(
    "x-powered-by"
);


app.use(
    helmet(
        {
            contentSecurityPolicy:
                false,

            crossOriginEmbedderPolicy:
                false
        }
    )
);


/*
============================================================
CORS
============================================================
*/

function getAllowedOrigins() {

    const raw =
        process.env.CORS_ORIGINS ||
        "";

    return raw
        .split(",")
        .map(
            origin =>
                origin.trim()
        )
        .filter(
            Boolean
        );
}


const allowedOrigins =
    getAllowedOrigins();


app.use(
    cors(
        {

            origin(
                origin,
                callback
            ) {

                /*
                ------------------------------------------------
                Requests sem Origin
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
                Sem CORS_ORIGINS configurado
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
                Origem autorizada
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

                "X-Requested-With"

            ]

        }
    )
);


/*
============================================================
BODY PARSING
============================================================
*/

app.use(
    express.json(
        {

            limit:
                "2mb",

            strict:
                true

        }
    )
);


app.use(
    express.urlencoded(
        {

            extended:
                false,

            limit:
                "2mb"

        }
    )
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

        const requestId =
            req.get(
                "x-request-id"
            ) ||
            cryptoRandomId();


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
PUBLIC RATE LIMITER
============================================================
*/

const publicRateLimiter =
    rateLimit(
        {

            windowMs:
                15 *
                60 *
                1000,

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

            skip(
                req
            ) {

                return (
                    req.path ===
                    "/health"
                );
            }

        }
    );


app.use(
    "/api",
    publicRateLimiter
);


/*
============================================================
REQUEST LOGGING
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

                    `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${req.requestId}`

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
                .json(
                    {

                        success:
                            healthy,

                        service:
                            "Honey Pay API",

                        version:
                            "1.1.0",

                        status:
                            healthy
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
                "[HEALTH ERROR]",
                error
            );


            return res
                .status(
                    503
                )
                .json(
                    {

                        success:
                            false,

                        service:
                            "Honey Pay API",

                        version:
                            "1.1.0",

                        status:
                            "degraded",

                        database:
                            {

                                connected:
                                    false

                            },

                        timestamp:
                            new Date()
                                .toISOString()

                    }
                );

        }

    }
);


/*
============================================================
API ROUTES
============================================================
*/


/*
------------------------------------------------------------
MAIN API
------------------------------------------------------------
*/

app.use(
    "/api",
    router
);


/*
------------------------------------------------------------
BANK ACCOUNTS
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
*/

app.use(
    "/api",
    checkoutRouter
);


/*
------------------------------------------------------------
PROOFS
------------------------------------------------------------
*/

app.use(
    "/api",
    proofRouter
);


/*
============================================================
API 404
============================================================
*/

app.use(
    "/api",
    (
        req,
        res
    ) => {

        return res
            .status(
                404
            )
            .json(
                {

                    success:
                        false,

                    code:
                        "API_ROUTE_NOT_FOUND",

                    message:
                        "A rota solicitada não existe.",

                    requestId:
                        req.requestId ||
                        null

                }
            );

    }
);


/*
============================================================
FRONTEND STATIC FILES
============================================================

IMPORTANTE:

Esta é a parte que faltava.

O Express passa a servir:

/
    → index.html

/style.css
    → style.css

/app.js
    → app.js

e qualquer outro recurso estático existente na raiz.

============================================================
*/

app.use(
    express.static(
        FRONTEND_DIR,
        {

            index:
                "index.html",

            extensions:
                [
                    "html"
                ],

            fallthrough:
                true

        }
    )
);


/*
============================================================
FRONTEND ROOT
============================================================

Garantia explícita de que:

GET /

entrega o index.html.

============================================================
*/

app.get(
    "/",
    (
        req,
        res
    ) => {

        return res.sendFile(
            path.join(
                FRONTEND_DIR,
                "index.html"
            )
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
            .status(
                404
            )
            .json(
                {

                    success:
                        false,

                    code:
                        "NOT_FOUND",

                    message:
                        "O recurso solicitado não existe.",

                    requestId:
                        req.requestId ||
                        null

                }
            );

    }
);


/*
============================================================
GLOBAL ERROR HANDLER
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
                .status(
                    400
                )
                .json(
                    {

                        success:
                            false,

                        code:
                            "INVALID_JSON",

                        message:
                            "O corpo da requisição contém JSON inválido.",

                        requestId:
                            req.requestId ||
                            null

                    }
                );

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
                .status(
                    413
                )
                .json(
                    {

                        success:
                            false,

                        code:
                            "PAYLOAD_TOO_LARGE",

                        message:
                            "O pedido excede o tamanho permitido.",

                        requestId:
                            req.requestId ||
                            null

                    }
                );

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
                .status(
                    403
                )
                .json(
                    {

                        success:
                            false,

                        code:
                            "CORS_ORIGIN_NOT_ALLOWED",

                        message:
                            "Origem não autorizada.",

                        requestId:
                            req.requestId ||
                            null

                    }
                );

        }


        /*
        ----------------------------------------------------
        GENERIC ERROR
        ----------------------------------------------------
        */

        return res
            .status(
                Number.isInteger(
                    error?.statusCode
                )
                    ? error.statusCode
                    : 500
            )
            .json(
                {

                    success:
                        false,

                    code:
                        error?.code ||
                        "INTERNAL_SERVER_ERROR",

                    message:
                        NODE_ENV ===
                        "production"

                            ? "Ocorreu um erro interno no servidor."

                            : (
                                error?.message ||
                                "Ocorreu um erro interno no servidor."
                            ),

                    requestId:
                        req.requestId ||
                        null

                }
            );

    }
);


/*
============================================================
REQUEST ID GENERATOR
============================================================
*/

function cryptoRandomId() {

    return (

        Date.now()
            .toString(
                36
            )

        +

        "-"

        +

        Math.random()
            .toString(
                36
            )
            .slice(
                2,
                12
            )

    );

}


/*
============================================================
SERVER
============================================================
*/

let server =
    null;


/*
============================================================
START SERVER
============================================================
*/

async function startServer() {

    try {

        console.log(
            "[HONEY PAY] Starting server..."
        );


        console.log(
            `[HONEY PAY] Environment: ${NODE_ENV}`
        );


        console.log(
            `[HONEY PAY] Frontend directory: ${FRONTEND_DIR}`
        );


        console.log(
            `[HONEY PAY] Frontend entry: ${path.join(
                FRONTEND_DIR,
                "index.html"
            )}`
        );


        /*
        ----------------------------------------------------
        MongoDB
        ----------------------------------------------------
        */

        await connectDatabase();


        console.log(
            "[HONEY PAY] MongoDB connected."
        );


        /*
        ----------------------------------------------------
        HTTP SERVER
        ----------------------------------------------------
        */

        server =
            app.listen(

                PORT,

                HOST,

                () => {

                    console.log(

                        `[HONEY PAY] Server listening on ${HOST}:${PORT}`

                    );


                    console.log(
                        "[HONEY PAY] Frontend available at /"
                    );


                    console.log(
                        "[HONEY PAY] API available at /api"
                    );


                    console.log(
                        "[HONEY PAY] Health available at /health"
                    );

                }

            );


        /*
        ----------------------------------------------------
        SERVER ERRORS
        ----------------------------------------------------
        */

        server.on(
            "error",
            error => {

                console.error(
                    "[HONEY PAY] HTTP server error:",
                    error
                );

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


        process.exit(
            1
        );

    }

}


/*
============================================================
GRACEFUL SHUTDOWN
============================================================
*/

let shuttingDown =
    false;


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


    try {

        /*
        ----------------------------------------------------
        STOP HTTP
        ----------------------------------------------------
        */

        if (
            server
        ) {

            await new Promise(
                resolve => {

                    server.close(
                        () => {

                            resolve();

                        }
                    );

                }
            );

        }


        /*
        ----------------------------------------------------
        CLOSE DATABASE
        ----------------------------------------------------
        */

        await closeDatabase();


        console.log(
            "[HONEY PAY] Shutdown completed."
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


        process.exit(
            1
        );

    }

}


/*
============================================================
PROCESS SIGNALS
============================================================
*/

process.on(
    "SIGTERM",
    () => {

        shutdown(
            "SIGTERM"
        );

    }
);


process.on(
    "SIGINT",
    () => {

        shutdown(
            "SIGINT"
        );

    }
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
START APPLICATION
============================================================
*/

startServer();


/*
============================================================
EXPORT
============================================================
*/

export default app;
