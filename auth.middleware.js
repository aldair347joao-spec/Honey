/*
==========================================
HONEY IA OS
AUTH MIDDLEWARE
JWT + MONGODB SESSION VALIDATION
V6.0
Enterprise Authentication Layer
Production Security
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


const AUTH_CONFIG = {

    algorithm: "HS256",

    issuer: "honey-ia",

    audience: "honey-ia-client"

};



/*
==========================================
SECURITY CHECK
==========================================
*/

if(!JWT_SECRET){

    console.error(

        "❌ HONEY IA AUTH: JWT_SECRET não configurado."

    );

}



/*
==========================================
SAFE ERROR
==========================================
*/

function sendAuthError(

    res,

    status,

    message

){

    return res

        .status(status)

        .json({

            success: false,

            error: message

        });

}



/*
==========================================
EXTRACT TOKEN
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


    return token || null;

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

            ],

            issuer:

                AUTH_CONFIG.issuer,

            audience:

                AUTH_CONFIG.audience

        }

    );

}



/*
==========================================
AUTH MIDDLEWARE
==========================================
*/

export async function authMiddleware(

    req,

    res,

    next

){

    try{

        if(!JWT_SECRET){

            return sendAuthError(

                res,

                500,

                "Sistema de autenticação não configurado."

            );

        }


        const token =

            extractAuthToken(req);


        if(!token){

            return sendAuthError(

                res,

                401,

                "Sessão não encontrada."

            );

        }


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
        ----------------------------------
        SESSION
        ----------------------------------
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
        ----------------------------------
        SESSION EXPIRATION
        ----------------------------------
        */

        if(

            !session.expiresAt ||

            session.expiresAt <=

                new Date()

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
        ----------------------------------
        USER
        ----------------------------------
        */

        const user =

            await User.findById(

                decoded.id

            );


        if(!user){

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
        ----------------------------------
        EMAIL CONSISTENCY
        ----------------------------------
        */

        if(

            decoded.email &&

            user.email !==

                decoded.email

        ){

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
        ----------------------------------
        ACCOUNT STATUS
        ----------------------------------
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
        ----------------------------------
        ATTACH USER
        ----------------------------------
        */

        req.user = user;


        req.auth = {

            userId:

                user._id,

            token,

            sessionId:

                session._id,

            expiresAt:

                session.expiresAt,

            provider:

                user.provider ||

                "local",

            plan:

                user.plan ||

                "free"

        };


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


        if(!token){

            req.user = null;

            req.auth = null;

            return next();

        }


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
HELPERS
==========================================
*/

export function getAuthToken(req){

    return (

        req.auth?.token ||

        extractAuthToken(req) ||

        null

    );

}


export function getAuthUser(req){

    return req.user || null;

}


export function getAuthUserId(req){

    return (

        req.auth?.userId ||

        req.user?._id ||

        null

    );

}


export function getAuthPlan(req){

    return (

        req.auth?.plan ||

        req.user?.plan ||

        "free"

    );

}


export function isAuthenticated(req){

    return Boolean(

        req.user &&

        req.auth?.userId

    );

}


export function hasPlan(

    req,

    allowedPlans = []

){

    if(

        !Array.isArray(

            allowedPlans

        )

    ){

        return false;

    }


    return allowedPlans.includes(

        getAuthPlan(req)

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

            return res

                .status(403)

                .json({

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
CLEAN SESSION
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
EXPORT
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
