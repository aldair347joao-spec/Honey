/*
============================================================
HONEY PAY
DATABASE
V1.0.0
============================================================

CAMADA CENTRAL DE DATABASE

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Conectar ao MongoDB
- Manter uma única conexão Mongoose
- Validar configuração
- Expor estado da conexão
- Encerrar conexão corretamente
- Fornecer informações seguras de diagnóstico
- Compatibilidade com Render
- Compatibilidade com MongoDB Atlas

------------------------------------------------------------
SEGURANÇA
------------------------------------------------------------

Nunca expõe:

- MongoDB URI
- Password
- Username
- JWT secret
- Connection string

============================================================
*/

import mongoose from "mongoose";


/*
============================================================
ENVIRONMENT
============================================================
*/

const MONGODB_URI =
    process.env.MONGODB_URI ||
    "";


const MONGODB_DB_NAME =
    process.env.MONGODB_DB_NAME ||
    "honey_pay";


/*
============================================================
STATE
============================================================
*/

let connectionPromise =
    null;


let shuttingDown =
    false;


/*
============================================================
MONGOOSE CONFIGURATION
============================================================
*/

mongoose.set(
    "strictQuery",
    true
);


/*
============================================================
CONNECTION OPTIONS
============================================================
*/

const connectionOptions = {

    dbName:
        MONGODB_DB_NAME,

    serverSelectionTimeoutMS:
        10000,

    connectTimeoutMS:
        10000,

    socketTimeoutMS:
        45000,

    maxPoolSize:
        10,

    minPoolSize:
        0,

    retryWrites:
        true,

    retryReads:
        true,

    family:
        4
};


/*
============================================================
VALIDATE DATABASE CONFIG
============================================================
*/

function validateDatabaseConfig() {

    if (
        !MONGODB_URI ||
        typeof MONGODB_URI !==
        "string"
    ) {

        const error =
            new Error(
                "MONGODB_URI não está configurada."
            );


        error.code =
            "DATABASE_CONFIGURATION_ERROR";


        error.statusCode =
            500;


        throw error;
    }


    if (
        !MONGODB_URI.startsWith(
            "mongodb://"
        ) &&
        !MONGODB_URI.startsWith(
            "mongodb+srv://"
        )
    ) {

        const error =
            new Error(
                "MONGODB_URI possui um formato inválido."
            );


        error.code =
            "DATABASE_CONFIGURATION_ERROR";


        error.statusCode =
            500;


        throw error;
    }


    if (
        !MONGODB_DB_NAME ||
        typeof MONGODB_DB_NAME !==
        "string"
    ) {

        const error =
            new Error(
                "MONGODB_DB_NAME não está configurado corretamente."
            );


        error.code =
            "DATABASE_CONFIGURATION_ERROR";


        error.statusCode =
            500;


        throw error;
    }
}


/*
============================================================
CONNECT DATABASE
============================================================

Garante que toda a aplicação utiliza a mesma conexão.

============================================================
*/

export async function connectDatabase() {

    if (
        shuttingDown
    ) {

        throw new Error(
            "A aplicação está em processo de encerramento."
        );
    }


    /*
    --------------------------------------------------------
    Já conectado
    --------------------------------------------------------
    */

    if (
        mongoose.connection.readyState ===
        1
    ) {

        return mongoose.connection;
    }


    /*
    --------------------------------------------------------
    Conexão já em andamento
    --------------------------------------------------------
    */

    if (
        connectionPromise
    ) {

        return connectionPromise;
    }


    validateDatabaseConfig();


    console.log(
        "[DATABASE] Connecting to MongoDB..."
    );


    connectionPromise =
        mongoose
            .connect(
                MONGODB_URI,
                connectionOptions
            )
            .then(
                connection => {

                    console.log(
                        `[DATABASE] MongoDB connected: ${connection.connection.name}`
                    );


                    return connection;
                }
            )
            .catch(
                error => {

                    connectionPromise =
                        null;


                    console.error(
                        "[DATABASE] MongoDB connection failed."
                    );


                    throw error;
                }
            );


    return connectionPromise;
}


/*
============================================================
DISCONNECT DATABASE
============================================================
*/

export async function disconnectDatabase() {

    if (
        mongoose.connection.readyState ===
        0
    ) {

        connectionPromise =
            null;


        return;
    }


    console.log(
        "[DATABASE] Closing MongoDB connection..."
    );


    await mongoose.disconnect();


    connectionPromise =
        null;


    console.log(
        "[DATABASE] MongoDB connection closed."
    );
}


/*
============================================================
COMPATIBILITY ALIAS
============================================================

Alguns componentes antigos da aplicação utilizam
closeDatabase().

Mantemos a função para que a transição da arquitetura
não quebre o servidor.

============================================================
*/

export async function closeDatabase() {

    return disconnectDatabase();
}


/*
============================================================
DATABASE STATUS
============================================================
*/

export function getDatabaseStatus() {

    const state =
        mongoose.connection.readyState;


    let status =
        "disconnected";


    if (
        state ===
        1
    ) {

        status =
            "connected";
    }

    else if (
        state ===
        2
    ) {

        status =
            "connecting";
    }

    else if (
        state ===
        3
    ) {

        status =
            "disconnecting";
    }


    return {

        connected:
            state ===
            1,

        status,

        readyState:
            state,

        database:
            mongoose.connection.name ||
            MONGODB_DB_NAME
    };
}


/*
============================================================
COMPATIBILITY
============================================================
*/

export function getDatabaseInfo() {

    return getDatabaseStatus();
}


export function getDatabaseState() {

    return mongoose.connection.readyState;
}


export function isDatabaseConnected() {

    return (
        mongoose.connection.readyState ===
        1
    );
}


/*
============================================================
MONGOOSE CONNECTION EVENTS
============================================================
*/

mongoose.connection.on(
    "connected",
    () => {

        console.log(
            "[DATABASE] MongoDB connection established."
        );
    }
);


mongoose.connection.on(
    "error",
    error => {

        console.error(
            "[DATABASE] MongoDB error:",
            error
        );
    }
);


mongoose.connection.on(
    "disconnected",
    () => {

        console.warn(
            "[DATABASE] MongoDB disconnected."
        );
    }
);


/*
============================================================
GRACEFUL SHUTDOWN STATE
============================================================
*/

export function markDatabaseShuttingDown() {

    shuttingDown =
        true;
}


/*
============================================================
EXPORT DEFAULT
============================================================
*/

export default {

    connectDatabase,

    disconnectDatabase,

    closeDatabase,

    getDatabaseStatus,

    getDatabaseInfo,

    getDatabaseState,

    isDatabaseConnected,

    markDatabaseShuttingDown
};
