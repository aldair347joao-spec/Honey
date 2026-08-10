/*
==========================================
HONEY IA OS
CHAT PERSISTENCE ENGINE
Conversation + Message Storage
V5.0
MongoDB Persistent Chat System
Enterprise Conversation Layer
Production Ready
==========================================
*/


import {

    Conversation,

    Message

} from "./models.js";

import mongoose from "mongoose";



/*
==========================================================
CONFIGURATION
==========================================================
*/


const DEFAULT_AGENT =

    "general";


const DEFAULT_WORKSPACE =

    "main";


const DEFAULT_TITLE =

    "Nova Conversa";


const DEFAULT_LIMIT =

    20;


const MAX_LIMIT =

    100;


const MAX_CONTENT_LENGTH =

    50000;


const MAX_TITLE_LENGTH =

    200;



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



function normalizeWorkspace(

    workspace

){

    if(

        typeof workspace !== "string" ||

        !workspace.trim()

    ){

        return DEFAULT_WORKSPACE;

    }


    return workspace

        .trim()

        .slice(

            0,

            100

        );

}



function normalizeTitle(

    title

){

    if(

        typeof title !== "string" ||

        !title.trim()

    ){

        return DEFAULT_TITLE;

    }


    return title

        .trim()

        .replace(

            /\s+/g,

            " "

        )

        .slice(

            0,

            MAX_TITLE_LENGTH

        );

}



function normalizeLimit(

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

        return DEFAULT_LIMIT;

    }


    return Math.min(

        Math.floor(value),

        MAX_LIMIT

    );

}



function normalizeContent(

    content

){

    if(

        typeof content !== "string"

    ){

        return "";

    }


    return content

        .trim()

        .slice(

            0,

            MAX_CONTENT_LENGTH

        );

}



function normalizeConversationId(

    conversationId

){

    if(

        conversationId === null ||

        conversationId === undefined

    ){

        return null;

    }


    const value =

        String(

            conversationId

        )

            .trim();


    if(!value){

        return null;

    }


    if(

        !mongoose.Types.ObjectId.isValid(

            value

        )

    ){

        return null;

    }


    return value;

}



function normalizeRole(

    role

){

    if(

        [

            "user",

            "assistant",

            "system"

        ].includes(

            role

        )

    ){

        return role;

    }


    return null;

}



function isValidUserId(

    userId

){

    return Boolean(

        userId

    );

}



function buildConversationQuery(

    userId,

    conversationId

){

    const normalizedId =

        normalizeConversationId(

            conversationId

        );


    if(

        !isValidUserId(userId) ||

        !normalizedId

    ){

        return null;

    }


    return {

        _id:

            normalizedId,

        userId

    };

}



/*
==========================================================
CREATE CONVERSATION
==========================================================
*/


export async function createConversation(

    userId,

    options = {}

){

    if(

        !isValidUserId(

            userId

        )

    ){

        throw new Error(

            "userId é obrigatório."

        );

    }


    try{

        const conversation =

            new Conversation({

                userId,

                title:

                    normalizeTitle(

                        options.title

                    ),

                agentId:

                    normalizeAgentId(

                        options.agentId

                    ),

                workspace:

                    normalizeWorkspace(

                        options.workspace

                    ),

                archived:

                    false

            });


        await conversation.save();


        return conversation;

    }

    catch(error){

        console.error(

            "[CHAT CREATE ERROR]",

            error

        );


        throw error;

    }

}



/*
==========================================================
GET CONVERSATION
==========================================================
*/


export async function getConversation(

    userId,

    conversationId

){

    const query =

        buildConversationQuery(

            userId,

            conversationId

        );


    if(!query){

        return null;

    }


    try{

        return await Conversation.findOne(

            query

        );

    }

    catch(error){

        console.error(

            "[CHAT GET CONVERSATION ERROR]",

            error

        );


        throw error;

    }

}



/*
==========================================================
GET OR CREATE CONVERSATION
==========================================================
*/


export async function getOrCreateConversation(

    userId,

    conversationId = null,

    options = {}

){

    if(

        !isValidUserId(

            userId

        )

    ){

        return null;

    }


    try{

        const normalizedConversationId =

            normalizeConversationId(

                conversationId

            );


        /*
        --------------------------------------------------
        EXISTING CONVERSATION
        --------------------------------------------------
        */


        if(

            normalizedConversationId

        ){

            const existing =

                await getConversation(

                    userId,

                    normalizedConversationId

                );


            if(existing){

                return existing;

            }


            /*
            ------------------------------------------------
            ID FOI FORNECIDO MAS NÃO EXISTE
            ------------------------------------------------

            Não criamos silenciosamente uma nova conversa
            quando o cliente forneceu um ID válido.

            Isto evita que uma conversa perdida seja
            acidentalmente transformada numa nova conversa.
            ------------------------------------------------
            */


            return null;

        }


        /*
        --------------------------------------------------
        CREATE NEW
        --------------------------------------------------
        */


        return await createConversation(

            userId,

            {

                title:

                    options.title ||

                    DEFAULT_TITLE,



                agentId:

                    options.agentId ||

                    DEFAULT_AGENT,



                workspace:

                    options.workspace ||

                    DEFAULT_WORKSPACE

            }

        );

    }

    catch(error){

        console.error(

            "[CHAT GET/CREATE ERROR]",

            error

        );


        throw error;

    }

}



/*
==========================================================
LIST CONVERSATIONS
==========================================================
*/


export async function getConversations(

    userId,

    options = {}

){

    if(

        !isValidUserId(

            userId

        )

    ){

        return [];

    }


    try{

        const query = {

            userId

        };


        /*
        --------------------------------------------------
        ARCHIVED FILTER
        --------------------------------------------------
        */


        if(

            options.includeArchived !== true

        ){

            query.archived = false;

        }


        /*
        --------------------------------------------------
        AGENT FILTER
        --------------------------------------------------
        */


        if(

            typeof options.agentId === "string" &&

            options.agentId.trim()

        ){

            query.agentId =

                normalizeAgentId(

                    options.agentId

                );

        }


        /*
        --------------------------------------------------
        QUERY
        --------------------------------------------------
        */


        return await Conversation

            .find(

                query

            )

            .sort({

                updatedAt:

                    -1

            })

            .limit(

                normalizeLimit(

                    options.limit || 50

                )

            );

    }

    catch(error){

        console.error(

            "[CHAT LIST ERROR]",

            error

        );


        throw error;

    }

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

    const query =

        buildConversationQuery(

            userId,

            conversationId

        );


    if(!query){

        return null;

    }


    try{

        const allowedUpdates = {};


        /*
        --------------------------------------------------
        TITLE
        --------------------------------------------------
        */


        if(

            typeof updates.title === "string"

        ){

            allowedUpdates.title =

                normalizeTitle(

                    updates.title

                );

        }


        /*
        --------------------------------------------------
        AGENT
        --------------------------------------------------
        */


        if(

            typeof updates.agentId === "string"

        ){

            allowedUpdates.agentId =

                normalizeAgentId(

                    updates.agentId

                );

        }


        /*
        --------------------------------------------------
        WORKSPACE
        --------------------------------------------------
        */


        if(

            typeof updates.workspace === "string"

        ){

            allowedUpdates.workspace =

                normalizeWorkspace(

                    updates.workspace

                );

        }


        /*
        --------------------------------------------------
        ARCHIVED
        --------------------------------------------------
        */


        if(

            typeof updates.archived === "boolean"

        ){

            allowedUpdates.archived =

                updates.archived;

        }


        /*
        --------------------------------------------------
        NOTHING TO UPDATE
        --------------------------------------------------
        */


        if(

            !Object.keys(

                allowedUpdates

            ).length

        ){

            return getConversation(

                userId,

                conversationId

            );

        }


        /*
        --------------------------------------------------
        UPDATE TIMESTAMP
        --------------------------------------------------
        */


        allowedUpdates.updatedAt =

            new Date();


        /*
        --------------------------------------------------
        DATABASE UPDATE
        --------------------------------------------------
        */


        return await Conversation.findOneAndUpdate(

            query,

            {

                $set:

                    allowedUpdates

            },

            {

                new:

                    true,

                runValidators:

                    true

            }

        );

    }

    catch(error){

        console.error(

            "[CHAT UPDATE ERROR]",

            error

        );


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

    return updateConversation(

        userId,

        conversationId,

        {

            archived:

                true

        }

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

    return updateConversation(

        userId,

        conversationId,

        {

            archived:

                false

        }

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

    const query =

        buildConversationQuery(

            userId,

            conversationId

        );


    if(!query){

        return false;

    }


    try{

        /*
        --------------------------------------------------
        VERIFY OWNERSHIP
        --------------------------------------------------
        */


        const conversation =

            await Conversation.findOne(

                query

            );


        if(!conversation){

            return false;

        }


        /*
        --------------------------------------------------
        DELETE MESSAGES
        --------------------------------------------------
        */


        await Message.deleteMany({

            conversationId:

                conversation._id

        });


        /*
        --------------------------------------------------
        DELETE CONVERSATION
        --------------------------------------------------
        */


        await Conversation.deleteOne({

            _id:

                conversation._id,

            userId

        });


        return true;

    }

    catch(error){

        console.error(

            "[CHAT DELETE ERROR]",

            error

        );


        throw error;

    }

}



/*
==========================================================
SAVE MESSAGE
==========================================================
*/


export async function saveMessage(

    userId,

    conversationId,

    role,

    content,

    agentId = DEFAULT_AGENT

){

    if(

        !isValidUserId(

            userId

        )

    ){

        throw new Error(

            "userId é obrigatório."

        );

    }


    const query =

        buildConversationQuery(

            userId,

            conversationId

        );


    if(!query){

        throw new Error(

            "conversationId inválido."

        );

    }


    const normalizedRole =

        normalizeRole(

            role

        );


    if(!normalizedRole){

        throw new Error(

            "Role de mensagem inválida."

        );

    }


    const normalizedContent =

        normalizeContent(

            content

        );


    if(!normalizedContent){

        throw new Error(

            "O conteúdo da mensagem está vazio."

        );

    }


    try{

        /*
        --------------------------------------------------
        VERIFY CONVERSATION OWNERSHIP
        --------------------------------------------------
        */


        const conversation =

            await Conversation.findOne(

                query

            );


        if(!conversation){

            throw new Error(

                "Conversa não encontrada."

            );

        }


        /*
        --------------------------------------------------
        AGENT
        --------------------------------------------------
        */


        const normalizedAgentId =

            normalizeAgentId(

                agentId ||

                conversation.agentId

            );


        /*
        --------------------------------------------------
        CREATE MESSAGE
        --------------------------------------------------
        */


        const message =

            new Message({

                conversationId:

                    conversation._id,

                agentId:

                    normalizedAgentId,

                role:

                    normalizedRole,

                content:

                    normalizedContent

            });


        await message.save();


        /*
        --------------------------------------------------
        UPDATE CONVERSATION
        --------------------------------------------------
        */


        conversation.updatedAt =

            new Date();


        if(

            normalizedAgentId !==

            conversation.agentId

        ){

            conversation.agentId =

                normalizedAgentId;

        }


        /*
        --------------------------------------------------
        AUTOMATIC TITLE
        --------------------------------------------------
        */


        if(

            normalizedRole === "user" &&

            (

                !conversation.title ||

                conversation.title ===

                    DEFAULT_TITLE

            )

        ){

            const generatedTitle =

                normalizedContent

                    .replace(

                        /\s+/g,

                        " "

                    )

                    .trim()

                    .slice(

                        0,

                        80

                    );


            if(generatedTitle){

                conversation.title =

                    generatedTitle;

            }

        }


        await conversation.save();


        return message;

    }

    catch(error){

        console.error(

            "[CHAT SAVE MESSAGE ERROR]",

            error

        );


        throw error;

    }

}



/*
==========================================================
GET MESSAGES
==========================================================
*/


export async function getMessages(

    userId,

    conversationId,

    options = {}

){

    const query =

        buildConversationQuery(

            userId,

            conversationId

        );


    if(!query){

        return [];

    }


    try{

        /*
        --------------------------------------------------
        VERIFY OWNERSHIP
        --------------------------------------------------
        */


        const conversation =

            await Conversation.findOne(

                query

            );


        if(!conversation){

            return [];

        }


        /*
        --------------------------------------------------
        MESSAGE QUERY
        --------------------------------------------------
        */


        const messageQuery = {

            conversationId:

                conversation._id

        };


        /*
        --------------------------------------------------
        AGENT FILTER
        --------------------------------------------------
        */


        if(

            typeof options.agentId === "string" &&

            options.agentId.trim()

        ){

            messageQuery.agentId =

                normalizeAgentId(

                    options.agentId

                );

        }


        /*
        --------------------------------------------------
        FETCH
        --------------------------------------------------
        */


        const messages =

            await Message

                .find(

                    messageQuery

                )

                .sort({

                    createdAt:

                        -1

                })

                .limit(

                    normalizeLimit(

                        options.limit || 100

                    )

                );


        /*
        --------------------------------------------------
        RESTORE CHRONOLOGICAL ORDER
        --------------------------------------------------
        */


        return messages.reverse();

    }

    catch(error){

        console.error(

            "[CHAT GET MESSAGES ERROR]",

            error

        );


        throw error;

    }

}



/*
==========================================================
GET RECENT MESSAGES
==========================================================
*/


export async function getRecentMessages(

    userId,

    conversationId,

    limit = DEFAULT_LIMIT

){

    return getMessages(

        userId,

        conversationId,

        {

            limit

        }

    );

}



/*
==========================================================
GET CHAT HISTORY
==========================================================
*/


export async function getChatHistory(

    userId,

    conversationId,

    options = {}

){

    const conversation =

        await getConversation(

            userId,

            conversationId

        );


    if(!conversation){

        return null;

    }


    try{

        const messages =

            await getMessages(

                userId,

                conversationId,

                options

            );


        return {

            conversation,

            messages

        };

    }

    catch(error){

        console.error(

            "[CHAT HISTORY ERROR]",

            error

        );


        throw error;

    }

}



/*
==========================================================
BUILD AI HISTORY
==========================================================
*/


export async function buildAIHistory(

    userId,

    conversationId,

    limit = DEFAULT_LIMIT

){

    try{

        const messages =

            await getMessages(

                userId,

                conversationId,

                {

                    limit

                }

            );


        return messages

            .filter(

                message =>

                    (

                        message.role === "user" ||

                        message.role === "assistant"

                    ) &&

                    typeof message.content === "string" &&

                    message.content.trim()

            )

            .map(

                message => ({

                    role:

                        message.role,

                    content:

                        message.content

                })

            );

    }

    catch(error){

        console.error(

            "[CHAT AI HISTORY ERROR]",

            error

        );


        throw error;

    }

}



/*
==========================================================
DEFAULT EXPORT
==========================================================
*/


export default {

    createConversation,

    getConversation,

    getConversations,

    getOrCreateConversation,

    updateConversation,

    archiveConversation,

    restoreConversation,

    deleteConversation,

    saveMessage,

    getMessages,

    getRecentMessages,

    getChatHistory,

    buildAIHistory

};
