import mongoose from "mongoose";

/*
============================================================
HONEY PAY
DATABASE MODELS
V1.0.0
============================================================

MODELOS DA PRIMEIRA VERSÃO

------------------------------------------------------------
Merchant
------------------------------------------------------------
Representa o comerciante/dono da conta.

------------------------------------------------------------
BankAccount
------------------------------------------------------------
Permite ao comerciante cadastrar várias contas bancárias.

------------------------------------------------------------
Invoice
------------------------------------------------------------
Representa uma cobrança/fatura.

------------------------------------------------------------
Payment
------------------------------------------------------------
Representa uma tentativa/pagamento associado à cobrança.

------------------------------------------------------------
Receipt
------------------------------------------------------------
Representa o comprovativo enviado pelo cliente.

------------------------------------------------------------
Customer
------------------------------------------------------------
Representa o comprador final quando o comerciante desejar
guardar os seus dados.

------------------------------------------------------------
Subscription
------------------------------------------------------------
Representa o plano do comerciante.

============================================================
*/


/*
============================================================
HELPERS
============================================================
*/

const {
    Schema,
    model,
    models
} = mongoose;


/*
============================================================
COMMON OPTIONS
============================================================
*/

const timestamps = {
    createdAt: true,
    updatedAt: true
};


/*
============================================================
MERCHANT
============================================================
*/

const merchantSchema =
    new Schema(

        {

            name: {
                type: String,
                required: true,
                trim: true,
                minlength: 2,
                maxlength: 120
            },


            businessName: {
                type: String,
                required: true,
                trim: true,
                minlength: 2,
                maxlength: 150
            },


            slug: {
                type: String,
                required: true,
                unique: true,
                lowercase: true,
                trim: true,
                minlength: 2,
                maxlength: 100,
                index: true
            },


            email: {
                type: String,
                required: true,
                unique: true,
                lowercase: true,
                trim: true,
                index: true
            },


            passwordHash: {
                type: String,
                required: true,
                select: false
            },


            phone: {
                type: String,
                trim: true,
                maxlength: 30
            },


            whatsappNumber: {
                type: String,
                trim: true,
                maxlength: 30
            },


            whatsappConnected: {
                type: Boolean,
                default: false
            },


            logoUrl: {
                type: String,
                trim: true,
                maxlength: 1000
            },


            description: {
                type: String,
                trim: true,
                maxlength: 500
            },


            address: {
                type: String,
                trim: true,
                maxlength: 300
            },


            city: {
                type: String,
                trim: true,
                maxlength: 100
            },


            country: {
                type: String,
                default: "AO",
                trim: true,
                maxlength: 2
            },


            currency: {
                type: String,
                default: "AOA",
                enum: [
                    "AOA"
                ]
            },


            invoiceCount: {
                type: Number,
                default: 0,
                min: 0
            },


            freeInvoiceCount: {
                type: Number,
                default: 0,
                min: 0
            },


            status: {
                type: String,
                enum: [
                    "active",
                    "suspended",
                    "deleted"
                ],
                default: "active",
                index: true
            },


            emailVerified: {
                type: Boolean,
                default: false
            },


            lastLoginAt: {
                type: Date,
                default: null
            }
        },

        timestamps
    );


/*
============================================================
BANK ACCOUNT
============================================================

Um comerciante pode possuir várias contas.

Exemplos:

Banco A
Banco B
Banco C

O checkout permitirá ao comprador escolher qual conta
utilizar para efetuar o pagamento.
============================================================
*/

const bankAccountSchema =
    new Schema(

        {

            merchantId: {
                type: Schema.Types.ObjectId,
                ref: "Merchant",
                required: true,
                index: true
            },


            bankName: {
                type: String,
                required: true,
                trim: true,
                maxlength: 120
            },


            accountName: {
                type: String,
                required: true,
                trim: true,
                maxlength: 150
            },


            iban: {
                type: String,
                required: true,
                trim: true,
                select: false
            },


            ibanLast4: {
                type: String,
                required: true,
                trim: true,
                maxlength: 4
            },


            accountNumber: {
                type: String,
                trim: true,
                select: false,
                maxlength: 100
            },


            accountType: {
                type: String,
                enum: [
                    "bank",
                    "mobile_money",
                    "other"
                ],
                default: "bank"
            },


            isActive: {
                type: Boolean,
                default: true,
                index: true
            },


            displayOrder: {
                type: Number,
                default: 0
            }
        },

        timestamps
    );


bankAccountSchema.index({
    merchantId: 1,
    isActive: 1,
    displayOrder: 1
});


/*
============================================================
INVOICE
============================================================

Uma cobrança criada pelo comerciante.

O link público será baseado no publicId.

Exemplo:

/pay/HNY-7F4K2P

Não utilizamos o ObjectId diretamente no link público.
============================================================
*/

const invoiceSchema =
    new Schema(

        {

            merchantId: {
                type: Schema.Types.ObjectId,
                ref: "Merchant",
                required: true,
                index: true
            },


            publicId: {
                type: String,
                required: true,
                unique: true,
                trim: true,
                index: true
            },


            invoiceNumber: {
                type: String,
                required: true,
                trim: true,
                maxlength: 80
            },


            customerId: {
                type: Schema.Types.ObjectId,
                ref: "Customer",
                default: null,
                index: true
            },


            customerName: {
                type: String,
                trim: true,
                maxlength: 150
            },


            customerPhone: {
                type: String,
                trim: true,
                maxlength: 30
            },


            customerEmail: {
                type: String,
                trim: true,
                maxlength: 200
            },


            description: {
                type: String,
                required: true,
                trim: true,
                maxlength: 500
            },


            amount: {
                type: Number,
                required: true,
                min: 1
            },


            currency: {
                type: String,
                default: "AOA",
                enum: [
                    "AOA"
                ]
            },


            selectedBankAccountId: {
                type: Schema.Types.ObjectId,
                ref: "BankAccount",
                default: null
            },


            paymentMethod: {
                type: String,
                enum: [
                    "bank_transfer",
                    "cash",
                    "other"
                ],
                default: "bank_transfer"
            },


            status: {
                type: String,
                enum: [
                    "draft",
                    "pending",
                    "receipt_submitted",
                    "under_review",
                    "paid",
                    "rejected",
                    "expired",
                    "cancelled"
                ],
                default: "pending",
                index: true
            },


            expiresAt: {
                type: Date,
                default: null,
                index: true
            },


            paidAt: {
                type: Date,
                default: null
            },


            cancelledAt: {
                type: Date,
                default: null
            },


            metadata: {
                type: Schema.Types.Mixed,
                default: {}
            }
        },

        timestamps
    );


invoiceSchema.index({
    merchantId: 1,
    createdAt: -1
});


invoiceSchema.index({
    merchantId: 1,
    status: 1,
    createdAt: -1
});


/*
============================================================
CUSTOMER
============================================================
*/

const customerSchema =
    new Schema(

        {

            merchantId: {
                type: Schema.Types.ObjectId,
                ref: "Merchant",
                required: true,
                index: true
            },


            name: {
                type: String,
                required: true,
                trim: true,
                maxlength: 150
            },


            phone: {
                type: String,
                trim: true,
                maxlength: 30
            },


            email: {
                type: String,
                trim: true,
                maxlength: 200
            }
        },

        timestamps
    );


customerSchema.index({
    merchantId: 1,
    phone: 1
});


/*
============================================================
PAYMENT
============================================================

Representa a tentativa de pagamento.

IMPORTANTE:

A criação deste documento NÃO significa que o dinheiro
foi confirmado.

A confirmação somente ocorrerá depois do processo de
verificação definido pelo Honey Shield.
============================================================
*/

const paymentSchema =
    new Schema(

        {

            merchantId: {
                type: Schema.Types.ObjectId,
                ref: "Merchant",
                required: true,
                index: true
            },


            invoiceId: {
                type: Schema.Types.ObjectId,
                ref: "Invoice",
                required: true,
                index: true
            },


            bankAccountId: {
                type: Schema.Types.ObjectId,
                ref: "BankAccount",
                default: null
            },


            amount: {
                type: Number,
                required: true,
                min: 1
            },


            currency: {
                type: String,
                default: "AOA",
                enum: [
                    "AOA"
                ]
            },


            status: {
                type: String,
                enum: [
                    "submitted",
                    "processing",
                    "confirmed",
                    "rejected",
                    "cancelled"
                ],
                default: "submitted",
                index: true
            },


            submittedAt: {
                type: Date,
                default: Date.now
            },


            confirmedAt: {
                type: Date,
                default: null
            },


            rejectedAt: {
                type: Date,
                default: null
            },


            rejectionReason: {
                type: String,
                trim: true,
                maxlength: 500
            }
        },

        timestamps
    );


paymentSchema.index({
    merchantId: 1,
    createdAt: -1
});


paymentSchema.index({
    invoiceId: 1,
    createdAt: -1
});


/*
============================================================
RECEIPT
============================================================

Comprovativo enviado pelo comprador.

O sistema guarda um hash criptográfico do arquivo.

Esse hash será fundamental para detectar:

- mesmo arquivo enviado novamente
- reutilização de comprovativo
- tentativa de fraude
============================================================
*/

const receiptSchema =
    new Schema(

        {

            merchantId: {
                type: Schema.Types.ObjectId,
                ref: "Merchant",
                required: true,
                index: true
            },


            invoiceId: {
                type: Schema.Types.ObjectId,
                ref: "Invoice",
                required: true,
                index: true
            },


            paymentId: {
                type: Schema.Types.ObjectId,
                ref: "Payment",
                default: null,
                index: true
            },


            originalFileName: {
                type: String,
                trim: true,
                maxlength: 255
            },


            mimeType: {
                type: String,
                required: true,
                trim: true,
                maxlength: 100
            },


            fileSize: {
                type: Number,
                required: true,
                min: 1
            },


            storagePath: {
                type: String,
                required: true,
                trim: true,
                maxlength: 1000,
                select: false
            },


            fileHash: {
                type: String,
                required: true,
                trim: true,
                lowercase: true,
                index: true
            },


            status: {
                type: String,
                enum: [
                    "uploaded",
                    "processing",
                    "accepted",
                    "rejected",
                    "duplicate",
                    "fraud_suspected"
                ],
                default: "uploaded",
                index: true
            },


            verificationScore: {
                type: Number,
                min: 0,
                max: 100,
                default: null
            },


            verificationNotes: {
                type: String,
                trim: true,
                maxlength: 2000
            },


            submittedIpHash: {
                type: String,
                trim: true,
                maxlength: 128,
                select: false
            },


            verifiedAt: {
                type: Date,
                default: null
            }
        },

        timestamps
    );


/*
------------------------------------------------------------
O mesmo hash não pode ser aceite repetidamente.

O índice permite encontrar rapidamente um comprovativo
já conhecido.
------------------------------------------------------------
*/

receiptSchema.index({
    merchantId: 1,
    fileHash: 1
});


receiptSchema.index({
    fileHash: 1
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
                type: Schema.Types.ObjectId,
                ref: "Merchant",
                required: true,
                unique: true,
                index: true
            },


            plan: {
                type: String,
                enum: [
                    "free",
                    "pro"
                ],
                default: "free",
                index: true
            },


            status: {
                type: String,
                enum: [
                    "active",
                    "past_due",
                    "cancelled",
                    "expired"
                ],
                default: "active",
                index: true
            },


            monthlyPriceKz: {
                type: Number,
                default: 0,
                min: 0
            },


            currentPeriodStart: {
                type: Date,
                default: null
            },


            currentPeriodEnd: {
                type: Date,
                default: null
            },


            autoRenew: {
                type: Boolean,
                default: true
            },


            activatedAt: {
                type: Date,
                default: null
            },


            cancelledAt: {
                type: Date,
                default: null
            }
        },

        timestamps
    );


/*
============================================================
EXPORT MODELS
============================================================

Utilizamos models existentes quando o processo for
recarregado, evitando o erro:

OverwriteModelError
============================================================
*/

export const Merchant =
    models.Merchant ||
    model(
        "Merchant",
        merchantSchema
    );


export const BankAccount =
    models.BankAccount ||
    model(
        "BankAccount",
        bankAccountSchema
    );


export const Customer =
    models.Customer ||
    model(
        "Customer",
        customerSchema
    );


export const Invoice =
    models.Invoice ||
    model(
        "Invoice",
        invoiceSchema
    );


export const Payment =
    models.Payment ||
    model(
        "Payment",
        paymentSchema
    );


export const Receipt =
    models.Receipt ||
    model(
        "Receipt",
        receiptSchema
    );


export const Subscription =
    models.Subscription ||
    model(
        "Subscription",
        subscriptionSchema
    );


/*
============================================================
DEFAULT EXPORT
============================================================
*/

export default {

    Merchant,

    BankAccount,

    Customer,

    Invoice,

    Payment,

    Receipt,

    Subscription
};
