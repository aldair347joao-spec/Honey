/*
==========================================
HONEY IA OS
CHAT SERVICE
Conversation + AI Orchestration
V3.0
Production Chat Engine
Persistent Conversations
Multi-Agent Orchestration
Tool Calling
Artifacts
Live Processing
Workspace Context
User Memory
Production Hardened
==========================================
*/


import chat from "./chat.persistence.js";

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


const DEFAULT_WORKSPACE =

    "main";


const DEFAULT_HISTORY_LIMIT =

    20;


const MAX_MEMORY_ITEMS =

    50;



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

        .toLowerCase()

        .slice(

            0,

            150

        );

}



/*
==========================================================
NORMALIZE MODE
==========================================================
*/


function normalizeMode(

    mode

){

    if(

        typeof mode !== "string" ||

        !mode.trim()

    ){

        return DEFAULT_MODE;

    }


    const normalized =

        mode

            .trim()

            .toLowerCase()

            .slice(

                0,

                50

            );


    return normalized || DEFAULT_MODE;

}



/*
==========================================================
NORMALIZE PROMPT
==========================================================
*/


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



/*
==========================================================
NORMALIZE HISTORY LIMIT
==========================================================
*/


function normalizeHistoryLimit(

    limit

){

    const value =

        Number(

            limit

        );


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



/*
==========================================================
NORMALIZE WORKSPACE CONTEXT
==========================================================
*/


function normalizeWorkspaceContext(

    workspaceContext

){

    if(

        !workspaceContext ||

        typeof workspaceContext !== "object" ||

        Array.isArray(workspaceContext)

    ){

        return {

            workspace:

                DEFAULT_WORKSPACE

        };

    }


    const context = {

        ...workspaceContext

    };


    if(

        typeof context.workspace !== "string" ||

        !context.workspace.trim()

    ){

        context.workspace =

            DEFAULT_WORKSPACE;

    }

    else{

        context.workspace =

            context.workspace

                .trim()

                .slice(

                    0,

                    100

                );

    }


    return context;

}



/*
==========================================================
NORMALIZE MEMORY
==========================================================
*/


function normalizeMemory(

    memory

){

    if(

        !Array.isArray(memory)

    ){

        return [];

    }


    return memory

        .filter(

            item =>

                typeof item === "string" ||

                (

                    item &&

                    typeof item === "object" &&

                    !Array.isArray(item)

                )

        )

        .slice(

            0,

            MAX_MEMORY_ITEMS

        );

}



/*
==========================================================
NORMALIZE ARTIFACTS
==========================================================
*/


function normalizeArtifacts(

    artifacts

){

    if(

        !Array.isArray(artifacts)

    ){

        return [];

    }


    return artifacts

        .filter(

            artifact =>

                artifact &&

                typeof artifact === "object"

        )

        .map(

            artifact => {

                const content =

                    typeof artifact.content === "string"

                        ? artifact.content

                        : "";


                const size =

                    Number.isFinite(

                        artifact.size

                    )

                        ? artifact.size

                        : content.length;


                return {

                    id:

                        artifact.id ||

                        null,


                    name:

                        artifact.name ||

                        "honey-ia-result",


                    type:

                        artifact.type ||

                        artifact.mime ||

                        "text/plain",


                    mime:

                        artifact.mime ||

                        artifact.type ||

                        "text/plain",


                    kind:

                        artifact.kind ||

                        "artifact",


                    language:

                        artifact.language ||

                        null,


                    content,


                    size

                };

            }

        );

}



/*
==========================================================
NORMALIZE TOOLS
==========================================================
*/


function normalizeTools(

    tools

){

    if(

        !Array.isArray(tools)

    ){

        return [];

    }


    return tools

        .filter(

            tool =>

                tool &&

                typeof tool === "object"

        )

        .map(

            tool => ({

                id:

                    tool.id ||

                    tool.toolCallId ||

                    null,


                name:

                    tool.name ||

                    tool.tool ||

                    null,


                type:

                    tool.type ||

                    "tool",


                status:

                    tool.status ||

                    (

                        tool.success === false

                            ? "failed"

                            : "completed"

                    ),


                success:

                    tool.success !== false,


                description:

                    tool.description ||

                    "",


                input:

                    tool.input ||

                    tool.arguments ||

                    null,


                output:

                    tool.output ||

                    tool.result ||

                    null,


                error:

                    tool.error ||

                    null

            })

        );

}



/*
==========================================================
NORMALIZE AI RESULT
==========================================================
*/


function normalizeAIResult(

    result,

    fallbackAgentId

){

    const response =

        result?.response ||

        result?.resposta ||

        result?.answer ||

        result?.content ||

        "";


    return {

        success:

            result?.success !== false,


        response:

            typeof response === "string"

                ? response

                : String(

                    response || ""

                ),


        agent:

            result?.agent ||

            {

                id:

                    fallbackAgentId,

                name:

                    "Honey IA",

                emoji:

                    "🤖"

            },


        artifacts:

            normalizeArtifacts(

                result?.artifacts

            ),


        tools:

            normalizeTools(

                result?.tools ||

                result?.toolResults ||

                result?.toolCalls

            ),


        routing:

            result?.routing ||

            null,


        usage:

            result?.usage ||

            null,


        latency:

            result?.latency ||

            null,


        error:

            result?.error ||

            null

    };

}



/*
==========================================================
VALIDATE USER
==========================================================
*/


function validateUserId(

    userId

){

    if(

        userId === undefined ||

        userId === null ||

        String(userId).trim() === ""

    ){

        throw new Error(

            "Utilizador não autenticado."

        );

    }

}



/*
==========================================================
VALIDATE CONVERSATION
==========================================================
*/


function validateConversationId(

    conversationId

){

    if(

        conversationId === undefined ||

        conversationId === null ||

        String(conversationId).trim() === ""

    ){

        throw new Error(

            "conversationId é obrigatório."

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


    const workspaceContext =

        normalizeWorkspaceContext(

            options.workspaceContext ||

            {

                workspace:

                    options.workspace ||

                    DEFAULT_WORKSPACE

            }

        );


    const workspace =

        workspaceContext.workspace ||

        DEFAULT_WORKSPACE;


    const title =

        typeof options.title === "string" &&

        options.title.trim()

            ? options.title

                .trim()

                .slice(

                    0,

                    200

                )

            : "Nova Conversa";


    const conversation =

        await chat.getOrCreateConversation(

            userId,

            conversationId,

            {

                agentId,

                workspace,

                title

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


    validateConversationId(

        conversationId

    );


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

                    options.limit ||

                    50

                ),


            includeArchived:

                options.includeArchived === true,


            agentId:

                options.agentId

                    ? normalizeAgentId(

                        options.agentId

                    )

                    : null

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


    validateConversationId(

        conversationId

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


    validateConversationId(

        conversationId

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
BUILD AI HISTORY
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
BUILD WORKSPACE CONTEXT
==========================================================
*/


function buildContext(

    workspaceContext,

    userId,

    conversationId

){

    const context =

        normalizeWorkspaceContext(

            workspaceContext

        );


    context.userId =

        String(

            userId

        );


    context.conversationId =

        String(

            conversationId

        );


    return context;

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
    WORKSPACE
    ------------------------------------------------------
    */


    const normalizedContext =

        normalizeWorkspaceContext(

            workspaceContext

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

                workspaceContext:

                    normalizedContext

            }

        );


    const activeConversationId =

        String(

            conversation._id

        );


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
    BUILD FINAL CONTEXT
    ------------------------------------------------------
    */


    const finalContext =

        buildContext(

            normalizedContext,

            userId,

            activeConversationId

        );


    /*
    ------------------------------------------------------
    AI REQUEST
    ------------------------------------------------------
    */


    let result;


    try{

        result =

            await orchestratorinstance.processRequest({

                userPrompt:

                    normalizedPrompt,


                agentId:

                    normalizedAgentId,


                history,


                workspaceContext:

                    finalContext,


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
    NORMALIZE RESULT
    ------------------------------------------------------
    */


    const aiResult =

        normalizeAIResult(

            result,

            normalizedAgentId

        );


    /*
    ------------------------------------------------------
    ORCHESTRATOR FAILURE
    ------------------------------------------------------
    */

    if(

        aiResult.success === false

    ){

        throw new Error(

            aiResult.error ||

            "A Honey IA não conseguiu processar o pedido."

        );

    }


    /*
    ------------------------------------------------------
    RESPONSE
    ------------------------------------------------------
    */


    const answer =

        normalizePrompt(

            aiResult.response

        );


    if(!answer){

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

        success:

            true,


        conversation: {

            id:

                activeConversationId,


            title:

                conversation.title,


            agentId:

                conversation.agentId ||


                normalizedAgentId,


            workspace:

                conversation.workspace ||

                finalContext.workspace ||

                DEFAULT_WORKSPACE

        },


        message: {

            user: {

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


            assistant: {

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

            aiResult.agent,


        routing:

            aiResult.routing,


        tools:

            aiResult.tools,


        artifacts:

            aiResult.artifacts,


        latency:

            aiResult.latency,


        usage:

            aiResult.usage

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

        /*
        --------------------------------------------------
        AUTHENTICATION
        --------------------------------------------------
        */


        validateUserId(

            userId

        );


        /*
        --------------------------------------------------
        PROMPT
        --------------------------------------------------
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
        --------------------------------------------------
        AGENT
        --------------------------------------------------
        */


        const normalizedAgentId =

            normalizeAgentId(

                agentId

            );


        /*
        --------------------------------------------------
        WORKSPACE
        --------------------------------------------------
        */


        const normalizedContext =

            normalizeWorkspaceContext(

                workspaceContext

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

                    workspaceContext:

                        normalizedContext

                }

            );


        const activeConversationId =

            String(

                conversation._id

            );


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
        FINAL CONTEXT
        --------------------------------------------------
        */


        const finalContext =

            buildContext(

                normalizedContext,

                userId,

                activeConversationId

            );


        /*
        --------------------------------------------------
        RESPONSE STATE
        --------------------------------------------------
        */


        let fullResponse = "";


        let completed = false;


        /*
        --------------------------------------------------
        ORCHESTRATOR STREAM
        --------------------------------------------------
        */


        const result =

            await orchestratorinstance.processStream({

                userPrompt:

                    normalizedPrompt,


                agentId:

                    normalizedAgentId,


                history,


                workspaceContext:

                    finalContext,


                userMemory:

                    normalizeMemory(

                        memory

                    ),


                mode:

                    "live",


                onChunk:

                    (chunk) => {

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


                onComplete:

                    async (orchestratorResult) => {

                        try{

                            const aiResult =

                                normalizeAIResult(

                                    {

                                        ...orchestratorResult,

                                        response:

                                            fullResponse ||

                                            orchestratorResult?.response ||

                                            ""

                                    },

                                    normalizedAgentId

                                );


                            if(

                                aiResult.success ===

                                false

                            ){

                                throw new Error(

                                    aiResult.error ||

                                    "A Honey IA não conseguiu concluir a resposta."

                                );

                            }


                            const answer =

                                normalizePrompt(

                                    aiResult.response

                                );


                            if(!answer){

                                throw new Error(

                                    "A Honey IA não devolveu uma resposta válida."

                                );

                            }


                            /*
                            ----------------------------------
                            SAVE ASSISTANT
                            ----------------------------------
                            */


                            const assistantMessage =

                                await saveAssistantMessage(

                                    userId,

                                    activeConversationId,

                                    answer,

                                    normalizedAgentId

                                );


                            completed = true;


                            /*
                            ----------------------------------
                            CALLBACK
                            ----------------------------------
                            */


                            if(

                                typeof onComplete ===

                                "function"

                            ){

                                await onComplete({

                                    success:

                                        true,


                                    conversationId:

                                        activeConversationId,


                                    conversation: {

                                        id:

                                            activeConversationId,


                                        title:

                                            conversation.title,


                                        agentId:

                                            conversation.agentId ||

                                            normalizedAgentId,


                                        workspace:

                                            conversation.workspace ||

                                            finalContext.workspace ||

                                            DEFAULT_WORKSPACE

                                    },


                                    userMessage,


                                    assistantMessage,


                                    response:

                                        answer,


                                    agent:

                                        aiResult.agent,


                                    routing:

                                        aiResult.routing,


                                    tools:

                                        aiResult.tools,


                                    artifacts:

                                        aiResult.artifacts,


                                    latency:

                                        aiResult.latency,


                                    usage:

                                        aiResult.usage

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

                                await onError(

                                    error

                                );

                            }

                            else{

                                throw error;

                            }

                        }

                    },


                onError:

                    async (error) => {

                        console.error(

                            "LIVE ORCHESTRATOR ERROR:",

                            error

                        );


                        if(

                            typeof onError ===

                            "function"

                        ){

                            await onError(

                                error

                            );

                        }

                    }

            });


        /*
        --------------------------------------------------
        FALLBACK COMPLETION
        --------------------------------------------------
        */


        if(

            !completed &&

            result?.success === false

        ){

            const error =

                new Error(

                    result.error ||

                    "A Honey IA não conseguiu processar o pedido."

                );


            if(

                typeof onError ===

                "function"

            ){

                await onError(

                    error

                );

                return;

            }


            throw error;

        }


        return result;

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

            await onError(

                error

            );


            return;

        }


        throw error;

    }

}



/*
==========================================================
ARCHIVE CONVERSATION
==========================================================
*/


export async function archiveConversation(

    userId,

    conversationId

){

    validateUserId(

        userId

    );


    validateConversationId(

        conversationId

    );


    return chat.archiveConversation(

        userId,

        conversationId

    );

}



/*
==========================================================
RESTORE CONVERSATION
==========================================================
*/


export async function restoreConversation(

    userId,

    conversationId

){

    validateUserId(

        userId

    );


    validateConversationId(

        conversationId

    );


    return chat.restoreConversation(

        userId,

        conversationId

    );

}



/*
==========================================================
DELETE CONVERSATION
==========================================================
*/


export async function deleteConversation(

    userId,

    conversationId

){

    validateUserId(

        userId

    );


    validateConversationId(

        conversationId

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


    validateConversationId(

        conversationId

    );


    if(

        !updates ||

        typeof updates !== "object" ||

        Array.isArray(updates)

    ){

        throw new Error(

            "Dados de atualização inválidos."

        );

    }


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
