/*
==========================================
HONEY IA OS
CHAT ROUTES
Conversation + AI Chat API
V2.0
Production Chat Architecture
JWT Protected
MongoDB
SSE Live Chat
==========================================
*/


import express from "express";

import jwt from "jsonwebtoken";

import { User } from "./models.js";

import chatController from "./chat.controller.js";



/*
==========================================================
ROUTER
==========================================================
*/


const router =

    express.Router();



/*
==========================================================
CONFIGURATION
==========================================================
*/


const JWT_SECRET =

    process.env.JWT_SECRET ||

    "honey-secret-change-me";



/*
==========================================================
AUTHENTICATION MIDDLEWARE
JWT SESSION PROTECTION
==========================================================
*/


async function requireAuth(

    req,

    res,

    next

){

    try{


        /*
        --------------------------------------------------
        AUTHORIZATION HEADER
        --------------------------------------------------
        */


        const authorization =

            req.headers.authorization;



        if(

            !authorization ||

            !authorization.startsWith(

                "Bearer "

            )

        ){

            return res

                .status(401)

                .json({

                    success:false,

                    error:

                        "Não autenticado."

                });

        }



        /*
        --------------------------------------------------
        TOKEN
        --------------------------------------------------
        */


        const token =

            authorization

                .slice(7)

                .trim();



        if(!token){

            return res

                .status(401)

                .json({

                    success:false,

                    error:

                        "Token de autenticação ausente."

                });

        }



        /*
        --------------------------------------------------
        VERIFY JWT
        --------------------------------------------------
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


            return res

                .status(401)

                .json({

                    success:false,

                    error:

                        "Sessão inválida ou expirada."

                });

        }



        /*
        --------------------------------------------------
        EXTRACT USER ID
        --------------------------------------------------
        */


        const userId =

            decoded.userId ||

            decoded.id ||

            decoded._id;



        if(!userId){

            return res

                .status(401)

                .json({

                    success:false,

                    error:

                        "Token de autenticação inválido."

                });

        }



        /*
        --------------------------------------------------
        LOAD USER
        --------------------------------------------------
        */


        const user =

            await User

                .findById(

                    userId

                )

                .select(

                    "-password " +

                    "-verificationCode " +

                    "-verificationExpires"

                );



        if(!user){

            return res

                .status(401)

                .json({

                    success:false,

                    error:

                        "Utilizador não encontrado."

                });

        }



        /*
        --------------------------------------------------
        ACCOUNT STATUS
        --------------------------------------------------
        */


        if(!user.isActive){

            return res

                .status(403)

                .json({

                    success:false,

                    error:

                        "A conta encontra-se desativada."

                });

        }



        /*
        --------------------------------------------------
        ATTACH AUTHENTICATED USER
        --------------------------------------------------
        */


        req.user = user;

        req.userId = user._id;



        return next();


    }

    catch(error){


        console.error(

            "[CHAT AUTH ERROR]",

            error

        );



        return res

            .status(500)

            .json({

                success:false,

                error:

                    "Erro ao validar autenticação."

            });

    }

}



/*
==========================================================
HEALTH
GET /api/chat/health
==========================================================
*/


router.get(

    "/health",

    (req,res)=>{


        return res.json({

            success:true,

            system:

                "Honey IA Chat",

            status:

                "online"

        });


    }

);



/*
==========================================================
SEND MESSAGE
POST /api/chat
==========================================================
*/


router.post(

    "/",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .sendMessage(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
SEND MESSAGE ALIAS
POST /api/chat/message
==========================================================
*/


router.post(

    "/message",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .sendMessage(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
LIVE CHAT
POST /api/chat/live
==========================================================

Server-Sent Events
Streaming AI Response
==========================================================
*/


router.post(

    "/live",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .sendLiveMessage(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
LIST CONVERSATIONS
GET /api/chat/conversations
==========================================================
*/


router.get(

    "/conversations",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .listConversations(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
CREATE CONVERSATION
POST /api/chat/conversations
==========================================================
*/


router.post(

    "/conversations",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .createConversation(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
GET SINGLE CONVERSATION
GET /api/chat/conversations/:conversationId
==========================================================
*/


router.get(

    "/conversations/:conversationId",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .getConversation(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
GET CONVERSATION MESSAGES
GET /api/chat/conversations/:conversationId/messages
==========================================================
*/


router.get(

    "/conversations/:conversationId/messages",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .getMessages(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
UPDATE CONVERSATION
PATCH /api/chat/conversations/:conversationId
==========================================================
*/


router.patch(

    "/conversations/:conversationId",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .updateConversation(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
ARCHIVE CONVERSATION
POST /api/chat/conversations/:conversationId/archive
==========================================================
*/


router.post(

    "/conversations/:conversationId/archive",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .archiveConversation(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
RESTORE CONVERSATION
POST /api/chat/conversations/:conversationId/restore
==========================================================
*/


router.post(

    "/conversations/:conversationId/restore",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .restoreConversation(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
DELETE CONVERSATION
DELETE /api/chat/conversations/:conversationId
==========================================================
*/


router.delete(

    "/conversations/:conversationId",

    requireAuth,

    async(req,res,next)=>{


        try{


            return await chatController

                .deleteConversation(

                    req,

                    res

                );


        }

        catch(error){


            return next(error);

        }


    }

);



/*
==========================================================
GLOBAL CHAT ROUTE ERROR HANDLER
==========================================================
*/


router.use(

    (error,req,res,next)=>{


        console.error(

            "=========================================="

        );



        console.error(

            "HONEY IA CHAT ROUTE ERROR"

        );



        console.error(

            error

        );



        console.error(

            "=========================================="



        );



        if(

            res.headersSent

        ){

            return next(error);

        }



        const status =

            Number.isInteger(

                error?.status

            )

                ?

                error.status

                :

                500;



        return res

            .status(status)

            .json({

                success:false,

                error:

                    error?.message ||

                    "Erro interno no sistema de Chat."

            });

    }

);



/*
==========================================================
EXPORT
==========================================================
*/


export default router;
