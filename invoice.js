/*
============================================================
HONEY PAY
INVOICE SERVICE
V1.0.0
============================================================

MÓDULO REAL DE FATURAS / COBRANÇAS

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Criar faturas
- Controlar limite FREE
- Permitir faturas ilimitadas PRO
- Gerar número único
- Gerar identificador público
- Associar conta bancária
- Criar checkout público
- Consultar faturas
- Cancelar faturas
- Atualizar contador do comerciante
- Evitar criação duplicada
- Preparar estrutura para QR Code
- Preparar estrutura para Honey Shield

------------------------------------------------------------
REGRA FREE
------------------------------------------------------------

1ª até 10ª fatura:
PERMITIDO

11ª fatura:
BLOQUEADA

------------------------------------------------------------
REGRA PRO
------------------------------------------------------------

Faturas ilimitadas.

============================================================
*/

import crypto from "node:crypto";

import {
    Merchant,
    Invoice,
    BankAccount
} from "./models.js";


import {
    validateInvoiceInput,
    validateObjectId
} from "./validators.js";


import {
    sanitizeInvoiceInput
} from "./validators.js";


import {
    canCreateInvoice,
    getEffectivePlan,
    PLAN_FREE,
    PLAN_PRO,
    FREE_INVOICE_LIMIT
} from "./plans.js";


import {
    buildCheckoutPath,
    buildAbsoluteUrl,
    publicInvoice
} from "./utils.js";


import {
    logSecurityEvent
} from "./logger.js";


/*
============================================================
CONSTANTES
============================================================
*/

const INVOICE_PREFIX =
    "HP";


const DEFAULT_CURRENCY =
    "AOA";


const DEFAULT_EXPIRATION_HOURS =
    24;


/*
============================================================
INVOICE PUBLIC ID
============================================================

Identificador que pode aparecer no link público.

Não usamos diretamente o _id do MongoDB no checkout.
============================================================
*/

function generatePublicId() {

    return (

        INVOICE_PREFIX +

        "-" +

        crypto
            .randomBytes(
                10
            )
            .toString(
                "hex"
            )
            .toUpperCase()
    );
}


/*
============================================================
INVOICE NUMBER
============================================================
*/

function generateInvoiceNumber() {

    const timestamp =
        Date.now()
            .toString(
                36
            )
            .toUpperCase();


    const random =
        crypto
            .randomBytes(
                3
            )
            .toString(
                "hex"
            )
            .toUpperCase();


    return (

        INVOICE_PREFIX +

        "-" +

        timestamp +

        "-" +

        random
    );
}


/*
============================================================
EXPIRATION
============================================================
*/

function getDefaultExpirationDate() {

    const date =
        new Date();


    date.setHours(

        date.getHours() +

        DEFAULT_EXPIRATION_HOURS
    );


    return date;
}


/*
============================================================
NORMALIZE CUSTOMER
============================================================
*/

function normalizeCustomer(
    data
) {

    return {

        name:
            data.customerName ||
            "",

        phone:
            data.customerPhone ||
            "",

        email:
            data.customerEmail ||
            ""
    };
}


/*
============================================================
GET BANK ACCOUNT
============================================================
*/

async function getSelectedBankAccount(
    merchantId,
    bankAccountId
) {

    if (
        !bankAccountId
    ) {

        return null;
    }


    const idError =
        validateObjectId(
            bankAccountId,
            "bankAccountId"
        );


    if (
        idError
    ) {

        const error =
            new Error(
                idError.message
            );


        error.code =
            "INVALID_BANK_ACCOUNT_ID";


        error.statusCode =
            400;


        throw error;
    }


    const account =
        await BankAccount
            .findOne({

                _id:
                    bankAccountId,

                merchantId,

                isActive:
                    true
            })
            .lean();


    if (
        !account
    ) {

        const error =
            new Error(
                "A conta bancária selecionada não existe ou está inativa."
            );


        error.code =
            "BANK_ACCOUNT_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    return account;
}


/*
============================================================
GET DEFAULT BANK ACCOUNT
============================================================
*/

async function getDefaultBankAccount(
    merchantId
) {

    /*
    --------------------------------------------------------
    Primeiro tentamos uma conta marcada como default.
    --------------------------------------------------------
    */

    const defaultAccount =
        await BankAccount
            .findOne({

                merchantId,

                isActive:
                    true,

                isDefault:
                    true
            })
            .sort({
                displayOrder:
                    1
            })
            .lean();


    if (
        defaultAccount
    ) {

        return defaultAccount;
    }


    /*
    --------------------------------------------------------
    Caso não exista, usamos a primeira conta ativa.
    --------------------------------------------------------
    */

    return BankAccount
        .findOne({

            merchantId,

            isActive:
                true
        })
        .sort({
            displayOrder:
                1,

            createdAt:
                1
        })
        .lean();
}


/*
============================================================
REQUIRE BANK ACCOUNT
============================================================
*/

async function resolveBankAccount(
    merchantId,
    bankAccountId
) {

    if (
        bankAccountId
    ) {

        return getSelectedBankAccount(
            merchantId,
            bankAccountId
        );
    }


    return getDefaultBankAccount(
        merchantId
    );
}


/*
============================================================
CREATE INVOICE
============================================================
*/

export async function createInvoice(
    merchantId,
    input,
    options = {}
) {

    /*
    --------------------------------------------------------
    Validar merchant ID.
    --------------------------------------------------------
    */

    const merchantIdError =
        validateObjectId(
            merchantId,
            "merchantId"
        );


    if (
        merchantIdError
    ) {

        const error =
            new Error(
                merchantIdError.message
            );


        error.code =
            "INVALID_MERCHANT_ID";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Validar input.
    --------------------------------------------------------
    */

    const validationErrors =
        validateInvoiceInput(
            input
        );


    if (
        validationErrors.length
    ) {

        const error =
            new Error(
                "Dados da fatura inválidos."
            );


        error.code =
            "VALIDATION_ERROR";


        error.statusCode =
            400;


        error.details =
            validationErrors;


        throw error;
    }


    /*
    --------------------------------------------------------
    Sanitizar.
    --------------------------------------------------------
    */

    const data =
        sanitizeInvoiceInput(
            input
        );


    /*
    --------------------------------------------------------
    Verificar capacidade do plano.

    Esta verificação acontece ANTES de criar a fatura.
    --------------------------------------------------------
    */

    const capacity =
        await canCreateInvoice(
            merchantId
        );


    if (
        !capacity.allowed
    ) {

        const error =
            new Error(
                "O limite de 10 faturas gratuitas foi atingido."
            );


        error.code =
            capacity.reason ||
            "INVOICE_LIMIT_REACHED";


        error.statusCode =
            402;


        error.upgrade = {

            requiredPlan:
                PLAN_PRO,

            priceKz:
                7500
        };


        throw error;
    }


    /*
    --------------------------------------------------------
    Obter comerciante.
    --------------------------------------------------------
    */

    const merchant =
        await Merchant
            .findById(
                merchantId
            );


    if (
        !merchant
    ) {

        const error =
            new Error(
                "Comerciante não encontrado."
            );


        error.code =
            "MERCHANT_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    if (
        merchant.status !==
        "active"
    ) {

        const error =
            new Error(
                "A conta do comerciante não está ativa."
            );


        error.code =
            "MERCHANT_INACTIVE";


        error.statusCode =
            403;


        throw error;
    }


    /*
    --------------------------------------------------------
    Resolver conta bancária.

    O comerciante pode ter várias contas.
    --------------------------------------------------------
    */

    const bankAccount =
        await resolveBankAccount(

            merchantId,

            input.bankAccountId
        );


    if (
        !bankAccount
    ) {

        const error =
            new Error(
                "Adicione pelo menos uma conta bancária antes de criar uma cobrança."
            );


        error.code =
            "BANK_ACCOUNT_REQUIRED";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Plano atual.
    --------------------------------------------------------
    */

    const plan =
        await getEffectivePlan(
            merchantId
        );


    /*
    --------------------------------------------------------
    Criar IDs.

    O loop permite tentar novamente se houver uma colisão
    extremamente improvável.
    --------------------------------------------------------
    */

    let invoice = null;


    for (
        let attempt = 0;
        attempt < 5;
        attempt++
    ) {

        const publicId =
            generatePublicId();


        const invoiceNumber =
            generateInvoiceNumber();


        try {

            invoice =
                await Invoice.create({

                    merchantId:

                        merchant._id,


                    bankAccountId:

                        bankAccount._id,


                    publicId,


                    invoiceNumber,


                    description:

                        data.description,


                    amount:

                        data.amount,


                    currency:

                        DEFAULT_CURRENCY,


                    customer:

                        normalizeCustomer(
                            data
                        ),


                    status:

                        "pending",


                    expiresAt:

                        options.expiresAt
                            ? new Date(
                                options.expiresAt
                            )
                            : getDefaultExpirationDate(),


                    payment:

                        {

                            method:
                                "bank_transfer",

                            bankAccountId:
                                bankAccount._id,

                            submittedAt:
                                null,

                            confirmedAt:
                                null
                        },


                    receipt:

                        {

                            status:
                                "not_submitted",

                            fileId:
                                null,

                            originalName:
                                null,

                            mimeType:
                                null,

                            size:
                                null,

                            sha256:
                                null,

                            submittedAt:
                                null
                        },


                    fraudProtection:

                        {

                            verificationStatus:
                                "not_checked",

                            duplicateDetected:
                                false,

                            riskScore:
                                0,

                            verificationAttempts:
                                0
                        },


                    qrCode:

                        {

                            enabled:
                                true,

                            generated:
                                false,

                            data:
                                null,

                            imageUrl:
                                null
                        },


                    metadata:

                        {

                            planAtCreation:
                                plan,

                            createdFrom:
                                options.source ||
                                "dashboard"
                        }
                });


            break;

        }

        catch (error) {

            /*
            ------------------------------------------------
            Colisão de publicId ou invoiceNumber.
            ------------------------------------------------
            */

            if (
                error?.code ===
                11000
            ) {

                invoice =
                    null;

                continue;
            }


            throw error;
        }
    }


    if (
        !invoice
    ) {

        const error =
            new Error(
                "Não foi possível gerar um identificador único para a fatura."
            );


        error.code =
            "INVOICE_ID_GENERATION_FAILED";


        error.statusCode =
            500;


        throw error;
    }


    /*
    ========================================================
    INCREMENTAR CONTADOR
    ========================================================

    A atualização usa condição para evitar que duas requests
    concorrentes ultrapassem o limite FREE.

    PRO não possui limite.
    ========================================================
    */

    if (
        plan ===
        PLAN_FREE
    ) {

        const updatedMerchant =
            await Merchant.findOneAndUpdate(

                {

                    _id:
                        merchant._id,

                    status:
                        "active",

                    invoiceCount:
                        {
                            $lt:
                                FREE_INVOICE_LIMIT
                        }
                },

                {

                    $inc:
                        {

                            invoiceCount:
                                1,

                            freeInvoiceCount:
                                1
                        }
                },

                {

                    new:
                        true
                }
            );


        /*
        ----------------------------------------------------
        Se não conseguiu incrementar, a fatura foi criada
        mas o limite foi atingido por uma request concorrente.

        Apagamos a fatura para manter consistência.
        ----------------------------------------------------
        */

        if (
            !updatedMerchant
        ) {

            await Invoice.deleteOne({

                _id:
                    invoice._id
            });


            const error =
                new Error(
                    "O limite de 10 faturas gratuitas foi atingido."
                );


            error.code =
                "FREE_INVOICE_LIMIT_REACHED";


            error.statusCode =
                402;


            error.upgrade = {

                requiredPlan:
                    PLAN_PRO,

                priceKz:
                    7500
            };


            throw error;
        }

    }

    else {

        /*
        ----------------------------------------------------
        PRO:
        contador apenas para estatísticas.
        ----------------------------------------------------
        */

        await Merchant.updateOne(

            {
                _id:
                    merchant._id
            },

            {
                $inc:
                    {
                        invoiceCount:
                            1
                    }
            }
        );
    }


    /*
    --------------------------------------------------------
    Construir URL de checkout.

    A URL absoluta depende de options.baseUrl.
    --------------------------------------------------------
    */

    const checkoutPath =
        buildCheckoutPath(
            invoice.publicId
        );


    const checkoutUrl =
        options.baseUrl
            ? buildAbsoluteUrl(
                options.baseUrl,
                checkoutPath
            )
            : checkoutPath;


    /*
    --------------------------------------------------------
    Atualizar URL no documento caso o schema possua o campo.
    --------------------------------------------------------
    */

    invoice.checkoutPath =
        checkoutPath;


    invoice.checkoutUrl =
        checkoutUrl;


    await invoice.save();


    logSecurityEvent(
        "invoice_created",
        {

            merchantId:
                merchant._id.toString(),

            invoiceId:
                invoice._id.toString(),

            plan,

            amount:
                invoice.amount
        }
    );


    return {

        invoice:
            publicInvoice(
                invoice
            ),

        checkout: {

            path:
                checkoutPath,

            url:
                checkoutUrl
        },

        bankAccount: {

            id:
                bankAccount._id.toString(),

            bankName:
                bankAccount.bankName,

            accountName:
                bankAccount.accountName,

            iban:
                bankAccount.iban,

            accountType:
                bankAccount.accountType
        },

        qrCode: {

            enabled:
                true,

            generated:
                false
        },

        plan: {

            id:
                plan,

            freeInvoicesRemaining:
                plan ===
                PLAN_FREE
                    ? Math.max(
                        0,
                        FREE_INVOICE_LIMIT -
                        Number(
                            merchant.invoiceCount || 0
                        ) -
                        1
                    )
                    : null
        }
    };
}


/*
============================================================
GET PUBLIC INVOICE
============================================================

Usado pelo checkout.

IMPORTANTE:

Não devolvemos dados internos do comerciante nem detalhes
desnecessários.
============================================================
*/

export async function getPublicInvoice(
    publicId
) {

    if (
        typeof publicId !==
        "string" ||
        publicId.length <
        5
    ) {

        const error =
            new Error(
                "Fatura não encontrada."
            );


        error.code =
            "INVOICE_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    const invoice =
        await Invoice
            .findOne({
                publicId:
                    publicId
                        .trim()
                        .toUpperCase()
            })
            .populate({

                path:
                    "merchantId",

                select:
                    "businessName slug logoUrl description phone country currency status"
            })
            .populate({

                path:
                    "bankAccountId",

                select:
                    "bankName accountName iban accountType isActive"
            })
            .lean();


    if (
        !invoice
    ) {

        const error =
            new Error(
                "Fatura não encontrada."
            );


        error.code =
            "INVOICE_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    if (
        invoice.merchantId?.status !==
        "active"
    ) {

        const error =
            new Error(
                "Esta cobrança não está disponível."
            );


        error.code =
            "INVOICE_UNAVAILABLE";


        error.statusCode =
            404;


        throw error;
    }


    /*
    --------------------------------------------------------
    Verificar expiração.

    Não alteramos automaticamente o status aqui para evitar
    efeitos colaterais numa operação de leitura.
    --------------------------------------------------------
    */

    const expired =
        invoice.expiresAt &&
        new Date(
            invoice.expiresAt
        ).getTime() <=
        Date.now();


    return {

        invoice: {

            publicId:
                invoice.publicId,

            invoiceNumber:
                invoice.invoiceNumber,

            description:
                invoice.description,

            amount:
                invoice.amount,

            currency:
                invoice.currency ||
                DEFAULT_CURRENCY,

            status:
                expired &&
                invoice.status ===
                "pending"

                    ? "expired"

                    : invoice.status,

            expiresAt:
                invoice.expiresAt,

            customer:
                {

                    name:
                        invoice.customer?.name ||
                        ""
                }
        },


        merchant: {

            businessName:
                invoice.merchantId
                    ?.businessName ||
                "",

            slug:
                invoice.merchantId
                    ?.slug ||
                "",

            logoUrl:
                invoice.merchantId
                    ?.logoUrl ||
                null,

            description:
                invoice.merchantId
                    ?.description ||
                null
        },


        bankAccount: {

            bankName:
                invoice.bankAccountId
                    ?.bankName ||
                "",

            accountName:
                invoice.bankAccountId
                    ?.accountName ||
                "",

            iban:
                invoice.bankAccountId
                    ?.iban ||
                "",

            accountType:
                invoice.bankAccountId
                    ?.accountType ||
                "bank"
        },


        payment: {

            method:
                "bank_transfer",

            receiptUpload:
                true
        },


        qrCode: {

            enabled:
                true,

            generated:
                Boolean(
                    invoice.qrCode?.generated
                ),

            data:
                invoice.qrCode?.data ||
                null,

            imageUrl:
                invoice.qrCode?.imageUrl ||
                null
        }
    };
}


/*
============================================================
GET MERCHANT INVOICE
============================================================
*/

export async function getMerchantInvoice(
    merchantId,
    invoiceId
) {

    const merchantIdError =
        validateObjectId(
            merchantId,
            "merchantId"
        );


    if (
        merchantIdError
    ) {

        const error =
            new Error(
                merchantIdError.message
            );


        error.code =
            "INVALID_MERCHANT_ID";


        error.statusCode =
            400;


        throw error;
    }


    const invoiceIdError =
        validateObjectId(
            invoiceId,
            "invoiceId"
        );


    if (
        invoiceIdError
    ) {

        const error =
            new Error(
                invoiceIdError.message
            );


        error.code =
            "INVALID_INVOICE_ID";


        error.statusCode =
            400;


        throw error;
    }


    const invoice =
        await Invoice
            .findOne({

                _id:
                    invoiceId,

                merchantId
            })
            .populate({

                path:
                    "bankAccountId",

                select:
                    "bankName accountName iban accountType isActive"
            })
            .lean();


    if (
        !invoice
    ) {

        const error =
            new Error(
                "Fatura não encontrada."
            );


        error.code =
            "INVOICE_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    return {

        invoice:
            publicInvoice(
                invoice
            ),

        checkout: {

            path:
                buildCheckoutPath(
                    invoice.publicId
                )
        },

        bankAccount:
            invoice.bankAccountId
                ? {

                    id:
                        invoice.bankAccountId
                            ._id
                            .toString(),

                    bankName:
                        invoice.bankAccountId
                            .bankName,

                    accountName:
                        invoice.bankAccountId
                            .accountName,

                    iban:
                        invoice.bankAccountId
                            .iban,

                    accountType:
                        invoice.bankAccountId
                            .accountType,

                    isActive:
                        invoice.bankAccountId
                            .isActive
                }
                : null,

        fraudProtection:
            {

                verificationStatus:
                    invoice
                        .fraudProtection
                        ?.verificationStatus ||
                    "not_checked",

                duplicateDetected:
                    Boolean(
                        invoice
                            .fraudProtection
                            ?.duplicateDetected
                    ),

                verificationAttempts:
                    invoice
                        .fraudProtection
                        ?.verificationAttempts ||
                    0
            },

        qrCode:
            {

                enabled:
                    true,

                generated:
                    Boolean(
                        invoice.qrCode
                            ?.generated
                    ),

                imageUrl:
                    invoice.qrCode
                        ?.imageUrl ||
                    null
            }
    };
}


/*
============================================================
LIST MERCHANT INVOICES
============================================================
*/

export async function listMerchantInvoices(
    merchantId,
    options = {}
) {

    const page =
        Math.max(
            1,
            Number(
                options.page ||
                1
            )
        );


    const limit =
        Math.min(
            100,
            Math.max(
                1,
                Number(
                    options.limit ||
                    20
                )
            )
        );


    const skip =
        (
            page -
            1
        ) *
        limit;


    const filter = {

        merchantId
    };


    if (
        options.status
    ) {

        filter.status =
            options.status;
    }


    const [
        invoices,
        total
    ] =
        await Promise.all([

            Invoice
                .find(
                    filter
                )
                .sort({

                    createdAt:
                        -1
                })
                .skip(
                    skip
                )
                .limit(
                    limit
                )
                .lean(),

            Invoice.countDocuments(
                filter
            )
        ]);


    return {

        items:
            invoices.map(
                invoice =>
                    publicInvoice(
                        invoice
                    )
            ),

        pagination: {

            page,

            limit,

            total,

            totalPages:
                Math.max(
                    1,
                    Math.ceil(
                        total /
                        limit
                    )
                )
        }
    };
}


/*
============================================================
CANCEL INVOICE
============================================================
*/

export async function cancelInvoice(
    merchantId,
    invoiceId
) {

    const invoice =
        await Invoice.findOne({

            _id:
                invoiceId,

            merchantId
        });


    if (
        !invoice
    ) {

        const error =
            new Error(
                "Fatura não encontrada."
            );


        error.code =
            "INVOICE_NOT_FOUND";


        error.statusCode =
            404;


        throw error;
    }


    /*
    --------------------------------------------------------
    Só cobranças pendentes podem ser canceladas.
    --------------------------------------------------------
    */

    if (
        invoice.status !==
        "pending"
    ) {

        const error =
            new Error(
                "Esta fatura não pode ser cancelada no estado atual."
            );


        error.code =
            "INVOICE_CANNOT_BE_CANCELLED";


        error.statusCode =
            409;


        throw error;
    }


    invoice.status =
        "cancelled";


    invoice.cancelledAt =
        new Date();


    await invoice.save();


    logSecurityEvent(
        "invoice_cancelled",
        {

            merchantId:
                merchantId.toString(),

            invoiceId:
                invoice._id.toString()
        }
    );


    return {

        invoice:
            publicInvoice(
                invoice
            )
    };
}


/*
============================================================
MARK EXPIRED INVOICES
============================================================

Função preparada para futura rotina automática.

Não depende de cron nesta V1.
============================================================
*/

export async function expirePendingInvoices(
    limit = 500
) {

    const result =
        await Invoice.updateMany(

            {

                status:
                    "pending",

                expiresAt:
                    {
                        $lte:
                            new Date()
                    }
            },

            {

                $set:
                    {

                        status:
                            "expired",

                        expiredAt:
                            new Date()
                    }
            },

            {

                limit
            }
        );


    return {

        matched:
            result.matchedCount ||
            0,

        modified:
            result.modifiedCount ||
            0
    };
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    createInvoice,

    getPublicInvoice,

    getMerchantInvoice,

    listMerchantInvoices,

    cancelInvoice,

    expirePendingInvoices
};
