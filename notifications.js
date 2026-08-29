/*
============================================================
HONEY PAY
NOTIFICATION SERVICE
V1.0.0
============================================================

CENTRAL DE NOTIFICAÇÕES

------------------------------------------------------------
RESPONSABILIDADES
------------------------------------------------------------

- Centralizar notificações da plataforma
- Notificar novo pagamento
- Notificar pagamento confirmado
- Notificar pagamento rejeitado
- Notificar tentativa de reutilização de comprovativo
- Notificar criação de fatura
- Isolar canais de comunicação da lógica de negócio
- Preparar futuros canais

------------------------------------------------------------
ARQUITETURA
------------------------------------------------------------

BUSINESS LOGIC
      ↓
NOTIFICATIONS
      ↓
WHATSAPP
      ↓
OUTROS CANAIS FUTUROS

============================================================
*/

import {
    notifyPaymentSubmitted,
    notifyPaymentConfirmed,
    notifyPaymentRejected,
    notifyDuplicateReceipt,
    notifyInvoiceCreated
} from "./whatsapp.js";


/*
============================================================
UTIL
============================================================
*/

function safeError(
    error
) {

    return {

        success:
            false,

        error:
            error?.message ||
            "Erro desconhecido.",

        code:
            error?.code ||
            "NOTIFICATION_ERROR"
    };
}


/*
============================================================
PAYMENT SUBMITTED
============================================================
*/

export async function notifyNewPayment(
    merchant,
    payment
) {

    try {

        return await notifyPaymentSubmitted(
            merchant,
            payment
        );

    }

    catch (error) {

        console.error(
            "[NOTIFICATIONS] Erro ao notificar novo pagamento:",
            error
        );


        return safeError(
            error
        );
    }
}


/*
============================================================
PAYMENT CONFIRMED
============================================================
*/

export async function notifyConfirmedPayment(
    merchant,
    payment
) {

    try {

        return await notifyPaymentConfirmed(
            merchant,
            payment
        );

    }

    catch (error) {

        console.error(
            "[NOTIFICATIONS] Erro ao notificar pagamento confirmado:",
            error
        );


        return safeError(
            error
        );
    }
}


/*
============================================================
PAYMENT REJECTED
============================================================
*/

export async function notifyRejectedPayment(
    merchant,
    payment
) {

    try {

        return await notifyPaymentRejected(
            merchant,
            payment
        );

    }

    catch (error) {

        console.error(
            "[NOTIFICATIONS] Erro ao notificar pagamento rejeitado:",
            error
        );


        return safeError(
            error
        );
    }
}


/*
============================================================
DUPLICATE RECEIPT
============================================================
*/

export async function notifyFraudAttempt(
    merchant,
    payment
) {

    try {

        return await notifyDuplicateReceipt(
            merchant,
            payment
        );

    }

    catch (error) {

        console.error(
            "[NOTIFICATIONS] Erro ao notificar alerta de segurança:",
            error
        );


        return safeError(
            error
        );
    }
}


/*
============================================================
INVOICE CREATED
============================================================
*/

export async function notifyNewInvoice(
    merchant,
    invoice
) {

    try {

        return await notifyInvoiceCreated(
            merchant,
            invoice
        );

    }

    catch (error) {

        console.error(
            "[NOTIFICATIONS] Erro ao notificar criação de fatura:",
            error
        );


        return safeError(
            error
        );
    }
}


/*
============================================================
NOTIFICATION BATCH
============================================================

Permite disparar várias notificações sem interromper
a operação principal caso um canal falhe.

============================================================
*/

export async function notifyBatch(
    notifications = []
) {

    if (
        !Array.isArray(
            notifications
        )
    ) {

        return [];
    }


    const results =
        await Promise.allSettled(
            notifications.map(
                notification => {

                    if (
                        typeof notification !==
                        "function"
                    ) {

                        return Promise.resolve({

                            success:
                                false,

                            error:
                                "Notificação inválida."
                        });
                    }


                    return notification();
                }
            )
        );


    return results.map(
        result => {

            if (
                result.status ===
                "fulfilled"
            ) {

                return result.value;
            }


            return safeError(
                result.reason
            );
        }
    );
}


/*
============================================================
NOTIFICATION HEALTH
============================================================
*/

export async function notificationsHealthCheck() {

    return {

        healthy:
            true,

        channels:
            {

                whatsapp:
                    true
            }
    };
}


/*
============================================================
EXPORT DEFAULT
============================================================
*/

export default {

    notifyNewPayment,

    notifyConfirmedPayment,

    notifyRejectedPayment,

    notifyFraudAttempt,

    notifyNewInvoice,

    notifyBatch,

    notificationsHealthCheck
};
