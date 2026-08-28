import "dotenv/config";

import crypto from "node:crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

const app = express();

/*
============================================================
HONEY PAY
BACKEND API
V1.0.0
============================================================

FUNÇÃO DESTE ARQUIVO
------------------------------------------------------------
- Inicialização do servidor
- Configuração HTTP
- Segurança base
- CORS
- Compression
- Rate limiting
- Request ID
- Health check
- Tratamento básico de erros

IMPORTANTE
------------------------------------------------------------
Este arquivo é a fundação do backend.
Os módulos de autenticação, negócios, lojas, cobranças,
pagamentos, comprovativos, Honey Shield, WhatsApp e planos
serão adicionados posteriormente sem quebrar esta base.
============================================================
*/


/*
============================================================
ENVIRONMENT
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
BASIC EXPRESS CONFIGURATION
============================================================
*/

app.disable("x-powered-by");

app.set("trust proxy", 1);


/*
============================================================
REQUEST ID
============================================================

Cada requisição recebe um identificador único.

Isso será importante posteriormente para:
- logs
- suporte
- auditoria
- investigação de erros
- segurança
============================================================
*/

app.use((req, res, next) => {
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
});


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

Durante desenvolvimento:
    CORS_ORIGIN=http://localhost:10000

Em produção:
    CORS_ORIGIN=https://teu-dominio.com

Não devemos depender de "*" em produção.
============================================================
*/

app.use(
    cors({
        origin: (origin, callback) => {

            if (!origin) {
                return callback(null, true);
            }

            if (CORS_ORIGIN === "*") {
                return callback(null, true);
            }

            const allowedOrigins =
                CORS_ORIGIN
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean);

            if (
                allowedOrigins.includes(origin)
            ) {
                return callback(null, true);
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
REQUEST BODY
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

Proteção inicial contra abuso excessivo da API.

Limites específicos serão adicionados posteriormente
para:
- login
- registro
- upload
- checkout
- criação de cobranças
- webhooks
============================================================
*/

const globalRateLimiter =
    rateLimit({
        windowMs: 15 * 60 * 1000,

        limit: 300,

        standardHeaders: "draft-8",

        legacyHeaders: false,

        message: {
            success: false,

            error: {
                code: "RATE_LIMIT_EXCEEDED",

                message:
                    "Muitas solicitações. Aguarde alguns minutos e tente novamente."
            }
        }
    });

app.use(globalRateLimiter);


/*
============================================================
API ROOT
============================================================
*/

app.get(
    "/",
    (req, res) => {

        return res.status(200).json({
            success: true,

            service: "Honey Pay API",

            version: "1.0.0",

            environment: NODE_ENV,

            status: "online",

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

Por enquanto verifica apenas o servidor.

Quando o MongoDB for adicionado, este endpoint também
passará a verificar a conexão com a base de dados.
============================================================
*/

app.get(
    "/api/v1/health",
    (req, res) => {

        return res.status(200).json({
            success: true,

            service: "honey-pay",

            version: "1.0.0",

            status: "healthy",

            database: "not_configured",

            environment: NODE_ENV,

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
                code: "ROUTE_NOT_FOUND",

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
    (error, req, res, next) => {

        console.error(
            "[HONEY PAY ERROR]",
            {
                message: error.message,
                method: req.method,
                path: req.originalUrl,
                requestId: req.requestId
            }
        );

        if (res.headersSent) {
            return next(error);
        }

        const isProduction =
            NODE_ENV === "production";

        return res.status(500).json({
            success: false,

            error: {
                code: "INTERNAL_SERVER_ERROR",

                message:
                    isProduction
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
SERVER START
============================================================
*/

const server =
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
                `URL: http://localhost:${PORT}`
            );

            console.log(
                "=================================================="
            );
        }
    );


/*
============================================================
GRACEFUL SHUTDOWN
============================================================
*/

function shutdown(signal) {

    console.log(
        `[SERVER] ${signal} recebido. Encerrando...`
    );

    server.close(
        () => {

            console.log(
                "[SERVER] Servidor encerrado corretamente."
            );

            process.exit(0);
        }
    );

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
    () => shutdown("SIGTERM")
);

process.once(
    "SIGINT",
    () => shutdown("SIGINT")
);


/*
============================================================
UNHANDLED ERRORS
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


export default app;
