import "dotenv/config";

import crypto from "node:crypto";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import {
    connectDatabase,
    isDatabaseConnected,
    getDatabaseInfo
} from "./database.js";


/*
============================================================
HONEY PAY
BACKEND API
V1.0.0
============================================================

ARQUIVO PRINCIPAL DO SERVIDOR

RESPONSABILIDADES
------------------------------------------------------------
- Inicialização da aplicação
- Conexão com MongoDB Atlas
- Segurança HTTP
- CORS
- Compression
- Rate limiting
- Request IDs
- Health check
- Tratamento de erros
- Graceful shutdown

ARQUITETURA ATUAL
------------------------------------------------------------

GitHub
   │
   ▼
Render
   │
   ▼
server.js
   │
   ▼
database.js
   │
   ▼
MongoDB Atlas

============================================================
*/


/*
============================================================
APPLICATION CONFIGURATION
============================================================
*/

const NODE_ENV =
    process.env.NODE_ENV || "development";

const PORT =
    Number(process.env.PORT) || 10000;

const CORS_ORIGIN =
    process.env.CORS_ORIGIN || "*";

const MAX_JSON_SIZE =
    process.env.MAX_JSON_SIZE || "1mb";

const MAX_URLENCODED_SIZE =
    process.env.MAX_URLENCODED_SIZE || "1mb";


/*
============================================================
EXPRESS APPLICATION
============================================================
*/

const app = express();

app.disable("x-powered-by");

app.set("trust proxy", 1);


/*
============================================================
REQUEST ID
============================================================

Cada requisição recebe um identificador único.

Será utilizado posteriormente para:

- auditoria
- logs
- suporte
- segurança
- investigação de erros
============================================================
*/

app.use(
    (req, res, next) => {

        const receivedRequestId =
            req.headers["x-request-id"];

        const validRequestId =
            typeof receivedRequestId === "string" &&
            receivedRequestId.length > 0 &&
            receivedRequestId.length <= 128;

        req.requestId =
            validRequestId
                ? receivedRequestId
                : crypto.randomUUID();

        res.setHeader(
            "X-Request-ID",
            req.requestId
        );

        next();
    }
);


/*
============================================================
SECURITY HEADERS
============================================================
*/

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false
    })
);


/*
============================================================
CORS
============================================================
*/

app.use(
    cors({
        origin: (
            origin,
            callback
        ) => {

            /*
            ------------------------------------------------
            Permite requisições sem Origin.

            Isto é necessário para:
            - health checks
            - servidores
            - ferramentas HTTP
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
            Durante desenvolvimento podemos utilizar "*".
            ------------------------------------------------
            */

            if (
                CORS_ORIGIN === "*"
            ) {
                return callback(
                    null,
                    true
                );
            }


            /*
            ------------------------------------------------
            Permite várias origens separadas por vírgula.
            ------------------------------------------------
            */

            const allowedOrigins =
                CORS_ORIGIN
                    .split(",")
                    .map(
                        (item) =>
                            item.trim()
                    )
                    .filter(Boolean);


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

        credentials: true,

        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],

        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "X-Request-ID"
        ]
    })
);


/*
============================================================
COMPRESSION
============================================================
*/

app.use(
    compression()
);


/*
============================================================
REQUEST BODY PARSING
============================================================
*/

app.use(
    express.json({
        limit: MAX_JSON_SIZE
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: MAX_URLENCODED_SIZE
    })
);


/*
============================================================
GLOBAL RATE LIMIT
============================================================

Este é apenas o limite global.

Posteriormente teremos limites específicos para:

- registro
- login
- recuperação de conta
- criação de cobrança
- upload de comprovativos
- checkout
- WhatsApp
- webhooks

============================================================
*/

const globalRateLimiter =
    rateLimit({
        windowMs:
            15 * 60 * 1000,

        limit: 300,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        message: {
            success: false,

            error: {
                code:
                    "RATE_LIMIT_EXCEEDED",

                message:
                    "Muitas solicitações. Aguarde alguns minutos e tente novamente."
            }
        }
    });

app.use(
    globalRateLimiter
);


/*
============================================================
ROOT ENDPOINT
============================================================
*/

app.get(
    "/",
    (req, res) => {

        return res.status(200).json({

            success: true,

            service:
                "Honey Pay API",

            version:
                "1.0.0",

            status:
                "online",

            environment:
                NODE_ENV,

            message:
                "Honey Pay API está online.",

            timestamp:
                new Date().toISOString(),

            requestId:
                req.requestId
        });
    }
);


/*
============================================================
HEALTH CHECK
============================================================

Este endpoint será utilizado pelo:

- Render
- monitorização
- testes
- diagnóstico

Agora o health check verifica realmente o MongoDB.
============================================================
*/

app.get(
    "/api/v1/health",
    (req, res) => {

        const databaseInfo =
            getDatabaseInfo();

        const healthy =
            isDatabaseConnected();


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
                    "honey-pay",

                version:
                    "1.0.0",

                status:
                    healthy
                        ? "healthy"
                        : "degraded",

                database: {
                    connected:
                        databaseInfo.connected,

                    state:
                        databaseInfo.state,

                    name:
                        databaseInfo.name,

                    host:
                        databaseInfo.host
                },

                environment:
                    NODE_ENV,

                timestamp:
                    new Date().toISOString(),

                requestId:
                    req.requestId
            });
    }
);


/*
============================================================
404 HANDLER
============================================================
*/

app.use(
    (req, res) => {

        return res.status(404).json({

            success: false,

            error: {

                code:
                    "ROUTE_NOT_FOUND",

                message:
                    "A rota solicitada não existe."
            },

            requestId:
                req.requestId
        });
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
            "[HONEY PAY ERROR]",
            {
                message:
                    error.message,

                method:
                    req.method,

                path:
                    req.originalUrl,

                requestId:
                    req.requestId
            }
        );


        if (
            res.headersSent
        ) {
            return next(error);
        }


        const production =
            NODE_ENV ===
            "production";


        return res.status(500).json({

            success: false,

            error: {

                code:
                    "INTERNAL_SERVER_ERROR",

                message:
                    production
                        ? "Ocorreu um erro interno."
                        : error.message
            },

            requestId:
                req.requestId
        });
    }
);


/*
============================================================
SERVER STARTUP
============================================================
*/

let server = null;


async function startServer() {

    try {

        /*
        ----------------------------------------------------
        PRIMEIRO:
        conectar ao MongoDB.
        ----------------------------------------------------
        */

        await connectDatabase();


        /*
        ----------------------------------------------------
        SEGUNDO:
        iniciar HTTP.
        ----------------------------------------------------
        */

        server =
            app.listen(
                PORT,
                "0.0.0.0",
                () => {

                    console.log(
                        "=================================================="
                    );

                    console.log(
                        "HONEY PAY API"
                    );

                    console.log(
                        "=================================================="
                    );

                    console.log(
                        `Status: ONLINE`
                    );

                    console.log(
                        `Environment: ${NODE_ENV}`
                    );

                    console.log(
                        `Port: ${PORT}`
                    );

                    console.log(
                        `Database: ${
                            isDatabaseConnected()
                                ? "CONNECTED"
                                : "DISCONNECTED"
                        }`
                    );

                    console.log(
                        `URL: http://localhost:${PORT}`
                    );

                    console.log(
                        "=================================================="
                    );
                }
            );

    }

    catch (error) {

        console.error(
            "=================================================="
        );

        console.error(
            "HONEY PAY NÃO CONSEGUIU INICIAR"
        );

        console.error(
            "=================================================="
        );

        console.error(
            error.message
        );

        console.error(
            "=================================================="
        );

        process.exit(1);
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

    console.log(
        `[SERVER] ${signal} recebido.`
    );


    if (!server) {

        process.exit(0);

    }


    server.close(
        async () => {

            try {

                const {
                    disconnectDatabase
                } = await import(
                    "./database.js"
                );


                await disconnectDatabase();


                console.log(
                    "[SERVER] MongoDB desconectado."
                );

                console.log(
                    "[SERVER] Honey Pay encerrado corretamente."
                );


                process.exit(0);

            }

            catch (error) {

                console.error(
                    "[SERVER] Erro durante shutdown:",
                    error.message
                );

                process.exit(1);
            }
        }
    );


    /*
    --------------------------------------------------------
    Segurança contra processo preso.
    --------------------------------------------------------
    */

    setTimeout(
        () => {

            console.error(
                "[SERVER] Encerramento forçado."
            );

            process.exit(1);

        },
        10000
    ).unref();
}


process.once(
    "SIGTERM",
    () =>
        shutdown(
            "SIGTERM"
        )
);

process.once(
    "SIGINT",
    () =>
        shutdown(
            "SIGINT"
        )
);


/*
============================================================
PROCESS ERROR HANDLERS
============================================================
*/

process.on(
    "unhandledRejection",
    (reason) => {

        console.error(
            "[PROCESS] Unhandled Promise Rejection:",
            reason
        );
    }
);


process.on(
    "uncaughtException",
    (error) => {

        console.error(
            "[PROCESS] Uncaught Exception:",
            error
        );

        shutdown(
            "uncaughtException"
        );
    }
);


/*
============================================================
EXPORT
============================================================
*/

export default app;


/*
============================================================
START APPLICATION
============================================================
*/

startServer();
