/*
==========================================
HONEY IA OS
CHAT DATA SERVICE
Conversation + Message Management
V2.0
MongoDB Persistent Chat System
==========================================
*/


import {

    Conversation,

    Message

} from "./models.js";



/*
==========================================
HELPERS
==========================================
*/


function normalizeAgentId(agentId){

    return (

        typeof agentId === "string" &&

        agentId.trim()

    )

        ?

        agentId.trim()

        :

        "general";

}



function normalizeTitle(title){

    if(

        typeof title !== "string" ||

        !title.trim()

    ){

        return "Nova Conversa";

    }



    return title

        .trim()

        .slice(

            0,

            200

        );

}



function normalizeLimit(limit){

    const value =

        Number(limit);



    if(

        !Number.isFinite(value) ||

        value <= 0

    ){

        return 20;

    }



    return Math.min(

        Math.floor(value),

        100

    );

}



/*
==========================================
CREATE CONVERSATION
==========================================
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



        const agentId =

            normalizeAgentId(

                options.agentId

            );



        const title =

            normalizeTitle(

                options.title

            );



        const workspace =

            typeof options.workspace === "string" &&

            options.workspace.trim()

                ?

                options.workspace

                    .trim()

                    .slice(0,100)

                :

                "main";



        const conversation =

            new Conversation({

                userId,

                title,

                agentId,

                workspace,

                archived:false

            });



        await conversation.save();



        return conversation;


    }

    catch(error){


        console.error(

            "Erro ao criar conversa:",

            error

        );



        return null;


    }

}



/*
==========================================
GET CONVERSATION
==========================================
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

                    conversationId,

                userId

            });



        return conversation;


    }

    catch(error){


        console.error(

            "Erro ao procurar conversa:",

            error

        );



        return null;


    }

}



/*
==========================================
LIST CONVERSATIONS
==========================================
*/


export async function getConversations(

    userId,

    options = {}

){

    try{


        if(!userId){

            return [];

        }



        const includeArchived =

            options.includeArchived === true;



        const limit =

            normalizeLimit(

                options.limit || 50

            );



        const query = {

            userId

        };



        if(!includeArchived){

            query.archived = false;

        }



        if(

            options.agentId &&

            typeof options.agentId === "string"

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

                .limit(limit);



        return conversations;


    }

    catch(error){


        console.error(

            "Erro ao procurar conversas:",

            error

        );



        return [];


    }

}



/*
==========================================
UPDATE CONVERSATION
==========================================
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

                updates.workspace

                    .trim()

                    .slice(0,100);

        }



        if(

            typeof updates.archived === "boolean"

        ){

            allowedUpdates.archived =

                updates.archived;

        }



        if(

            !Object.keys(

                allowedUpdates

            ).length

        ){

            return await getConversation(

                userId,

                conversationId

            );

        }



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

            "Erro ao atualizar conversa:",

            error

        );



        return null;


    }

}



/*
==========================================
ARCHIVE CONVERSATION
==========================================
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
==========================================
RESTORE CONVERSATION
==========================================
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
==========================================
DELETE CONVERSATION
==========================================
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

            "Erro ao eliminar conversa:",

            error

        );



        return false;


    }

}



/*
==========================================
SAVE MESSAGE
==========================================
*/


export async function saveMessage(

    userId,

    conversationId,

    role,

    content,

    agentId = "general"

){

    try{


        if(

            !userId ||

            !conversationId ||

            !role ||

            typeof content !== "string" ||

            !content.trim()

        ){

            return null;

        }



        if(

            ![

                "user",

                "assistant",

                "system"

            ].includes(role)

        ){

            throw new Error(

                "Role de mensagem inválida."

            );

        }



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



        const normalizedAgentId =

            normalizeAgentId(

                agentId ||

                conversation.agentId

            );



        const message =

            new Message({

                conversationId:

                    conversation._id,

                agentId:

                    normalizedAgentId,

                role,

                content:

                    content.trim()

            });



        await message.save();



        /*
        --------------------------------------
        Atualizar conversa
        --------------------------------------
        */

        conversation.updatedAt =

            new Date();



        if(

            conversation.agentId === "general" &&

            normalizedAgentId !== "general"

        ){

            conversation.agentId =

                normalizedAgentId;

        }



        /*
        --------------------------------------
        Criar título automaticamente a partir
        da primeira mensagem do utilizador.
        --------------------------------------
        */

        if(

            role === "user" &&

            (

                !conversation.title ||

                conversation.title ===

                    "Nova Conversa"

            )

        ){

            const generatedTitle =

                content

                    .trim()

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

            "Erro ao salvar mensagem:",

            error

        );



        return null;


    }

}



/*
==========================================
GET MESSAGES
==========================================
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



        const limit =

            normalizeLimit(

                options.limit || 100

            );



        const query = {

            conversationId:

                conversation._id

        };



        if(

            options.agentId &&

            typeof options.agentId === "string"

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

                .limit(limit);



        return messages.reverse();


    }

    catch(error){


        console.error(

            "Erro ao procurar mensagens:",

            error

        );



        return [];


    }

}



/*
==========================================
GET RECENT MESSAGES
COMPATIBILITY HELPER
==========================================
*/


export async function getRecentMessages(

    userId,

    conversationId,

    limit = 20

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
==========================================
GET CHAT HISTORY
==========================================
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

            "Erro ao carregar histórico do chat:",

            error

        );



        return null;


    }

}



/*
==========================================
BUILD AI HISTORY
Converte mensagens MongoDB para o formato
esperado pelo Orchestrator.
==========================================
*/


export async function buildAIHistory(

    userId,

    conversationId,

    limit = 20

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



        return messages.map(

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

            "Erro ao construir histórico da IA:",

            error

        );



        return [];

    }

}



/*
==========================================
CREATE OR GET CONVERSATION
==========================================
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



        if(conversationId){

            const existing =

                await getConversation(

                    userId,

                    conversationId

                );



            if(existing){

                return existing;

            }

        }



        return await createConversation(

            userId,

            options

        );


    }

    catch(error){


        console.error(

            "Erro ao obter/criar conversa:",

            error

        );



        return null;


    }

}



/*
==========================================
EXPORT DEFAULT
==========================================
*/


export default {

    createConversation,

    getConversation,

    getConversations,

    updateConversation,

    archiveConversation,

    restoreConversation,

    deleteConversation,

    saveMessage,

    getMessages,

    getRecentMessages,

    getChatHistory,

    buildAIHistory,

    getOrCreateConversation

};
