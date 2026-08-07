import mongoose from "mongoose";


/*
==========================================
HONEY IA
DATABASE MODELS V3
Enterprise Authentication + Workspace
==========================================
*/


/*
==========================================
USER MODEL
REAL AUTH SYSTEM
==========================================
*/


const UserSchema = new mongoose.Schema({


    firstName:{


        type:String,

        required:true,

        trim:true


    },





    lastName:{


        type:String,

        required:true,

        trim:true


    },





    email:{


        type:String,

        required:true,

        unique:true,

        lowercase:true,

        trim:true


    },





    password:{


        type:String,


        default:null


    },





    googleId:{


        type:String,


        default:null


    },





    avatar:{


        type:String,


        default:null


    },





    emailVerified:{


        type:Boolean,


        default:false


    },





    verificationCode:{


        type:String,


        default:null


    },





    verificationExpires:{


        type:Date,


        default:null


    },





    plan:{


        type:String,


        enum:[

            "free",

            "individual",

            "business"

        ],


        default:"free"


    },





    sessionToken:{


        type:String,


        default:null


    },





    lastLogin:{


        type:Date,


        default:null


    },





    createdAt:{


        type:Date,


        default:Date.now


    }





});









export const User =

mongoose.model(

    "User",

    UserSchema

); /*
==========================================
CONVERSATION MODEL
USER WORKSPACE HISTORY
==========================================
*/


const ConversationSchema = new mongoose.Schema({


    userId:{


        type:mongoose.Schema.Types.ObjectId,

        ref:"User",

        required:true


    },





    title:{


        type:String,


        default:"Nova Conversa"


    },





    agentId:{


        type:String,


        default:"general"


    },





    createdAt:{


        type:Date,


        default:Date.now


    },





    updatedAt:{


        type:Date,


        default:Date.now


    }



});









export const Conversation =

mongoose.model(

    "Conversation",

    ConversationSchema

);











/*
==========================================
MESSAGE MODEL
AI MEMORY BY CONVERSATION
==========================================
*/


const MessageSchema = new mongoose.Schema({


    conversationId:{


        type:mongoose.Schema.Types.ObjectId,


        ref:"Conversation"


    },





    userId:{


        type:mongoose.Schema.Types.ObjectId,


        ref:"User"


    },





    agentId:{


        type:String,


        default:"general"


    },





    role:{


        type:String,


        enum:[

            "user",

            "assistant",

            "system"

        ],


        default:"user"


    },





    content:{


        type:String,


        default:""


    },





    createdAt:{


        type:Date,


        default:Date.now


    }



});









export const Message =

mongoose.model(

    "Message",

    MessageSchema

);











/*
==========================================
LONG TERM MEMORY MODEL
HONEY IA USER MEMORY
==========================================
*/


const MemorySchema = new mongoose.Schema({


    userId:{


        type:mongoose.Schema.Types.ObjectId,


        ref:"User"


    },





    key:{


        type:String,


        required:true


    },





    value:{


        type:String,


        default:""


    },





    importance:{


        type:Number,


        default:1


    },





    createdAt:{


        type:Date,


        default:Date.now


    }



});









export const Memory =

mongoose.model(

    "Memory",

    MemorySchema

); /*
==========================================
PLUGIN MODEL
EXTENSION SYSTEM
==========================================
*/


const PluginSchema = new mongoose.Schema({


    name:{


        type:String,


        required:true


    },





    description:{


        type:String,


        default:""


    },





    active:{


        type:Boolean,


        default:true


    },





    createdAt:{


        type:Date,


        default:Date.now


    }



});









export const Plugin =

mongoose.model(

    "Plugin",

    PluginSchema

);











/*
==========================================
DOCUMENT MODEL
USER FILE STORAGE
==========================================
*/


const DocumentSchema = new mongoose.Schema({


    userId:{


        type:mongoose.Schema.Types.ObjectId,


        ref:"User",


        required:true


    },





    name:{


        type:String,


        required:true


    },





    type:{


        type:String,


        default:"unknown"


    },





    text:{


        type:String,


        default:""


    },





    size:{


        type:Number,


        default:0


    },





    createdAt:{


        type:Date,


        default:Date.now


    }



});









export const Document =

mongoose.model(

    "Document",

    DocumentSchema

);
