/*
==========================================
HONEY IA OS
CHAT CONTROLLER
HTTP Chat API
V2.0
Production Conversation System
JWT Authentication Compatible
Live Chat / SSE
MongoDB
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



/*
==========================================================
SEND ERROR
==========================================================
*/


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

            error:message,

            ...extra

        });

}



/*
==========================================================
NORMALIZE CONVERSATION ID
==========================================================
*/


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



/*
==========================================================
NORMALIZE AGENT
==========================================================
*/


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



/*
==========================================================
NORMALIZE LIMIT
==========================================================
*/


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
NORMALIZE BODY OBJECT
==========================================================
*/


function normalizeObject(

    value

){

    if(

        !value ||

        typeof value !== "object" ||

        Array.isArray(value)

    ){

        return {};

    }



    return value;

}



/*
==========================================================
NORMALIZE MEMORY
==========================================================
*/


function normalizeMemory(

    value

){

    if(

        !Array.isArray(value)

    ){

        return [];

    }



    return value.slice(

        0,

        50

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



        const body =

            normalizeObject(

                req.body

            );



        const conversation =

            await chatservice.getOrCreateConversation(

                userId,

                {

                    conversationId:null,



                    agentId:

                        normalizeAgentId(

                            body.agentId

                        ),



                    workspace:

                        body.workspace,



                    title:

                        body.title

                }

            );



        if(!conversation){

            return sendError(

                res,

                500,

                "Não foi possível criar a conversa."

            );

        }



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

            error?.message ||

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

                        req.query?.archived ===

                        "true",



                    agentId:

                        typeof req.query?.agentId ===

                        "string"

                            ?

                            req.query.agentId

                            :

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

            error?.message ||

                "Não foi possível carregar as conversas."

        );

    }

}



/*
==========================================================
GET SINGLE CONVERSATION
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



        if(!result){

            return sendError(

                res,

                404,

                "Conversa não encontrada."

            );

        }



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

            "[CHAT GET CONVERSATION ERROR]",

            error

        );



        const message =

            error?.message ||

            "Não foi possível carregar a conversa.";



        const status =

            message ===

                "Conversa não encontrada."

                ?

                404

                :

                500;



        return sendError(

            res,

            status,

            message

        );

    }

}



/*
==========================================================
GET CONVERSATION MESSAGES
GET /api/chat/conversations/:conversationId/messages
==========================================================
*/


export async function getMessages(

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



        const history =

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



        if(!history){

            return sendError(

                res,

                404,

                "Conversa não encontrada."

            );

        }



        return res.json({

            success:true,

            conversationId,

            total:

                Array.isArray(

                    history.messages

                )

                    ?

                    history.messages.length

                    :

                    0,

            messages:

                history.messages || []

        });


    }

    catch(error){


        console.error(

            "[CHAT GET MESSAGES ERROR]",

            error

        );



        return sendError(

            res,

            500,

            error?.message ||

                "Não foi possível carregar as mensagens."

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

            normalizeObject(

                req.body

            );



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

                    normalizeObject(

                        body.workspaceContext

                    ),



                memory:

                    normalizeMemory(

                        body.memory

                    ),



                mode:

                    typeof body.mode ===

                    "string" &&

                    body.mode.trim()

                        ?

                        body.mode.trim()

                        :

                        "chat",



                historyLimit:

                    normalizeLimit(

                        body.historyLimit,

                        20

                    )

            });



        if(

            !result ||

            result.success === false

        ){

            return sendError(

                res,

                500,

                result?.error ||

                    "Não foi possível processar a mensagem.",

                result?.conversation

                    ?

                    {

                        conversation:

                            result.conversation

                    }

                    :

                    {}

            );

        }



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

            error?.message ||

            "Não foi possível processar a mensagem.";



        let status = 500;



        if(

            message ===

                "Utilizador não autenticado."

        ){

            status = 401;

        }



        else if(

            message ===

                "Prompt vazio."

        ){

            status = 400;

        }



        else if(

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
LIVE CHAT
POST /api/chat/live
Server-Sent Events
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

        normalizeObject(

            req.body

        );



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


    res.status(200);



    res.setHeader(

        "Content-Type",

        "text/event-stream; charset=utf-8"

    );



    res.setHeader(

        "Cache-Control",

        "no-cache, no-transform"

    );



    res.setHeader(

        "Connection",

        "keep-alive"

    );



    res.setHeader(

        "X-Accel-Buffering",

        "no"

    );



    res.flushHeaders?.();



    /*
    ------------------------------------------------------
    STREAM STATE
    ------------------------------------------------------
    */


    let streamClosed = false;



    const closeStream =

        () => {

            streamClosed = true;

        };



    req.on(

        "close",

        closeStream

    );



    /*
    ------------------------------------------------------
    SSE WRITER
    ------------------------------------------------------
    */


    const sendEvent =

        (payload)=>{


            if(

                streamClosed ||

                res.writableEnded ||

                res.destroyed

            ){

                return false;

            }



            try{


                res.write(

                    `data: ${JSON.stringify(

                        payload

                    )}\n\n`

                );



                return true;


            }

            catch(error){


                streamClosed = true;



                return false;

            }

        };



    /*
    ------------------------------------------------------
    INITIAL EVENT
    ------------------------------------------------------
    */


    sendEvent({

        connected:true

    });



    /*
    ------------------------------------------------------
    PROCESS STREAM
    ------------------------------------------------------
    */


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

                normalizeObject(

                    body.workspaceContext

                ),



            memory:

                normalizeMemory(

                    body.memory

                ),



            historyLimit:

                normalizeLimit(

                    body.historyLimit,

                    20

                ),



            onChunk:(chunk)=>{


                if(

                    typeof chunk !==

                    "string"

                ){

                    return;

                }



                sendEvent({

                    text:

                        chunk

                });


            },



            onComplete:(result)=>{


                if(

                    streamClosed ||

                    res.writableEnded

                ){

                    return;

                }



                sendEvent({

                    done:true,



                    conversationId:

                        result?.conversationId ||

                        null,



                    agent:

                        result?.agent ||

                        null,



                    response:

                        result?.response ||

                        "",



                    latency:

                        result?.latency ||

                        null,



                    usage:

                        result?.usage ||

                        null

                });



                if(

                    !res.writableEnded

                ){

                    res.end();

                }


            },



            onError:(error)=>{


                if(

                    streamClosed ||

                    res.writableEnded

                ){

                    return;

                }



                sendEvent({

                    error:

                        error?.message ||

                        "Erro no modo Live."

                });



                if(

                    !res.writableEnded

                ){

                    res.end();

                }


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



        sendEvent({

            error:

                error?.message ||

                "Erro no modo Live."

        });



        if(

            !res.writableEnded

        ){

            res.end();

        }

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

            normalizeObject(

                req.body

            );



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

            error?.message ||

                "Não foi possível atualizar a conversa."

        );

    }

}



/*
==========================================================
ARCHIVE CONVERSATION
POST /api/chat/conversations/:conversationId/archive
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

            error?.message ||

                "Não foi possível arquivar a conversa."

        );

    }

}



/*
==========================================================
RESTORE CONVERSATION
POST /api/chat/conversations/:conversationId/restore
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

            error?.message ||

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

            error?.message ||

                "Não foi possível eliminar a conversa."

        );

    }

}



/*
==========================================================
DEFAULT EXPORT
==========================================================
*/


export default {

    createConversation,

    listConversations,

    getConversation,

    getMessages,

    sendMessage,

    sendLiveMessage,

    updateConversation,

    archiveConversation,

    restoreConversation,

    deleteConversation

};
