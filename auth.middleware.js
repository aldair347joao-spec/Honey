/*
==========================================
HONEY IA OS
AUTH MIDDLEWARE
JWT + MONGODB SESSION VALIDATION
V4.0
Enterprise Authentication Layer
==========================================
*/


import jwt from "jsonwebtoken";

import mongoose from "mongoose";

import {

    User,

    Session

} from "./models.js";



/*
==========================================
CONFIGURATION
==========================================
*/


const JWT_SECRET =

    process.env.JWT_SECRET;



/*
==========================================
SESSION CONFIGURATION
==========================================
*/


const AUTH_CONFIG = {

    algorithm: "HS256",

    issuer: "honey-ia",

    audience: "honey-ia-client"

};



/*
==========================================
SECURITY CONFIGURATION
==========================================
*/


if(!JWT_SECRET){

    console.error(

        "❌ HONEY IA AUTH: JWT_SECRET não configurado."

    );

}



/*
==========================================
UTILITY
SAFE ERROR RESPONSE
==========================================
*/


function sendAuthError(

    res,

    status,

    message

){

    return res.status(status).json({

        success: false,

        error: message

    });

}



/*
==========================================
EXTRACT BEARER TOKEN
==========================================
*/


export function extractAuthToken(req){


    const authorization =

        req.headers.authorization;



    if(

        !authorization ||

        typeof authorization !== "string"

    ){

        return null;

    }



    if(

        !authorization

            .toLowerCase()

            .startsWith("bearer ")

    ){

        return null;

    }



    const token =

        authorization

            .slice(7)

            .trim();



    if(!token){

        return null;

    }



    return token;

}



/*
==========================================
VALIDATE OBJECT ID
==========================================
*/


function isValidUserId(id){


    return (

        typeof id === "string" &&

        mongoose.Types.ObjectId.isValid(id)

    );

}



/*
==========================================
VERIFY JWT
==========================================
*/


function verifyToken(token){


    if(!JWT_SECRET){

        throw new Error(

            "JWT_SECRET não configurado."

        );

    }



    return jwt.verify(

        token,

        JWT_SECRET,

        {

            algorithms: [

                AUTH_CONFIG.algorithm

            ]

        }

    );

}



/*
==========================================
AUTH MIDDLEWARE
REQUIRED AUTHENTICATION
==========================================
*/


export async function authMiddleware(

    req,

    res,

    next

){


    try{


        /*
        ==================================
        1. JWT SECRET
        ==================================
        */


        if(!JWT_SECRET){

            console.error(

                "❌ AUTH: JWT_SECRET não configurado."

            );



            return sendAuthError(

                res,

                500,

                "Sistema de autenticação não configurado."

            );

        }



        /*
        ==================================
        2. EXTRACT TOKEN
        ==================================
        */


        const token =

            extractAuthToken(req);



        if(!token){


            return sendAuthError(

                res,

                401,

                "Sessão não encontrada."

            );

        }



        /*
        ==================================
        3. VERIFY JWT
        ==================================
        */


        let decoded;



        try{


            decoded =

                verifyToken(token);


        }

        catch(error){


            if(

                error.name ===

                "TokenExpiredError"

            ){

                return sendAuthError(

                    res,

                    401,

                    "Sessão expirada."

                );

            }



            if(

                error.name ===

                "JsonWebTokenError"

            ){

                return sendAuthError(

                    res,

                    401,

                    "Sessão inválida."

                );

            }



            if(

                error.name ===

                "NotBeforeError"

            ){

                return sendAuthError(

                    res,

                    401,

                    "Sessão ainda não está ativa."

                );

            }



            console.error(

                "JWT VERIFY ERROR:",

                error

            );



            return sendAuthError(

                res,

                401,

                "Token de autenticação inválido."

            );

        }



        /*
        ==================================
        4. VALIDATE JWT PAYLOAD
        ==================================
        */


        if(

            !decoded ||

            typeof decoded !== "object"

        ){

            return sendAuthError(

                res,

                401,

                "Token inválido."

            );

        }



        if(!decoded.id){

            return sendAuthError(

                res,

                401,

                "Token sem identificação de utilizador."

            );

        }



        if(

            !isValidUserId(

                decoded.id

            )

        ){

            return sendAuthError(

                res,

                401,

                "Identificação de utilizador inválida."

            );

        }



        /*
        ==================================
        5. OPTIONAL EMAIL VALIDATION
        ==================================
        */


        if(

            decoded.email &&

            typeof decoded.email !== "string"

        ){

            return sendAuthError(

                res,

                401,

                "Token inválido."

            );

        }



        /*
        ==================================
        6. FIND DATABASE SESSION
        ==================================
        */


        const session =

            await Session.findOne({

                token,

                userId:

                    decoded.id

            });



        if(!session){

            return sendAuthError(

                res,

                401,

                "Sessão não encontrada ou terminada."

            );

        }



        /*
        ==================================
        7. CHECK SESSION EXPIRATION
        ==================================
        */


        if(

            !session.expiresAt ||

            session.expiresAt <= new Date()

        ){


            await Session.deleteOne({

                _id:

                    session._id

            });



            return sendAuthError(

                res,

                401,

                "Sessão expirada."

            );

        }



        /*
        ==================================
        8. FIND USER
        ==================================
        */


        const user =

            await User.findById(

                decoded.id

            );



        if(!user){


            /*
            ------------------------------
            Remove orphan session
            ------------------------------
            */


            await Session.deleteOne({

                _id:

                    session._id

            });



            return sendAuthError(

                res,

                401,

                "Utilizador não encontrado."

            );

        }



        /*
        ==================================
        9. VERIFY TOKEN EMAIL
        ==================================
        */


        if(

            decoded.email &&

            user.email !== decoded.email

        ){

            console.warn(

                "⚠️ AUTH: Email do token não corresponde ao utilizador."

            );



            await Session.deleteOne({

                _id:

                    session._id

            });



            return sendAuthError(

                res,

                401,

                "Sessão inválida."

            );

        }



        /*
        ==================================
        10. ACCOUNT STATUS
        ==================================
        */


        if(!user.isActive){


            await Session.deleteOne({

                _id:

                    session._id

            });



            return sendAuthError(

                res,

                403,

                "Esta conta está desativada."

            );

        }



        /*
        ==================================
        11. ATTACH USER
        ==================================
        */


        req.user = user;



        /*
        ==================================
        12. ATTACH AUTH CONTEXT
        ==================================
        */


        req.auth = {

            userId:

                user._id,

            token,

            sessionId:

                session._id,

            expiresAt:

                session.expiresAt,

            provider:

                user.provider || "local",

            plan:

                user.plan || "free"

        };



        /*
        ==================================
        13. CONTINUE REQUEST
        ==================================
        */


        return next();



    }

    catch(error){


        console.error(

            "❌ AUTH MIDDLEWARE ERROR:",

            error

        );



        return sendAuthError(

            res,

            500,

            "Erro ao validar a sessão."

        );

    }

}



/*
==========================================
OPTIONAL AUTH
PUBLIC + AUTHENTICATED REQUESTS
==========================================
*/


export async function optionalAuth(

    req,

    res,

    next

){


    try{


        const token =

            extractAuthToken(req);



        /*
        ----------------------------------
        No token
        ----------------------------------
        */


        if(!token){

            req.user = null;

            req.auth = null;

            return next();

        }



        /*
        ----------------------------------
        Token supplied
        ----------------------------------
        */


        return authMiddleware(

            req,

            res,

            next

        );



    }

    catch(error){


        console.error(

            "OPTIONAL AUTH ERROR:",

            error

        );



        req.user = null;

        req.auth = null;



        return next();

    }

}



/*
==========================================
GET AUTH TOKEN
==========================================
*/


export function getAuthToken(req){


    return (

        req.auth?.token ||

        extractAuthToken(req) ||

        null

    );

}



/*
==========================================
GET AUTH USER
==========================================
*/


export function getAuthUser(req){


    return (

        req.user ||

        null

    );

}



/*
==========================================
GET AUTH USER ID
==========================================
*/


export function getAuthUserId(req){


    return (

        req.auth?.userId ||

        req.user?._id ||

        null

    );

}



/*
==========================================
GET AUTH PLAN
==========================================
*/


export function getAuthPlan(req){


    return (

        req.auth?.plan ||

        req.user?.plan ||

        "free"

    );

}



/*
==========================================
CHECK AUTHENTICATION
==========================================
*/


export function isAuthenticated(req){


    return Boolean(

        req.user &&

        req.auth?.userId

    );

}



/*
==========================================
CHECK PLAN
==========================================
*/


export function hasPlan(

    req,

    allowedPlans = []

){


    if(!Array.isArray(allowedPlans)){

        return false;

    }



    const plan =

        getAuthPlan(req);



    return allowedPlans.includes(

        plan

    );

}



/*
==========================================
PLAN MIDDLEWARE
==========================================
*/


export function requirePlan(

    allowedPlans = []

){


    return function(

        req,

        res,

        next

    ){


        if(

            !isAuthenticated(req)

        ){

            return sendAuthError(

                res,

                401,

                "Autenticação necessária."

            );

        }



        if(

            !hasPlan(

                req,

                allowedPlans

            )

        ){

            return res.status(403).json({

                success: false,

                error:

                    "O seu plano atual não permite esta funcionalidade.",

                plan:

                    getAuthPlan(req),

                requiredPlans:

                    allowedPlans

            });

        }



        return next();

    };

}



/*
==========================================
CLEAN EXPIRED SESSION
HELPER
==========================================
*/


export async function cleanupExpiredSession(

    req

){


    try{


        const token =

            getAuthToken(req);



        if(!token){

            return false;

        }



        const result =

            await Session.deleteOne({

                token

            });



        return (

            result.deletedCount > 0

        );



    }

    catch(error){


        console.error(

            "SESSION CLEANUP ERROR:",

            error

        );



        return false;

    }

}



/*
==========================================
EXPORT CONTROLLER
==========================================
*/


export default {

    authMiddleware,

    optionalAuth,

    extractAuthToken,

    getAuthToken,

    getAuthUser,

    getAuthUserId,

    getAuthPlan,

    isAuthenticated,

    hasPlan,

    requirePlan,

    cleanupExpiredSession

};
