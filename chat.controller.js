/*
==========================================
HONEY IA OS
CHAT CONTROLLER
HTTP Chat API
V1.0
Persistent Conversation System
JWT Authentication Compatible
==========================================
*/


import chatservice from "./chat.service.js";



/*
==========================================================
HELPERS
==========================================================
*/


function getAuthenticatedUserId(

    req

){

    /*
    ------------------------------------------------------
    Compatibilidade com diferentes formatos usados
    pelo middleware de autenticação.
    ------------------------------------------------------
    */

    const user =

        req.user ||

        req.auth ||

        null;



    if(!user){

        return null;

    }



    return (

        user._id ||

        user.id ||

        user.userId ||

        null

    );

}



function sendError(

    res,

    status,

    message,

    extra = {}

){

    return res

        .status(status)

        .json({

            success:false,

            error:

                message,

            ...extra

        });

}



function normalizeConversationId(

    value

){

    if(

        typeof value !== "string"

    ){

        return null;

    }



    const id =

        value.trim();



    return id || null;

}



function normalizeAgentId(

    value

){

    if(

        typeof value !== "string" ||

        !value.trim()

    ){

        return "general";

    }



    return value

        .trim()

        .slice(

            0,

            150

        );

}



function normalizeLimit(

    value,

    fallback = 50

){

    const number =

        Number(value);



    if(

        !Number.isFinite(number) ||

        number <= 0

    ){

        return fallback;

    }



    return Math.min(

        Math.floor(number),

        100

    );

}



/*
==========================================================
CREATE CONVERSATION
POST /api/chat/conversations
==========================================================
*/


export async function createConversation(

    req,

    res

){

    try{


        const userId =

            getAuthenticatedUserId(

                req

            );



        if(!userId){

            return sendError(

                res,

                401,

                "Utilizador não autenticado."

            );

        }



        const {

            title,

            agentId,

            workspace

        } = req.body || {};



        const conversation =

            await chatservice.getOrCreateConversation(

                userId,

                {

                    agentId:

                        normalizeAgentId(

                            agentId

                        ),

                    title,

                    workspace

                }

            );



        return res

            .status(201)

            .json({

                success:true,

                conversation

            });


    }

    catch(error){


        console.error(

            "[CHAT CREATE ERROR]",

            error

        );



        return sendError(

            res,

            500,

            error.message ||

                "Não foi possível criar a conversa."

        );


    }

}



/*
==========================================================
LIST CONVERSATIONS
GET /api/chat/conversations
==========================================================
*/


export async function listConversations(

    req,

    res

){

    try{


        const userId =

            getAuthenticatedUserId(

                req

            );



        if(!userId){

            return sendError(

                res,

                401,

                "Utilizador não autenticado."

            );

        }



        const conversations =

            await chatservice.listConversations(

                userId,

                {

                    limit:

                        normalizeLimit(

                            req.query?.limit,

                            50

                        ),



                    includeArchived:

                        req.query?.archived === "true",



                    agentId:

                        req.query?.agentId ||

                        null

                }

            );



        return res.json({

            success:true,

            total:

                conversations.length,

            conversations

        });


    }

    catch(error){


        console.error(

            "[CHAT LIST ERROR]",

            error

        );



        return sendError(

            res,

            500,

            error.message ||

                "Não foi possível carregar as conversas."

        );


    }

}



/*
==========================================================
GET CONVERSATION
GET /api/chat/conversations/:conversationId
==========================================================
*/


export async function getConversation(

    req,

    res

){

    try{


        const userId =

            getAuthenticatedUserId(

                req

            );



        if(!userId){

            return sendError(

                res,

                401,

                "Utilizador não autenticado."

            );

        }



        const conversationId =

            normalizeConversationId(

                req.params?.conversationId

            );



        if(!conversationId){

            return sendError(

                res,

                400,

                "conversationId é obrigatório."

            );

        }



        const result =

            await chatservice.getConversationHistory(

                userId,

                conversationId,

                {

                    limit:

                        normalizeLimit(

                            req.query?.limit,

                            100

                        )

                }

            );



        return res.json({

            success:true,

            conversation:

                result.conversation,

            messages:

                result.messages

        });


    }

    catch(error){


        console.error(

            "[CHAT GET ERROR]",

            error

        );



        const status =

            error.message ===

                "Conversa não encontrada."

                ?

                404

                :

                500;



        return sendError(

            res,

            status,

            error.message ||

                "Não foi possível carregar a conversa."

        );


    }

}



/*
==========================================================
SEND MESSAGE
POST /api/chat
==========================================================
*/


export async function sendMessage(

    req,

    res

){

    try{


        const userId =

            getAuthenticatedUserId(

                req

            );



        if(!userId){

            return sendError(

                res,

                401,

                "Utilizador não autenticado."

            );

        }



        const body =

            req.body || {};



        const prompt =

            typeof body.prompt === "string"

                ?

                body.prompt.trim()

                :

                "";



        if(!prompt){

            return sendError(

                res,

                400,

                "Prompt vazio."

            );

        }



        const result =

            await chatservice.processChat({

                userId,



                conversationId:

                    normalizeConversationId(

                        body.conversationId

                    ),



                prompt,



                agentId:

                    normalizeAgentId(

                        body.agentId

                    ),



                workspaceContext:

                    body.workspaceContext || {},



                memory:

                    Array.isArray(

                        body.memory

                    )

                        ?

                        body.memory

                        :

                        [],



                mode:

                    body.mode || "chat",



                historyLimit:

                    normalizeLimit(

                        body.historyLimit,

                        20

                    )

            });



        return res.json(

            result

        );


    }

    catch(error){


        console.error(

            "[CHAT SEND ERROR]",

            error

        );



        const message =

            error.message ||

            "Não foi possível processar a mensagem.";



        let status = 500;



        if(

            message ===

                "Utilizador não autenticado."

        ){

            status = 401;

        }



        if(

            message ===

                "Prompt vazio."

        ){

            status = 400;

        }



        if(

            message ===

                "Conversa não encontrada."

        ){

            status = 404;

        }



        return sendError(

            res,

            status,

            message

        );


    }

}



/*
==========================================================
LIVE MESSAGE
POST /api/chat/live
==========================================================
*/


export async function sendLiveMessage(

    req,

    res

){

    const userId =

        getAuthenticatedUserId(

            req

        );



    if(!userId){

        return sendError(

            res,

            401,

            "Utilizador não autenticado."

        );

    }



    const body =

        req.body || {};



    const prompt =

        typeof body.prompt === "string"

            ?

            body.prompt.trim()

            :

            "";



    if(!prompt){

        return sendError(

            res,

            400,

            "Prompt vazio."

        );

    }



    /*
    ------------------------------------------------------
    SSE HEADERS
    ------------------------------------------------------
    */


    res.setHeader(

        "Content-Type",

        "text/event-stream"

    );



    res.setHeader(

        "Cache-Control",

        "no-cache"

    );



    res.setHeader(

        "Connection",

        "keep-alive"

    );



    res.flushHeaders?.();



    let streamClosed =

        false;



    const closeStream =

        () => {

            streamClosed = true;

        };



    req.on(

        "close",

        closeStream

    );



    try{


        await chatservice.processLiveChat({

            userId,



            conversationId:

                normalizeConversationId(

                    body.conversationId

                ),



            prompt,



            agentId:

                normalizeAgentId(

                    body.agentId

                ),



            workspaceContext:

                body.workspaceContext || {},



            memory:

                Array.isArray(

                    body.memory

                )

                    ?

                    body.memory

                    :

                    [],



            historyLimit:

                normalizeLimit(

                    body.historyLimit,

                    20

                ),



            onChunk:(chunk)=>{


                if(

                    streamClosed ||

                    res.writableEnded

                ){

                    return;

                }



                res.write(

                    `data: ${JSON.stringify({

                        text:

                            chunk

                    })}\n\n`

                );


            },



            onComplete:(result)=>{


                if(

                    streamClosed ||

                    res.writableEnded

                ){

                    return;

                }



                res.write(

                    `data: ${JSON.stringify({

                        done:true,

                        conversationId:

                            result?.conversationId ||

                            null,

                        agent:

                            result?.agent ||

                            null,

                        latency:

                            result?.latency ||

                            null

                    })}\n\n`

                );



                res.end();


            },



            onError:(error)=>{


                if(

                    streamClosed ||

                    res.writableEnded

                ){

                    return;

                }



                res.write(

                    `data: ${JSON.stringify({

                        error:

                            error?.message ||

                            "Erro no modo Live."

                    })}\n\n`

                );



                res.end();


            }

        });


    }

    catch(error){


        console.error(

            "[CHAT LIVE ERROR]",

            error

        );



        if(

            streamClosed ||

            res.writableEnded

        ){

            return;

        }



        res.write(

            `data: ${JSON.stringify({

                error:

                    error.message ||

                    "Erro no modo Live."

            })}\n\n`

        );



        res.end();


    }

}



/*
==========================================================
UPDATE CONVERSATION
PATCH /api/chat/conversations/:conversationId
==========================================================
*/


export async function updateConversation(

    req,

    res

){

    try{


        const userId =

            getAuthenticatedUserId(

                req

            );



        if(!userId){

            return sendError(

                res,

                401,

                "Utilizador não autenticado."

            );

        }



        const conversationId =

            normalizeConversationId(

                req.params?.conversationId

            );



        if(!conversationId){

            return sendError(

                res,

                400,

                "conversationId é obrigatório."

            );

        }



        const updates =

            req.body || {};



        const conversation =

            await chatservice.updateConversation(

                userId,

                conversationId,

                updates

            );



        if(!conversation){

            return sendError(

                res,

                404,

                "Conversa não encontrada."

            );

        }



        return res.json({

            success:true,

            conversation

        });


    }

    catch(error){


        console.error(

            "[CHAT UPDATE ERROR]",

            error

        );



        return sendError(

            res,

            500,

            error.message ||

                "Não foi possível atualizar a conversa."

        );


    }

}



/*
==========================================================
ARCHIVE CONVERSATION
PATCH /api/chat/conversations/:conversationId/archive
==========================================================
*/


export async function archiveConversation(

    req,

    res

){

    try{


        const userId =

            getAuthenticatedUserId(

                req

            );



        if(!userId){

            return sendError(

                res,

                401,

                "Utilizador não autenticado."

            );

        }



        const conversationId =

            normalizeConversationId(

                req.params?.conversationId

            );



        if(!conversationId){

            return sendError(

                res,

                400,

                "conversationId é obrigatório."

            );

        }



        const conversation =

            await chatservice.archiveConversation(

                userId,

                conversationId

            );



        if(!conversation){

            return sendError(

                res,

                404,

                "Conversa não encontrada."

            );

        }



        return res.json({

            success:true,

            conversation

        });


    }

    catch(error){


        console.error(

            "[CHAT ARCHIVE ERROR]",

            error

        );



        return sendError(

            res,

            500,

            error.message ||

                "Não foi possível arquivar a conversa."

        );


    }

}



/*
==========================================================
RESTORE CONVERSATION
PATCH /api/chat/conversations/:conversationId/restore
==========================================================
*/


export async function restoreConversation(

    req,

    res

){

    try{


        const userId =

            getAuthenticatedUserId(

                req

            );



        if(!userId){

            return sendError(

                res,

                401,

                "Utilizador não autenticado."

            );

        }



        const conversationId =

            normalizeConversationId(

                req.params?.conversationId

            );



        if(!conversationId){

            return sendError(

                res,

                400,

                "conversationId é obrigatório."

            );

        }



        const conversation =

            await chatservice.restoreConversation(

                userId,

                conversationId

            );



        if(!conversation){

            return sendError(

                res,

                404,

                "Conversa não encontrada."

            );

        }



        return res.json({

            success:true,

            conversation

        });


    }

    catch(error){


        console.error(

            "[CHAT RESTORE ERROR]",

            error

        );



        return sendError(

            res,

            500,

            error.message ||

                "Não foi possível restaurar a conversa."

        );


    }

}



/*
==========================================================
DELETE CONVERSATION
DELETE /api/chat/conversations/:conversationId
==========================================================
*/


export async function deleteConversation(

    req,

    res

){

    try{


        const userId =

            getAuthenticatedUserId(

                req

            );



        if(!userId){

            return sendError(

                res,

                401,

                "Utilizador não autenticado."

            );

        }



        const conversationId =

            normalizeConversationId(

                req.params?.conversationId

            );



        if(!conversationId){

            return sendError(

                res,

                400,

                "conversationId é obrigatório."

            );

        }



        const deleted =

            await chatservice.deleteConversation(

                userId,

                conversationId

            );



        if(!deleted){

            return sendError(

                res,

                404,

                "Conversa não encontrada."

            );

        }



        return res.json({

            success:true,

            message:

                "Conversa eliminada com sucesso."

        });


    }

    catch(error){


        console.error(

            "[CHAT DELETE ERROR]",

            error

        );



        return sendError(

            res,

            500,

            error.message ||

                "Não foi possível eliminar a conversa."

        );


    }

}



/*
==========================================================
EXPORTS
==========================================================
*/


export default {

    createConversation,

    listConversations,

    getConversation,

    sendMessage,

    sendLiveMessage,

    updateConversation,

    archiveConversation,

    restoreConversation,

    deleteConversation

};
