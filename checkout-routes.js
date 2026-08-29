/*
============================================================
HONEY PAY
PUBLIC CHECKOUT ROUTES
V1.0.0
============================================================

ROTAS PÚBLICAS DO CHECKOUT

------------------------------------------------------------
PUBLIC
------------------------------------------------------------

GET /api/pay/:publicToken

------------------------------------------------------------
OBJETIVO
------------------------------------------------------------

Permitir que qualquer cliente abra um link de pagamento
Honey Pay e veja:

- comerciante;
- descrição;
- valor;
- moeda;
- estado da fatura;
- prazo;
- contas bancárias disponíveis;
- instruções para pagamento.

------------------------------------------------------------
SEGURANÇA
------------------------------------------------------------

- Não exige autenticação do comprador.
- Não aceita valor enviado pelo cliente.
- Não aceita merchantId para decidir qual fatura mostrar.
- A fatura é localizada exclusivamente através do token.
- Somente dados públicos são devolvidos.
- Não são devolvidos documentos MongoDB.
- Não são devolvidos dados administrativos.
- Não são devolvidos dados de outras faturas.
- Cache público é desativado.
- O endpoint não revela detalhes internos do banco.

============================================================
*/

import express from "express";


import {
    getPublicCheckout
} from "./checkout.js";


import {
    errorResponse,
    normalizeError,
    successResponse
} from "./utils.js";


/*
============================================================
ROUTER
============================================================
*/

const router =
    express.Router();


/*
============================================================
SECURITY HEADERS
============================================================
*/

function applyCheckoutSecurityHeaders(
    res
) {

    /*
    --------------------------------------------------------
    O checkout contém informações específicas de uma fatura.
    Não queremos que proxies armazenem uma resposta pública
    reutilizável.
    --------------------------------------------------------
    */

    res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
    );


    res.setHeader(
        "Pragma",
        "no-cache"
    );


    res.setHeader(
        "Expires",
        "0"
    );


    res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
    );


    res.setHeader(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
    );


    res.setHeader(
        "X-Frame-Options",
        "SAMEORIGIN"
    );


    res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );
}


/*
============================================================
TOKEN VALIDATION
============================================================
*/

function normalizeCheckoutToken(
    value
) {

    if (
        typeof value !==
        "string"
    ) {

        const error =
            new Error(
                "Link de pagamento inválido."
            );


        error.code =
            "INVALID_CHECKOUT_TOKEN";


        error.statusCode =
            400;


        throw error;
    }


    const token =
        value.trim();


    if (
        !token
    ) {

        const error =
            new Error(
                "Link de pagamento inválido."
            );


        error.code =
            "INVALID_CHECKOUT_TOKEN";


        error.statusCode =
            400;


        throw error;
    }


    /*
    --------------------------------------------------------
    O token gerado pelo checkout utiliza somente caracteres
    URL-safe.
    --------------------------------------------------------
    */

    if (
        !/^[A-Za-z0-9_-]+$/.test(
            token
        )
    ) {

        const error =
            new Error(
                "Link de pagamento inválido."
            );


        error.code =
            "INVALID_CHECKOUT_TOKEN";


        error.statusCode =
            400;


        throw error;
    }


    if (
        token.length >
        200
    ) {

        const error =
            new Error(
                "Link de pagamento inválido."
            );


        error.code =
            "INVALID_CHECKOUT_TOKEN";


        error.statusCode =
            400;


        throw error;
    }


    return token;
}


/*
============================================================
ERROR RESPONSE
============================================================
*/

function sendCheckoutError(
    res,
    error
) {

    const normalized =
        normalizeError(
            error
        );


    /*
    --------------------------------------------------------
    Nunca enviar stack trace, error object ou detalhes
    internos para o comprador.
    --------------------------------------------------------
    */

    return errorResponse(

        res,

        normalized.statusCode,

        normalized.code,

        normalized.message,

        null
    );
}


/*
============================================================
GET PUBLIC CHECKOUT
============================================================

GET /api/pay/:publicToken

============================================================
*/

router.get(
    "/pay/:publicToken",

    async (
        req,
        res
    ) => {

        applyCheckoutSecurityHeaders(
            res
        );


        try {

            const token =
                normalizeCheckoutToken(
                    req.params.publicToken
                );


            const checkout =
                await getPublicCheckout(
                    token
                );


            return successResponse(

                res,

                checkout
            );
        }

        catch (
            error
        ) {

            return sendCheckoutError(

                res,

                error
            );
        }
    }
);


/*
============================================================
HEAD CHECKOUT
============================================================

Permite verificar se o link existe sem transferir o corpo
completo da resposta.

============================================================
*/

router.head(
    "/pay/:publicToken",

    async (
        req,
        res
    ) => {

        applyCheckoutSecurityHeaders(
            res
        );


        try {

            const token =
                normalizeCheckoutToken(
                    req.params.publicToken
                );


            await getPublicCheckout(
                token
            );


            return res
                .status(
                    200
                )
                .end();
        }

        catch (
            error
        ) {

            const normalized =
                normalizeError(
                    error
                );


            return res
                .status(
                    normalized.statusCode
                )
                .end();
        }
    }
);


/*
============================================================
404 FALLBACK
============================================================
*/

router.use(
    (
        req,
        res
    ) => {

        applyCheckoutSecurityHeaders(
            res
        );


        return errorResponse(

            res,

            404,

            "CHECKOUT_ROUTE_NOT_FOUND",

            "O checkout solicitado não existe."
        );
    }
);


/*
============================================================
GLOBAL ERROR HANDLER
============================================================
*/

router.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(

            "[HONEY PAY CHECKOUT ERROR]",

            error
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );
        }


        applyCheckoutSecurityHeaders(
            res
        );


        return sendCheckoutError(

            res,

            error
        );
    }
);


/*
============================================================
EXPORT
============================================================
*/

export default router;
