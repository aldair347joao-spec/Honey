/*
============================================================
HONEY PAY
MAIN SERVER
V1.3.0
============================================================

SERVIDOR PRINCIPAL DA HONEY PAY

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Servir o frontend da Honey Pay
- Servir index.html
- Servir CSS / JS / assets
- Montar todas as APIs
- Autenticação
- Comerciantes
- Planos
- Faturas
- Contas bancárias
- Checkout
- Comprovativos
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
PAGAMENTOS
------------------------------------------------------------

CAMADA 1 — SUBSCRIÇÃO DA HONEY PAY

Comerciante
    ↓
Plano Honey Pay
    ↓
BitPay
    ↓
Pagamento da subscrição
    ↓
Honey Pay / proprietário


CAMADA 2 — PAGAMENTO DO CLIENTE

Cliente
    ↓
Checkout Honey Pay
    ↓
Conta bancária do comerciante
    ↓
Transferência / pagamento bancário
    ↓
Comprovativo
    ↓
Comerciante
    ↓
Aprovar / Rejeitar

A CAMADA 2 NÃO PASSA PELO BITPAY.

============================================================
*/

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";


/*
============================================================
MAIN API
============================================================
*/

import router from "./routes.js";


/*
============================================================
BANK ACCOUNTS
============================================================
*/

import bankAccountRouter from "./bank-account-routes.js";


/*
============================================================
CHECKOUT
============================================================
*/

import checkoutRouter from "./checkout-routes.js";


/*
============================================================
PROOFS
============================================================
*/

import proofRouter from "./proof-routes.js";


/*
============================================================
INVOICES
============================================================
*/

import invoiceRouter from "./invoice-routes.js";


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

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);


/*
============================================================
PROJECT ROOT
============================================================

server.js encontra-se na raiz do projeto.

Exemplo Render:

/opt/render/project/src

============================================================
*/

const PROJECT_ROOT = __dirname;


/*
============================================================
FRONTEND
============================================================
*/

const INDEX_FILE = path.join(
    PROJECT_ROOT,
    "index.html"
);

const FRONTEND_DIR = PROJECT_ROOT;


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
        process.env.PORT || 10000
    );


const HOST =
    process.env.HOST ||
    "0.0.0.0";


/*
============================================================
APPLICATION
============================================================
*/

const app = express();


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
            contentSecurityPolicy: false,

            crossOriginEmbedderPolicy: false,

            referrerPolicy: {
                policy:
                    "strict-origin-when-cross-origin"
            },

            frameguard: {
                action:
                    "sameorigin"
            }
        }
    )
);


/*
============================================================
CORS
============================================================

CORS_ORIGINS pode conter:

https://honeypay.ao
https://www.honeypay.ao

ou múltiplas origens separadas por vírgula.

Em produção, se não houver CORS_ORIGINS definido,
requests same-origin continuam funcionando normalmente.

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
        .filter(Boolean);

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

                if (!origin) {

                    return callback(
                        null,
                        true
                    );

                }


                /*
                ------------------------------------------------
                CORS não configurado
                ------------------------------------------------

                O frontend principal e a API estão no mesmo
                domínio no Render.

                Portanto requests same-origin não dependem
                desta configuração.

                Para desenvolvimento e compatibilidade inicial,
                permitimos origins quando a lista ainda não
                foi configurada.
                ------------------------------------------------
                */

                if (
                    allowedOrigins.length === 0
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
                    allowedOrigins.includes(origin)
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

            credentials: true,

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
                "X-Request-ID"
            ],

            exposedHeaders: [
                "X-Request-ID"
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
            limit: "2mb",
            strict: true
        }
    )
);


app.use(
    express.urlencoded(
        {
            extended: false,
            limit: "2mb"
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

        const incomingRequestId =
            req.get(
                "x-request-id"
            );


        const requestId =
            isValidRequestId(
                incomingRequestId
            )
                ? incomingRequestId
                : cryptoRandomId();


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

Limite geral das APIs.

Não substitui limites específicos das operações
sensíveis existentes nos routers.

============================================================
*/

const publicRateLimiter =
    rateLimit(
        {
            windowMs:
                15 * 60 * 1000,

            limit:
                300,

            standardHeaders:
                "draft-8",

            legacyHeaders:
                false,

            message:
                {
                    success: false,

                    code:
                        "RATE_LIMIT_EXCEEDED",

                    message:
                        "Demasiados pedidos. Tente novamente mais tarde."
                },

            handler(
                req,
                res
            ) {

                res.status(
                    429
                ).json(
                    {
                        success: false,

                        code:
                            "RATE_LIMIT_EXCEEDED",

                        message:
                            "Demasiados pedidos. Tente novamente mais tarde.",

                        requestId:
                            req.requestId ||
                            null
                    }
                );

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
                    `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms ${req.requestId || "-"}`
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


            const databaseConnected =
                database?.connected === true;


            const healthy =
                databaseConnected;


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
                            "1.3.0",

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

                        requestId:
                            req.requestId ||
                            null,

                        timestamp:
                            new Date()
                                .toISOString()
                    }
                );

        }

        catch (error) {

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
                            "1.3.0",

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

                        requestId:
                            req.requestId ||
                            null,

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

Rotas esperadas:

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

/
 /index.html
 /style.css
 /app.js
 /frontend/*
 /assets/*
 /favicon.ico

e restantes ficheiros públicos existentes na raiz.

============================================================
*/

app.use(
    express.static(
        FRONTEND_DIR,
        {
            index: false,

            fallthrough: true,

            etag: true,

            maxAge:
                NODE_ENV === "production"
                    ? "1h"
                    : 0
        }
    )
);


/*
============================================================
ROOT FRONTEND
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

Rotas conhecidas do frontend.

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

        /*
        ----------------------------------------------------
        Se for uma requisição que espera JSON
        ----------------------------------------------------
        */

        const acceptsJson =
            req.accepts(
                "json"
            );


        if (
            acceptsJson &&
            !req.accepts("html")
        ) {

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


        /*
        ----------------------------------------------------
        Para requests HTML
        ----------------------------------------------------
        */

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

                error:
                    error?.message ||
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
        RATE LIMIT
        ----------------------------------------------------
        */

        if (
            error?.status === 429 ||
            error?.statusCode === 429
        ) {

            return res
                .status(
                    429
                )
                .json(
                    {
                        success:
                            false,

                        code:
                            "RATE_LIMIT_EXCEEDED",

                        message:
                            "Demasiados pedidos. Tente novamente mais tarde.",

                        requestId:
                            req.requestId ||
                            null
                    }
                );

        }


        /*
        ----------------------------------------------------
        HTTP STATUS
        ----------------------------------------------------
        */

        const statusCode =
            Number.isInteger(
                error?.statusCode
            )
                ? error.statusCode
                : (
                    Number.isInteger(
                        error?.status
                    )
                        ? error.status
                        : 500
                );


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
            typeof error?.code === "string" &&
            /^[A-Z0-9_:-]+$/.test(
                error.code
            )
                ? error.code
                : "INTERNAL_SERVER_ERROR";


        /*
        ----------------------------------------------------
        ERROR MESSAGE
        ----------------------------------------------------
        */

        let message =
            "Ocorreu um erro interno no servidor.";


        if (
            NODE_ENV !== "production"
        ) {

            message =
                error?.message ||
                message;

        }
        else if (
            error?.expose === true &&
            typeof error?.message === "string"
        ) {

            message =
                error.message;

        }


        /*
        ----------------------------------------------------
        RESPONSE
        ----------------------------------------------------
        */

        return res
            .status(
                safeStatus
            )
            .json(
                {
                    success:
                        false,

                    code:
                        errorCode,

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

    return crypto.randomUUID();

}


function isValidRequestId(
    value
) {

    if (
        typeof value !== "string"
    ) {

        return false;

    }


    if (
        value.length < 8 ||
        value.length > 128
    ) {

        return false;

    }


    /*
    --------------------------------------------------------
    Permite IDs UUID e IDs alfanuméricos seguros.
    --------------------------------------------------------
    */

    return /^[a-zA-Z0-9._:-]+$/.test(
        value
    );

}


/*
============================================================
SERVER STATE
============================================================
*/

let server = null;

let shuttingDown = false;


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
            `[HONEY PAY] Version: 1.3.0`
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
        VALIDATE FRONTEND
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

        catch (error) {

            console.error(
                "[HONEY PAY] index.html was not found:",
                INDEX_FILE
            );


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
                        "[HONEY PAY] Bank accounts: /api"
                    );


                    console.log(
                        "[HONEY PAY] Proofs: /api"
                    );


                    console.log(
                        "[HONEY PAY] Checkout: /api"
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

        Valores suficientemente altos para não interromper
        operações legítimas, mas evitando conexões penduradas
        indefinidamente.

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


                /*
                ------------------------------------------------
                Se a porta já estiver em uso, termina o processo
                para que o Render possa reiniciar corretamente.
                ------------------------------------------------
                */

                if (
                    error?.code ===
                    "EADDRINUSE"
                ) {

                    console.error(
                        `[HONEY PAY] Port ${PORT} is already in use.`
                    );


                    process.exit(
                        1
                    );

                }

            }
        );

    }

    catch (error) {

        console.error(
            "[HONEY PAY] Failed to start:",
            error
        );


        /*
        ----------------------------------------------------
        Tenta fechar a ligação à base de dados caso tenha
        sido aberta antes da falha.
        ----------------------------------------------------
        */

        try {

            await closeDatabase();

        }

        catch (closeError) {

            console.error(
                "[HONEY PAY] Database close after startup failure failed:",
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


    /*
    --------------------------------------------------------
    Safety timeout
    --------------------------------------------------------
    */

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
        STOP HTTP SERVER
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


        clearTimeout(
            forceShutdownTimer
        );


        process.exit(
            0
        );

    }

    catch (error) {

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
PROCESS SIGNALS
============================================================
*/

process.once(
    "SIGTERM",
    () => {

        shutdown(
            "SIGTERM"
        );

    }
);


process.once(
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

Não encerramos imediatamente porque uma Promise rejeitada
pode ser tratada pelo próprio processo/infraestrutura.

O erro fica registado para diagnóstico.

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

Uma exceção não capturada pode deixar o processo num estado
inconsistente.

Por isso encerramos de forma controlada.

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
