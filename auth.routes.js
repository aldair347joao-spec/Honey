/*
==========================================
HONEY IA OS
AUTH ROUTES
Authentication API
V5.0
Local + Google + Session Management
Email Verification
Google Configuration
Production Authentication
==========================================
*/


import express from "express";

import authService from "./auth.service.js";

import {

    authMiddleware,

    getAuthToken

} from "./auth.middleware.js";



const router =

    express.Router();



/*
==========================================
SAFE ERROR HANDLER
==========================================
*/

function handleError(

    res,

    error

){

    console.error(

        "AUTH ROUTE ERROR:",

        error

    );


    const status =

        Number.isInteger(

            error?.status

        )

            ? error.status

            : 500;


    return res

        .status(status)

        .json({

            success: false,

            error:

                error?.message ||

                "Erro de autenticação."

        });

}



/*
==========================================
REGISTER
POST /api/auth/register
==========================================
*/

router.post(

    "/register",

    async(req,res)=>{

        try{

            const result =

                await authService.register(

                    req.body || {},

                    req

                );


            return res

                .status(201)

                .json(result);

        }

        catch(error){

            return handleError(

                res,

                error

            );

        }

    }

);



/*
==========================================
VERIFY EMAIL
POST /api/auth/verify-email
==========================================
*/

router.post(

    "/verify-email",

    async(req,res)=>{

        try{

            const {

                email,

                code,

                codigo

            } = req.body || {};


            const result =

                await authService.verifyEmail(

                    email,

                    code || codigo

                );


            return res.json(

                result

            );

        }

        catch(error){

            return handleError(

                res,

                error

            );

        }

    }

);



/*
==========================================
RESEND VERIFICATION
POST /api/auth/resend-verification
==========================================
*/

router.post(

    "/resend-verification",

    async(req,res)=>{

        try{

            const email =

                req.body?.email;


            const result =

                await authService.resendVerificationCode(

                    email

                );


            return res.json(

                result

            );

        }

        catch(error){

            return handleError(

                res,

                error

            );

        }

    }

);



/*
==========================================
GOOGLE CONFIG
GET /api/auth/google-config

Returns only the PUBLIC Google Client ID.

IMPORTANT:
GOOGLE_CLIENT_SECRET MUST NEVER
BE SENT TO THE FRONTEND.
==========================================
*/

router.get(

    "/google-config",

    (req,res)=>{

        try{

            const clientId =

                String(

                    process.env.GOOGLE_CLIENT_ID ||

                    ""

                ).trim();


            /*
            ----------------------------------
            GOOGLE NOT CONFIGURED
            ----------------------------------
            */

            if(!clientId){

                return res

                    .status(503)

                    .json({

                        success: false,

                        configured: false,

                        error:

                            "Login Google não configurado no servidor."

                    });

            }


            /*
            ----------------------------------
            PUBLIC CONFIGURATION
            ----------------------------------
            */

            return res.json({

                success: true,

                configured: true,

                clientId

            });

        }

        catch(error){

            return handleError(

                res,

                error

            );

        }

    }

);



/*
==========================================
LOGIN
POST /api/auth/login
==========================================
*/

router.post(

    "/login",

    async(req,res)=>{

        try{

            const {

                email,

                password

            } = req.body || {};


            const result =

                await authService.login(

                    email,

                    password,

                    req

                );


            return res.json(

                result

            );

        }

        catch(error){

            return handleError(

                res,

                error

            );

        }

    }

);



/*
==========================================
GOOGLE LOGIN
POST /api/auth/google
==========================================
*/

router.post(

    "/google",

    async(req,res)=>{

        try{

            const {

                credential

            } = req.body || {};


            /*
            ----------------------------------
            VALIDATE CREDENTIAL
            ----------------------------------
            */

            if(

                !credential ||

                typeof credential !== "string"

            ){

                return res

                    .status(400)

                    .json({

                        success: false,

                        error:

                            "Credencial Google não fornecida."

                    });

            }



            /*
            ----------------------------------
            GOOGLE TOKEN VALIDATION
            ----------------------------------
            */

            const googleResponse =

                await fetch(

                    "https://oauth2.googleapis.com/tokeninfo?id_token=" +

                    encodeURIComponent(

                        credential

                    )

                );


            if(

                !googleResponse.ok

            ){

                return res

                    .status(401)

                    .json({

                        success: false,

                        error:

                            "Credencial Google inválida ou expirada."

                    });

            }



            const googleProfile =

                await googleResponse.json();



            /*
            ----------------------------------
            CLIENT ID
            ----------------------------------
            */

            const googleClientId =

                String(

                    process.env.GOOGLE_CLIENT_ID ||

                    ""

                ).trim();


            if(!googleClientId){

                return res

                    .status(503)

                    .json({

                        success: false,

                        error:

                            "Login Google não configurado no servidor."

                    });

            }



            /*
            ----------------------------------
            AUDIENCE
            ----------------------------------
            */

            if(

                String(

                    googleProfile.aud

                ) !==

                googleClientId

            ){

                return res

                    .status(401)

                    .json({

                        success: false,

                        error:

                            "Credencial Google não pertence a esta aplicação."

                    });

            }



            /*
            ----------------------------------
            ISSUER
            ----------------------------------
            */

            const issuer =

                String(

                    googleProfile.iss ||

                    ""

                );


            if(

                issuer !==

                    "accounts.google.com" &&

                issuer !==

                    "https://accounts.google.com"

            ){

                return res

                    .status(401)

                    .json({

                        success: false,

                        error:

                            "Emissor da credencial Google inválido."

                    });

            }



            /*
            ----------------------------------
            EXPIRATION
            ----------------------------------
            */

            const expiration =

                Number(

                    googleProfile.exp

                );


            if(

                !Number.isFinite(

                    expiration

                ) ||

                expiration <=

                    Math.floor(

                        Date.now() / 1000

                    )

            ){

                return res

                    .status(401)

                    .json({

                        success: false,

                        error:

                            "Credencial Google expirada."

                    });

            }



            /*
            ----------------------------------
            AUTH SERVICE
            ----------------------------------
            */

            const result =

                await authService.googleLogin(

                    googleProfile,

                    req

                );


            return res.json(

                result

            );

        }

        catch(error){

            return handleError(

                res,

                error

            );

        }

    }

);



/*
==========================================
CURRENT USER
GET /api/auth/me
==========================================
*/

router.get(

    "/me",

    authMiddleware,

    async(req,res)=>{

        try{

            return res.json({

                success: true,

                user: {

                    id:

                        req.user._id.toString(),

                    firstName:

                        req.user.firstName || "",

                    lastName:

                        req.user.lastName || "",

                    name:

                        [

                            req.user.firstName,

                            req.user.lastName

                        ]

                            .filter(Boolean)

                            .join(" "),

                    email:

                        req.user.email,

                    provider:

                        req.user.provider ||

                        "local",

                    avatar:

                        req.user.avatar ||

                        null,

                    emailVerified:

                        req.user.emailVerified === true,

                    plan:

                        req.user.plan ||

                        "free",

                    isActive:

                        req.user.isActive === true

                },

                auth: {

                    userId:

                        req.auth.userId,

                    provider:

                        req.auth.provider,

                    plan:

                        req.auth.plan,

                    expiresAt:

                        req.auth.expiresAt

                }

            });

        }

        catch(error){

            return handleError(

                res,

                error

            );

        }

    }

);



/*
==========================================
LOGOUT
POST /api/auth/logout
==========================================
*/

router.post(

    "/logout",

    async(req,res)=>{

        try{

            const token =

                getAuthToken(req);


            const result =

                await authService.logout(

                    token

                );


            return res.json(

                result

            );

        }

        catch(error){

            return handleError(

                res,

                error

            );

        }

    }

);



/*
==========================================
LOGOUT ALL
POST /api/auth/logout-all
==========================================
*/

router.post(

    "/logout-all",

    authMiddleware,

    async(req,res)=>{

        try{

            const result =

                await authService.logoutAll(

                    req.user._id

                );


            return res.json(

                result

            );

        }

        catch(error){

            return handleError(

                res,

                error

            );

        }

    }

);



/*
==========================================
HEALTH
GET /api/auth/health
==========================================
*/

router.get(

    "/health",

    (req,res)=>{

        return res.json({

            success: true,

            authentication:

                "online"

        });

    }

);



/*
==========================================
EXPORT
==========================================
*/

export default router;
