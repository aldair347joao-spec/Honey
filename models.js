import mongoose from "mongoose";


/*
============================================================
HONEY PAY
MONGOOSE MODELS
V2.0.0
============================================================

AUTENTICAÇÃO:
Google Account ONLY.

Não existe password obrigatória.

============================================================
*/

const {
    Schema
} = mongoose;


/*
============================================================
MERCHANT
============================================================
*/

const merchantSchema =
    new Schema(

        {

            /*
            ------------------------------------------------
            IDENTIDADE
            ------------------------------------------------
            */

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


            email: {

                type:
                    String,

                required:
                    true,

                unique:
                    true,

                lowercase:
                    true,

                trim:
                    true,

                maxlength:
                    180,

                index:
                    true

            },


            /*
            ------------------------------------------------
            GOOGLE IDENTITY
            ------------------------------------------------

            O sub de Google é o identificador estável
            da conta Google.

            ------------------------------------------------
            */

            googleId: {

                type:
                    String,

                unique:
                    true,

                sparse:
                    true,

                index:
                    true,

                trim:
                    true,

                maxlength:
                    255

            },


            googleEmail: {

                type:
                    String,

                lowercase:
                    true,

                trim:
                    true,

                maxlength:
                    180,

                default:
                    null

            },


            googlePicture: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    1000,

                default:
                    null

            },


            googleEmailVerified: {

                type:
                    Boolean,

                default:
                    false

            },


            /*
            ------------------------------------------------
            LEGACY PASSWORD
            ------------------------------------------------

            Mantido apenas para compatibilidade com dados
            antigos.

            NÃO é utilizado pelo novo login.

            ------------------------------------------------
            */

            passwordHash: {

                type:
                    String,

                select:
                    false,

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

            },


            businessName: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    180,

                default:
                    null

            },


            accountStatus: {

                type:
                    String,

                enum: [

                    "active",

                    "suspended",

                    "blocked",

                    "pending"

                ],

                default:
                    "active",

                index:
                    true

            },


            role: {

                type:
                    String,

                enum: [

                    "merchant",

                    "admin"

                ],

                default:
                    "merchant"

            },


            /*
            ------------------------------------------------
            SUBSCRIPTION CACHE
            ------------------------------------------------
            */

            subscription: {

                plan: {

                    type:
                        String,

                    enum: [

                        "free",

                        "pro",

                        "business"

                    ],

                    default:
                        "free"

                },


                status: {

                    type:
                        String,

                    enum: [

                        "active",

                        "inactive",

                        "past_due",

                        "cancelled",

                        "trial"

                    ],

                    default:
                        "active"

                },


                startedAt: {

                    type:
                        Date,

                    default:
                        Date.now

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
            LOGIN
            ------------------------------------------------
            */

            lastLoginAt: {

                type:
                    Date,

                default:
                    null

            },


            lastLoginIp: {

                type:
                    String,

                default:
                    null,

                maxlength:
                    120

            },


            lastLoginProvider: {

                type:
                    String,

                enum: [

                    "google",

                    null

                ],

                default:
                    null

            }

        },

        {

            timestamps:
                true,

            collection:
                "merchants"

        }

    );


merchantSchema.index(

    {

        email:
            1

    },

    {

        unique:
            true

    }

);


merchantSchema.index(

    {

        googleId:
            1

    },

    {

        unique:
            true,

        sparse:
            true

    }

);


/*
============================================================
BANK ACCOUNT
============================================================
*/

const bankAccountSchema =
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


            bankName: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    160

            },


            accountName: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    160

            },


            iban: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                uppercase:
                    true,

                maxlength:
                    80

            },


            ibanLast4: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    4,

                default:
                    null

            },


            accountNumber: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    80,

                default:
                    null

            },


            accountType: {

                type:
                    String,

                enum: [

                    "bank",

                    "iban",

                    "current",

                    "savings",

                    "business"

                ],

                default:
                    "bank"

            },


            currency: {

                type:
                    String,

                uppercase:
                    true,

                trim:
                    true,

                default:
                    "AOA",

                maxlength:
                    10

            },


            isActive: {

                type:
                    Boolean,

                default:
                    true,

                index:
                    true

            },


            isPrimary: {

                type:
                    Boolean,

                default:
                    false,

                index:
                    true

            },


            displayOrder: {

                type:
                    Number,

                default:
                    0,

                min:
                    0

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
                "bankAccounts"

        }

    );


bankAccountSchema.index({

    merchantId:
        1,

    isActive:
        1

});


bankAccountSchema.index({

    merchantId:
        1,

    isPrimary:
        1

});


/*
============================================================
INVOICE
============================================================
*/

const invoiceSchema =
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


            invoiceNumber: {

                type:
                    String,

                required:
                    true,

                trim:
                    true,

                maxlength:
                    80

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


            publicToken: {

                type:
                    String,

                unique:
                    true,

                sparse:
                    true,

                index:
                    true,

                trim:
                    true

            },


            customerName: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    180,

                default:
                    null

            },


            customerEmail: {

                type:
                    String,

                lowercase:
                    true,

                trim:
                    true,

                maxlength:
                    180,

                default:
                    null

            },


            customerPhone: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    40,

                default:
                    null

            },


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


            amount: {

                type:
                    Number,

                required:
                    true,

                min:
                    0

            },


            currency: {

                type:
                    String,

                uppercase:
                    true,

                default:
                    "AOA",

                maxlength:
                    10

            },


            status: {

                type:
                    String,

                enum: [

                    "draft",

                    "pending",

                    "payment_submitted",

                    "paid",

                    "expired",

                    "cancelled",

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

                trim:
                    true,

                default:
                    null

            },


            bankAccountId: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "BankAccount",

                default:
                    null

            },


            expiresAt: {

                type:
                    Date,

                default:
                    null,

                index:
                    true

            },


            expiredAt: {

                type:
                    Date,

                default:
                    null

            },


            paidAt: {

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


            payment: {

                paymentId: {

                    type:
                        Schema.Types.ObjectId,

                    ref:
                        "Payment",

                    default:
                        null

                },


                method: {

                    type:
                        String,

                    default:
                        null

                },


                bankAccountId: {

                    type:
                        Schema.Types.ObjectId,

                    ref:
                        "BankAccount",

                    default:
                        null

                },


                submittedAt: {

                    type:
                        Date,

                    default:
                        null

                },


                confirmedAt: {

                    type:
                        Date,

                    default:
                        null

                }

            },


            receipt: {

                status: {

                    type:
                        String,

                    enum: [

                        "none",

                        "submitted",

                        "verified",

                        "rejected"

                    ],

                    default:
                        "none"

                },


                fileId: {

                    type:
                        Schema.Types.ObjectId,

                    default:
                        null

                },


                originalName: {

                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        255,

                    default:
                        null

                },


                mimeType: {

                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        120,

                    default:
                        null

                },


                size: {

                    type:
                        Number,

                    min:
                        0,

                    default:
                        null

                },


                sha256: {

                    type:
                        String,

                    lowercase:
                        true,

                    trim:
                        true,

                    maxlength:
                        64,

                    default:
                        null

                },


                submittedAt: {

                    type:
                        Date,

                    default:
                        null

                }

            },


            fraudProtection: {

                verificationStatus: {

                    type:
                        String,

                    enum: [

                        "pending",

                        "verified",

                        "rejected"

                    ],

                    default:
                        "pending"

                },


                duplicateDetected: {

                    type:
                        Boolean,

                    default:
                        false

                },


                riskScore: {

                    type:
                        Number,

                    min:
                        0,

                    max:
                        100,

                    default:
                        0

                },


                verificationAttempts: {

                    type:
                        Number,

                    min:
                        0,

                    default:
                        0

                }

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
                "invoices"

        }

    );


invoiceSchema.index({

    merchantId:
        1,

    createdAt:
        -1

});


invoiceSchema.index({

    merchantId:
        1,

    status:
        1

});


invoiceSchema.index({

    "receipt.sha256":
        1

});


/*
============================================================
PAYMENT
============================================================
*/

const paymentSchema =
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


            invoiceId: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "Invoice",

                required:
                    true,

                index:
                    true

            },


            bankAccountId: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "BankAccount",

                required:
                    true,

                index:
                    true

            },


            amount: {

                type:
                    Number,

                required:
                    true,

                min:
                    0

            },


            currency: {

                type:
                    String,

                uppercase:
                    true,

                trim:
                    true,

                default:
                    "AOA",

                maxlength:
                    10

            },


            status: {

                type:
                    String,

                enum: [

                    "pending_review",

                    "confirmed",

                    "rejected"

                ],

                default:
                    "pending_review",

                index:
                    true

            },


            method: {

                type:
                    String,

                trim:
                    true,

                default:
                    "bank_transfer"

            },


            payer: {

                name: {

                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        180,

                    default:
                        ""

                },


                phone: {

                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        40,

                    default:
                        ""

                },


                reference: {

                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        180,

                    default:
                        ""

                }

            },


            receipt: {

                originalName: {

                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        255,

                    default:
                        "receipt"

                },


                mimeType: {

                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        120,

                    default:
                        null

                },


                size: {

                    type:
                        Number,

                    min:
                        0,

                    default:
                        0

                },


                sha256: {

                    type:
                        String,

                    lowercase:
                        true,

                    trim:
                        true,

                    maxlength:
                        64,

                    default:
                        null

                },


                storagePath: {

                    type:
                        String,

                    trim:
                        true,

                    maxlength:
                        1000,

                    default:
                        null

                },


                uploadedAt: {

                    type:
                        Date,

                    default:
                        null

                }

            },


            verification: {

                status: {

                    type:
                        String,

                    enum: [

                        "pending",

                        "confirmed",

                        "rejected"

                    ],

                    default:
                        "pending"

                },


                duplicateDetected: {

                    type:
                        Boolean,

                    default:
                        false

                },


                riskScore: {

                    type:
                        Number,

                    min:
                        0,

                    max:
                        100,

                    default:
                        0

                },


                notes: {

                    type:
                        [
                            String
                        ],

                    default:
                        []

                }

            },


            submittedAt: {

                type:
                    Date,

                default:
                    Date.now,

                index:
                    true

            },


            confirmedAt: {

                type:
                    Date,

                default:
                    null

            },


            confirmedBy: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "Merchant",

                default:
                    null

            },


            rejectedAt: {

                type:
                    Date,

                default:
                    null

            },


            rejectionReason: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    1000,

                default:
                    null

            },


            ip: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    120,

                default:
                    null

            },


            userAgent: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    1000,

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
                "payments"

        }

    );


paymentSchema.index({

    merchantId:
        1,

    createdAt:
        -1

});


paymentSchema.index({

    merchantId:
        1,

    status:
        1

});


paymentSchema.index({

    invoiceId:
        1,

    status:
        1

});


paymentSchema.index(

    {

        merchantId:
            1,

        "receipt.sha256":
            1

    },

    {

        unique:
            true,

        partialFilterExpression: {

            "receipt.sha256":
                {
                    $type:
                        "string"
                }

        }

    }

);


/*
============================================================
RECEIPT
============================================================
*/

const receiptSchema =
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


            invoiceId: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "Invoice",

                required:
                    true,

                index:
                    true

            },


            paymentId: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "Payment",

                default:
                    null,

                index:
                    true

            },


            receiptNumber: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    100,

                default:
                    null

            },


            fileId: {

                type:
                    Schema.Types.ObjectId,

                default:
                    null

            },


            fileName: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    255,

                default:
                    null

            },


            mimeType: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    120,

                default:
                    null

            },


            sha256: {

                type:
                    String,

                lowercase:
                    true,

                trim:
                    true,

                maxlength:
                    64,

                default:
                    null

            },


            size: {

                type:
                    Number,

                min:
                    0,

                default:
                    null

            },


            storagePath: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    1000,

                default:
                    null

            },


            status: {

                type:
                    String,

                enum: [

                    "pending",

                    "approved",

                    "rejected"

                ],

                default:
                    "pending",

                index:
                    true

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
                "receipts"

        }

    );


receiptSchema.index({

    merchantId:
        1,

    createdAt:
        -1

});


/*
============================================================
SUBSCRIPTION
============================================================
*/

const subscriptionSchema =
    new Schema(

        {

            merchantId: {

                type:
                    Schema.Types.ObjectId,

                ref:
                    "Merchant",

                required:
                    true,

                unique:
                    true,

                index:
                    true

            },


            plan: {

                type:
                    String,

                enum: [

                    "free",

                    "pro",

                    "business"

                ],

                default:
                    "free"

            },


            status: {

                type:
                    String,

                enum: [

                    "active",

                    "inactive",

                    "past_due",

                    "cancelled",

                    "trial"

                ],

                default:
                    "active"

            },


            startedAt: {

                type:
                    Date,

                default:
                    Date.now

            },


            expiresAt: {

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
                "subscriptions"

        }

    );


/*
============================================================
MODELS
============================================================
*/

const Merchant =
    mongoose.models.Merchant ||
    mongoose.model(
        "Merchant",
        merchantSchema
    );


const BankAccount =
    mongoose.models.BankAccount ||
    mongoose.model(
        "BankAccount",
        bankAccountSchema
    );


const Invoice =
    mongoose.models.Invoice ||
    mongoose.model(
        "Invoice",
        invoiceSchema
    );


const Payment =
    mongoose.models.Payment ||
    mongoose.model(
        "Payment",
        paymentSchema
    );


const Receipt =
    mongoose.models.Receipt ||
    mongoose.model(
        "Receipt",
        receiptSchema
    );


const Subscription =
    mongoose.models.Subscription ||
    mongoose.model(
        "Subscription",
        subscriptionSchema
    );


export {

    Merchant,

    BankAccount,

    Invoice,

    Payment,

    Receipt,

    Subscription

};


export default {

    Merchant,

    BankAccount,

    Invoice,

    Payment,

    Receipt,

    Subscription

};
