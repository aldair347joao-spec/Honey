import crypto from "node:crypto";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

import config from "./config.js";
import logger from "./logger.js";


/*
============================================================
HONEY PAY
APPLICATION
V1.0.0
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Criar a aplicação Express
- Configurar segurança HTTP
- Configurar CORS
- Configurar compression
- Configurar rate limiting
- Configurar parsing de requests
- Criar Request ID
- Health endpoint
- 404 handler
- Error handler

IMPORTANTE
------------------------------------------------------------
Este arquivo NÃO inicia o servidor.

A inicialização continua sendo responsabilidade do
server.js.

ARQUITETURA

server.js
    │
    ▼
app.js
    │
    ├── middleware
    ├── security
    ├── routes
    └── error handling

============================================================
*/


/*
============================================================
CREATE EXPRESS APPLICATION
============================================================
*/

const app =
    express();


/*
============================================================
BASIC EXPRESS SECURITY
============================================================
*/

app.disable(
    "x-powered-by"
);

app.set(
    "trust proxy",
    1
);


/*
============================================================
REQUEST ID
============================================================

Cada request recebe um identificador único.

Se o cliente já enviar X-Request-ID válido, preservamos
o valor.

Caso contrário, criamos um UUID novo.
============================================================
*/

app.use(
    (req, res, next) => {

        const incomingRequestId =
            req.headers[
                "x-request-id"
            ];


        const validRequestId =
            typeof incomingRequestId ===
                "string" &&

            incomingRequestId.length >
                0 &&

            incomingRequestId.length <=
                128;


        req.requestId =
            validRequestId
                ? incomingRequestId
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

        /*
        ----------------------------------------------------
        A política CSP será definida quando o frontend
        definitivo estiver integrado.
        ----------------------------------------------------
        */

        contentSecurityPolicy:
            false,


        /*
        ----------------------------------------------------
        Permite utilização segura de recursos externos
        enquanto estruturamos o frontend.
        ----------------------------------------------------
        */

        crossOriginEmbedderPolicy:
            false
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
            Requests sem Origin.
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
            Desenvolvimento.
            ------------------------------------------------
            */

            if (
                config.cors.origin ===
                "*"
            ) {

                return callback(
                    null,
                    true
                );
            }


            const allowedOrigins =
                config.cors.origin
                    .split(",")
                    .map(
                        (item) =>
                            item.trim()
                    )
                    .filter(
                        Boolean
                    );


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
BODY PARSERS
============================================================
*/

app.use(
    express.json({

        limit:
            config.requests.maxJsonSize,

        strict:
            true
    })
);


app.use(
    express.urlencoded({

        extended:
            true,

        limit:
            config.requests.maxUrlEncodedSize,

        parameterLimit:
            100
    })
);


/*
============================================================
GLOBAL RATE LIMIT
============================================================
*/

const globalRateLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        limit:
            300,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,


        handler:
            (
                req,
                res
            ) => {

                logger.warn(
                    {
                        requestId:
                            req.requestId,

                        method:
                            req.method,

                        path:
                            req.originalUrl,

                        ip:
                            req.ip
                    },

                    "Global rate limit exceeded"
                );


                return res
                    .status(429)
                    .json({

                        success:
                            false,

                        error: {

                            code:
                                "RATE_LIMIT_EXCEEDED",

                            message:
                                "Muitas solicitações. Aguarde alguns minutos e tente novamente."
                        },

                        requestId:
                            req.requestId
                    });
            }
    });


app.use(
    globalRateLimiter
);


/*
============================================================
REQUEST LOGGING
============================================================

Não registramos body da requisição.

Isso evita que informações como:
- passwords
- IBANs
- tokens
- comprovativos
- dados pessoais

sejam colocadas nos logs automaticamente.
============================================================
*/

app.use(
    (
        req,
        res,
        next
    ) => {

        const start =
            process.hrtime.bigint();


        res.on(
            "finish",
            () => {

                const end =
                    process.hrtime.bigint();


                const durationMs =
                    Number(
                        end - start
                    ) /
                    1_000_000;


                logger.info(
                    {

                        requestId:
                            req.requestId,

                        method:
                            req.method,

                        path:
                            req.originalUrl,

                        statusCode:
                            res.statusCode,

                        durationMs:
                            Number(
                                durationMs.toFixed(
                                    2
                                )
                            ),

                        ip:
                            req.ip
                    },

                    "HTTP request completed"
                );
            }
        );


        next();
    }
);


/*
============================================================
API ROOT
============================================================
*/

app.get(
    "/",
    (
        req,
        res
    ) => {

        return res
            .status(200)
            .json({

                success:
                    true,

                service:
                    "Honey Pay API",

                version:
                    config.app.version,

                status:
                    "online",

                environment:
                    config.app.environment,

                message:
                    "Honey Pay API está online.",

                timestamp:
                    new Date()
                        .toISOString(),

                requestId:
                    req.requestId
            });
    }
);


/*
============================================================
API INFORMATION
============================================================
*/

app.get(
    "/api/v1",
    (
        req,
        res
    ) => {

        return res
            .status(200)
            .json({

                success:
                    true,

                name:
                    "Honey Pay",

                version:
                    config.app.version,

                apiVersion:
                    "v1",

                status:
                    "online",

                endpoints: {

                    health:
                        "/api/v1/health"
                },

                timestamp:
                    new Date()
                        .toISOString(),

                requestId:
                    req.requestId
            });
    }
);


/*
============================================================
HEALTH ROUTE
============================================================

A rota final de health será ligada ao estado real do
MongoDB através do server.js/database.js.

Por enquanto mantemos uma rota interna que pode ser
substituída pelo router definitivo.
============================================================
*/

app.get(
    "/api/v1/health",
    async (
        req,
        res,
        next
    ) => {

        try {

            /*
            ------------------------------------------------
            Importação dinâmica para evitar dependência
            circular durante a inicialização.
            ------------------------------------------------
            */

            const database =
                await import(
                    "./database.js"
                );


            const databaseInfo =
                database.getDatabaseInfo();


            const healthy =
                database.isDatabaseConnected();


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
                        config.app.version,

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
                        config.app.environment,

                    timestamp:
                        new Date()
                            .toISOString(),

                    requestId:
                        req.requestId
                });

        }

        catch (error) {

            next(error);
        }
    }
);


/*
============================================================
API ROUTE PLACEHOLDER
============================================================

Os routers reais serão registrados posteriormente.

Exemplos futuros:

/api/v1/auth
/api/v1/businesses
/api/v1/bank-accounts
/api/v1/invoices
/api/v1/payments
/api/v1/receipts
/api/v1/checkout
/api/v1/whatsapp
/api/v1/subscription

Não colocamos lógica desses módulos aqui.
============================================================
*/


/*
============================================================
404 HANDLER
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

        /*
        ----------------------------------------------------
        Se a resposta já começou, deixamos o Express
        continuar o tratamento.
        ----------------------------------------------------
        */

        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }


        logger.error(
            {

                error,

                requestId:
                    req.requestId,

                method:
                    req.method,

                path:
                    req.originalUrl,

                ip:
                    req.ip
            },

            "Unhandled application error"
        );


        /*
        ----------------------------------------------------
        Erros de JSON inválido.
        ----------------------------------------------------
        */

        if (
            error instanceof
                SyntaxError &&

            error.status ===
                400 &&

            "body" in error
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "INVALID_JSON",

                        message:
                            "O corpo da requisição contém JSON inválido."
                    },

                    requestId:
                        req.requestId
                });
        }


        /*
        ----------------------------------------------------
        Erro de CORS.
        ----------------------------------------------------
        */

        if (
            error.message ===
            "Origem não autorizada pelo CORS."
        ) {

            return res
                .status(403)
                .json({

                    success:
                        false,

                    error: {

                        code:
                            "CORS_ORIGIN_DENIED",

                        message:
                            "A origem da requisição não está autorizada."
                    },

                    requestId:
                        req.requestId
                });
        }


        /*
        ----------------------------------------------------
        Resposta genérica.
        ----------------------------------------------------
        */

        return res
            .status(500)
            .json({

                success:
                    false,

                error: {

                    code:
                        "INTERNAL_SERVER_ERROR",

                    message:
                        config.app.isProduction
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
EXPORT
============================================================
*/

export default app;
