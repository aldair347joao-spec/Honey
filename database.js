/*
============================================================
HONEY PAY
DATABASE
V1.0.1
============================================================

CAMADA CENTRAL DE DATABASE

------------------------------------------------------------
ARQUITETURA
------------------------------------------------------------

Mongoose
    │
    ├── Models
    │
    └── Native MongoDB Database Handle
             │
             ├── Invoice Service
             ├── Checkout
             ├── Proof
             └── Outros serviços legados

------------------------------------------------------------
OBJETIVO
------------------------------------------------------------

Manter UMA conexão MongoDB.

O sistema pode utilizar:

1. Mongoose para os modelos;
2. driver MongoDB nativo através de mongoose.connection.db.

Isso permite migrar os serviços gradualmente sem abrir
múltiplas conexões ao MongoDB.

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
MONGOOSE
============================================================
*/

mongoose.set(
    "strictQuery",
    true
);


/*
============================================================
OPTIONS
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
CONFIG VALIDATION
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
}


/*
============================================================
CONNECT DATABASE
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


    if (
        mongoose.connection.readyState ===
        1
    ) {

        return mongoose.connection;
    }


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
GET MONGOOSE CONNECTION
============================================================
*/

export function getMongooseConnection() {

    if (
        mongoose.connection.readyState !==
        1
    ) {

        const error =
            new Error(
                "A conexão MongoDB ainda não está disponível."
            );


        error.code =
            "DATABASE_NOT_CONNECTED";


        error.statusCode =
            503;


        throw error;
    }


    return mongoose.connection;
}


/*
============================================================
GET NATIVE DATABASE
============================================================

Compatibilidade para serviços que utilizam:

db.collection(...)

IMPORTANTE:

Não cria uma nova conexão.

Utiliza exatamente a mesma conexão aberta pelo Mongoose.

============================================================
*/

export function getDatabase() {

    const connection =
        getMongooseConnection();


    const database =
        connection.db;


    if (
        !database
    ) {

        const error =
            new Error(
                "A instância nativa do MongoDB não está disponível."
            );


        error.code =
            "DATABASE_HANDLE_UNAVAILABLE";


        error.statusCode =
            503;


        throw error;
    }


    return database;
}


/*
============================================================
DISCONNECT
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
CLOSE DATABASE
============================================================

Alias utilizado pelo server.js.

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

    const readyState =
        mongoose.connection.readyState;


    let status =
        "disconnected";


    if (
        readyState ===
        1
    ) {

        status =
            "connected";
    }

    else if (
        readyState ===
        2
    ) {

        status =
            "connecting";
    }

    else if (
        readyState ===
        3
    ) {

        status =
            "disconnecting";
    }


    return {

        connected:
            readyState ===
            1,

        status,

        readyState,

        database:
            mongoose.connection.name ||
            MONGODB_DB_NAME
    };
}


/*
============================================================
COMPATIBILITY HELPERS
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
SHUTDOWN STATE
============================================================
*/

export function markDatabaseShuttingDown() {

    shuttingDown =
        true;
}


/*
============================================================
MONGOOSE EVENTS
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
DEFAULT EXPORT
============================================================
*/

export default {

    connectDatabase,

    getMongooseConnection,

    getDatabase,

    disconnectDatabase,

    closeDatabase,

    getDatabaseStatus,

    getDatabaseInfo,

    getDatabaseState,

    isDatabaseConnected,

    markDatabaseShuttingDown
};
