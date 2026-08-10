/*
==========================================
HONEY IA OS
CHAT SERVICE
Conversation + AI Orchestration
V1.0
Persistent Enterprise Chat Engine
==========================================
*/


import chat from "./chat.js";

import orchestratorinstance from "./orchestrator.js";



/*
==========================================================
CONFIGURATION
==========================================================
*/


const DEFAULT_AGENT =

    "general";


const DEFAULT_MODE =

    "chat";


const DEFAULT_HISTORY_LIMIT =

    20;



/*
==========================================================
HELPERS
==========================================================
*/


function normalizeAgentId(

    agentId

){

    if(

        typeof agentId !== "string" ||

        !agentId.trim()

    ){

        return DEFAULT_AGENT;

    }



    return agentId

        .trim()

        .slice(

            0,

            150

        );

}



function normalizeMode(

    mode

){

    if(

        typeof mode !== "string" ||

        !mode.trim()

    ){

        return DEFAULT_MODE;

    }



    return mode

        .trim()

        .slice(

            0,

            50

        );

}



function normalizePrompt(

    prompt

){

    if(

        typeof prompt !== "string"

    ){

        return "";

    }



    return prompt.trim();

}



function normalizeHistoryLimit(

    limit

){

    const value =

        Number(limit);



    if(

        !Number.isFinite(value) ||

        value <= 0

    ){

        return DEFAULT_HISTORY_LIMIT;

    }



    return Math.min(

        Math.floor(value),

        100

    );

}



function normalizeWorkspaceContext(

    workspaceContext

){

    if(

        !workspaceContext ||

        typeof workspaceContext !== "object" ||

        Array.isArray(workspaceContext)

    ){

        return {};

    }



    return workspaceContext;

}



function normalizeMemory(

    memory

){

    if(

        !Array.isArray(memory)

    ){

        return [];

    }



    return memory.slice(

        0,

        50

    );

}



/*
==========================================================
VALIDATE USER
==========================================================
*/


function validateUserId(

    userId

){

    if(!userId){

        throw new Error(

            "Utilizador não autenticado."

        );

    }

}



/*
==========================================================
GET OR CREATE CONVERSATION
==========================================================
*/


export async function getOrCreateConversation(

    userId,

    options = {}

){

    validateUserId(

        userId

    );



    const conversationId =

        options.conversationId ||

        null;



    const agentId =

        normalizeAgentId(

            options.agentId

        );



    const workspace =

        typeof options.workspace === "string" &&

        options.workspace.trim()

            ?

            options.workspace

                .trim()

                .slice(

                    0,

                    100

                )

            :

            "main";



    const conversation =

        await chat.getOrCreateConversation(

            userId,

            conversationId,

            {

                agentId,

                workspace,

                title:

                    options.title ||

                    "Nova Conversa"

            }

        );



    if(!conversation){

        throw new Error(

            "Não foi possível criar ou recuperar a conversa."

        );

    }



    return conversation;

}



/*
==========================================================
GET CONVERSATION HISTORY
==========================================================
*/


export async function getConversationHistory(

    userId,

    conversationId,

    options = {}

){

    validateUserId(

        userId

    );



    if(!conversationId){

        throw new Error(

            "conversationId é obrigatório."

        );

    }



    const history =

        await chat.getChatHistory(

            userId,

            conversationId,

            {

                limit:

                    normalizeHistoryLimit(

                        options.limit

                    )

            }

        );



    if(!history){

        throw new Error(

            "Conversa não encontrada."

        );

    }



    return history;

}



/*
==========================================================
LIST USER CONVERSATIONS
==========================================================
*/


export async function listConversations(

    userId,

    options = {}

){

    validateUserId(

        userId

    );



    return chat.getConversations(

        userId,

        {

            limit:

                normalizeHistoryLimit(

                    options.limit || 50

                ),



            includeArchived:

                options.includeArchived === true,



            agentId:

                options.agentId || null

        }

    );

}



/*
==========================================================
SAVE USER MESSAGE
==========================================================
*/


export async function saveUserMessage(

    userId,

    conversationId,

    content,

    agentId = DEFAULT_AGENT

){

    validateUserId(

        userId

    );



    const prompt =

        normalizePrompt(

            content

        );



    if(!prompt){

        throw new Error(

            "Mensagem vazia."

        );

    }



    const message =

        await chat.saveMessage(

            userId,

            conversationId,

            "user",

            prompt,

            normalizeAgentId(

                agentId

            )

        );



    if(!message){

        throw new Error(

            "Não foi possível guardar a mensagem do utilizador."

        );

    }



    return message;

}



/*
==========================================================
SAVE ASSISTANT MESSAGE
==========================================================
*/


export async function saveAssistantMessage(

    userId,

    conversationId,

    content,

    agentId = DEFAULT_AGENT

){

    validateUserId(

        userId

    );



    const response =

        normalizePrompt(

            content

        );



    if(!response){

        return null;

    }



    const message =

        await chat.saveMessage(

            userId,

            conversationId,

            "assistant",

            response,

            normalizeAgentId(

                agentId

            )

        );



    if(!message){

        throw new Error(

            "Não foi possível guardar a resposta da Honey IA."

        );

    }



    return message;

}



/*
==========================================================
BUILD ORCHESTRATOR HISTORY
==========================================================
*/


export async function getAIHistory(

    userId,

    conversationId,

    limit = DEFAULT_HISTORY_LIMIT

){

    validateUserId(

        userId

    );



    if(!conversationId){

        return [];

    }



    return chat.buildAIHistory(

        userId,

        conversationId,

        normalizeHistoryLimit(

            limit

        )

    );

}



/*
==========================================================
PROCESS CHAT REQUEST
==========================================================
*/


export async function processChat(

    options = {}

){

    const {

        userId,

        conversationId = null,

        prompt,

        agentId = DEFAULT_AGENT,

        workspaceContext = {},

        memory = [],

        mode = DEFAULT_MODE,

        historyLimit = DEFAULT_HISTORY_LIMIT

    } = options;



    /*
    ------------------------------------------------------
    AUTHENTICATION
    ------------------------------------------------------
    */


    validateUserId(

        userId

    );



    /*
    ------------------------------------------------------
    PROMPT
    ------------------------------------------------------
    */


    const normalizedPrompt =

        normalizePrompt(

            prompt

        );



    if(!normalizedPrompt){

        throw new Error(

            "Prompt vazio."

        );

    }



    /*
    ------------------------------------------------------
    AGENT
    ------------------------------------------------------
    */


    const normalizedAgentId =

        normalizeAgentId(

            agentId

        );



    /*
    ------------------------------------------------------
    MODE
    ------------------------------------------------------
    */


    const normalizedMode =

        normalizeMode(

            mode

        );



    /*
    ------------------------------------------------------
    CONVERSATION
    ------------------------------------------------------
    */


    const conversation =

        await getOrCreateConversation(

            userId,

            {

                conversationId,

                agentId:

                    normalizedAgentId,

                workspace:

                    workspaceContext?.workspace ||

                    "main"

            }

        );



    const activeConversationId =

        conversation._id.toString();



    /*
    ------------------------------------------------------
    HISTORY
    ------------------------------------------------------
    */


    const history =

        await getAIHistory(

            userId,

            activeConversationId,

            historyLimit

        );



    /*
    ------------------------------------------------------
    SAVE USER MESSAGE
    ------------------------------------------------------
    */


    const userMessage =

        await saveUserMessage(

            userId,

            activeConversationId,

            normalizedPrompt,

            normalizedAgentId

        );



    /*
    ------------------------------------------------------
    ORCHESTRATOR CONTEXT
    ------------------------------------------------------
    */


    const normalizedContext =

        normalizeWorkspaceContext(

            workspaceContext

        );



    normalizedContext.conversationId =

        activeConversationId;



    normalizedContext.userId =

        userId.toString();



    /*
    ------------------------------------------------------
    AI REQUEST
    ------------------------------------------------------
    */


    let result;



    try{


        result =

            await orchestratorinstance

                .processRequest({

                    userPrompt:

                        normalizedPrompt,



                    agentId:

                        normalizedAgentId,



                    history,



                    workspaceContext:

                        normalizedContext,



                    userMemory:

                        normalizeMemory(

                            memory

                        ),



                    mode:

                        normalizedMode

                });


    }

    catch(error){


        console.error(

            "CHAT ORCHESTRATOR ERROR:",

            error

        );



        throw error;

    }



    /*
    ------------------------------------------------------
    EXTRACT RESPONSE
    ------------------------------------------------------
    */


    const answer =

        result?.response ||

        result?.resposta ||

        result?.answer ||

        result?.content ||

        "";



    /*
    ------------------------------------------------------
    AI RESPONSE VALIDATION
    ------------------------------------------------------
    */


    if(

        typeof answer !== "string" ||

        !answer.trim()

    ){

        throw new Error(

            "A Honey IA não devolveu uma resposta válida."

        );

    }



    /*
    ------------------------------------------------------
    SAVE ASSISTANT MESSAGE
    ------------------------------------------------------
    */


    const assistantMessage =

        await saveAssistantMessage(

            userId,

            activeConversationId,

            answer,

            normalizedAgentId

        );



    /*
    ------------------------------------------------------
    FINAL RESULT
    ------------------------------------------------------
    */


    return {

        success:true,



        conversation:{

            id:

                activeConversationId,

            title:

                conversation.title,

            agentId:

                conversation.agentId,

            workspace:

                conversation.workspace

        },



        message:{

            user:{

                id:

                    userMessage?._id ||

                    null,

                role:

                    "user",

                content:

                    normalizedPrompt,

                createdAt:

                    userMessage?.createdAt ||

                    null

            },



            assistant:{

                id:

                    assistantMessage?._id ||

                    null,

                role:

                    "assistant",

                content:

                    answer,

                createdAt:

                    assistantMessage?.createdAt ||

                    null

            }

        },



        response:

            answer,



        agent:

            result?.agent ||

            normalizedAgentId,



        latency:

            result?.latency ||

            null,



        usage:

            result?.usage ||

            null

    };

}



/*
==========================================================
PROCESS LIVE CHAT
==========================================================
*/


export async function processLiveChat(

    options = {}

){

    const {

        userId,

        conversationId = null,

        prompt,

        agentId = DEFAULT_AGENT,

        workspaceContext = {},

        memory = [],

        historyLimit = DEFAULT_HISTORY_LIMIT,

        onChunk,

        onComplete,

        onError

    } = options;



    try{


        validateUserId(

            userId

        );



        const normalizedPrompt =

            normalizePrompt(

                prompt

            );



        if(!normalizedPrompt){

            throw new Error(

                "Prompt vazio."

            );

        }



        const normalizedAgentId =

            normalizeAgentId(

                agentId

            );



        /*
        --------------------------------------------------
        CONVERSATION
        --------------------------------------------------
        */


        const conversation =

            await getOrCreateConversation(

                userId,

                {

                    conversationId,

                    agentId:

                        normalizedAgentId,

                    workspace:

                        workspaceContext?.workspace ||

                        "main"

                }

            );



        const activeConversationId =

            conversation._id.toString();



        /*
        --------------------------------------------------
        HISTORY
        --------------------------------------------------
        */


        const history =

            await getAIHistory(

                userId,

                activeConversationId,

                historyLimit

            );



        /*
        --------------------------------------------------
        SAVE USER MESSAGE
        --------------------------------------------------
        */


        const userMessage =

            await saveUserMessage(

                userId,

                activeConversationId,

                normalizedPrompt,

                normalizedAgentId

            );



        /*
        --------------------------------------------------
        CONTEXT
        --------------------------------------------------
        */


        const normalizedContext =

            normalizeWorkspaceContext(

                workspaceContext

            );



        normalizedContext.conversationId =

            activeConversationId;



        normalizedContext.userId =

            userId.toString();



        /*
        --------------------------------------------------
        STREAM STATE
        --------------------------------------------------
        */


        let fullResponse = "";



        /*
        --------------------------------------------------
        ORCHESTRATOR STREAM
        --------------------------------------------------
        */


        await orchestratorinstance

            .processStream({

                userPrompt:

                    normalizedPrompt,



                agentId:

                    normalizedAgentId,



                history,



                workspaceContext:

                    normalizedContext,



                userMemory:

                    normalizeMemory(

                        memory

                    ),



                mode:

                    "live",



                onChunk:(chunk)=>{


                    if(

                        typeof chunk ===

                        "string"

                    ){

                        fullResponse +=

                            chunk;

                    }



                    if(

                        typeof onChunk ===

                        "function"

                    ){

                        onChunk(

                            chunk

                        );

                    }


                },



                onComplete:async(result)=>{


                    try{


                        const answer =

                            fullResponse ||

                            result?.response ||

                            result?.resposta ||

                            result?.answer ||

                            "";



                        let assistantMessage =

                            null;



                        if(

                            typeof answer === "string" &&

                            answer.trim()

                        ){

                            assistantMessage =

                                await saveAssistantMessage(

                                    userId,

                                    activeConversationId,

                                    answer,

                                    normalizedAgentId

                                );

                        }



                        if(

                            typeof onComplete ===

                            "function"

                        ){

                            await onComplete({

                                ...result,



                                response:

                                    answer,



                                conversationId:

                                    activeConversationId,



                                userMessage,



                                assistantMessage

                            });

                        }


                    }

                    catch(error){


                        console.error(

                            "LIVE SAVE ERROR:",

                            error

                        );



                        if(

                            typeof onError ===

                            "function"

                        ){

                            onError(

                                error

                            );

                        }


                    }


                },



                onError:(error)=>{


                    console.error(

                        "LIVE ORCHESTRATOR ERROR:",

                        error

                    );



                    if(

                        typeof onError ===

                        "function"

                    ){

                        onError(

                            error

                        );

                    }


                }

            });


    }

    catch(error){


        console.error(

            "CHAT LIVE SERVICE ERROR:",

            error

        );



        if(

            typeof onError ===

            "function"

        ){

            onError(

                error

            );

            return;

        }



        throw error;

    }

}



/*
==========================================================
ARCHIVE
==========================================================
*/


export async function archiveConversation(

    userId,

    conversationId

){

    validateUserId(

        userId

    );



    return chat.archiveConversation(

        userId,

        conversationId

    );

}



/*
==========================================================
RESTORE
==========================================================
*/


export async function restoreConversation(

    userId,

    conversationId

){

    validateUserId(

        userId

    );



    return chat.restoreConversation(

        userId,

        conversationId

    );

}



/*
==========================================================
DELETE
==========================================================
*/


export async function deleteConversation(

    userId,

    conversationId

){

    validateUserId(

        userId

    );



    return chat.deleteConversation(

        userId,

        conversationId

    );

}



/*
==========================================================
UPDATE CONVERSATION
==========================================================
*/


export async function updateConversation(

    userId,

    conversationId,

    updates = {}

){

    validateUserId(

        userId

    );



    return chat.updateConversation(

        userId,

        conversationId,

        updates

    );

}



/*
==========================================================
DEFAULT EXPORT
==========================================================
*/


export default {

    getOrCreateConversation,

    getConversationHistory,

    listConversations,

    saveUserMessage,

    saveAssistantMessage,

    getAIHistory,

    processChat,

    processLiveChat,

    archiveConversation,

    restoreConversation,

    deleteConversation,

    updateConversation

};
