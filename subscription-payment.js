/*
============================================================
HONEY PAY
SUBSCRIPTION PAYMENT MODEL
V1.0.0
============================================================

FINALIDADE
------------------------------------------------------------

Este modelo representa EXCLUSIVAMENTE pagamentos realizados
por um cliente da Honey Pay para subscrever ou renovar um
plano da plataforma.

============================================================

ARQUITETURA FINANCEIRA
------------------------------------------------------------

CAMADA 1 — SUBSCRIÇÃO DA HONEY PAY
------------------------------------------------------------

Cliente Honey Pay
   ↓
Subscription
   ↓
SubscriptionPayment
   ↓
BitPay
   ↓
Webhook
   ↓
Subscription ACTIVE


CAMADA 2 — PAGAMENTOS DOS COMERCIANTES
------------------------------------------------------------

Comerciante
   ↓
Invoice
   ↓
Payment
   ↓
BankAccount
   ↓
Proof
   ↓
Confirmação


IMPORTANTE
------------------------------------------------------------

Este modelo pertence SOMENTE à CAMADA 1.

NÃO representa:

✗ compra de cliente
✗ pagamento de fatura
✗ transferência bancária de comerciante
✗ comprovativo
✗ pagamento para BankAccount
✗ checkout de comerciante
✗ venda de comerciante

O BitPay NÃO participa da CAMADA 2.

============================================================
*/


import mongoose from "mongoose";


const {
    Schema
} = mongoose;


/*
============================================================
ENUMS
============================================================
*/


export const SUBSCRIPTION_PAYMENT_STATUS = {

    CREATED:
        "created",

    PENDING:
        "pending",

    PROCESSING:
        "processing",

    SUCCEEDED:
        "succeeded",

    FAILED:
        "failed",

    CANCELLED:
        "cancelled",

    EXPIRED:
        "expired"

};


/*
============================================================
PAYMENT PROVIDER
============================================================
*/

export const SUBSCRIPTION_PAYMENT_PROVIDER = {

    BITPAY:
        "bitpay"

};


/*
============================================================
PAYMENT TYPE
============================================================
*/

export const SUBSCRIPTION_PAYMENT_TYPE = {

    INITIAL:
        "initial",

    RENEWAL:
        "renewal",

    UPGRADE:
        "upgrade",

    DOWNGRADE:
        "downgrade",

    RETRY:
        "retry"

};


/*
============================================================
SCHEMA
============================================================
*/

const subscriptionPaymentSchema =
    new Schema(

        {

            /*
            ------------------------------------------------
            HONEY PAY CUSTOMER / MERCHANT OWNER
            ------------------------------------------------
            */

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


            /*
            ------------------------------------------------
            SUBSCRIPTION
            ------------------------------------------------
            */

            subscriptionId: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "Subscription",

                required:
                    true,

                index:
                    true

            },


            /*
            ------------------------------------------------
            INTERNAL PAYMENT REFERENCE
            ------------------------------------------------

            Identificador interno da Honey Pay.

            Exemplo:

            HNY-SUB-20260829-ABC123

            Esta referência não depende do ID do BitPay.

            ------------------------------------------------
            */

            reference: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true,

                trim:
                    true,

                maxlength:
                    120

            },


            /*
            ------------------------------------------------
            PLAN
            ------------------------------------------------

            Plano escolhido no momento da cobrança.

            O preço não deve ser confiado ao frontend.

            ------------------------------------------------
            */

            plan: {

                type:
                    String,

                enum: [

                    "free",
                    "pro"

                ],

                required:
                    true,

                index:
                    true

            },


            /*
            ------------------------------------------------
            PAYMENT TYPE
            ------------------------------------------------
            */

            type: {

                type:
                    String,

                enum: [

                    "initial",
                    "renewal",
                    "upgrade",
                    "downgrade",
                    "retry"

                ],

                required:
                    true,

                default:
                    "initial",

                index:
                    true

            },


            /*
            ------------------------------------------------
            AMOUNT
            ------------------------------------------------

            Valor congelado no momento da criação.

            Este valor deverá ser obtido pelo backend a partir
            da configuração oficial dos planos.

            ------------------------------------------------
            */

            amount: {

                type:
                    Number,

                required:
                    true,

                min:
                    0

            },


            /*
            ------------------------------------------------
            CURRENCY
            ------------------------------------------------
            */

            currency: {

                type:
                    String,

                required:
                    true,

                uppercase:
                    true,

                trim:
                    true,

                default:
                    "AOA",

                maxlength:
                    10

            },


            /*
            ------------------------------------------------
            BILLING PERIOD
            ------------------------------------------------
            */

            billing: {

                type:
                    String,

                enum: [

                    "lifetime",
                    "monthly"

                ],

                required:
                    true

            },


            /*
            ------------------------------------------------
            PAYMENT PROVIDER
            ------------------------------------------------
            */

            provider: {

                type:
                    String,

                enum: [

                    "bitpay"

                ],

                required:
                    true,

                default:
                    "bitpay",

                index:
                    true

            },


            /*
            ------------------------------------------------
            PAYMENT STATUS
            ------------------------------------------------
            */

            status: {

                type:
                    String,

                enum: [

                    "created",
                    "pending",
                    "processing",
                    "succeeded",
                    "failed",
                    "cancelled",
                    "expired"

                ],

                required:
                    true,

                default:
                    "created",

                index:
                    true

            },


            /*
            ------------------------------------------------
            IDEMPOTENCY KEY
            ------------------------------------------------

            Chave usada para impedir que uma mesma operação
            financeira seja criada duas vezes.

            Esta chave nunca deve ser substituída durante
            um retry.

            ------------------------------------------------
            */

            idempotencyKey: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                index:
                    true,

                trim:
                    true,

                maxlength:
                    200

            },


            /*
            ------------------------------------------------
            BITPAY DATA
            ------------------------------------------------

            Apenas referências da operação no BitPay.

            NUNCA guardar:

            ✗ BITPAY_SECRET_KEY
            ✗ webhook secret
            ✗ credenciais privadas

            ------------------------------------------------
            */

            bitpay: {

                paymentIntentId: {

                    type:
                        String,

                    trim:
                        true,

                    index:
                        true,

                    default:
                        null,

                    maxlength:
                        200

                },


                checkoutSessionId: {

                    type:
                        String,

                    trim:
                        true,

                    index:
                        true,

                    default:
                        null,

                    maxlength:
                        200

                },


                paymentLinkId: {

                    type:
                        String,

                    trim:
                        true,

                    index:
                        true,

                    default:
                        null,

                    maxlength:
                        200

                },


                mandateId: {

                    type:
                        String,

                    trim:
                        true,

                    index:
                        true,

                    default:
                        null,

                    maxlength:
                        200

                },


                status: {

                    type:
                        String,

                    trim:
                        true,

                    default:
                        null,

                    maxlength:
                        100

                },


                reference: {

                    type:
                        String,

                    trim:
                        true,

                    default:
                        null,

                    maxlength:
                        200

                }

            },


            /*
            ------------------------------------------------
            CHECKOUT
            ------------------------------------------------
            */

            checkout: {

                url: {

                    type:
                        String,

                    trim:
                        true,

                    default:
                        null,

                    maxlength:
                        2000

                },


                createdAt: {

                    type:
                        Date,

                    default:
                        null

                },


                expiresAt: {

                    type:
                        Date,

                    default:
                        null

                }

            },


            /*
            ------------------------------------------------
            PAYMENT DATES
            ------------------------------------------------
            */

            createdPaymentAt: {

                type:
                    Date,

                default:
                    Date.now

            },


            pendingAt: {

                type:
                    Date,

                default:
                    null

            },


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
            WEBHOOK
            ------------------------------------------------

            Guarda apenas dados necessários para auditoria.

            Secrets nunca são armazenados aqui.

            ------------------------------------------------
            */

            webhook: {

                lastEventId: {

                    type:
                        String,

                    trim:
                        true,

                    default:
                        null,

                    maxlength:
                        200

                },


                lastEventType: {

                    type:
                        String,

                    trim:
                        true,

                    default:
                        null,

                    maxlength:
                        150

                },


                lastReceivedAt: {

                    type:
                        Date,

                    default:
                        null

                },


                processedAt: {

                    type:
                        Date,

                    default:
                        null

                }

            },


            /*
            ------------------------------------------------
            FAILURE
            ------------------------------------------------
            */

            failure: {

                code: {

                    type:
                        String,

                    trim:
                        true,

                    default:
                        null,

                    maxlength:
                        120

                },


                message: {

                    type:
                        String,

                    trim:
                        true,

                    default:
                        null,

                    maxlength:
                        1000

                },


                occurredAt: {

                    type:
                        Date,

                    default:
                        null

                }

            },


            /*
            ------------------------------------------------
            SERVICE PERIOD
            ------------------------------------------------

            Período que o pagamento pretende conceder.

            IMPORTANTE:

            Estas datas NÃO ativam automaticamente a
            subscrição.

            A ativação depende da confirmação do pagamento.

            ------------------------------------------------
            */

            servicePeriod: {

                startsAt: {

                    type:
                        Date,

                    default:
                        null

                },


                endsAt: {

                    type:
                        Date,

                    default:
                        null

                }

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
                "subscriptionPayments"

        }

    );


/*
============================================================
INDEXES
============================================================
*/


/*
------------------------------------------------------------
MERCHANT / CUSTOMER HISTORY
------------------------------------------------------------
*/

subscriptionPaymentSchema.index(

    {

        merchantId:
            1,

        createdAt:
            -1

    }

);


/*
------------------------------------------------------------
SUBSCRIPTION HISTORY
------------------------------------------------------------
*/

subscriptionPaymentSchema.index(

    {

        subscriptionId:
            1,

        createdAt:
            -1

    }

);


/*
------------------------------------------------------------
STATUS
------------------------------------------------------------
*/

subscriptionPaymentSchema.index(

    {

        status:
            1,

        createdAt:
            -1

    }

);


/*
------------------------------------------------------------
BITPAY PAYMENT INTENT
------------------------------------------------------------
*/

subscriptionPaymentSchema.index(

    {

        "bitpay.paymentIntentId":
            1

    },

    {

        sparse:
            true

    }

);


/*
------------------------------------------------------------
BITPAY CHECKOUT SESSION
------------------------------------------------------------
*/

subscriptionPaymentSchema.index(

    {

        "bitpay.checkoutSessionId":
            1

    },

    {

        sparse:
            true

    }

);


/*
------------------------------------------------------------
BITPAY MANDATE
------------------------------------------------------------
*/

subscriptionPaymentSchema.index(

    {

        "bitpay.mandateId":
            1

    },

    {

        sparse:
            true

    }

);


/*
============================================================
INSTANCE HELPERS
============================================================
*/


/*
------------------------------------------------------------
IS FINAL
------------------------------------------------------------
*/

subscriptionPaymentSchema.methods.isFinal =
    function () {

        return [

            "succeeded",
            "failed",
            "cancelled",
            "expired"

        ].includes(

            this.status

        );

    };


/*
------------------------------------------------------------
IS SUCCESSFUL
------------------------------------------------------------
*/

subscriptionPaymentSchema.methods.isSuccessful =
    function () {

        return (

            this.status ===
            "succeeded"

        );

    };


/*
------------------------------------------------------------
IS PENDING
------------------------------------------------------------
*/

subscriptionPaymentSchema.methods.isPending =
    function () {

        return [

            "created",
            "pending",
            "processing"

        ].includes(

            this.status

        );

    };


/*
============================================================
STATIC HELPERS
============================================================
*/


/*
------------------------------------------------------------
FIND BY INTERNAL REFERENCE
------------------------------------------------------------
*/

subscriptionPaymentSchema.statics.findByReference =
    function (

        reference

    ) {

        return this.findOne({

            reference

        });

    };


/*
------------------------------------------------------------
FIND BY IDEMPOTENCY KEY
------------------------------------------------------------
*/

subscriptionPaymentSchema.statics.findByIdempotencyKey =
    function (

        idempotencyKey

    ) {

        return this.findOne({

            idempotencyKey

        });

    };


/*
------------------------------------------------------------
FIND BY BITPAY PAYMENT INTENT
------------------------------------------------------------
*/

subscriptionPaymentSchema.statics.findByBitPayPaymentIntent =
    function (

        paymentIntentId

    ) {

        return this.findOne({

            "bitpay.paymentIntentId":
                paymentIntentId

        });

    };


/*
------------------------------------------------------------
FIND BY CHECKOUT SESSION
------------------------------------------------------------
*/

subscriptionPaymentSchema.statics.findByCheckoutSession =
    function (

        checkoutSessionId

    ) {

        return this.findOne({

            "bitpay.checkoutSessionId":
                checkoutSessionId

        });

    };


/*
------------------------------------------------------------
FIND ACTIVE PAYMENT
------------------------------------------------------------

Evita múltiplos pagamentos simultâneos para a mesma
subscrição.

------------------------------------------------------------
*/

subscriptionPaymentSchema.statics.findActivePayment =
    function (

        merchantId,

        subscriptionId

    ) {

        return this.findOne({

            merchantId,

            subscriptionId,

            status: {

                $in: [

                    "created",
                    "pending",
                    "processing"

                ]

            }

        })
            .sort({

                createdAt:
                    -1

            });

    };


/*
============================================================
MODEL REGISTRATION
============================================================
*/

const SubscriptionPayment =
    mongoose.models.SubscriptionPayment ||

    mongoose.model(

        "SubscriptionPayment",

        subscriptionPaymentSchema

    );


/*
============================================================
EXPORTS
============================================================
*/

export {

    SubscriptionPayment

};


export default {

    SubscriptionPayment

};
