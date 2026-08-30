/*
============================================================
HONEY PAY
WEBHOOK SERVICE
V1.0.0
============================================================
*/

import crypto from "node:crypto";

import {
    WebhookEndpoint,
    MerchantApiKey
} from "./integration-models.js";

import {
    PaymentEvent,
    WebhookDelivery
} from "./payment-core-models.js";


/*
============================================================
CONSTANTS
============================================================
*/

const WEBHOOK_SECRET_PREFIX =
    "whsec_";


const MAX_ENDPOINTS =
    10;


/*
============================================================
ERROR
============================================================
*/

function createError(

    message,

    code,

    statusCode = 400

) {

    const error =
        new Error(
            message
        );

    error.code =
        code;

    error.statusCode =
        statusCode;

    return error;

}


/*
============================================================
HASH
============================================================
*/

function hashSecret(
    value
) {

    return crypto

        .createHash(
            "sha256"
        )

        .update(
            value
        )

        .digest(
            "hex"
        );

}


/*
============================================================
SECRET
============================================================
*/

function generateWebhookSecret() {

    return (

        WEBHOOK_SECRET_PREFIX +

        crypto

            .randomBytes(
                32
            )

            .toString(
                "base64url"
            )

    );

}


/*
============================================================
ENDPOINT ID
============================================================
*/

function generateEndpointId() {

    return (

        "we_hny_" +

        crypto

            .randomBytes(
                12
            )

            .toString(
                "hex"
            )

    );

}


/*
============================================================
CREATE ENDPOINT
============================================================
*/

export async function createWebhookEndpoint(

    merchantId,

    payload = {}

) {

    const url =
        String(
            payload.url ||
            ""
        )
            .trim();


    if (
        !url
    ) {

        throw createError(

            "URL do webhook é obrigatória.",

            "WEBHOOK_URL_REQUIRED",

            400

        );

    }


    let parsedUrl;


    try {

        parsedUrl =
            new URL(
                url
            );

    }

    catch {

        throw createError(

            "URL do webhook inválida.",

            "INVALID_WEBHOOK_URL",

            400

        );

    }


    /*
    --------------------------------------------------------
    HTTPS obrigatório
    --------------------------------------------------------
    */

    if (
        parsedUrl.protocol !==
        "https:"
    ) {

        if (
            process.env.NODE_ENV ===
            "production"
        ) {

            throw createError(

                "Webhooks de produção precisam utilizar HTTPS.",

                "WEBHOOK_HTTPS_REQUIRED",

                400

            );

        }

    }


    /*
    --------------------------------------------------------
    Endpoint limit
    --------------------------------------------------------
    */

    const count =
        await WebhookEndpoint
            .countDocuments(
                {
                    merchantId
                }
            );


    if (
        count >=
        MAX_ENDPOINTS
    ) {

        throw createError(

            "O limite de endpoints de webhook foi atingido.",

            "WEBHOOK_ENDPOINT_LIMIT",

            409

        );

    }


    const events =
        Array.isArray(
            payload.events
        )

            ? [
                ...new Set(
                    payload.events
                        .map(
                            event =>
                                String(
                                    event
                                )
                        )
                )
            ]

            : [

                "payment_intent.created",

                "payment_intent.processing",

                "payment_intent.succeeded",

                "payment_intent.failed",

                "payment_intent.cancelled",

                "payment_intent.expired"

            ];


    const allowedEvents = [

        "payment_intent.created",

        "payment_intent.processing",

        "payment_intent.succeeded",

        "payment_intent.failed",

        "payment_intent.cancelled",

        "payment_intent.expired"

    ];


    const invalidEvent =
        events.find(
            event =>
                !allowedEvents.includes(
                    event
                )
        );


    if (
        invalidEvent
    ) {

        throw createError(

            `Evento de webhook inválido: ${invalidEvent}`,

            "INVALID_WEBHOOK_EVENT",

            400

        );

    }


    const secret =
        generateWebhookSecret();


    const endpoint =
        new WebhookEndpoint({

            merchantId,

            endpointId:
                generateEndpointId(),

            url,

            secretHash:
                hashSecret(
                    secret
                ),

            secretPrefix:
                secret.slice(
                    0,
                    12
                ),

            description:
                payload.description
                    ? String(
                        payload.description
                    )
                        .trim()
                        .slice(
                            0,
                            255
                        )
                    : null,

            enabled:
                true,

            events

        });


    await endpoint.save();


    return {

        id:
            endpoint.endpointId,

        url:
            endpoint.url,

        description:
            endpoint.description,

        events:
            endpoint.events,

        enabled:
            endpoint.enabled,

        secret,

        createdAt:
            endpoint.createdAt,

        warning:
            "O webhook secret só é apresentado uma vez. Guarde-o num local seguro."

    };

}


/*
============================================================
LIST ENDPOINTS
============================================================
*/

export async function listWebhookEndpoints(
    merchantId
) {

    const endpoints =
        await WebhookEndpoint

            .find(
                {
                    merchantId
                }
            )

            .sort(
                {
                    createdAt:
                        -1
                }
            )

            .lean();


    return endpoints.map(
        endpoint => ({

            id:
                endpoint.endpointId,

            url:
                endpoint.url,

            description:
                endpoint.description,

            events:
                endpoint.events,

            enabled:
                endpoint.enabled,

            secretPrefix:
                endpoint.secretPrefix,

            failureCount:
                endpoint.failureCount,

            lastDeliveryAt:
                endpoint.lastDeliveryAt,

            lastSuccessAt:
                endpoint.lastSuccessAt,

            lastFailureAt:
                endpoint.lastFailureAt,

            createdAt:
                endpoint.createdAt

        })
    );

}


/*
============================================================
DISABLE ENDPOINT
============================================================
*/

export async function disableWebhookEndpoint(

    merchantId,

    endpointId

) {

    const endpoint =
        await WebhookEndpoint

            .findOne(
                {
                    merchantId,

                    endpointId
                }
            );


    if (
        !endpoint
    ) {

        throw createError(

            "Webhook endpoint não encontrado.",

            "WEBHOOK_NOT_FOUND",

            404

        );

    }


    endpoint.enabled =
        false;


    await endpoint.save();


    return {

        id:
            endpoint.endpointId,

        enabled:
            false

    };

}


/*
============================================================
SIGN PAYLOAD
============================================================
*/

export function signWebhookPayload(

    secret,

    timestamp,

    rawPayload

) {

    const signedContent =
        `${timestamp}.${rawPayload}`;


    const signature =
        crypto

            .createHmac(
                "sha256",
                secret
            )

            .update(
                signedContent
            )

            .digest(
                "hex"
            );


    return signature;

}


/*
============================================================
VERIFY SIGNATURE
============================================================
*/

export function verifyWebhookSignature(

    secret,

    timestamp,

    rawPayload,

    signature,

    toleranceSeconds = 300

) {

    const timestampNumber =
        Number(
            timestamp
        );


    if (
        !Number.isSafeInteger(
            timestampNumber
        )
    ) {

        return false;

    }


    const age =
        Math.abs(
            Math.floor(
                Date.now() /
                1000
            ) -
            timestampNumber
        );


    if (
        age >
        toleranceSeconds
    ) {

        return false;

    }


    const expected =
        signWebhookPayload(

            secret,

            timestamp,

            rawPayload

        );


    if (
        typeof signature !==
        "string" ||
        signature.length !==
        expected.length
    ) {

        return false;

    }


    return crypto.timingSafeEqual(

        Buffer.from(
            expected
        ),

        Buffer.from(
            signature
        )

    );

}


/*
============================================================
BUILD EVENT PAYLOAD
============================================================
*/

function buildWebhookPayload(
    event
) {

    return {

        id:
            event.eventId,

        object:
            "event",

        type:
            event.type,

        createdAt:
            event.createdAt,

        data:
            event.data || {},

        paymentIntentId:
            event.paymentIntentId
                ? String(
                    event.paymentIntentId
                )
                : null,

        transactionId:
            event.transactionId
                ? String(
                    event.transactionId
                )
                : null,

        previousStatus:
            event.previousStatus,

        newStatus:
            event.newStatus

    };

}


/*
============================================================
CREATE DELIVERIES
============================================================
*/

export async function queueWebhookDeliveries(
    eventId
) {

    const event =
        await PaymentEvent
            .findOne(
                {
                    eventId
                }
            )
            .lean();


    if (
        !event
    ) {

        throw createError(

            "Payment Event não encontrado.",

            "PAYMENT_EVENT_NOT_FOUND",

            404

        );

    }


    const endpoints =
        await WebhookEndpoint
            .find(
                {
                    merchantId:
                        event.merchantId,

                    enabled:
                        true,

                    events:
                        event.type

                }
            )
            .lean();


    if (
        endpoints.length ===
        0
    ) {

        return [];

    }


    const deliveries =
        [];


    for (
        const endpoint
        of endpoints
    ) {

        const existing =
            await WebhookDelivery
                .findOne(
                    {
                        merchantId:
                            event.merchantId,

                        eventId,

                        endpoint:
                            endpoint.url
                    }
                );


        if (
            existing
        ) {

            deliveries.push(
                existing
            );

            continue;

        }


        const delivery =
            await WebhookDelivery
                .create({

                    merchantId:
                        event.merchantId,

                    paymentEventId:
                        event._id,

                    eventId,

                    endpoint:
                        endpoint.url,

                    status:
                        "pending",

                    attempts:
                        0,

                    nextAttemptAt:
                        new Date()

                });


        deliveries.push(
            delivery
        );

    }


    return deliveries;

}


/*
============================================================
DELIVER WEBHOOK
============================================================
*/

export async function deliverWebhook(
    deliveryId
) {

    const delivery =
        await WebhookDelivery
            .findById(
                deliveryId
            );


    if (
        !delivery
    ) {

        throw createError(

            "Webhook delivery não encontrada.",

            "WEBHOOK_DELIVERY_NOT_FOUND",

            404

        );

    }


    if (
        [
            "delivered",
            "disabled"
        ]
            .includes(
                delivery.status
            )
    ) {

        return {

            delivered:
                delivery.status ===
                "delivered",

            status:
                delivery.status

        };

    }


    const endpoint =
        await WebhookEndpoint
            .findOne(
                {

                    merchantId:
                        delivery.merchantId,

                    url:
                        delivery.endpoint

                }
            );


    if (
        !endpoint ||
        !endpoint.enabled
    ) {

        delivery.status =
            "disabled";

        await delivery.save();


        return {

            delivered:
                false,

            status:
                "disabled"

        };

    }


    const event =
        await PaymentEvent
            .findById(
                delivery.paymentEventId
            )
            .lean();


    if (
        !event
    ) {

        throw createError(

            "Evento do webhook não encontrado.",

            "WEBHOOK_EVENT_NOT_FOUND",

            404

        );

    }


    const payload =
        buildWebhookPayload(
            event
        );


    const rawPayload =
        JSON.stringify(
            payload
        );


    const timestamp =
        Math.floor(
            Date.now() /
            1000
        );


    /*
    --------------------------------------------------------
    IMPORTANTE

    Nesta implementação o secret é recuperado através do
    hash? Não.

    O secret original nunca é armazenado, portanto para
    produção precisamos de uma forma segura de recuperar
    o secret de assinatura.

    Esta função deliberadamente não envia o webhook ainda.
    --------------------------------------------------------
    */

    throw createError(

        "Webhook delivery requer secret de endpoint seguro.",

        "WEBHOOK_SECRET_STORAGE_NOT_CONFIGURED",

        500

    );

}
