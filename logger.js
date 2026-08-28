import pino from "pino";

/*
============================================================
HONEY PAY
LOGGER
V1.0.0
============================================================

RESPONSABILIDADES
------------------------------------------------------------
- Logs estruturados
- Logs de desenvolvimento
- Logs de produção
- Proteção contra exposição de dados sensíveis
- Identificação da aplicação
- Preparação para monitorização no Render

DADOS QUE NUNCA DEVEM APARECER NOS LOGS
------------------------------------------------------------
- Passwords
- JWTs
- Tokens
- API keys
- IBAN completo
- Segredos de webhooks
- Credenciais bancárias
- Comprovativos
============================================================
*/


const isProduction =
    process.env.NODE_ENV === "production";


/*
============================================================
LOGGER
============================================================
*/

const logger = pino({

    level:
        isProduction
            ? "info"
            : "debug",

    base: {

        service:
            "honey-pay",

        version:
            "1.0.0"
    },

    timestamp:
        pino.stdTimeFunctions.isoTime,


    /*
    ========================================================
    REDACTION
    ========================================================

    Substitui automaticamente informações sensíveis antes
    de serem escritas nos logs.
    ========================================================
    */

    redact: {

        paths: [

            "password",

            "req.body.password",

            "body.password",

            "token",

            "req.body.token",

            "accessToken",

            "refreshToken",

            "jwt",

            "authorization",

            "req.headers.authorization",

            "cookie",

            "req.headers.cookie",

            "secret",

            "apiKey",

            "api_key",

            "apiToken",

            "api_token",

            "webhookSecret",

            "webhook_secret",

            "iban",

            "req.body.iban",

            "body.iban",

            "bankAccount.iban",

            "bankAccounts",

            "creditCard",

            "cardNumber",

            "cvv"
        ],

        censor:
            "[REDACTED]"
    }

});


/*
============================================================
SAFE LOGGER METHODS
============================================================
*/

export function logInfo(
    message,
    data = undefined
) {

    if (
        data === undefined
    ) {

        logger.info(
            message
        );

        return;
    }

    logger.info(
        data,
        message
    );
}


export function logDebug(
    message,
    data = undefined
) {

    if (
        data === undefined
    ) {

        logger.debug(
            message
        );

        return;
    }

    logger.debug(
        data,
        message
    );
}


export function logWarn(
    message,
    data = undefined
) {

    if (
        data === undefined
    ) {

        logger.warn(
            message
        );

        return;
    }

    logger.warn(
        data,
        message
    );
}


export function logError(
    message,
    error = undefined,
    data = undefined
) {

    const payload = {};

    if (
        error
    ) {

        payload.error =
            error;
    }

    if (
        data
    ) {

        Object.assign(
            payload,
            data
        );
    }

    if (
        Object.keys(payload).length === 0
    ) {

        logger.error(
            message
        );

        return;
    }

    logger.error(
        payload,
        message
    );
}


export function logFatal(
    message,
    error = undefined
) {

    if (
        error
    ) {

        logger.fatal(
            {
                error
            },
            message
        );

        return;
    }

    logger.fatal(
        message
    );
}


/*
============================================================
REQUEST LOGGER
============================================================

Função preparada para ser utilizada pelo middleware HTTP.
============================================================
*/

export function logRequest(
    request
) {

    if (
        !request
    ) {
        return;
    }


    const data = {

        requestId:
            request.requestId || null,

        method:
            request.method || null,

        path:
            request.originalUrl || null,

        ip:
            request.ip || null
    };


    logger.info(
        data,
        "HTTP request"
    );
}


/*
============================================================
SECURITY EVENT LOGGER
============================================================

Eventos importantes de segurança poderão utilizar esta
função posteriormente.

Exemplos:

- tentativa de login inválida
- bloqueio de conta
- upload rejeitado
- tentativa de reutilização de comprovativo
- alteração de dados bancários
============================================================
*/

export function logSecurityEvent(
    event,
    data = {}
) {

    logger.warn(
        {
            securityEvent:
                event,

            ...data
        },

        "Security event"
    );
}


/*
============================================================
BUSINESS EVENT LOGGER
============================================================

Eventos comerciais importantes:

- cobrança criada
- pagamento recebido
- pagamento confirmado
- pagamento rejeitado
- upgrade PRO
============================================================
*/

export function logBusinessEvent(
    event,
    data = {}
) {

    logger.info(
        {
            businessEvent:
                event,

            ...data
        },

        "Business event"
    );
}


/*
============================================================
DEFAULT EXPORT
============================================================
*/

export default logger;
