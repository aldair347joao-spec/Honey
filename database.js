import mongoose from "mongoose";

/*
============================================================
HONEY PAY
DATABASE CONNECTION
V1.0.0
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Conectar ao MongoDB Atlas
- Manter uma conexão estável
- Configurar parâmetros seguros do Mongoose
- Expor o estado da conexão
- Encerrar a conexão corretamente

IMPORTANTE
------------------------------------------------------------
Este arquivo não cria modelos nem coleções.

Os modelos serão adicionados posteriormente e utilizarão
esta conexão central.

ARQUITETURA
------------------------------------------------------------

Honey Pay
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
DATABASE STATE
============================================================
*/

let connected = false;


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
CONNECTION EVENTS
============================================================
*/

mongoose.connection.on(
    "connected",
    () => {

        connected = true;

        console.log(
            "[DATABASE] MongoDB conectado com sucesso."
        );
    }
);


mongoose.connection.on(
    "disconnected",
    () => {

        connected = false;

        console.warn(
            "[DATABASE] MongoDB foi desconectado."
        );
    }
);


mongoose.connection.on(
    "reconnected",
    () => {

        connected = true;

        console.log(
            "[DATABASE] MongoDB reconectado."
        );
    }
);


mongoose.connection.on(
    "error",
    (error) => {

        connected = false;

        console.error(
            "[DATABASE] Erro de conexão:",
            error.message
        );
    }
);


/*
============================================================
CONNECT DATABASE
============================================================
*/

export async function connectDatabase() {

    /*
    --------------------------------------------------------
    Evita abrir múltiplas conexões desnecessárias.
    --------------------------------------------------------
    */

    if (
        connected &&
        mongoose.connection.readyState === 1
    ) {

        return mongoose.connection;
    }


    /*
    --------------------------------------------------------
    Obtém a URI através das variáveis de ambiente.
    --------------------------------------------------------
    */

    const mongoURI =
        process.env.MONGODB_URI;


    /*
    --------------------------------------------------------
    A aplicação não deve iniciar sem uma URI válida.
    --------------------------------------------------------
    */

    if (
        !mongoURI ||
        typeof mongoURI !== "string" ||
        mongoURI.trim().length === 0
    ) {

        throw new Error(
            "MONGODB_URI não está configurada."
        );
    }


    /*
    --------------------------------------------------------
    Conexão com MongoDB Atlas.
    --------------------------------------------------------
    */

    await mongoose.connect(
        mongoURI,
        {
            serverSelectionTimeoutMS: 10000,

            connectTimeoutMS: 10000,

            socketTimeoutMS: 45000,

            maxPoolSize: 10,

            minPoolSize: 2,

            retryWrites: true,

            family: 4
        }
    );


    connected = true;


    return mongoose.connection;
}


/*
============================================================
DATABASE STATUS
============================================================
*/

export function isDatabaseConnected() {

    return (
        connected &&
        mongoose.connection.readyState === 1
    );
}


/*
============================================================
DATABASE READY STATE
============================================================

Estados Mongoose:

0 = disconnected
1 = connected
2 = connecting
3 = disconnecting
============================================================
*/

export function getDatabaseState() {

    const state =
        mongoose.connection.readyState;


    switch (state) {

        case 0:
            return "disconnected";

        case 1:
            return "connected";

        case 2:
            return "connecting";

        case 3:
            return "disconnecting";

        default:
            return "unknown";
    }
}


/*
============================================================
DATABASE CONNECTION INFORMATION
============================================================

Nunca retornamos a URI ou credenciais.

Apenas informações seguras para health checks,
monitorização e diagnóstico.
============================================================
*/

export function getDatabaseInfo() {

    return {

        connected:
            isDatabaseConnected(),

        state:
            getDatabaseState(),

        name:
            mongoose.connection.name || null,

        host:
            mongoose.connection.host || null
    };
}


/*
============================================================
DISCONNECT DATABASE
============================================================
*/

export async function disconnectDatabase() {

    if (
        mongoose.connection.readyState === 0
    ) {

        connected = false;

        return;
    }


    await mongoose.disconnect();


    connected = false;
}


/*
============================================================
WAIT FOR DATABASE
============================================================

Útil posteriormente para operações que precisam garantir
que a base de dados está disponível antes de continuar.
============================================================
*/

export async function waitForDatabase(
    timeout = 10000
) {

    if (
        isDatabaseConnected()
    ) {

        return true;
    }


    const start =
        Date.now();


    while (
        Date.now() - start < timeout
    ) {

        if (
            isDatabaseConnected()
        ) {

            return true;
        }


        await new Promise(
            (resolve) =>
                setTimeout(
                    resolve,
                    100
                )
        );
    }


    return false;
}
