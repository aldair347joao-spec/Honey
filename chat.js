/*
==========================================
HONEY IA OS
CHAT PERSISTENCE ENGINE
Conversation + Message Storage
V5.0
MongoDB Persistent Chat System
Enterprise Conversation Layer
Production Architecture
==========================================
*/


import mongoose from "mongoose";

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


const MAX_CONVERSATION_TITLE_LENGTH =

    200;


const MAX_CONTENT_LENGTH =

    50000;


const MAX_AGENT_ID_LENGTH =

    150;


const MAX_WORKSPACE_LENGTH =

    100;


const MAX_PROJECT_ID_LENGTH =

    100;



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

            MAX_AGENT_ID_LENGTH

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

            MAX_WORKSPACE_LENGTH

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

            MAX_CONVERSATION_TITLE_LENGTH

        );

}



function normalizeLimit(

    limit,

    fallback = DEFAULT_LIMIT

){

    const value =

        Number(limit);


    if(

        !Number.isFinite(value) ||

        value <= 0

    ){

        return fallback;

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

        conversationId instanceof

        mongoose.Types.ObjectId

    ){

        return conversationId;

    }


    if(

        typeof conversationId !== "string"

    ){

        return null;

    }


    const value =

        conversationId.trim();


    if(

        !value ||

        !mongoose.Types.ObjectId.isValid(

            value

        )

    ){

        return null;

    }


    return new mongoose.Types.ObjectId(

        value

    );

}



function normalizeUserId(

    userId

){

    if(

        userId instanceof

        mongoose.Types.ObjectId

    ){

        return userId;

    }


    if(

        typeof userId !== "string"

    ){

        return null;

    }


    const value =

        userId.trim();


    if(

        !value ||

        !mongoose.Types.ObjectId.isValid(

            value

        )

    ){

        return null;

    }


    return new mongoose.Types.ObjectId(

        value

    );

}



function normalizeProjectId(

    projectId

){

    if(

        projectId === null ||

        projectId === undefined ||

        projectId === ""

    ){

        return null;

    }


    if(

        projectId instanceof

        mongoose.Types.ObjectId

    ){

        return projectId;

    }


    if(

        typeof projectId !== "string"

    ){

        return null;

    }


    const value =

        projectId.trim();


    if(

        !value ||

        !mongoose.Types.ObjectId.isValid(

            value

        )

    ){

        return null;

    }


    return new mongoose.Types.ObjectId(

        value

    );

}



function normalizeRole(

    role

){

    const normalized =

        typeof role === "string"

            ? role

                .trim()

                .toLowerCase()

            : "";


    if(

        [

            "user",

            "assistant",

            "system",

            "tool"

        ].includes(

            normalized

        )

    ){

        return normalized;

    }


    return null;

}



function normalizeToolCallId(

    toolCallId

){

    if(

        typeof toolCallId !== "string"

    ){

        return null;

    }


    const value =

        toolCallId.trim();


    return value

        ? value.slice(

            0,

            300

        )

        : null;

}



function createConversationTitle(

    content

){

    const normalized =

        normalizeContent(

            content

        );


    if(!normalized){

        return DEFAULT_TITLE;

    }


    return normalized

        .replace(

            /\s+/g,

            " "

        )

        .slice(

            0,

            80

        );

}



function isConversationIdValid(

    conversationId

){

    return Boolean(

        normalizeConversationId(

            conversationId

        )

    );

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

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    if(!normalizedUserId){

        throw new Error(

            "userId inválido ou ausente."

        );

    }


    const conversation =

        new Conversation({

            userId:

                normalizedUserId,

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

            projectId:

                normalizeProjectId(

                    options.projectId

                ),

            archived:

                false

        });


    await conversation.save();


    return conversation;

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

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    const normalizedConversationId =

        normalizeConversationId(

            conversationId

        );


    if(

        !normalizedUserId ||

        !normalizedConversationId

    ){

        return null;

    }


    return Conversation.findOne({

        _id:

            normalizedConversationId,

        userId:

            normalizedUserId

    });

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

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    if(!normalizedUserId){

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

                normalizedUserId,

                normalizedConversationId

            );


        if(existing){

            return existing;

        }

    }


    /*
    --------------------------------------------------
    CREATE NEW CONVERSATION
    --------------------------------------------------
    */


    return createConversation(

        normalizedUserId,

        {

            title:

                options.title ||

                DEFAULT_TITLE,

            agentId:

                options.agentId ||

                DEFAULT_AGENT,

            workspace:

                options.workspace ||

                DEFAULT_WORKSPACE,

            projectId:

                options.projectId ||

                null

        }

    );

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

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    if(!normalizedUserId){

        return [];

    }


    const query = {

        userId:

            normalizedUserId

    };


    /*
    --------------------------------------------------
    ARCHIVED FILTER
    --------------------------------------------------
    */


    if(

        options.includeArchived !== true

    ){

        query.archived =

            false;

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
    WORKSPACE FILTER
    --------------------------------------------------
    */


    if(

        typeof options.workspace === "string" &&

        options.workspace.trim()

    ){

        query.workspace =

            normalizeWorkspace(

                options.workspace

            );

    }


    /*
    --------------------------------------------------
    PROJECT FILTER
    --------------------------------------------------
    */


    if(

        options.projectId !== undefined &&

        options.projectId !== null &&

        options.projectId !== ""

    ){

        const projectId =

            normalizeProjectId(

                options.projectId

            );


        if(projectId){

            query.projectId =

                projectId;

        }

    }


    return Conversation

        .find(query)

        .sort({

            updatedAt:

                -1

        })

        .limit(

            normalizeLimit(

                options.limit,

                50

            )

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

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    const normalizedConversationId =

        normalizeConversationId(

            conversationId

        );


    if(

        !normalizedUserId ||

        !normalizedConversationId

    ){

        return null;

    }


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
    PROJECT
    --------------------------------------------------
    */


    if(

        updates.projectId !== undefined

    ){

        allowedUpdates.projectId =

            normalizeProjectId(

                updates.projectId

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

            normalizedUserId,

            normalizedConversationId

        );

    }



    /*
    --------------------------------------------------
    UPDATE
    --------------------------------------------------
    */


    return Conversation.findOneAndUpdate(

        {

            _id:

                normalizedConversationId,

            userId:

                normalizedUserId

        },

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

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    const normalizedConversationId =

        normalizeConversationId(

            conversationId

        );


    if(

        !normalizedUserId ||

        !normalizedConversationId

    ){

        return false;

    }


    /*
    --------------------------------------------------
    VERIFY OWNERSHIP
    --------------------------------------------------
    */


    const conversation =

        await Conversation.findOne({

            _id:

                normalizedConversationId,

            userId:

                normalizedUserId

        });


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

            conversation._id,

        userId:

            normalizedUserId

    });


    /*
    --------------------------------------------------
    DELETE CONVERSATION
    --------------------------------------------------
    */


    const result =

        await Conversation.deleteOne({

            _id:

                conversation._id,

            userId:

                normalizedUserId

        });


    return (

        result.deletedCount === 1

    );

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

    agentId = DEFAULT_AGENT,

    options = {}

){

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    const normalizedConversationId =

        normalizeConversationId(

            conversationId

        );


    if(

        !normalizedUserId ||

        !normalizedConversationId

    ){

        return null;

    }


    /*
    --------------------------------------------------
    ROLE
    --------------------------------------------------
    */


    const normalizedRole =

        normalizeRole(

            role

        );


    if(!normalizedRole){

        throw new Error(

            "Role de mensagem inválida."

        );

    }


    /*
    --------------------------------------------------
    CONTENT
    --------------------------------------------------
    */


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

                normalizedConversationId,

            userId:

                normalizedUserId

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

            conversation.agentId ||

            DEFAULT_AGENT

        );


    /*
    --------------------------------------------------
    OPTIONAL TOOL DATA
    --------------------------------------------------
    */


    const toolCallId =

        normalizeToolCallId(

            options.toolCallId

        );


    const toolId =

        options.toolId &&

        mongoose.Types.ObjectId.isValid(

            options.toolId

        )

            ? new mongoose.Types.ObjectId(

                options.toolId

            )

            : null;



    /*
    --------------------------------------------------
    CREATE MESSAGE
    --------------------------------------------------
    */


    const message =

        new Message({

            conversationId:

                conversation._id,

            userId:

                normalizedUserId,

            agentId:

                normalizedAgentId,

            role:

                normalizedRole,

            content:

                normalizedContent,

            toolCallId,

            toolId

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

            createConversationTitle(

                normalizedContent

            );


        if(

            generatedTitle !==

            DEFAULT_TITLE

        ){

            conversation.title =

                generatedTitle;

        }

    }


    await conversation.save();


    return message;

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

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    const normalizedConversationId =

        normalizeConversationId(

            conversationId

        );


    if(

        !normalizedUserId ||

        !normalizedConversationId

    ){

        return [];

    }


    /*
    --------------------------------------------------
    VERIFY CONVERSATION OWNERSHIP
    --------------------------------------------------
    */


    const conversation =

        await Conversation.findOne({

            _id:

                normalizedConversationId,

            userId:

                normalizedUserId

        });


    if(!conversation){

        return [];

    }


    /*
    --------------------------------------------------
    QUERY
    --------------------------------------------------
    */


    const query = {

        conversationId:

            conversation._id,

        userId:

            normalizedUserId

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

        query.agentId =

            normalizeAgentId(

                options.agentId

            );

    }


    /*
    --------------------------------------------------
    ROLE FILTER
    --------------------------------------------------
    */


    if(

        Array.isArray(

            options.roles

        ) &&

        options.roles.length

    ){

        const roles =

            options.roles

                .map(

                    normalizeRole

                )

                .filter(

                    Boolean

                );


        if(roles.length){

            query.role = {

                $in:

                    roles

            };

        }

    }


    /*
    --------------------------------------------------
    FETCH
    --------------------------------------------------
    */


    const messages =

        await Message

            .find(query)

            .sort({

                createdAt:

                    -1

            })

            .limit(

                normalizeLimit(

                    options.limit,

                    100

                )

            );


    /*
    --------------------------------------------------
    RETURN CHRONOLOGICAL ORDER
    --------------------------------------------------
    */


    return messages.reverse();

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

                    "assistant",

                    "system"

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



/*
==========================================================
BUILD FULL AI HISTORY
==========================================================
*/


export async function buildFullAIHistory(

    userId,

    conversationId,

    limit = DEFAULT_LIMIT

){

    const messages =

        await getMessages(

            userId,

            conversationId,

            {

                limit

            }

        );


    return messages

        .map(

            message => {

                const item = {

                    role:

                        message.role,

                    content:

                        message.content

                };


                if(

                    message.toolCallId

                ){

                    item.tool_call_id =

                        message.toolCallId;

                }


                return item;

            }

        );

}



/*
==========================================================
COUNT MESSAGES
==========================================================
*/


export async function countMessages(

    userId,

    conversationId

){

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    const normalizedConversationId =

        normalizeConversationId(

            conversationId

        );


    if(

        !normalizedUserId ||

        !normalizedConversationId

    ){

        return 0;

    }


    const conversation =

        await Conversation.findOne({

            _id:

                normalizedConversationId,

            userId:

                normalizedUserId

        });


    if(!conversation){

        return 0;

    }


    return Message.countDocuments({

        conversationId:

            conversation._id,

        userId:

            normalizedUserId

    });

}



/*
==========================================================
TOUCH CONVERSATION
==========================================================
*/


export async function touchConversation(

    userId,

    conversationId

){

    const normalizedUserId =

        normalizeUserId(

            userId

        );


    const normalizedConversationId =

        normalizeConversationId(

            conversationId

        );


    if(

        !normalizedUserId ||

        !normalizedConversationId

    ){

        return null;

    }


    return Conversation.findOneAndUpdate(

        {

            _id:

                normalizedConversationId,

            userId:

                normalizedUserId

        },

        {

            $set: {

                updatedAt:

                    new Date()

            }

        },

        {

            new:

                true

        }

    );

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

    buildAIHistory,

    buildFullAIHistory,

    countMessages,

    touchConversation

};
