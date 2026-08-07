/*
==========================================
HONEY IA OS
DATABASE MODELS
MongoDB Enterprise Schema
V3.0
==========================================
*/

import mongoose from "mongoose";





/*
==========================================
USER MODEL
==========================================
*/


const UserSchema = new mongoose.Schema({


    nome: {

        type: String,

        required: true,

        trim: true

    },



    apelido: {

        type: String,

        required: true,

        trim: true

    },



    email: {

        type: String,

        required: true,

        unique: true,

        lowercase: true,

        trim: true

    },



    password: {

        type: String,

        default: null

    },



    googleId: {

        type: String,

        default: null

    },



    avatar: {

        type: String,

        default: null

    },



    plano: {

        type: String,

        default: "free"

    },



    emailVerificado: {

        type: Boolean,

        default: false

    },



    codigoVerificacao: {

        type: String,

        default: null

    },



    codigoExpira: {

        type: Date,

        default: null

    },



    ultimoLogin: {

        type: Date,

        default: null

    },



    preferencias: {

        idioma: {

            type: String,

            default: "pt-PT"

        },


        tema: {

            type: String,

            default: "dark"

        }

    },



    criadoEm: {

        type: Date,

        default: Date.now

    }



});









/*
==========================================
CONVERSATIONS
==========================================
*/


const ConversationSchema = new mongoose.Schema({


    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User"

    },



    titulo: {

        type: String,

        default: "Nova Conversa"

    },



    criadoEm: {

        type: Date,

        default: Date.now

    }



});









/*
==========================================
MESSAGES
==========================================
*/


const MessageSchema = new mongoose.Schema({


    conversationId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Conversation"

    },



    agentId: {

        type: String,

        default: "general"

    },



    role: {

        type: String,

        enum:[

            "user",

            "assistant",

            "system"

        ]

    },



    content: {

        type: String

    },



    criadoEm: {

        type: Date,

        default: Date.now

    }



});









/*
==========================================
AI MEMORY
==========================================
*/


const MemorySchema = new mongoose.Schema({


    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref:"User"

    },



    chave:String,



    valor:String,



    importancia:{

        type:Number,

        default:1

    },



    criadoEm:{

        type:Date,

        default:Date.now

    }



});









/*
==========================================
PLUGINS
==========================================
*/


const PluginSchema = new mongoose.Schema({


    nome:String,


    descricao:String,


    ativo:{


        type:Boolean,

        default:true

    }



});









/*
==========================================
DOCUMENTS
==========================================
*/


const DocumentSchema = new mongoose.Schema({


    userId:{

        type:mongoose.Schema.Types.ObjectId,

        ref:"User"

    },



    nome:String,


    tipo:String,


    texto:String,



    criadoEm:{

        type:Date,

        default:Date.now

    }



});









/*
==========================================
EXPORTS
==========================================
*/


export const User = mongoose.model(

    "User",

    UserSchema

);



export const Conversation = mongoose.model(

    "Conversation",

    ConversationSchema

);



export const Message = mongoose.model(

    "Message",

    MessageSchema

);



export const Memory = mongoose.model(

    "Memory",

    MemorySchema

);



export const Plugin = mongoose.model(

    "Plugin",

    PluginSchema

);



export const Document = mongoose.model(

    "Document",

    DocumentSchema

);
