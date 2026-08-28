import "dotenv/config";

import app from "./app.js";

import {
    connectDatabase,
    disconnectDatabase,
    isDatabaseConnected
} from "./database.js";

import config from "./config.js";

import logger from "./logger.js";


/*
============================================================
HONEY PAY
SERVER
V1.0.0
============================================================

PONTO DE ENTRADA DA APLICAÇÃO

RESPONSABILIDADES
------------------------------------------------------------
- Carregar configuração
- Conectar ao MongoDB
- Iniciar o servidor HTTP
- Encerrar o servidor corretamente
- Encerrar a conexão com MongoDB
- Tratar erros fatais de processo

A configuração do Express está em:

    app.js

A conexão MongoDB está em:

    database.js

A configuração global está em:

    config.js

Os logs estão em:

    logger.js

============================================================
*/


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

        /*
        ----------------------------------------------------
        1. VALIDAR CONFIGURAÇÃO ESSENCIAL
        ----------------------------------------------------
        */

        if (
            config.app.isProduction &&
            !config.database.uri
        ) {

            throw new Error(
                "MONGODB_URI não está configurada."
            );
        }


        /*
        ----------------------------------------------------
        2. CONECTAR AO MONGODB
        ----------------------------------------------------
        */

        await connectDatabase();


        /*
        ----------------------------------------------------
        3. INICIAR HTTP SERVER
        ----------------------------------------------------
        */

        server =
            app.listen(
                config.app.port,
                "0.0.0.0"
            );


        /*
        ----------------------------------------------------
        SERVER LISTENING
        ----------------------------------------------------
        */

        server.on(
            "listening",
            () => {

                logger.info(
                    {

                        port:
                            config.app.port,

                        environment:
                            config.app.environment,

                        database:
                            isDatabaseConnected()
                                ? "connected"
                                : "disconnected",

                        publicUrl:
                            config.app.publicUrl
                    },

                    "Honey Pay server started"
                );


                console.log(
                    ""
                );

                console.log(
                    "=================================================="
                );

                console.log(
                    "HONEY PAY"
                );

                console.log(
                    "=================================================="
                );

                console.log(
                    `Status: ONLINE`
                );

                console.log(
                    `Environment: ${
                        config.app.environment
                    }`
                );

                console.log(
                    `Port: ${
                        config.app.port
                    }`
                );

                console.log(
                    `MongoDB: ${
                        isDatabaseConnected()
                            ? "CONNECTED"
                            : "DISCONNECTED"
                    }`
                );

                console.log(
                    `URL: ${
                        config.app.publicUrl
                    }`
                );

                console.log(
                    "=================================================="
                );

                console.log(
                    ""
                );
            }
        );


        /*
        ----------------------------------------------------
        SERVER ERROR
        ----------------------------------------------------
        */

        server.on(
            "error",
            (error) => {

                logger.error(
                    {
                        error
                    },

                    "HTTP server error"
                );


                /*
                --------------------------------------------
                Porta já utilizada.
                --------------------------------------------
                */

                if (
                    error.code ===
                    "EADDRINUSE"
                ) {

                    logger.fatal(
                        {
                            port:
                                config.app.port
                        },

                        "Port already in use"
                    );

                    process.exit(1);
                }
            }
        );

    }

    catch (error) {

        logger.fatal(
            {
                error
            },

            "Honey Pay failed to start"
        );


        console.error(
            ""
        );

        console.error(
            "=================================================="
        );

        console.error(
            "HONEY PAY — FALHA AO INICIAR"
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

        console.error(
            ""
        );


        process.exit(1);
    }
}


/*
============================================================
GRACEFUL SHUTDOWN
============================================================

O Render envia SIGTERM quando precisa reiniciar ou
encerrar o serviço.

Precisamos fechar:

1. HTTP server
2. MongoDB

antes de terminar o processo.
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


    logger.info(
        {
            signal
        },

        "Shutdown initiated"
    );


    console.log(
        `[SERVER] ${signal} recebido.`
    );


    /*
    --------------------------------------------------------
    Caso o servidor HTTP ainda não tenha iniciado.
    --------------------------------------------------------
    */

    if (
        !server
    ) {

        try {

            await disconnectDatabase();

        }

        catch (error) {

            logger.error(
                {
                    error
                },

                "Database disconnect failed"
            );
        }


        process.exit(0);

        return;
    }


    /*
    --------------------------------------------------------
    Fechar novas conexões HTTP.
    --------------------------------------------------------
    */

    await new Promise(
        (
            resolve
        ) => {

            server.close(
                () => {

                    logger.info(
                        "HTTP server closed"
                    );

                    resolve();
                }
            );
        }
    );


    /*
    --------------------------------------------------------
    Fechar MongoDB.
    --------------------------------------------------------
    */

    try {

        await disconnectDatabase();


        logger.info(
            "MongoDB connection closed"
        );

    }

    catch (error) {

        logger.error(
            {
                error
            },

            "MongoDB shutdown error"
        );

    }


    console.log(
        "[SERVER] Honey Pay encerrado corretamente."
    );


    process.exit(0);
}


/*
============================================================
SIGNAL HANDLERS
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
UNHANDLED PROMISE REJECTION
============================================================
*/

process.on(
    "unhandledRejection",
    (reason) => {

        logger.error(
            {
                reason
            },

            "Unhandled Promise Rejection"
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
    async (
        error
    ) => {

        logger.fatal(
            {
                error
            },

            "Uncaught Exception"
        );


        await shutdown(
            "uncaughtException"
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
