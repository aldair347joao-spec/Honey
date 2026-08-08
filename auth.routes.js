/*
==========================================
HONEY IA OS
AUTH ROUTES
Authentication API
V3.0
Local + Google + Session Management
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


    return res

        .status(

            error.status ||

            400

        )

        .json({

            success: false,

            error:

                error.message ||

                "Erro de autenticação."

        });

}



/*
==========================================
REGISTER
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
LOGIN
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
==========================================
*/

router.post(

    "/google",

    async(req,res)=>{

        try{

            const {

                credential

            } = req.body || {};


            if(!credential){

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
            VERIFY GOOGLE TOKEN
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

                            "Credencial Google inválida."

                    });

            }


            const googleProfile =

                await googleResponse.json();


            /*
            ----------------------------------
            AUDIENCE CHECK
            ----------------------------------
            */

            const googleClientId =

                process.env.GOOGLE_CLIENT_ID;


            if(

                !googleClientId

            ){

                return res

                    .status(503)

                    .json({

                        success: false,

                        error:

                            "Login Google não configurado no servidor."

                    });

            }


            if(

                googleProfile.aud !==

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

                        req.user._id,

                    firstName:

                        req.user.firstName,

                    lastName:

                        req.user.lastName,

                    email:

                        req.user.email,

                    provider:

                        req.user.provider,

                    avatar:

                        req.user.avatar,

                    emailVerified:

                        req.user.emailVerified,

                    plan:

                        req.user.plan,

                    isActive:

                        req.user.isActive

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
==========================================
*/

router.get(

    "/health",

    (req,res)=>{

        return res.json({

            success: true,

            authentication: "online"

        });

    }

);



export default router;
