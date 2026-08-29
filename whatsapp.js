/*
============================================================
HONEY PAY
WHATSAPP SERVICE
V1.0.0
============================================================

NOTIFICAÇÕES WHATSAPP

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Normalizar números de telefone
- Validar números angolanos
- Criar mensagens transacionais
- Notificar comerciante sobre novo comprovativo
- Notificar comerciante sobre pagamento confirmado
- Notificar comerciante sobre pagamento rejeitado
- Separar provider da lógica de negócio
- Permitir desenvolvimento sem API externa
- Preparar integração real com WhatsApp

------------------------------------------------------------
ARQUITETURA
------------------------------------------------------------

payment
   ↓
whatsapp service
   ↓
provider
   ↓
WhatsApp

O núcleo da aplicação NÃO depende diretamente do provider.

============================================================
*/


/*
============================================================
CONFIGURAÇÃO
============================================================
*/

const WHATSAPP_PROVIDER =
    String(
        process.env.WHATSAPP_PROVIDER ||
        "console"
    )
        .trim()
        .toLowerCase();


const WHATSAPP_COUNTRY_CODE =
    "244";


const MAX_MESSAGE_LENGTH =
    4096;


/*
============================================================
UTIL — STRING
============================================================
*/

function cleanString(
    value,
    maxLength = 500
) {

    return String(
        value ?? ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        )
        .slice(
            0,
            maxLength
        );
}


/*
============================================================
NORMALIZE PHONE
============================================================

Aceita:

923123456
+244923123456
244923123456
00924923123456

Retorna:

244923123456
============================================================
*/

export function normalizePhone(
    phone
) {

    let value =
        String(
            phone || ""
        )
            .trim();


    if (
        !value
    ) {

        return null;
    }


    value =
        value.replace(
            /[^\d+]/g,
            ""
        );


    if (
        value.startsWith(
            "00"
        )
    ) {

        value =
            value.slice(
                2
            );
    }


    if (
        value.startsWith(
            "+"
        )
    ) {

        value =
            value.slice(
                1
            );
    }


    if (
        value.startsWith(
            "0"
        )
    ) {

        value =
            WHATSAPP_COUNTRY_CODE +
            value.slice(
                1
            );
    }


    if (
        !value.startsWith(
            WHATSAPP_COUNTRY_CODE
        )
    ) {

        value =
            WHATSAPP_COUNTRY_CODE +
            value;
    }


    /*
    --------------------------------------------------------
    Número angolano normalizado.
    --------------------------------------------------------
    */

    if (
        !/^2449\d{8}$/.test(
            value
        )
    ) {

        return null;
    }


    return value;
}


/*
============================================================
VALIDATE PHONE
============================================================
*/

export function isValidPhone(
    phone
) {

    return Boolean(
        normalizePhone(
            phone
        )
    );
}


/*
============================================================
FORMAT PHONE FOR DISPLAY
============================================================
*/

export function formatPhone(
    phone
) {

    const normalized =
        normalizePhone(
            phone
        );


    if (
        !normalized
    ) {

        return "";
    }


    return (
        "+" +
        normalized
    );
}


/*
============================================================
FORMAT MONEY
============================================================
*/

function formatMoney(
    amount,
    currency = "AOA"
) {

    const numeric =
        Number(
            amount
        );


    if (
        !Number.isFinite(
            numeric
        )
    ) {

        return "0 Kz";
    }


    if (
        currency ===
        "AOA"
    ) {

        return (
            new Intl.NumberFormat(
                "pt-PT",
                {
                    minimumFractionDigits:
                        0,
                    maximumFractionDigits:
                        2
                }
            )
                .format(
                    numeric
                ) +
            " Kz"
        );
    }


    return (
        new Intl.NumberFormat(
            "pt-PT",
            {
                style:
                    "currency",

                currency:
                    currency
            }
        )
            .format(
                numeric
            )
    );
}


/*
============================================================
TRUNCATE MESSAGE
============================================================
*/

function normalizeMessage(
    message
) {

    return String(
        message || ""
    )
        .trim()
        .slice(
            0,
            MAX_MESSAGE_LENGTH
        );
}


/*
============================================================
BUILD — NEW PAYMENT
============================================================
*/

export function buildPaymentSubmittedMessage(
    data = {}
) {

    const storeName =
        cleanString(
            data.storeName ||
            "A sua loja",
            100
        );


    const invoiceNumber =
        cleanString(
            data.invoiceNumber ||
            data.invoiceId ||
            "—",
            80
        );


    const amount =
        formatMoney(
            data.amount,
            data.currency ||
            "AOA"
        );


    const payerName =
        cleanString(
            data.payerName ||
            "Cliente",
            120
        );


    const paymentReference =
        cleanString(
            data.reference ||
            "Não indicada",
            120
        );


    return normalizeMessage(
        [
            `🔔 Novo pagamento recebido — ${storeName}`,

            "",

            `Fatura: ${invoiceNumber}`,

            `Valor: ${amount}`,

            `Cliente: ${payerName}`,

            `Referência: ${paymentReference}`,

            "",

            "O comprovativo foi enviado e está pendente de confirmação.",

            "",

            "Entre no Honey Pay para analisar o pagamento."
        ]
            .join("\n")
    );
}


/*
============================================================
BUILD — PAYMENT CONFIRMED
============================================================
*/

export function buildPaymentConfirmedMessage(
    data = {}
) {

    const storeName =
        cleanString(
            data.storeName ||
            "A sua loja",
            100
        );


    const invoiceNumber =
        cleanString(
            data.invoiceNumber ||
            data.invoiceId ||
            "—",
            80
        );


    const amount =
        formatMoney(
            data.amount,
            data.currency ||
            "AOA"
        );


    return normalizeMessage(
        [
            `✅ Pagamento confirmado — ${storeName}`,

            "",

            `Fatura: ${invoiceNumber}`,

            `Valor: ${amount}`,

            "",

            "O pagamento foi confirmado com sucesso."
        ]
            .join("\n")
    );
}


/*
============================================================
BUILD — PAYMENT REJECTED
============================================================
*/

export function buildPaymentRejectedMessage(
    data = {}
) {

    const storeName =
        cleanString(
            data.storeName ||
            "A sua loja",
            100
        );


    const invoiceNumber =
        cleanString(
            data.invoiceNumber ||
            data.invoiceId ||
            "—",
            80
        );


    const reason =
        cleanString(
            data.reason ||
            "Comprovativo não validado.",
            300
        );


    return normalizeMessage(
        [
            `⚠️ Pagamento rejeitado — ${storeName}`,

            "",

            `Fatura: ${invoiceNumber}`,

            `Motivo: ${reason}`,

            "",

            "Verifique os detalhes no Honey Pay."
        ]
            .join("\n")
    );
}


/*
============================================================
BUILD — RECEIPT DUPLICATE
============================================================
*/

export function buildDuplicateReceiptMessage(
    data = {}
) {

    const storeName =
        cleanString(
            data.storeName ||
            "A sua loja",
            100
        );


    const invoiceNumber =
        cleanString(
            data.invoiceNumber ||
            data.invoiceId ||
            "—",
            80
        );


    return normalizeMessage(
        [
            `🚨 Alerta de segurança — ${storeName}`,

            "",

            `Fatura: ${invoiceNumber}`,

            "",

            "O sistema detetou que o comprovativo enviado já foi utilizado anteriormente.",

            "",

            "O pagamento foi bloqueado para análise."
        ]
            .join("\n")
    );
}


/*
============================================================
BUILD — INVOICE CREATED
============================================================
*/

export function buildInvoiceCreatedMessage(
    data = {}
) {

    const storeName =
        cleanString(
            data.storeName ||
            "A sua loja",
            100
        );


    const invoiceNumber =
        cleanString(
            data.invoiceNumber ||
            data.invoiceId ||
            "—",
            80
        );


    const amount =
        formatMoney(
            data.amount,
            data.currency ||
            "AOA"
        );


    const paymentUrl =
        cleanString(
            data.paymentUrl ||
            "",
            500
        );


    return normalizeMessage(
        [
            `🧾 Nova cobrança criada — ${storeName}`,

            "",

            `Fatura: ${invoiceNumber}`,

            `Valor: ${amount}`,

            paymentUrl
                ? `Link: ${paymentUrl}`
                : "",

            "",

            "A cobrança está pronta para ser enviada ao cliente."
        ]
            .filter(
                Boolean
            )
            .join("\n")
    );
}


/*
============================================================
CONSOLE PROVIDER
============================================================
*/

async function sendWithConsoleProvider(
    options = {}
) {

    const to =
        normalizePhone(
            options.to
        );


    if (
        !to
    ) {

        const error =
            new Error(
                "Número WhatsApp inválido."
            );


        error.code =
            "WHATSAPP_INVALID_NUMBER";


        error.statusCode =
            400;


        throw error;
    }


    const message =
        normalizeMessage(
            options.message
        );


    if (
        !message
    ) {

        const error =
            new Error(
                "Mensagem WhatsApp vazia."
            );


        error.code =
            "WHATSAPP_EMPTY_MESSAGE";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Provider de desenvolvimento.

    Não envia mensagem real.
    --------------------------------------------------------
    */

    console.log(
        "\n=================================================="
    );

    console.log(
        "HONEY PAY — WHATSAPP CONSOLE PROVIDER"
    );

    console.log(
        "=================================================="
    );

    console.log(
        "TO:",
        formatPhone(
            to
        )
    );

    console.log(
        "MESSAGE:"
    );

    console.log(
        message
    );

    console.log(
        "==================================================\n"
    );


    return {

        success:
            true,

        provider:
            "console",

        simulated:
            true,

        messageId:
            `console_${Date.now()}`,

        to
    };
}


/*
============================================================
HTTP PROVIDER PLACEHOLDER
============================================================

Este provider será utilizado quando a aplicação estiver
ligada a um gateway WhatsApp real.

Não inventamos endpoint, token ou API.

As credenciais e endpoint serão definidos através do .env.

============================================================
*/

async function sendWithHttpProvider(
    options = {}
) {

    const endpoint =
        String(
            process.env.WHATSAPP_API_URL ||
            ""
        )
            .trim();


    const token =
        String(
            process.env.WHATSAPP_API_TOKEN ||
            ""
        )
            .trim();


    const sender =
        String(
            process.env.WHATSAPP_SENDER ||
            ""
        )
            .trim();


    if (
        !endpoint ||
        !token ||
        !sender
    ) {

        const error =
            new Error(
                "O provider WhatsApp ainda não está configurado."
            );


        error.code =
            "WHATSAPP_PROVIDER_NOT_CONFIGURED";


        error.statusCode =
            503;


        throw error;
    }


    const to =
        normalizePhone(
            options.to
        );


    if (
        !to
    ) {

        const error =
            new Error(
                "Número WhatsApp inválido."
            );


        error.code =
            "WHATSAPP_INVALID_NUMBER";


        error.statusCode =
            400;


        throw error;
    }


    const message =
        normalizeMessage(
            options.message
        );


    if (
        !message
    ) {

        const error =
            new Error(
                "Mensagem WhatsApp vazia."
            );


        error.code =
            "WHATSAPP_EMPTY_MESSAGE";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    Não assumimos o formato de uma API de terceiros.

    O endpoint configurado deverá aceitar:

    {
        from,
        to,
        message
    }

    --------------------------------------------------------
    */

    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () =>
                controller.abort(),
            15000
        );


    try {

        const response =
            await fetch(
                endpoint,
                {

                    method:
                        "POST",

                    headers:
                        {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`
                        },

                    body:
                        JSON.stringify({

                            from:
                                sender,

                            to,

                            message
                        }),

                    signal:
                        controller.signal
                }
            );


        const responseText =
            await response.text();


        let responseData =
            null;


        try {

            responseData =
                responseText
                    ? JSON.parse(
                        responseText
                    )
                    : null;

        }

        catch {

            responseData =
                {
                    raw:
                        responseText
                };
        }


        if (
            !response.ok
        ) {

            const error =
                new Error(
                    "O provider WhatsApp recusou o envio."
                );


            error.code =
                "WHATSAPP_PROVIDER_ERROR";


            error.statusCode =
                502;


            error.providerStatus =
                response.status;


            error.providerResponse =
                responseData;


            throw error;
        }


        return {

            success:
                true,

            provider:
                "http",

            simulated:
                false,

            messageId:
                responseData?.messageId ||
                responseData?.id ||
                null,

            to,

            providerResponse:
                responseData
        };

    }

    catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            const timeoutError =
                new Error(
                    "O envio WhatsApp excedeu o tempo limite."
                );


            timeoutError.code =
                "WHATSAPP_TIMEOUT";


            timeoutError.statusCode =
                504;


            throw timeoutError;
        }


        throw error;

    }

    finally {

        clearTimeout(
            timeout
        );
    }
}


/*
============================================================
SEND MESSAGE
============================================================
*/

export async function sendWhatsAppMessage(
    options = {}
) {

    const provider =
        String(
            options.provider ||
            WHATSAPP_PROVIDER
        )
            .trim()
            .toLowerCase();


    if (
        provider ===
        "console"
    ) {

        return sendWithConsoleProvider(
            options
        );
    }


    if (
        provider ===
        "http"
    ) {

        return sendWithHttpProvider(
            options
        );
    }


    const error =
        new Error(
            `Provider WhatsApp desconhecido: ${provider}`
        );


    error.code =
        "WHATSAPP_UNKNOWN_PROVIDER";


    error.statusCode =
        500;


    throw error;
}


/*
============================================================
NOTIFY PAYMENT SUBMITTED
============================================================
*/

export async function notifyPaymentSubmitted(
    merchant,
    payment
) {

    const phone =
        normalizePhone(
            merchant?.whatsapp ||
            merchant?.phone
        );


    if (
        !phone
    ) {

        return {

            success:
                false,

            skipped:
                true,

            reason:
                "MERCHANT_WHATSAPP_NOT_CONFIGURED"
        };
    }


    const message =
        buildPaymentSubmittedMessage({

            storeName:
                merchant.storeName ||
                merchant.businessName,

            invoiceNumber:
                payment.invoiceNumber ||
                payment.invoiceId,

            amount:
                payment.amount,

            currency:
                payment.currency,

            payerName:
                payment.payer?.name,

            reference:
                payment.payer?.reference
        });


    return sendWhatsAppMessage({

        to:
            phone,

        message
    });
}


/*
============================================================
NOTIFY PAYMENT CONFIRMED
============================================================
*/

export async function notifyPaymentConfirmed(
    merchant,
    payment
) {

    const phone =
        normalizePhone(
            merchant?.whatsapp ||
            merchant?.phone
        );


    if (
        !phone
    ) {

        return {

            success:
                false,

            skipped:
                true,

            reason:
                "MERCHANT_WHATSAPP_NOT_CONFIGURED"
        };
    }


    const message =
        buildPaymentConfirmedMessage({

            storeName:
                merchant.storeName ||
                merchant.businessName,

            invoiceNumber:
                payment.invoiceNumber ||
                payment.invoiceId,

            amount:
                payment.amount,

            currency:
                payment.currency
        });


    return sendWhatsAppMessage({

        to:
            phone,

        message
    });
}


/*
============================================================
NOTIFY PAYMENT REJECTED
============================================================
*/

export async function notifyPaymentRejected(
    merchant,
    payment
) {

    const phone =
        normalizePhone(
            merchant?.whatsapp ||
            merchant?.phone
        );


    if (
        !phone
    ) {

        return {

            success:
                false,

            skipped:
                true,

            reason:
                "MERCHANT_WHATSAPP_NOT_CONFIGURED"
        };
    }


    const message =
        buildPaymentRejectedMessage({

            storeName:
                merchant.storeName ||
                merchant.businessName,

            invoiceNumber:
                payment.invoiceNumber ||
                payment.invoiceId,

            reason:
                payment.rejectionReason
        });


    return sendWhatsAppMessage({

        to:
            phone,

        message
    });
}


/*
============================================================
NOTIFY DUPLICATE RECEIPT
============================================================
*/

export async function notifyDuplicateReceipt(
    merchant,
    payment
) {

    const phone =
        normalizePhone(
            merchant?.whatsapp ||
            merchant?.phone
        );


    if (
        !phone
    ) {

        return {

            success:
                false,

            skipped:
                true,

            reason:
                "MERCHANT_WHATSAPP_NOT_CONFIGURED"
        };
    }


    const message =
        buildDuplicateReceiptMessage({

            storeName:
                merchant.storeName ||
                merchant.businessName,

            invoiceNumber:
                payment.invoiceNumber ||
                payment.invoiceId
        });


    return sendWhatsAppMessage({

        to:
            phone,

        message
    });
}


/*
============================================================
NOTIFY INVOICE CREATED
============================================================
*/

export async function notifyInvoiceCreated(
    merchant,
    invoice
) {

    const phone =
        normalizePhone(
            merchant?.whatsapp ||
            merchant?.phone
        );


    if (
        !phone
    ) {

        return {

            success:
                false,

            skipped:
                true,

            reason:
                "MERCHANT_WHATSAPP_NOT_CONFIGURED"
        };
    }


    const message =
        buildInvoiceCreatedMessage({

            storeName:
                merchant.storeName ||
                merchant.businessName,

            invoiceNumber:
                invoice.invoiceNumber ||
                invoice.publicId,

            amount:
                invoice.amount,

            currency:
                invoice.currency,

            paymentUrl:
                invoice.paymentUrl
        });


    return sendWhatsAppMessage({

        to:
            phone,

        message
    });
}


/*
============================================================
GET PROVIDER STATUS
============================================================
*/

export function getWhatsAppProviderStatus() {

    return {

        provider:
            WHATSAPP_PROVIDER,

        configured:
            WHATSAPP_PROVIDER ===
                "console"
                ? true
                : Boolean(
                    process.env.WHATSAPP_API_URL &&
                    process.env.WHATSAPP_API_TOKEN &&
                    process.env.WHATSAPP_SENDER
                ),

        mode:
            WHATSAPP_PROVIDER ===
                "console"
                ? "development"
                : "production",

        country:
            "AO",

        countryCode:
            WHATSAPP_COUNTRY_CODE
    };
}


/*
============================================================
HEALTH CHECK
============================================================
*/

export async function whatsappHealthCheck() {

    const status =
        getWhatsAppProviderStatus();


    return {

        healthy:
            status.configured,

        provider:
            status.provider,

        mode:
            status.mode
    };
}


/*
============================================================
EXPORT
============================================================
*/

export default {

    normalizePhone,

    isValidPhone,

    formatPhone,

    buildPaymentSubmittedMessage,

    buildPaymentConfirmedMessage,

    buildPaymentRejectedMessage,

    buildDuplicateReceiptMessage,

    buildInvoiceCreatedMessage,

    sendWhatsAppMessage,

    notifyPaymentSubmitted,

    notifyPaymentConfirmed,

    notifyPaymentRejected,

    notifyDuplicateReceipt,

    notifyInvoiceCreated,

    getWhatsAppProviderStatus,

    whatsappHealthCheck
};
