/*
============================================================
HONEY PAY
INTEGRATION MODELS
V1.0.0
============================================================

MODELOS:

- MerchantApiKey
- WebhookEndpoint

SEGURANÇA:

- API keys nunca são armazenadas em texto puro.
- Webhook secrets nunca são armazenados em texto puro.
- Apenas hashes são persistidos.
============================================================
*/

import mongoose from "mongoose";

const {
    Schema
} = mongoose;


/*
============================================================
API KEY
============================================================
*/

const merchantApiKeySchema =
    new Schema(

        {

            merchantId: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "Merchant",

                required:
                    true,

                index:
                    true

            },


            keyId: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true

            },


            keyPrefix: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    32

            },


            keyHash: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true,

                maxlength:
                    64

            },


            name: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    120

            },


            environment: {

                type:
                    String,

                enum: [

                    "test",

                    "live"

                ],

                default:
                    "live",

                index:
                    true

            },


            scopes: {

                type:
                    [

                        {

                            type:
                                String,

                            trim:
                                true

                        }

                    ],

                default:
                    [

                        "payment_intents:write",

                        "payment_intents:read"

                    ]

            },


            enabled: {

                type:
                    Boolean,

                default:
                    true,

                index:
                    true

            },


            expiresAt: {

                type:
                    Date,

                default:
                    null,

                index:
                    true

            },


            lastUsedAt: {

                type:
                    Date,

                default:
                    null

            },


            lastUsedIp: {

                type:
                    String,

                maxlength:
                    100,

                default:
                    null

            },


            createdBy: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "Merchant",

                default:
                    null

            },


            revokedAt: {

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
                "merchantApiKeys"

        }

    );


merchantApiKeySchema.index(

    {

        merchantId:
            1,

        enabled:
            1,

        environment:
            1

    }

);


/*
============================================================
WEBHOOK ENDPOINT
============================================================
*/

const webhookEndpointSchema =
    new Schema(

        {

            merchantId: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "Merchant",

                required:
                    true,

                index:
                    true

            },


            endpointId: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true

            },


            url: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    2000

            },


            secretHash: {

                type:
                    String,

                required:
                    true,

                maxlength:
                    64

            },


            secretPrefix: {

                type:
                    String,

                required:
                    true,

                maxlength:
                    32

            },


            description: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    255,

                default:
                    null

            },


            enabled: {

                type:
                    Boolean,

                default:
                    true,

                index:
                    true

            },


            events: {

                type:
                    [

                        {

                            type:
                                String,

                            trim:
                                true

                        }

                    ],

                default:
                    [

                        "payment_intent.created",

                        "payment_intent.processing",

                        "payment_intent.succeeded",

                        "payment_intent.failed",

                        "payment_intent.cancelled",

                        "payment_intent.expired"

                    ]

            },


            failureCount: {

                type:
                    Number,

                min:
                    0,

                default:
                    0

            },


            lastDeliveryAt: {

                type:
                    Date,

                default:
                    null

            },


            lastSuccessAt: {

                type:
                    Date,

                default:
                    null

            },


            lastFailureAt: {

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
                "webhookEndpoints"

        }

    );


webhookEndpointSchema.index(

    {

        merchantId:
            1,

        enabled:
            1

    }

);


/*
============================================================
MODEL REGISTRATION
============================================================
*/

const MerchantApiKey =
    mongoose.models.MerchantApiKey ||
    mongoose.model(

        "MerchantApiKey",

        merchantApiKeySchema

    );


const WebhookEndpoint =
    mongoose.models.WebhookEndpoint ||
    mongoose.model(

        "WebhookEndpoint",

        webhookEndpointSchema

    );


/*
============================================================
EXPORTS
============================================================
*/

export {

    MerchantApiKey,

    WebhookEndpoint

};


export default {

    MerchantApiKey,

    WebhookEndpoint

};
