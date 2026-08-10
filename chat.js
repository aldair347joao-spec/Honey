/*
==========================================
HONEY IA OS
CHAT PERSISTENCE ENGINE
Conversation + Message Storage
V4.0
MongoDB Persistent Chat System
Enterprise Conversation Layer
==========================================
*/


import {

    Conversation,

    Message

} from "./models.js";



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


const MAX_CONTENT_LENGTH =

    50000;



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

        .slice(

            0,

            200

        );

}



function normalizeLimit(

    limit

){

    const value =

        Number(limit);



    if(

        !Number.isFinite(value) ||

        value <= 0

    ){

        return DEFAULT_LIMIT;

    }



    return Math.min(

        Math.floor(value),

        100

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



    if(

        typeof conversationId !== "string"

    ){

        return String(

            conversationId

        );

    }



    const value =

        conversationId.trim();



    return value || null;

}



function normalizeRole(

    role

){

    if(

        [

            "user",

            "assistant",

            "system"

        ].includes(role)

    ){

        return role;

    }



    return null;

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

    try{


        if(!userId){

            throw new Error(

                "userId é obrigatório."

            );

        }



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

                archived:false

            });



        await conversation.save();



        return conversation;


    }

    catch(error){


        console.error(

            "[CHAT CREATE ERROR]",

            error

        );



        return null;

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

    try{


        if(

            !userId ||

            !conversationId

        ){

            return null;

        }



        const conversation =

            await Conversation.findOne({

                _id:

                    normalizeConversationId(

                        conversationId

                    ),

                userId

            });



        return conversation;


    }

    catch(error){


        console.error(

            "[CHAT GET CONVERSATION ERROR]",

            error

        );



        return null;

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

    try{


        if(!userId){

            return null;

        }



        const normalizedConversationId =

            normalizeConversationId(

                conversationId

            );



        /*
        --------------------------------------------------
        EXISTING CONVERSATION
        --------------------------------------------------
        */


        if(normalizedConversationId){

            const existing =

                await getConversation(

                    userId,

                    normalizedConversationId

                );



            if(existing){

                return existing;

            }

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



        return null;

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

    try{


        if(!userId){

            return [];

        }



        const query = {

            userId

        };



        if(

            options.includeArchived !== true

        ){

            query.archived = false;

        }



        if(

            typeof options.agentId === "string" &&

            options.agentId.trim()

        ){

            query.agentId =

                normalizeAgentId(

                    options.agentId

                );

        }



        const conversations =

            await Conversation

                .find(query)

                .sort({

                    updatedAt:-1

                })

                .limit(

                    normalizeLimit(

                        options.limit || 50

                    )

                );



        return conversations;


    }

    catch(error){


        console.error(

            "[CHAT LIST ERROR]",

            error

        );



        return [];

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

    try{


        if(

            !userId ||

            !conversationId

        ){

            return null;

        }



        const allowedUpdates = {};



        if(

            typeof updates.title === "string"

        ){

            allowedUpdates.title =

                normalizeTitle(

                    updates.title

                );

        }



        if(

            typeof updates.agentId === "string"

        ){

            allowedUpdates.agentId =

                normalizeAgentId(

                    updates.agentId

                );

        }



        if(

            typeof updates.workspace === "string"

        ){

            allowedUpdates.workspace =

                normalizeWorkspace(

                    updates.workspace

                );

        }



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
        UPDATE
        --------------------------------------------------
        */


        const conversation =

            await Conversation.findOneAndUpdate(

                {

                    _id:

                        conversationId,

                    userId

                },

                {

                    $set:

                        allowedUpdates

                },

                {

                    new:true,

                    runValidators:true

                }

            );



        return conversation;


    }

    catch(error){


        console.error(

            "[CHAT UPDATE ERROR]",

            error

        );



        return null;

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

    return updateConversation(

        userId,

        conversationId,

        {

            archived:true

        }

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

    return updateConversation(

        userId,

        conversationId,

        {

            archived:false

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

    try{


        if(

            !userId ||

            !conversationId

        ){

            return false;

        }



        const conversation =

            await Conversation.findOne({

                _id:

                    conversationId,

                userId

            });



        if(!conversation){

            return false;

        }



        await Message.deleteMany({

            conversationId:

                conversation._id

        });



        await Conversation.deleteOne({

            _id:

                conversation._id

        });



        return true;


    }

    catch(error){


        console.error(

            "[CHAT DELETE ERROR]",

            error

        );



        return false;

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

    try{


        if(

            !userId ||

            !conversationId

        ){

            return null;

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

            return null;

        }



        /*
        --------------------------------------------------
        VERIFY CONVERSATION OWNERSHIP
        --------------------------------------------------
        */


        const conversation =

            await Conversation.findOne({

                _id:

                    conversationId,

                userId

            });



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
        MESSAGE
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



        return null;

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

    try{


        if(

            !userId ||

            !conversationId

        ){

            return [];

        }



        const conversation =

            await Conversation.findOne({

                _id:

                    conversationId,

                userId

            });



        if(!conversation){

            return [];

        }



        const query = {

            conversationId:

                conversation._id

        };



        if(

            typeof options.agentId === "string" &&

            options.agentId.trim()

        ){

            query.agentId =

                normalizeAgentId(

                    options.agentId

                );

        }



        const messages =

            await Message

                .find(query)

                .sort({

                    createdAt:-1

                })

                .limit(

                    normalizeLimit(

                        options.limit || 100

                    )

                );



        return messages.reverse();


    }

    catch(error){


        console.error(

            "[CHAT GET MESSAGES ERROR]",

            error

        );



        return [];

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

    try{


        const conversation =

            await getConversation(

                userId,

                conversationId

            );



        if(!conversation){

            return null;

        }



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



        return null;

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

                    [

                        "user",

                        "assistant"

                    ].includes(

                        message.role

                    )

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



        return [];

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
