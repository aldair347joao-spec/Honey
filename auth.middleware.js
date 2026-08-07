/*
==========================================
HONEY IA OS
AUTH MIDDLEWARE
JWT + MONGODB SESSION VALIDATION
V2.0
==========================================
*/


import jwt from "jsonwebtoken";

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
AUTH MIDDLEWARE
VALIDATE AUTHENTICATED REQUEST
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
        JWT SECRET
        ==================================
        */


        if(!JWT_SECRET){

            console.error(

                "❌ JWT_SECRET não configurado."

            );


            return res.status(500).json({

                success:false,

                error:

                "Sistema de autenticação não configurado."

            });

        }



        /*
        ==================================
        AUTHORIZATION HEADER
        ==================================
        */


        const authorization =

        req.headers.authorization;



        if(!authorization){

            return res.status(401).json({

                success:false,

                error:

                "Sessão não encontrada."

            });

        }



        /*
        ==================================
        EXTRACT BEARER TOKEN
        ==================================
        */


        if(

            !authorization

            .toLowerCase()

            .startsWith("bearer ")

        ){

            return res.status(401).json({

                success:false,

                error:

                "Token de autenticação inválido."

            });

        }



        const token =

        authorization

        .slice(7)

        .trim();



        if(!token){

            return res.status(401).json({

                success:false,

                error:

                "Token de autenticação não fornecido."

            });

        }



        /*
        ==================================
        VERIFY JWT
        ==================================
        */


        let decoded;



        try{


            decoded =

            jwt.verify(

                token,

                JWT_SECRET

            );


        }

        catch(error){


            if(

                error.name ===

                "TokenExpiredError"

            ){

                return res.status(401).json({

                    success:false,

                    error:

                    "Sessão expirada."

                });

            }



            return res.status(401).json({

                success:false,

                error:

                "Sessão inválida."

            });

        }



        /*
        ==================================
        VALIDATE JWT PAYLOAD
        ==================================
        */


        if(

            !decoded ||

            !decoded.id

        ){

            return res.status(401).json({

                success:false,

                error:

                "Token inválido."

            });

        }



        /*
        ==================================
        FIND ACTIVE SESSION
        ==================================
        */


        const session =

        await Session.findOne({

            token,

            userId:

            decoded.id

        });



        if(!session){

            return res.status(401).json({

                success:false,

                error:

                "Sessão não encontrada ou terminada."

            });

        }



        /*
        ==================================
        SESSION EXPIRATION
        ==================================
        */


        if(

            !session.expiresAt ||

            session.expiresAt < new Date()

        ){



            await Session.deleteOne({

                _id:

                session._id

            });



            return res.status(401).json({

                success:false,

                error:

                "Sessão expirada."

            });

        }



        /*
        ==================================
        FIND USER
        ==================================
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



            return res.status(401).json({

                success:false,

                error:

                "Utilizador não encontrado."

            });

        }



        /*
        ==================================
        ACCOUNT STATUS
        ==================================
        */


        if(!user.isActive){

            await Session.deleteOne({

                _id:

                session._id

            });



            return res.status(403).json({

                success:false,

                error:

                "Esta conta está desativada."

            });

        }



        /*
        ==================================
        ATTACH AUTH DATA TO REQUEST
        ==================================
        */


        req.user = user;


        req.auth = {

            userId:

            user._id,

            token,

            sessionId:

            session._id,

            expiresAt:

            session.expiresAt

        };



        /*
        ==================================
        CONTINUE REQUEST
        ==================================
        */


        return next();



    }

    catch(error){


        console.error(

            "AUTH MIDDLEWARE ERROR:",

            error

        );



        return res.status(500).json({

            success:false,

            error:

            "Erro ao validar a sessão."

        });

    }

}



/*
==========================================
OPTIONAL AUTH MIDDLEWARE
Useful for public/private hybrid routes
==========================================
*/


export async function optionalAuth(

    req,

    res,

    next

){


    try{


        const authorization =

        req.headers.authorization;



        if(!authorization){

            req.user = null;

            req.auth = null;

            return next();

        }



        /*
        ----------------------------------
        Reuse the normal authentication
        ----------------------------------
        */


        return authMiddleware(

            req,

            res,

            next

        );


    }

    catch(error){


        req.user = null;

        req.auth = null;


        return next();

    }

}



/*
==========================================
EXPORT
==========================================
*/


export default {

    authMiddleware,

    optionalAuth

};
