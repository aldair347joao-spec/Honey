/*
============================================================
HONEY PAY
MONGOOSE MODELS
V1.0.1
============================================================

MODELOS PRINCIPAIS DA PLATAFORMA

------------------------------------------------------------
MODELOS

- Merchant
- BankAccount
- Invoice
- Payment
- Receipt
- Subscription

------------------------------------------------------------
ARQUITETURA

MongoDB
   ↓
Mongoose
   ↓
Models
   ↓
Services
   ↓
API Routes

============================================================
*/

import mongoose from "mongoose";


/*
============================================================
SCHEMA HELPERS
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
                    180
            },


            passwordHash: {
                type:
                    String,

                required:
                    true,

                select:
                    false
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
                    "active"
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


/*
============================================================
BANK ACCOUNT
============================================================

Modelo definitivo utilizado pela plataforma.

Compatibilidade com o serviço:

- merchantId
- bankName
- accountName
- iban
- ibanLast4
- accountNumber
- accountType
- isActive
- isPrimary
- displayOrder

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


bankAccountSchema.index(
    {
        merchantId:
            1,

        isActive:
            1
    }
);


bankAccountSchema.index(
    {
        merchantId:
            1,

        isPrimary:
            1
    }
);


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


invoiceSchema.index(
    {
        merchantId:
            1,

        createdAt:
            -1
    }
);


invoiceSchema.index(
    {
        merchantId:
            1,

        status:
            1
    }
);


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
                    "AOA"
            },


            status: {

                type:
                    String,

                enum: [

                    "pending",

                    "confirmed",

                    "failed",

                    "refunded"
                ],

                default:
                    "pending",

                index:
                    true
            },


            method: {

                type:
                    String,

                default:
                    null
            },


            transactionReference: {

                type:
                    String,

                trim:
                    true,

                maxlength:
                    180,

                default:
                    null
            },


            paidAt: {

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
                "payments"
        }
    );


paymentSchema.index(
    {
        merchantId:
            1,

        createdAt:
            -1
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
                    null
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
MODEL REGISTRATION
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


/*
============================================================
EXPORTS
============================================================
*/

export {

    Merchant,

    BankAccount,

    Invoice,

    Payment,

    Receipt,

    Subscription

};


/*
============================================================
DEFAULT EXPORT
============================================================
*/

export default {

    Merchant,

    BankAccount,

    Invoice,

    Payment,

    Receipt,

    Subscription

};
