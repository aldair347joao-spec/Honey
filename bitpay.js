/*
============================================================
HONEY PAY
BITPAY GATEWAY CLIENT
V1.0.0
============================================================

INTEGRAÇÃO OFICIAL DO HONEY PAY COM BITPAY

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Comunicação segura com a API BitPay
- Autenticação através de BITPAY_SECRET_KEY
- Suporte sandbox / produção
- Criação de Payment Intents
- Consulta de Payment Intents
- Criação de Payment Links
- Consulta de Payment Links
- Gestão de Mandates
- Criação de instruções de débito
- Gestão de Webhook Endpoints
- Tratamento normalizado de erros
- Timeout de comunicação
- Nunca expor a API key nas respostas

------------------------------------------------------------
ENVIRONMENT
------------------------------------------------------------

BITPAY_SECRET_KEY
BITPAY_ENV
BITPAY_API_URL

------------------------------------------------------------
IMPORTANTE
------------------------------------------------------------

Este módulo NÃO:

- ativa subscrições;
- confirma pagamentos;
- altera invoices;
- altera planos;
- processa webhooks.

Essas responsabilidades pertencem aos serviços próprios.

============================================================
*/


/*
============================================================
CONSTANTS
============================================================
*/

const DEFAULT_API_URL =
    "https://api-sandbox.bitpay.ao/v1";


const PRODUCTION_API_URL =
    "https://api.bitpay.ao/v1";


const REQUEST_TIMEOUT =
    30_000;


const MAX_ERROR_BODY_LENGTH =
    2_000;


/*
============================================================
ENVIRONMENT
============================================================
*/

const BITPAY_SECRET_KEY =
    String(
        process.env.BITPAY_SECRET_KEY ||
        ""
    ).trim();


const BITPAY_ENV =
    String(
        process.env.BITPAY_ENV ||
        "sandbox"
    )
        .trim()
        .toLowerCase();


const configuredApiUrl =
    String(
        process.env.BITPAY_API_URL ||
        ""
    ).trim();


/*
============================================================
VALIDATE CONFIGURATION
============================================================
*/

function getApiUrl() {

    if (
        configuredApiUrl
    ) {

        return configuredApiUrl
            .replace(
                /\/+$/,
                ""
            );
    }


    if (
        BITPAY_ENV ===
        "production"
    ) {

        return PRODUCTION_API_URL;
    }


    return DEFAULT_API_URL;
}


/*
============================================================
CONFIGURATION STATUS
============================================================
*/

export function getBitPayConfig() {

    return {

        configured:
            Boolean(
                BITPAY_SECRET_KEY
            ),

        environment:
            BITPAY_ENV,

        apiUrl:
            getApiUrl(),

        hasSecretKey:
            Boolean(
                BITPAY_SECRET_KEY
            )

    };
}


/*
============================================================
ASSERT CONFIGURATION
============================================================
*/

function assertConfigured() {

    if (
        !BITPAY_SECRET_KEY
    ) {

        const error =
            new Error(
                "BITPAY_SECRET_KEY não está configurada."
            );


        error.code =
            "BITPAY_NOT_CONFIGURED";


        error.statusCode =
            500;


        throw error;
    }


    if (
        ![
            "sandbox",
            "production"
        ].includes(
            BITPAY_ENV
        )
    ) {

        const error =
            new Error(
                "BITPAY_ENV inválido. Use sandbox ou production."
            );


        error.code =
            "BITPAY_INVALID_ENVIRONMENT";


        error.statusCode =
            500;


        throw error;
    }
}


/*
============================================================
URL BUILDER
============================================================
*/

function buildUrl(

    path

) {

    const baseUrl =
        getApiUrl();


    const normalizedPath =
        String(
            path ||
            ""
        )
            .replace(
                /^\/+/,
                ""
            );


    return `${baseUrl}/${normalizedPath}`;
}


/*
============================================================
SAFE JSON
============================================================
*/

async function parseResponseBody(

    response

) {

    const text =
        await response.text();


    if (
        !text
    ) {

        return null;
    }


    try {

        return JSON.parse(
            text
        );

    }

    catch {

        return text
            .slice(
                0,
                MAX_ERROR_BODY_LENGTH
            );
    }
}


/*
============================================================
ERROR
============================================================
*/

function createBitPayError(

    message,

    statusCode,

    code,

    details = null

) {

    const error =
        new Error(
            message
        );


    error.name =
        "BitPayError";


    error.statusCode =
        statusCode;


    error.code =
        code;


    if (
        details !== null
    ) {

        error.details =
            details;
    }


    return error;
}


/*
============================================================
HTTP REQUEST
============================================================
*/

export async function bitPayRequest(

    path,

    options = {}

) {

    assertConfigured();


    const {

        method = "GET",

        body = undefined,

        headers = {},

        timeout =
            REQUEST_TIMEOUT

    } =
        options;


    const controller =
        new AbortController();


    const timeoutId =
        setTimeout(

            () => {

                controller.abort();

            },

            timeout

        );


    try {

        const requestHeaders = {

            Accept:
                "application/json",

            Authorization:
                `Bearer ${BITPAY_SECRET_KEY}`,

            ...headers

        };


        if (
            body !==
            undefined
        ) {

            requestHeaders[
                "Content-Type"
            ] =
                "application/json";
        }


        const response =
            await fetch(

                buildUrl(
                    path
                ),

                {

                    method,

                    headers:
                        requestHeaders,

                    body:
                        body ===
                        undefined

                            ? undefined

                            : JSON.stringify(
                                body
                            ),

                    signal:
                        controller.signal

                }

            );


        const data =
            await parseResponseBody(
                response
            );


        if (
            !response.ok
        ) {

            const message =

                typeof data ===
                "object" &&
                data !== null &&

                (
                    data.message ||
                    data.error ||
                    data.detail
                )

                    ? (

                        data.message ||
                        data.error ||
                        data.detail

                    )

                    : `BitPay respondeu com HTTP ${response.status}.`;


            throw createBitPayError(

                message,

                response.status,

                "BITPAY_API_ERROR",

                data

            );
        }


        return data;

    }

    catch (
        error
    ) {

        if (
            error?.name ===
            "AbortError"
        ) {

            throw createBitPayError(

                "A comunicação com o BitPay excedeu o tempo limite.",

                504,

                "BITPAY_TIMEOUT"

            );
        }


        if (
            error?.name ===
            "BitPayError"
        ) {

            throw error;
        }


        throw createBitPayError(

            "Não foi possível comunicar com o BitPay.",

            502,

            "BITPAY_CONNECTION_ERROR",

            {

                originalMessage:
                    error?.message ||
                    null

            }

        );
    }

    finally {

        clearTimeout(
            timeoutId
        );
    }
}


/*
============================================================
PAYMENT INTENTS
============================================================
*/


/*
------------------------------------------------------------
CREATE PAYMENT INTENT
------------------------------------------------------------
*/

export async function createPaymentIntent(

    data

) {

    if (
        !data ||
        typeof data !==
        "object"
    ) {

        throw createBitPayError(

            "Os dados do Payment Intent são obrigatórios.",

            400,

            "INVALID_PAYMENT_INTENT_DATA"

        );
    }


    return bitPayRequest(

        "/payment_intents",

        {

            method:
                "POST",

            body:
                data

        }

    );
}


/*
------------------------------------------------------------
GET PAYMENT INTENT
------------------------------------------------------------
*/

export async function getPaymentIntent(

    paymentIntentId

) {

    if (
        !paymentIntentId
    ) {

        throw createBitPayError(

            "paymentIntentId é obrigatório.",

            400,

            "PAYMENT_INTENT_ID_REQUIRED"

        );
    }


    return bitPayRequest(

        `/payment_intents/${encodeURIComponent(
            paymentIntentId
        )}`,

        {

            method:
                "GET"

        }

    );
}


/*
------------------------------------------------------------
LIST PAYMENT INTENTS
------------------------------------------------------------
*/

export async function listPaymentIntents(

    query = {}

) {

    const searchParams =
        new URLSearchParams();


    for (
        const [
            key,
            value
        ]
        of Object.entries(
            query
        )
    ) {

        if (
            value !==
            undefined &&
            value !==
            null &&
            value !==
            ""
        ) {

            searchParams.set(

                key,

                String(
                    value
                )

            );
        }
    }


    const queryString =
        searchParams.toString();


    return bitPayRequest(

        `/payment_intents${
            queryString
                ? `?${queryString}`
                : ""
        }`,

        {

            method:
                "GET"

        }

    );
}


/*
============================================================
PAYMENT LINKS
============================================================
*/


/*
------------------------------------------------------------
CREATE PAYMENT LINK
------------------------------------------------------------
*/

export async function createPaymentLink(

    data

) {

    if (
        !data ||
        typeof data !==
        "object"
    ) {

        throw createBitPayError(

            "Os dados do Payment Link são obrigatórios.",

            400,

            "INVALID_PAYMENT_LINK_DATA"

        );
    }


    return bitPayRequest(

        "/payment_links",

        {

            method:
                "POST",

            body:
                data

        }

    );
}


/*
------------------------------------------------------------
GET PAYMENT LINK
------------------------------------------------------------
*/

export async function getPaymentLink(

    paymentLinkId

) {

    if (
        !paymentLinkId
    ) {

        throw createBitPayError(

            "paymentLinkId é obrigatório.",

            400,

            "PAYMENT_LINK_ID_REQUIRED"

        );
    }


    return bitPayRequest(

        `/payment_links/${encodeURIComponent(
            paymentLinkId
        )}`,

        {

            method:
                "GET"

        }

    );
}


/*
------------------------------------------------------------
LIST PAYMENT LINKS
------------------------------------------------------------
*/

export async function listPaymentLinks(

    query = {}

) {

    const searchParams =
        new URLSearchParams();


    for (
        const [
            key,
            value
        ]
        of Object.entries(
            query
        )
    ) {

        if (
            value !==
            undefined &&
            value !==
            null &&
            value !==
            ""
        ) {

            searchParams.set(

                key,

                String(
                    value
                )

            );
        }
    }


    const queryString =
        searchParams.toString();


    return bitPayRequest(

        `/payment_links${
            queryString
                ? `?${queryString}`
                : ""
        }`,

        {

            method:
                "GET"

        }

    );
}


/*
============================================================
MANDATES
============================================================
*/


/*
------------------------------------------------------------
CREATE MANDATE
------------------------------------------------------------
*/

export async function createMandate(

    data

) {

    if (
        !data ||
        typeof data !==
        "object"
    ) {

        throw createBitPayError(

            "Os dados do mandato são obrigatórios.",

            400,

            "INVALID_MANDATE_DATA"

        );
    }


    return bitPayRequest(

        "/mandates",

        {

            method:
                "POST",

            body:
                data

        }

    );
}


/*
------------------------------------------------------------
GET MANDATE
------------------------------------------------------------
*/

export async function getMandate(

    mandateId

) {

    if (
        !mandateId
    ) {

        throw createBitPayError(

            "mandateId é obrigatório.",

            400,

            "MANDATE_ID_REQUIRED"

        );
    }


    return bitPayRequest(

        `/mandates/${encodeURIComponent(
            mandateId
        )}`,

        {

            method:
                "GET"

        }

    );
}


/*
------------------------------------------------------------
LIST MANDATES
------------------------------------------------------------
*/

export async function listMandates(

    query = {}

) {

    const searchParams =
        new URLSearchParams();


    for (
        const [
            key,
            value
        ]
        of Object.entries(
            query
        )
    ) {

        if (
            value !==
            undefined &&
            value !==
            null &&
            value !==
            ""
        ) {

            searchParams.set(

                key,

                String(
                    value
                )

            );
        }
    }


    const queryString =
        searchParams.toString();


    return bitPayRequest(

        `/mandates${
            queryString
                ? `?${queryString}`
                : ""
        }`,

        {

            method:
                "GET"

        }

    );
}


/*
============================================================
DEBIT INSTRUCTIONS
============================================================
*/


/*
------------------------------------------------------------
CREATE DEBIT INSTRUCTION
------------------------------------------------------------
*/

export async function createDebitInstruction(

    data

) {

    if (
        !data ||
        typeof data !==
        "object"
    ) {

        throw createBitPayError(

            "Os dados da instrução de débito são obrigatórios.",

            400,

            "INVALID_DEBIT_INSTRUCTION_DATA"

        );
    }


    return bitPayRequest(

        "/debit_instructions",

        {

            method:
                "POST",

            body:
                data

        }

    );
}


/*
------------------------------------------------------------
GET DEBIT INSTRUCTION
------------------------------------------------------------
*/

export async function getDebitInstruction(

    debitInstructionId

) {

    if (
        !debitInstructionId
    ) {

        throw createBitPayError(

            "debitInstructionId é obrigatório.",

            400,

            "DEBIT_INSTRUCTION_ID_REQUIRED"

        );
    }


    return bitPayRequest(

        `/debit_instructions/${encodeURIComponent(
            debitInstructionId
        )}`,

        {

            method:
                "GET"

        }

    );
}


/*
============================================================
WEBHOOK ENDPOINTS
============================================================
*/


/*
------------------------------------------------------------
CREATE WEBHOOK ENDPOINT
------------------------------------------------------------
*/

export async function createWebhookEndpoint(

    data

) {

    if (
        !data ||
        typeof data !==
        "object"
    ) {

        throw createBitPayError(

            "Os dados do webhook endpoint são obrigatórios.",

            400,

            "INVALID_WEBHOOK_DATA"

        );
    }


    return bitPayRequest(

        "/webhook_endpoints",

        {

            method:
                "POST",

            body:
                data

        }

    );
}


/*
------------------------------------------------------------
GET WEBHOOK ENDPOINT
------------------------------------------------------------
*/

export async function getWebhookEndpoint(

    webhookEndpointId

) {

    if (
        !webhookEndpointId
    ) {

        throw createBitPayError(

            "webhookEndpointId é obrigatório.",

            400,

            "WEBHOOK_ENDPOINT_ID_REQUIRED"

        );
    }


    return bitPayRequest(

        `/webhook_endpoints/${encodeURIComponent(
            webhookEndpointId
        )}`,

        {

            method:
                "GET"

        }

    );
}


/*
------------------------------------------------------------
LIST WEBHOOK ENDPOINTS
------------------------------------------------------------
*/

export async function listWebhookEndpoints(

) {

    return bitPayRequest(

        "/webhook_endpoints",

        {

            method:
                "GET"

        }

    );
}


/*
------------------------------------------------------------
DELETE WEBHOOK ENDPOINT
------------------------------------------------------------
*/

export async function deleteWebhookEndpoint(

    webhookEndpointId

) {

    if (
        !webhookEndpointId
    ) {

        throw createBitPayError(

            "webhookEndpointId é obrigatório.",

            400,

            "WEBHOOK_ENDPOINT_ID_REQUIRED"

        );
    }


    return bitPayRequest(

        `/webhook_endpoints/${encodeURIComponent(
            webhookEndpointId
        )}`,

        {

            method:
                "DELETE"

        }

    );
}


/*
============================================================
HEALTH / CONNECTION TEST
============================================================
*/

export async function testBitPayConnection(

) {

    assertConfigured();


    try {

        /*
        ----------------------------------------------------
        A listagem de Payment Intents é utilizada apenas
        como teste autenticado da conexão.

        Não criamos pagamentos reais aqui.
        ----------------------------------------------------
        */

        const result =
            await listPaymentIntents({

                limit:
                    1

            });


        return {

            connected:
                true,

            environment:
                BITPAY_ENV,

            apiUrl:
                getApiUrl(),

            result

        };

    }

    catch (
        error
    ) {

        throw error;
    }
}


/*
============================================================
SANITIZE CONFIG
============================================================
*/

export function getSafeBitPayConfig(

) {

    return {

        configured:
            Boolean(
                BITPAY_SECRET_KEY
            ),

        environment:
            BITPAY_ENV,

        apiUrl:
            getApiUrl()

    };
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    getBitPayConfig,

    getSafeBitPayConfig,

    bitPayRequest,

    createPaymentIntent,

    getPaymentIntent,

    listPaymentIntents,

    createPaymentLink,

    getPaymentLink,

    listPaymentLinks,

    createMandate,

    getMandate,

    listMandates,

    createDebitInstruction,

    getDebitInstruction,

    createWebhookEndpoint,

    getWebhookEndpoint,

    listWebhookEndpoints,

    deleteWebhookEndpoint,

    testBitPayConnection

};
