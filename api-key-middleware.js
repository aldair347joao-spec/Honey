/*
============================================================
HONEY PAY
EXTERNAL API KEY MIDDLEWARE
V1.0.0
============================================================
*/

import {
    authenticateApiKey
} from "./api-key.js";


/*
============================================================
EXTRACT API KEY
============================================================
*/

function extractApiKey(
    req
) {

    /*
    --------------------------------------------------------
    X-API-Key
    --------------------------------------------------------
    */

    const directKey =
        req.get(
            "X-API-Key"
        );


    if (
        directKey
    ) {

        return directKey.trim();

    }


    /*
    --------------------------------------------------------
    Authorization Bearer
    --------------------------------------------------------
    */

    const authorization =
        req.get(
            "Authorization"
        );


    if (
        !authorization
    ) {

        return null;

    }


    const parts =
        authorization
            .trim()
            .split(
                /\s+/
            );


    if (
        parts.length !==
        2
    ) {

        return null;

    }


    if (
        parts[0].toLowerCase() !==
        "bearer"
    ) {

        return null;

    }


    const token =
        parts[1];


    if (
        !token.startsWith(
            "hny_"
        )
    ) {

        return null;

    }


    return token;

}


/*
============================================================
AUTHENTICATE EXTERNAL API
============================================================
*/

export async function authenticateExternalApi(

    req,

    res,

    next

) {

    try {

        const rawKey =
            extractApiKey(
                req
            );


        if (
            !rawKey
        ) {

            return res

                .status(
                    401
                )

                .json({

                    success:
                        false,

                    error: {

                        code:
                            "API_KEY_REQUIRED",

                        message:
                            "API Key necessária."

                    },

                    requestId:
                        req.requestId ||
                        null

                });

        }


        const result =
            await authenticateApiKey(

                rawKey,

                {

                    ip:
                        req.ip

                }

            );


        req.apiAuth = {

            merchantId:
                String(
                    result.apiKey
                        .merchantId
                ),

            merchant:
                result.merchant,

            apiKey:
                result.apiKey

        };


        return next();

    }

    catch (
        error
    ) {

        return res

            .status(
                error.statusCode ||
                401
            )

            .json({

                success:
                    false,

                error: {

                    code:
                        error.code ||
                        "API_AUTHENTICATION_FAILED",

                    message:
                        error.message ||
                        "Não foi possível autenticar a API Key."

                },

                requestId:
                    req.requestId ||
                    null

            });

    }

}
