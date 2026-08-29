/*
============================================================
HONEY PAY
BITPAY GATEWAY CLIENT
V1.1.0
PRODUCTION PAYMENT INFRASTRUCTURE
============================================================

RESPONSABILIDADES
------------------------------------------------------------

• Comunicação server-side com BitPay Angola
• Autenticação segura através de BITPAY_SECRET_KEY
• Sandbox / Production
• Payment Intents
• Checkout Sessions
• Payment Links
• Refunds
• Mandates
• Debit Instructions
• Webhook Endpoints
• Idempotency-Key
• Timeout de requests
• Normalização de erros
• Nunca expor secrets
• Nunca ativar subscriptions diretamente

SEGURANÇA
------------------------------------------------------------

A BITPAY_SECRET_KEY:

✓ fica exclusivamente no backend
✓ vem de process.env
✓ nunca é devolvida ao frontend
✓ nunca é incluída em logs
✓ nunca é incluída em erros

IMPORTANTE
------------------------------------------------------------

Este módulo NÃO:

✗ ativa subscriptions
✗ confirma pagamentos
✗ processa webhooks
✗ decide se um cliente tem PRO
✗ altera Subscription
✗ confia em success_url

Essas responsabilidades pertencem aos módulos superiores.

============================================================
*/


/*
============================================================
CONFIGURATION
============================================================
*/

const SANDBOX_API_URL =
    "https://api-sandbox.bitpay.ao/v1";


const PRODUCTION_API_URL =
    "https://api.bitpay.ao/v1";


const DEFAULT_TIMEOUT_MS =
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
        process.env.BITPAY_SECRET_KEY || ""
    ).trim();


const BITPAY_ENV =
    String(
        process.env.BITPAY_ENV || "sandbox"
    )
        .trim()
        .toLowerCase();


const CONFIGURED_API_URL =
    String(
        process.env.BITPAY_API_URL || ""
    ).trim();


/*
============================================================
API URL
============================================================
*/

function getApiUrl() {

    if (
        CONFIGURED_API_URL
    ) {

        return CONFIGURED_API_URL
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


    return SANDBOX_API_URL;
}


/*
============================================================
CONFIG VALIDATION
============================================================
*/

function validateConfiguration() {

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
        BITPAY_ENV !== "sandbox" &&
        BITPAY_ENV !== "production"
    ) {

        const error =
            new Error(
                "BITPAY_ENV deve ser 'sandbox' ou 'production'."
            );

        error.code =
            "BITPAY_INVALID_ENVIRONMENT";

        error.statusCode =
            500;

        throw error;
    }


    return true;
}


/*
============================================================
SAFE CONFIGURATION
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
URL BUILDER
============================================================
*/

function buildUrl(

    path

) {

    const normalizedPath =
        String(
            path || ""
        )
            .replace(
                /^\/+/,
                ""
            );


    return `${getApiUrl()}/${normalizedPath}`;
}


/*
============================================================
IDEMPOTENCY KEY
============================================================

A chave deve ser estável para retries.

Exemplo:

subscription_abc123

Se o mesmo pedido for repetido com a
mesma chave, o BitPay evita uma
segunda cobrança.

============================================================
*/

function createIdempotencyKey(

    suppliedKey = null

) {

    if (
        suppliedKey !== null &&
        suppliedKey !== undefined
    ) {

        const normalized =
            String(
                suppliedKey
            ).trim();


        if (
            normalized
        ) {

            return normalized;
        }
    }


    if (
        typeof crypto !==
        "undefined" &&
        typeof crypto.randomUUID ===
        "function"
    ) {

        return crypto.randomUUID();
    }


    return `honey_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 14)}`;
}


/*
============================================================
RESPONSE PARSER
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

        return text.slice(
            0,
            MAX_ERROR_BODY_LENGTH
        );
    }
}


/*
============================================================
BITPAY ERROR
============================================================
*/

function createBitPayError(

    message,

    statusCode,

    code,

    details = null,

    requestId = null

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


    if (
        requestId
    ) {

        error.requestId =
            requestId;
    }


    return error;
}


/*
============================================================
REQUEST
============================================================
*/

export async function bitPayRequest(

    path,

    options = {}

) {

    validateConfiguration();


    const {

        method = "GET",

        body,

        headers = {},

        timeout =
            DEFAULT_TIMEOUT_MS,

        idempotencyKey = null,

        financialOperation = false

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


        /*
        ----------------------------------------------------
        CONTENT TYPE
        ----------------------------------------------------
        */

        if (
            body !== undefined
        ) {

            requestHeaders[
                "Content-Type"
            ] =
                "application/json";
        }


        /*
        ----------------------------------------------------
        IDEMPOTENCY
        ----------------------------------------------------

        Obrigatória nas operações financeiras
        de criação.

        ----------------------------------------------------
        */

        if (
            financialOperation &&
            method.toUpperCase() ===
            "POST"
        ) {

            requestHeaders[
                "Idempotency-Key"
            ] =
                createIdempotencyKey(
                    idempotencyKey
                );
        }


        const response =
            await fetch(

                buildUrl(
                    path
                ),

                {

                    method:
                        method.toUpperCase(),

                    headers:
                        requestHeaders,

                    body:
                        body === undefined
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


        /*
        ----------------------------------------------------
        SUCCESS
        ----------------------------------------------------
        */

        if (
            response.ok
        ) {

            return data;
        }


        /*
        ----------------------------------------------------
        ERROR FORMAT
        ----------------------------------------------------
        */

        const apiError =
            data &&
            typeof data ===
            "object" &&
            data.error
                ? data.error
                : null;


        const message =
            apiError?.message ||
            (
                typeof data ===
                "object" &&
                data !== null
                    ? (
                        data.message ||
                        data.detail ||
                        data.error
                    )
                    : null
            ) ||
            `BitPay respondeu com HTTP ${response.status}.`;


        const code =
            apiError?.code ||
            "BITPAY_API_ERROR";


        const requestId =
            apiError?.request_id ||
            data?.request_id ||
            null;


        throw createBitPayError(

            message,

            response.status,

            code,

            data,

            requestId

        );

    }

    catch (
        error
    ) {

        /*
        ----------------------------------------------------
        TIMEOUT
        ----------------------------------------------------
        */

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


        /*
        ----------------------------------------------------
        ALREADY NORMALIZED
        ----------------------------------------------------
        */

        if (
            error?.name ===
            "BitPayError"
        ) {

            throw error;
        }


        /*
        ----------------------------------------------------
        CONNECTION FAILURE
        ----------------------------------------------------
        */

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

Idempotency-Key obrigatória.

============================================================
*/

export async function createPaymentIntent(

    data,

    options = {}

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
                data,

            idempotencyKey:
                options.idempotencyKey,

            financialOperation:
                true

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
CANCEL PAYMENT INTENT
------------------------------------------------------------
*/

export async function cancelPaymentIntent(

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
        )}/cancel`,

        {

            method:
                "POST"

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
            value !== undefined &&
            value !== null &&
            value !== ""
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
CHECKOUT SESSIONS
============================================================
*/


/*
------------------------------------------------------------
CREATE CHECKOUT SESSION
------------------------------------------------------------

O cliente será redirecionado para o
checkout hospedado do BitPay.

A confirmação verdadeira continuará
a ser feita por webhook.

============================================================
*/

export async function createCheckoutSession(

    data,

    options = {}

) {

    if (
        !data ||
        typeof data !==
        "object"
    ) {

        throw createBitPayError(

            "Os dados da Checkout Session são obrigatórios.",

            400,

            "INVALID_CHECKOUT_SESSION_DATA"

        );
    }


    return bitPayRequest(

        "/checkout/sessions",

        {

            method:
                "POST",

            body:
                data,

            idempotencyKey:
                options.idempotencyKey,

            financialOperation:
                true

        }

    );
}


/*
------------------------------------------------------------
GET CHECKOUT SESSION
------------------------------------------------------------
*/

export async function getCheckoutSession(

    sessionId

) {

    if (
        !sessionId
    ) {

        throw createBitPayError(

            "sessionId é obrigatório.",

            400,

            "CHECKOUT_SESSION_ID_REQUIRED"

        );
    }


    return bitPayRequest(

        `/checkout/sessions/${encodeURIComponent(
            sessionId
        )}`,

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

    data,

    options = {}

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
                data,

            idempotencyKey:
                options.idempotencyKey,

            financialOperation:
                true

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
DELETE PAYMENT LINK
------------------------------------------------------------
*/

export async function deletePaymentLink(

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
                "DELETE"

        }

    );
}


/*
============================================================
REFUNDS
============================================================
*/


/*
------------------------------------------------------------
CREATE REFUND
------------------------------------------------------------
*/

export async function createRefund(

    data,

    options = {}

) {

    if (
        !data ||
        typeof data !==
        "object"
    ) {

        throw createBitPayError(

            "Os dados do reembolso são obrigatórios.",

            400,

            "INVALID_REFUND_DATA"

        );
    }


    return bitPayRequest(

        "/refunds",

        {

            method:
                "POST",

            body:
                data,

            idempotencyKey:
                options.idempotencyKey,

            financialOperation:
                true

        }

    );
}


/*
------------------------------------------------------------
GET REFUND
------------------------------------------------------------
*/

export async function getRefund(

    refundId

) {

    if (
        !refundId
    ) {

        throw createBitPayError(

            "refundId é obrigatório.",

            400,

            "REFUND_ID_REQUIRED"

        );
    }


    return bitPayRequest(

        `/refunds/${encodeURIComponent(
            refundId
        )}`,

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

A estrutura exata do payload é responsabilidade
do módulo de subscrição.

Este cliente apenas envia o objeto.

============================================================
*/

export async function createMandate(

    data,

    options = {}

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
                data,

            idempotencyKey:
                options.idempotencyKey,

            financialOperation:
                true

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
            value !== undefined &&
            value !== null &&
            value !== ""
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

    data,

    options = {}

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
                data,

            idempotencyKey:
                options.idempotencyKey,

            financialOperation:
                true

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

A resposta contém o secret whsec_...
que deverá ser guardado no Render.

NUNCA devolver este secret ao frontend.

============================================================
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

export async function listWebhookEndpoints() {

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
PAYMENT METHODS
============================================================
*/

export async function listPaymentMethods() {

    return bitPayRequest(

        "/payment_methods",

        {

            method:
                "GET"

        }

    );
}


/*
============================================================
CONNECTION TEST
============================================================
*/

export async function testBitPayConnection() {

    validateConfiguration();


    const paymentMethods =
        await listPaymentMethods();


    return {

        connected:
            true,

        environment:
            BITPAY_ENV,

        apiUrl:
            getApiUrl(),

        paymentMethods

    };
}


/*
============================================================
SAFE CONFIG
============================================================
*/

export function getSafeBitPayConfig() {

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
DEFAULT EXPORT
============================================================
*/

export default {

    getBitPayConfig,

    getSafeBitPayConfig,

    bitPayRequest,

    createPaymentIntent,

    getPaymentIntent,

    cancelPaymentIntent,

    listPaymentIntents,

    createCheckoutSession,

    getCheckoutSession,

    createPaymentLink,

    getPaymentLink,

    deletePaymentLink,

    createRefund,

    getRefund,

    createMandate,

    getMandate,

    listMandates,

    createDebitInstruction,

    getDebitInstruction,

    createWebhookEndpoint,

    getWebhookEndpoint,

    listWebhookEndpoints,

    deleteWebhookEndpoint,

    listPaymentMethods,

    testBitPayConnection

};
