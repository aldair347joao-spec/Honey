/*
============================================================
HONEY PAY
PAYMENT CORE MODELS
V1.0.0
============================================================

NÚCLEO FINANCEIRO DA HONEY PAY

MODELOS:

- PaymentIntent
- PaymentTransaction
- PaymentEvent
- IdempotencyRecord
- WebhookDelivery

IMPORTANTE
------------------------------------------------------------
Este módulo é introduzido ao lado dos modelos financeiros
legados existentes.

Não substitui ainda:

- Invoice
- Payment
- Receipt

A migração desses modelos será feita posteriormente.
============================================================
*/

import mongoose from "mongoose";

const {
    Schema
} = mongoose;


/*
============================================================
HELPERS
============================================================
*/

const objectId = () =>
    Schema.Types.ObjectId;


/*
============================================================
PAYMENT INTENT
============================================================

Representa a intenção de pagamento criada pelo comerciante
ou pela integração da loja online.

Estados:

requires_payment
processing
succeeded
failed
cancelled
expired

============================================================
*/

const paymentIntentSchema =
    new Schema(

        {

            merchantId: {
                type:
                    objectId(),

                ref:
                    "Merchant",

                required:
                    true,

                index:
                    true
            },


            publicId: {
                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true,

                trim:
                    true
            },


            /*
            ------------------------------------------------
            VALOR FINANCEIRO
            ------------------------------------------------

            O valor oficial da API é armazenado em unidade
            inteira.

            Exemplo:

            25.000 AOA

            amountMinor:

            25000

            ------------------------------------------------
            */

            amountMinor: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,

                validate: {
                    validator(value) {
                        return (
                            Number.isSafeInteger(
                                value
                            )
                        );
                    },

                    message:
                        "amountMinor deve ser um inteiro seguro."
                }
            },


            currency: {
                type:
                    String,

                required:
                    true,

                uppercase:
                    true,

                trim:
                    true,

                enum: [
                    "AOA"
                ],

                default:
                    "AOA"
            },


            /*
            ------------------------------------------------
            DESCRIÇÃO
            ------------------------------------------------
            */

            description: {
                type:
                    String,

                trim:
                    true,

                maxlength:
                    1000,

                default:
                    null
            },


            /*
            ------------------------------------------------
            REFERÊNCIA DA LOJA
            ------------------------------------------------

            Permite ligar o pagamento ao pedido original.

            Exemplo:

            ORDER-1024

            ------------------------------------------------
            */

            externalReference: {
                type:
                    String,

                trim:
                    true,

                maxlength:
                    255,

                default:
                    null
            },


            /*
            ------------------------------------------------
            CUSTOMER
            ------------------------------------------------
            */

            customer: {

                name: {
                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        180,

                    default:
                        null
                },


                email: {
                    type:
                        String,

                    trim:
                        true,

                    lowercase:
                        true,

                    maxlength:
                        180,

                    default:
                        null
                },


                phone: {
                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        40,

                    default:
                        null
                }

            },


            /*
            ------------------------------------------------
            STATUS
            ------------------------------------------------
            */

            status: {
                type:
                    String,

                enum: [
                    "requires_payment",
                    "processing",
                    "succeeded",
                    "failed",
                    "cancelled",
                    "expired"
                ],

                default:
                    "requires_payment",

                index:
                    true
            },


            /*
            ------------------------------------------------
            PAYMENT METHOD
            ------------------------------------------------
            */

            paymentMethod: {
                type:
                    String,

                enum: [
                    "bank_transfer",
                    "multicaixa",
                    "unitel_money",
                    "provider"
                ],

                default:
                    "bank_transfer"
            },


            /*
            ------------------------------------------------
            PROVIDER
            ------------------------------------------------
            */

            provider: {
                type:
                    String,

                trim:
                    true,

                maxlength:
                    100,

                default:
                    null
            },


            providerPaymentId: {
                type:
                    String,

                trim:
                    true,

                maxlength:
                    255,

                default:
                    null
            },


            /*
            ------------------------------------------------
            CHECKOUT
            ------------------------------------------------
            */

            checkoutToken: {
                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true,

                trim:
                    true
            },


            checkoutExpiresAt: {
                type:
                    Date,

                required:
                    true,

                index:
                    true
            },


            /*
            ------------------------------------------------
            INVOICE LEGACY LINK
            ------------------------------------------------

            Durante a migração, o PaymentIntent poderá
            apontar para uma Invoice existente.

            ------------------------------------------------
            */

            invoiceId: {
                type:
                    objectId(),

                ref:
                    "Invoice",

                default:
                    null,

                index:
                    true
            },


            /*
            ------------------------------------------------
            TIMELINE
            ------------------------------------------------
            */

            processingAt: {
                type:
                    Date,

                default:
                    null
            },


            succeededAt: {
                type:
                    Date,

                default:
                    null
            },


            failedAt: {
                type:
                    Date,

                default:
                    null
            },


            cancelledAt: {
                type:
                    Date,

                default:
                    null
            },


            expiredAt: {
                type:
                    Date,

                default:
                    null
            },


            /*
            ------------------------------------------------
            METADATA
            ------------------------------------------------
            */

            metadata: {
                type:
                    Schema.Types.Mixed,

                default:
                    {}
            }

        },

        {
            timestamps:
                true,

            collection:
                "paymentIntents"
        }

    );


/*
============================================================
PAYMENT INTENT INDEXES
============================================================
*/

paymentIntentSchema.index(
    {
        merchantId:
            1,

        createdAt:
            -1
    }
);


paymentIntentSchema.index(
    {
        merchantId:
            1,

        status:
            1,

        createdAt:
            -1
    }
);


paymentIntentSchema.index(
    {
        merchantId:
            1,

        externalReference:
            1
    }
);


/*
============================================================
PAYMENT TRANSACTION
============================================================

Registo financeiro de uma tentativa/transacção.

É deliberadamente separado do PaymentIntent.

Um PaymentIntent pode futuramente ter várias tentativas.

============================================================
*/

const paymentTransactionSchema =
    new Schema(

        {

            merchantId: {
                type:
                    objectId(),

                ref:
                    "Merchant",

                required:
                    true,

                index:
                    true
            },


            paymentIntentId: {
                type:
                    objectId(),

                ref:
                    "PaymentIntent",

                required:
                    true,

                index:
                    true
            },


            publicId: {
                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true
            },


            amountMinor: {
                type:
                    Number,

                required:
                    true,

                min:
                    1,

                validate: {
                    validator(value) {
                        return (
                            Number.isSafeInteger(
                                value
                            )
                        );
                    }
                }
            },


            currency: {
                type:
                    String,

                required:
                    true,

                uppercase:
                    true,

                default:
                    "AOA"
            },


            type: {
                type:
                    String,

                enum: [
                    "payment"
                ],

                default:
                    "payment"
            },


            status: {
                type:
                    String,

                enum: [
                    "pending",
                    "processing",
                    "succeeded",
                    "failed"
                ],

                default:
                    "pending",

                index:
                    true
            },


            paymentMethod: {
                type:
                    String,

                default:
                    "bank_transfer"
            },


            provider: {
                type:
                    String,

                default:
                    null
            },


            providerTransactionId: {
                type:
                    String,

                trim:
                    true,

                maxlength:
                    255,

                default:
                    null
            },


            failureCode: {
                type:
                    String,

                trim:
                    true,

                maxlength:
                    100,

                default:
                    null
            },


            failureMessage: {
                type:
                    String,

                trim:
                    true,

                maxlength:
                    1000,

                default:
                    null
            },


            processedAt: {
                type:
                    Date,

                default:
                    null
            },


            metadata: {
                type:
                    Schema.Types.Mixed,

                default:
                    {}
            }

        },

        {
            timestamps:
                true,

            collection:
                "paymentTransactions"
        }

    );


paymentTransactionSchema.index(
    {
        paymentIntentId:
            1,

        createdAt:
            -1
    }
);


paymentTransactionSchema.index(
    {
        merchantId:
            1,

        createdAt:
            -1
    }
);


/*
============================================================
PAYMENT EVENT
============================================================

Histórico imutável do ciclo financeiro.

Exemplos:

payment_intent.created
payment_intent.processing
payment_intent.succeeded
payment_intent.failed
payment_intent.cancelled
payment_intent.expired

============================================================
*/

const paymentEventSchema =
    new Schema(

        {

            merchantId: {
                type:
                    objectId(),

                ref:
                    "Merchant",

                required:
                    true,

                index:
                    true
            },


            paymentIntentId: {
                type:
                    objectId(),

                ref:
                    "PaymentIntent",

                required:
                    true,

                index:
                    true
            },


            transactionId: {
                type:
                    objectId(),

                ref:
                    "PaymentTransaction",

                default:
                    null,

                index:
                    true
            },


            eventId: {
                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true
            },


            type: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    120,

                index:
                    true
            },


            previousStatus: {
                type:
                    String,

                default:
                    null
            },


            newStatus: {
                type:
                    String,

                default:
                    null
            },


            source: {
                type:
                    String,

                enum: [
                    "api",
                    "checkout",
                    "merchant",
                    "provider",
                    "system",
                    "webhook"
                ],

                default:
                    "system"
            },


            actorId: {
                type:
                    objectId(),

                ref:
                    "Merchant",

                default:
                    null
            },


            requestId: {
                type:
                    String,

                trim:
                    true,

                maxlength:
                    255,

                default:
                    null
            },


            data: {
                type:
                    Schema.Types.Mixed,

                default:
                    {}
            }

        },

        {
            timestamps:
                true,

            collection:
                "paymentEvents"
        }

    );


paymentEventSchema.index(
    {
        paymentIntentId:
            1,

        createdAt:
            -1
    }
);


/*
============================================================
IDEMPOTENCY RECORD
============================================================

Impede a criação duplicada de pagamentos quando uma loja
repete a mesma requisição.

============================================================
*/

const idempotencyRecordSchema =
    new Schema(

        {

            merchantId: {
                type:
                    objectId(),

                ref:
                    "Merchant",

                required:
                    true
            },


            key: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    255
            },


            operation: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    120
            },


            requestHash: {
                type:
                    String,

                required:
                    true,

                maxlength:
                    64
            },


            statusCode: {
                type:
                    Number,

                default:
                    200
            },


            response: {
                type:
                    Schema.Types.Mixed,

                default:
                    {}
            },


            resourceType: {
                type:
                    String,

                default:
                    null
            },


            resourceId: {
                type:
                    String,

                default:
                    null
            },


            expiresAt: {
                type:
                    Date,

                required:
                    true,

                index:
                    true
            }

        },

        {
            timestamps:
                true,

            collection:
                "idempotencyRecords"
        }

    );


idempotencyRecordSchema.index(
    {
        merchantId:
            1,

        key:
            1,

        operation:
            1
    },

    {
        unique:
            true
    }
);


/*
============================================================
WEBHOOK DELIVERY
============================================================

Preparado para o sistema de webhooks da Honey Pay.

Não envia ainda nesta primeira etapa.

============================================================
*/

const webhookDeliverySchema =
    new Schema(

        {

            merchantId: {
                type:
                    objectId(),

                ref:
                    "Merchant",

                required:
                    true,

                index:
                    true
            },


            paymentEventId: {
                type:
                    objectId(),

                ref:
                    "PaymentEvent",

                required:
                    true,

                index:
                    true
            },


            eventId: {
                type:
                    String,

                required:
                    true,

                index:
                    true
            },


            endpoint: {
                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    2000
            },


            status: {
                type:
                    String,

                enum: [
                    "pending",
                    "delivered",
                    "failed",
                    "disabled"
                ],

                default:
                    "pending",

                index:
                    true
            },


            attempts: {
                type:
                    Number,

                min:
                    0,

                default:
                    0
            },


            nextAttemptAt: {
                type:
                    Date,

                default:
                    null,

                index:
                    true
            },


            lastAttemptAt: {
                type:
                    Date,

                default:
                    null
            },


            deliveredAt: {
                type:
                    Date,

                default:
                    null
            },


            lastStatusCode: {
                type:
                    Number,

                default:
                    null
            },


            lastError: {
                type:
                    String,

                maxlength:
                    2000,

                default:
                    null
            }

        },

        {
            timestamps:
                true,

            collection:
                "webhookDeliveries"
        }

    );


webhookDeliverySchema.index(
    {
        merchantId:
            1,

        eventId:
            1
    },

    {
        unique:
            true
    }
);


/*
============================================================
MODEL REGISTRATION
============================================================
*/

const PaymentIntent =
    mongoose.models.PaymentIntent ||
    mongoose.model(
        "PaymentIntent",
        paymentIntentSchema
    );


const PaymentTransaction =
    mongoose.models.PaymentTransaction ||
    mongoose.model(
        "PaymentTransaction",
        paymentTransactionSchema
    );


const PaymentEvent =
    mongoose.models.PaymentEvent ||
    mongoose.model(
        "PaymentEvent",
        paymentEventSchema
    );


const IdempotencyRecord =
    mongoose.models.IdempotencyRecord ||
    mongoose.model(
        "IdempotencyRecord",
        idempotencyRecordSchema
    );


const WebhookDelivery =
    mongoose.models.WebhookDelivery ||
    mongoose.model(
        "WebhookDelivery",
        webhookDeliverySchema
    );


export {
    PaymentIntent,
    PaymentTransaction,
    PaymentEvent,
    IdempotencyRecord,
    WebhookDelivery
};


export default {
    PaymentIntent,
    PaymentTransaction,
    PaymentEvent,
    IdempotencyRecord,
    WebhookDelivery
};
