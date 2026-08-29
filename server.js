/*
============================================================
HONEY PAY
MAIN SERVER
V1.2.0
============================================================

SERVIDOR PRINCIPAL DA HONEY PAY

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Servir o frontend da Honey Pay
- Servir index.html na raiz
- Servir CSS / JS / assets
- Montar todas as APIs
- Montar autenticação
- Montar faturas
- Montar contas bancárias
- Montar checkout
- Montar comprovativos
- Health check
- Segurança
- CORS
- Rate limiting
- Request ID
- Error handling
- Graceful shutdown
- Render
- MongoDB Atlas

------------------------------------------------------------
ARQUITETURA
------------------------------------------------------------

                    RENDER
                       │
                       ▼
                 server.js
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
      FRONTEND        API         HEALTH
          │            │
          │            ├── Auth
          │            ├── Merchant
          │            ├── Plans
          │            ├── Invoices
          │            ├── Bank Accounts
          │            ├── Checkout
          │            └── Proofs
          │
          ▼
      index.html
      style.css
      frontend/app.js

------------------------------------------------------------
PAGAMENTOS
------------------------------------------------------------

CAMADA 1 — SUBSCRIÇÃO DA HONEY PAY

Comerciante
     │
     ▼
Plano Honey Pay
     │
     ▼
BitPay
     │
     ▼
Pagamento da subscrição
     │
     ▼
Honey Pay / proprietário

CAMADA 2 — PAGAMENTO DO CLIENTE DO COMERCIANTE

Cliente
     │
     ▼
Checkout Honey Pay
     │
     ▼
Conta bancária escolhida
     │
     ▼
Transferência / pagamento bancário
     │
     ▼
Comprovativo
     │
     ▼
Comerciante
     │
     ├── Aprovar
     └── Rejeitar

A CAMADA 2 NÃO PASSA PELO BITPAY.

============================================================
*/

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import path from "node:path";
import { fileURLToPath } from "node:url";


/*
============================================================
MAIN API
============================================================
*/

import router
    from "./routes.js";


/*
============================================================
BANK ACCOUNTS
============================================================
*/

import bankAccountRouter
    from "./bank-account-routes.js";


/*
============================================================
CHECKOUT
============================================================
*/

import checkoutRouter
    from "./checkout-routes.js";


/*
============================================================
PROOFS
============================================================
*/

import proofRouter
    from "./proof-routes.js";


/*
============================================================
INVOICES
============================================================

IMPORTANTE:

Este router existia no projeto, mas não estava montado no
server.js.

Agora passa a estar oficialmente ligado ao servidor.

Rotas:

POST   /api/invoices
GET    /api/invoices
GET    /api/invoices/statistics
GET    /api/invoices/:invoiceId
PATCH  /api/invoices/:invoiceId
POST   /api/invoices/:invoiceId/cancel
GET    /api/pay/:publicToken

============================================================
*/

import invoiceRouter
    from "./invoice-routes.js";


/*
============================================================
DATABASE
============================================================
*/

import {
    connectDatabase,
    closeDatabase,
    getDatabaseStatus
} from "./database.js";


/*
============================================================
PATH CONFIGURATION
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
PROJECT ROOT
============================================================

server.js está na raiz do projeto.

Portanto:

__dirname
    ↓
/opt/render/project/src

e o frontend:

/opt/render/project/src/index.html

============================================================
*/

const PROJECT_ROOT =
    __dirname;


/*
============================================================
FRONTEND
============================================================
*/

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
APPLICATION
============================================================
*/

const app =
    express();


/*
============================================================
EXPRESS CONFIGURATION
============================================================
*/

app.disable(
    "x-powered-by"
);


/*
============================================================
TRUST PROXY
============================================================

Render utiliza proxy reverso.

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

app.use(
    helmet(
        {

            /*
            O frontend pode utilizar recursos locais,
            módulos ES e assets próprios.
            */

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
                Se CORS_ORIGINS não estiver configurado
                ------------------------------------------------

                Como frontend e backend estão no mesmo domínio
                no Render, normalmente o browser nem precisa
                de CORS para as chamadas internas.

                Mantemos compatibilidade para integrações
                externas durante a fase inicial.
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
BODY PARSER
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
RATE LIMIT
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

            message:
                {

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
HTTP LOGGING
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
HEALTH CHECK
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
                            "1.2.0",

                        status:
                            healthy
                                ? "operational"
                                : "degraded",

                        database,

                        frontend:
                            {

                                available:
                                    true,

                                entry:
                                    "/"

                            },

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
                            "1.2.0",

                        status:
                            "degraded",

                        database:
                            {

                                connected:
                                    false

                            },

                        frontend:
                            {

                                available:
                                    true

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
INVOICES
------------------------------------------------------------

IMPORTANTE:

Tem de ficar antes do API 404.

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
STATIC FRONTEND
============================================================

Serve:

/index.html
/style.css
/app.js
/frontend/app.js
/assets/*
/favicon.ico

e qualquer outro recurso estático que esteja na raiz.

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
                NODE_ENV ===
                "production"

                    ? "1h"

                    : 0

        }
    )
);


/*
============================================================
ROOT FRONTEND
============================================================

GET /

Entrega explicitamente:

/index.html

============================================================
*/

app.get(
    "/",
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
FRONTEND FALLBACK
============================================================

Permite que páginas do frontend baseadas em rota sejam
reencaminhadas para o index.html sem interferir com /api.

Exemplo:

/dashboard
/login
/register

============================================================
*/

app.get(
    [
        "/dashboard",
        "/login",
        "/register",
        "/merchant",
        "/settings",
        "/billing"
    ],
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


        /*
        ----------------------------------------------------
        Headers já enviados
        ----------------------------------------------------
        */

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
        STATUS
        ----------------------------------------------------
        */

        const statusCode =
            Number.isInteger(
                error?.statusCode
            )

                ? error.statusCode

                : 500;


        /*
        ----------------------------------------------------
        MESSAGE
        ----------------------------------------------------
        */

        const message =
            NODE_ENV ===
            "production"

                ? (
                    error?.code
                        ? error.message
                        : "Ocorreu um erro interno no servidor."
                )

                : (
                    error?.message ||
                    "Ocorreu um erro interno no servidor."
                );


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
                        "INTERNAL_SERVER_ERROR",

                    message,

                    requestId:
                        req.requestId ||
                        null

                }
            );

    }
);


/*
============================================================
REQUEST ID
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


let shuttingDown =
    false;


/*
============================================================
START SERVER
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
            `[HONEY PAY] Environment: ${NODE_ENV}`
        );


        console.log(
            `[HONEY PAY] Project root: ${PROJECT_ROOT}`
        );


        console.log(
            `[HONEY PAY] Frontend: ${INDEX_FILE}`
        );


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
        HTTP SERVER
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
                        "[HONEY PAY] API: /api"
                    );


                    console.log(
                        "[HONEY PAY] Health: /health"
                    );


                    console.log(
                        "[HONEY PAY] Invoices: /api/invoices"
                    );


                    console.log(
                        "[HONEY PAY] Public checkout: /api/pay/:publicToken"
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
        HTTP SERVER ERROR
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
        STOP HTTP SERVER
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
            "[HONEY PAY] MongoDB connection closed."
        );


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
UNHANDLED PROMISE
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
