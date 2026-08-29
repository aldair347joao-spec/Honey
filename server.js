/*
============================================================
HONEY PAY
MAIN SERVER
V1.0.0
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

============================================================
*/

import express from "express";

import cors from "cors";

import helmet from "helmet";

import rateLimit from "express-rate-limit";


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

Isso permite que req.ip represente corretamente o cliente
quando o proxy estiver configurado.

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
        .split(
            ","
        )
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
                --------------------------------------------
                Requests sem Origin:

                - curl
                - health checks
                - servidores
                - aplicações server-to-server

                --------------------------------------------
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
                --------------------------------------------
                Se não existir CORS_ORIGINS configurado,
                permitir durante a inicialização da V1.

                Em produção recomenda-se configurar:

                CORS_ORIGINS=https://teudominio.com
                --------------------------------------------
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

O tamanho foi definido para permitir dados de checkout e
operações normais sem transformar a API num endpoint de
upload ilimitado.

Uploads grandes devem utilizar armazenamento próprio.

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

Cada request recebe um identificador para facilitar
diagnóstico no Render.

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

Protege principalmente:

- login
- register
- checkout
- comprovativos

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
ROOT
============================================================
*/

app.get(
    "/",
    (
        req,
        res
    ) => {

        return res.status(
            200
        ).json(
            {

                success:
                    true,

                service:
                    "Honey Pay API",

                version:
                    "1.0.0",

                status:
                    "operational"
            }
        );
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
                            "1.0.0",

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
                            "1.0.0",

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
        Erros conhecidos de payload JSON.
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
        Payload demasiado grande.
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
        Erro genérico.

        Nunca enviar:
        - stack
        - caminho de ficheiros
        - queries
        - connection strings
        - detalhes MongoDB
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
            ) +

        "-" +

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
SERVER START
============================================================
*/

let server =
    null;


/*
============================================================
START
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
        HTTP
        ----------------------------------------------------
        */

        server =
            app.listen(

                PORT,

                HOST,

                () => {

                    console.log(
                        `[HONEY PAY] API listening on ${HOST}:${PORT}`
                    );
                }
            );


        /*
        ----------------------------------------------------
        Server errors
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
        Parar de aceitar novas conexões.
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
        Fechar MongoDB.
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
