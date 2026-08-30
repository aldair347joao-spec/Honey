/*
============================================================
HONEY PAY
PAYMENT INTENT SERVICE
V1.0.0
============================================================
*/

import crypto from "node:crypto";

import mongoose from "mongoose";

import {
    PaymentIntent,
    PaymentTransaction,
    PaymentEvent,
    IdempotencyRecord
} from "./payment-core-models.js";

import {
    Merchant
} from "./models.js";


/*
============================================================
CONSTANTS
============================================================
*/

const DEFAULT_CURRENCY =
    "AOA";

const DEFAULT_CHECKOUT_TTL_MINUTES =
    30;

const IDEMPOTENCY_TTL_DAYS =
    7;


/*
============================================================
ERROR
============================================================
*/

function createError(
    message,
    code,
    statusCode = 400,
    details = null
) {

    const error =
        new Error(
            message
        );

    error.code =
        code;

    error.statusCode =
        statusCode;

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
OBJECT ID
============================================================
*/

function assertMerchantId(
    merchantId
) {

    if (
        !mongoose.isValidObjectId(
            merchantId
        )
    ) {

        throw createError(
            "Merchant ID inválido.",
            "INVALID_MERCHANT_ID",
            400
        );

    }

}


/*
============================================================
AMOUNT
============================================================
*/

function normalizeAmount(
    amountMinor
) {

    const amount =
        Number(
            amountMinor
        );

    if (
        !Number.isSafeInteger(
            amount
        ) ||
        amount <= 0
    ) {

        throw createError(
            "amountMinor deve ser um inteiro positivo.",
            "INVALID_AMOUNT",
            400
        );

    }

    return amount;

}


/*
============================================================
STRING
============================================================
*/

function optionalString(
    value,
    maxLength
) {

    if (
        value === undefined ||
        value === null
    ) {

        return null;

    }

    const normalized =
        String(
            value
        ).trim();

    if (
        !normalized
    ) {

        return null;

    }

    if (
        normalized.length >
        maxLength
    ) {

        throw createError(
            "Campo excede o tamanho permitido.",
            "FIELD_TOO_LONG",
            400
        );

    }

    return normalized;

}


/*
============================================================
PUBLIC ID
============================================================
*/

function createPublicId(
    prefix
) {

    return (
        prefix +
        "_" +
        crypto
            .randomBytes(
                18
            )
            .toString(
                "base64url"
            )
    );

}


/*
============================================================
CHECKOUT TOKEN
============================================================
*/

function createCheckoutToken() {

    return crypto
        .randomBytes(
            32
        )
        .toString(
            "base64url"
        );

}


/*
============================================================
EVENT ID
============================================================
*/

function createEventId() {

    return (
        "evt_hny_" +
        crypto
            .randomBytes(
                18
            )
            .toString(
                "base64url"
            )
    );

}


/*
============================================================
HASH REQUEST
============================================================
*/

function hashRequest(
    payload
) {

    const normalized =
        JSON.stringify(
            payload
        );

    return crypto
        .createHash(
            "sha256"
        )
        .update(
            normalized
        )
        .digest(
            "hex"
        );

}


/*
============================================================
PUBLIC PAYMENT INTENT
============================================================
*/

function publicPaymentIntent(
    intent
) {

    return {

        id:
            intent.publicId,

        object:
            "payment_intent",

        amountMinor:
            intent.amountMinor,

        currency:
            intent.currency,

        description:
            intent.description,

        externalReference:
            intent.externalReference,

        status:
            intent.status,

        paymentMethod:
            intent.paymentMethod,

        provider:
            intent.provider,

        checkoutUrl:
            `/checkout/${intent.checkoutToken}`,

        checkoutExpiresAt:
            intent.checkoutExpiresAt,

        customer:
            intent.customer,

        invoiceId:
            intent.invoiceId
                ? String(
                    intent.invoiceId
                )
                : null,

        metadata:
            intent.metadata,

        createdAt:
            intent.createdAt,

        updatedAt:
            intent.updatedAt

    };

}


/*
============================================================
MERCHANT
============================================================
*/

async function assertMerchantActive(
    merchantId
) {

    const merchant =
        await Merchant
            .findById(
                merchantId
            )
            .select(
                "_id accountStatus"
            )
            .lean();

    if (
        !merchant
    ) {

        throw createError(
            "Comerciante não encontrado.",
            "MERCHANT_NOT_FOUND",
            404
        );

    }

    if (
        merchant.accountStatus !==
        "active"
    ) {

        throw createError(
            "A conta do comerciante não está activa.",
            "MERCHANT_NOT_ACTIVE",
            403
        );

    }

    return merchant;

}


/*
============================================================
IDEMPOTENCY
============================================================
*/

async function findIdempotencyRecord(
    merchantId,
    key,
    operation
) {

    if (
        !key
    ) {

        return null;

    }

    return IdempotencyRecord
        .findOne(
            {
                merchantId,
                key,
                operation
            }
        );

}


/*
============================================================
CREATE EVENT
============================================================
*/

async function createPaymentEvent(
    {
        merchantId,
        paymentIntentId,
        transactionId = null,
        type,
        previousStatus = null,
        newStatus = null,
        source = "system",
        actorId = null,
        requestId = null,
        data = {},
        session = null
    }
) {

    const event =
        new PaymentEvent(
            {
                merchantId,

                paymentIntentId,

                transactionId,

                eventId:
                    createEventId(),

                type,

                previousStatus,

                newStatus,

                source,

                actorId,

                requestId,

                data
            }
        );

    await event.save(
        session
            ? {
                session
            }
            : undefined
    );

    return event;

}


/*
============================================================
CREATE PAYMENT INTENT
============================================================
*/

export async function createPaymentIntent(
    merchantId,
    payload = {},
    options = {}
) {

    assertMerchantId(
        merchantId
    );

    await assertMerchantActive(
        merchantId
    );


    const {

        amountMinor,

        currency =
            DEFAULT_CURRENCY,

        description,

        externalReference,

        customer = {},

        paymentMethod =
            "bank_transfer",

        metadata = {}

    } =
        payload;


    const amount =
        normalizeAmount(
            amountMinor
        );


    const normalizedCurrency =
        String(
            currency ||
            DEFAULT_CURRENCY
        )
            .trim()
            .toUpperCase();


    if (
        normalizedCurrency !==
        "AOA"
    ) {

        throw createError(
            "A moeda solicitada não é suportada.",
            "UNSUPPORTED_CURRENCY",
            400
        );

    }


    const normalizedDescription =
        optionalString(
            description,
            1000
        );


    const normalizedExternalReference =
        optionalString(
            externalReference,
            255
        );


    const normalizedCustomer = {

        name:
            optionalString(
                customer?.name,
                180
            ),

        email:
            customer?.email
                ? String(
                    customer.email
                )
                    .trim()
                    .toLowerCase()
                : null,

        phone:
            optionalString(
                customer?.phone,
                40
            )

    };


    if (
        ![
            "bank_transfer",
            "multicaixa",
            "unitel_money",
            "provider"
        ]
            .includes(
                paymentMethod
            )
    ) {

        throw createError(
            "Método de pagamento inválido.",
            "INVALID_PAYMENT_METHOD",
            400
        );

    }


    /*
    --------------------------------------------------------
    IDEMPOTENCY
    --------------------------------------------------------
    */

    const idempotencyKey =
        options.idempotencyKey
            ? String(
                options.idempotencyKey
            ).trim()
            : null;


    if (
        idempotencyKey
    ) {

        if (
            idempotencyKey.length >
            255
        ) {

            throw createError(
                "Idempotency-Key demasiado longa.",
                "INVALID_IDEMPOTENCY_KEY",
                400
            );

        }

    }


    const requestPayload = {

        amountMinor:
            amount,

        currency:
            normalizedCurrency,

        description:
            normalizedDescription,

        externalReference:
            normalizedExternalReference,

        customer:
            normalizedCustomer,

        paymentMethod,

        metadata

    };


    const requestHash =
        hashRequest(
            requestPayload
        );


    if (
        idempotencyKey
    ) {

        const existing =
            await findIdempotencyRecord(
                merchantId,
                idempotencyKey,
                "payment_intent.create"
            );


        if (
            existing
        ) {

            if (
                existing.requestHash !==
                requestHash
            ) {

                throw createError(
                    "A mesma Idempotency-Key foi utilizada com dados diferentes.",
                    "IDEMPOTENCY_KEY_REUSED",
                    409
                );

            }


            return {

                paymentIntent:
                    existing.response,

                idempotentReplay:
                    true

            };

        }

    }


    /*
    --------------------------------------------------------
    CHECKOUT
    --------------------------------------------------------
    */

    const ttlMinutes =
        Number(
            options.checkoutTtlMinutes ||
            DEFAULT_CHECKOUT_TTL_MINUTES
        );


    if (
        !Number.isInteger(
            ttlMinutes
        ) ||
        ttlMinutes < 5 ||
        ttlMinutes > 1440
    ) {

        throw createError(
            "checkoutTtlMinutes deve estar entre 5 e 1440 minutos.",
            "INVALID_CHECKOUT_TTL",
            400
        );

    }


    const now =
        new Date();


    const checkoutExpiresAt =
        new Date(
            now.getTime() +
            ttlMinutes *
            60 *
            1000
        );


    /*
    --------------------------------------------------------
    DATABASE TRANSACTION
    --------------------------------------------------------
    */

    const session =
        await mongoose
            .startSession();


    let createdIntent;


    try {

        await session.withTransaction(
            async () => {

                /*
                --------------------------------------------
                IDEMPOTENCY RACE PROTECTION
                --------------------------------------------
                */

                if (
                    idempotencyKey
                ) {

                    const existing =
                        await IdempotencyRecord
                            .findOne(
                                {
                                    merchantId,
                                    key:
                                        idempotencyKey,
                                    operation:
                                        "payment_intent.create"
                                }
                            )
                            .session(
                                session
                            );


                    if (
                        existing
                    ) {

                        if (
                            existing.requestHash !==
                            requestHash
                        ) {

                            throw createError(
                                "A mesma Idempotency-Key foi utilizada com dados diferentes.",
                                "IDEMPOTENCY_KEY_REUSED",
                                409
                            );

                        }

                        createdIntent =
                            await PaymentIntent
                                .findById(
                                    existing.resourceId
                                )
                                .session(
                                    session
                                );

                        return;

                    }

                }


                /*
                --------------------------------------------
                PAYMENT INTENT
                --------------------------------------------
                */

                createdIntent =
                    new PaymentIntent(
                        {

                            merchantId,

                            publicId:
                                createPublicId(
                                    "pi_hny"
                                ),

                            amountMinor:
                                amount,

                            currency:
                                normalizedCurrency,

                            description:
                                normalizedDescription,

                            externalReference:
                                normalizedExternalReference,

                            customer:
                                normalizedCustomer,

                            status:
                                "requires_payment",

                            paymentMethod,

                            checkoutToken:
                                createCheckoutToken(),

                            checkoutExpiresAt,

                            metadata:
                                metadata || {}

                        }
                    );


                await createdIntent.save(
                    {
                        session
                    }
                );


                /*
                --------------------------------------------
                TRANSACTION
                --------------------------------------------
                */

                const transaction =
                    new PaymentTransaction(
                        {

                            merchantId,

                            paymentIntentId:
                                createdIntent._id,

                            publicId:
                                createPublicId(
                                    "txn_hny"
                                ),

                            amountMinor:
                                amount,

                            currency:
                                normalizedCurrency,

                            type:
                                "payment",

                            status:
                                "pending",

                            paymentMethod,

                            metadata:
                                metadata || {}

                        }
                    );


                await transaction.save(
                    {
                        session
                    }
                );


                /*
                --------------------------------------------
                EVENT
                --------------------------------------------
                */

                await createPaymentEvent(
                    {

                        merchantId,

                        paymentIntentId:
                            createdIntent._id,

                        transactionId:
                            transaction._id,

                        type:
                            "payment_intent.created",

                        previousStatus:
                            null,

                        newStatus:
                            "requires_payment",

                        source:
                            options.source ||
                            "api",

                        actorId:
                            options.actorId ||
                            null,

                        requestId:
                            options.requestId ||
                            null,

                        data: {
                            amountMinor:
                                amount,

                            currency:
                                normalizedCurrency,

                            paymentMethod

                        },

                        session

                    }
                );


                /*
                --------------------------------------------
                IDEMPOTENCY
                --------------------------------------------
                */

                if (
                    idempotencyKey
                ) {

                    const response =
                        publicPaymentIntent(
                            createdIntent
                        );


                    const expiresAt =
                        new Date(
                            now.getTime() +
                            IDEMPOTENCY_TTL_DAYS *
                            24 *
                            60 *
                            60 *
                            1000
                        );


                    const record =
                        new IdempotencyRecord(
                            {

                                merchantId,

                                key:
                                    idempotencyKey,

                                operation:
                                    "payment_intent.create",

                                requestHash,

                                statusCode:
                                    201,

                                response,

                                resourceType:
                                    "PaymentIntent",

                                resourceId:
                                    String(
                                        createdIntent._id
                                    ),

                                expiresAt

                            }
                        );


                    await record.save(
                        {
                            session
                        }
                    );

                }

            }
        );

    }

    finally {

        await session.endSession();

    }


    return {

        paymentIntent:
            publicPaymentIntent(
                createdIntent
            ),

        idempotentReplay:
            false

    };

}


/*
============================================================
GET PAYMENT INTENT
============================================================
*/

export async function getPaymentIntent(
    merchantId,
    publicId
) {

    assertMerchantId(
        merchantId
    );


    const intent =
        await PaymentIntent
            .findOne(
                {
                    merchantId,

                    publicId
                }
            )
            .lean();


    if (
        !intent
    ) {

        throw createError(
            "Payment Intent não encontrado.",
            "PAYMENT_INTENT_NOT_FOUND",
            404
        );

    }


    return publicPaymentIntent(
        intent
    );

}


/*
============================================================
CANCEL PAYMENT INTENT
============================================================
*/

export async function cancelPaymentIntent(
    merchantId,
    publicId,
    options = {}
) {

    assertMerchantId(
        merchantId
    );


    const session =
        await mongoose
            .startSession();


    try {

        let result;


        await session.withTransaction(
            async () => {

                const intent =
                    await PaymentIntent
                        .findOne(
                            {
                                merchantId,
                                publicId
                            }
                        )
                        .session(
                            session
                        );


                if (
                    !intent
                ) {

                    throw createError(
                        "Payment Intent não encontrado.",
                        "PAYMENT_INTENT_NOT_FOUND",
                        404
                    );

                }


                if (
                    intent.status ===
                    "cancelled"
                ) {

                    result =
                        publicPaymentIntent(
                            intent
                        );

                    return;

                }


                if (
                    [
                        "succeeded",
                        "expired"
                    ]
                        .includes(
                            intent.status
                        )
                ) {

                    throw createError(
                        "Este Payment Intent não pode ser cancelado.",
                        "PAYMENT_INTENT_CANNOT_BE_CANCELLED",
                        409
                    );

                }


                const previousStatus =
                    intent.status;


                intent.status =
                    "cancelled";


                intent.cancelledAt =
                    new Date();


                await intent.save(
                    {
                        session
                    }
                );


                await PaymentTransaction
                    .updateMany(
                        {
                            paymentIntentId:
                                intent._id,

                            status:
                                {
                                    $in: [
                                        "pending",
                                        "processing"
                                    ]
                                }
                        },

                        {
                            $set: {
                                status:
                                    "failed",

                                failureCode:
                                    "PAYMENT_INTENT_CANCELLED",

                                failureMessage:
                                    "Payment Intent cancelado."

                            }
                        },

                        {
                            session
                        }
                    );


                await createPaymentEvent(
                    {

                        merchantId,

                        paymentIntentId:
                            intent._id,

                        type:
                            "payment_intent.cancelled",

                        previousStatus,

                        newStatus:
                            "cancelled",

                        source:
                            options.source ||
                            "merchant",

                        actorId:
                            options.actorId ||
                            merchantId,

                        requestId:
                            options.requestId ||
                            null,

                        data: {},

                        session

                    }
                );


                result =
                    publicPaymentIntent(
                        intent
                    );

            }
        );


        return result;

    }

    finally {

        await session.endSession();

    }

}


/*
============================================================
EXPORTS
============================================================
*/

export {
    publicPaymentIntent
};
