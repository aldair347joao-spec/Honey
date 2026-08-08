/*
==========================================
HONEY IA OS
DATABASE MODELS
MongoDB User & AI Workspace System
V7.0
Production Authentication Architecture
==========================================
*/

import mongoose from "mongoose";


/*
==========================================
USER MODEL
AUTHENTICATION + PROFILE + BILLING
==========================================
*/

const UserSchema = new mongoose.Schema({

    /*
    --------------------------------------
    BASIC PROFILE
    --------------------------------------
    */

    firstName: {

        type: String,

        required: true,

        trim: true,

        minlength: 1,

        maxlength: 80

    },


    lastName: {

        type: String,

        required: true,

        trim: true,

        minlength: 1,

        maxlength: 80

    },


    email: {

        type: String,

        required: true,

        unique: true,

        lowercase: true,

        trim: true,

        index: true

    },


    /*
    --------------------------------------
    LOCAL AUTHENTICATION
    --------------------------------------
    */

    password: {

        type: String,

        default: null

    },


    /*
    --------------------------------------
    AUTH PROVIDER
    --------------------------------------
    */

    provider: {

        type: String,

        enum: [

            "local",

            "google"

        ],

        default: "local",

        index: true

    },


    /*
    --------------------------------------
    GOOGLE AUTHENTICATION
    --------------------------------------
    */

    googleId: {

        type: String,

        default: undefined,

        trim: true,

        index: true

    },


    /*
    --------------------------------------
    PROFILE
    --------------------------------------
    */

    avatar: {

        type: String,

        default: null,

        trim: true

    },


    /*
    --------------------------------------
    EMAIL VERIFICATION
    --------------------------------------
    */

    emailVerified: {

        type: Boolean,

        default: false,

        index: true

    },


    verificationCode: {

        type: String,

        default: null

    },


    verificationExpires: {

        type: Date,

        default: null

    },


    /*
    --------------------------------------
    HONEY IA PLAN
    --------------------------------------
    */

    plan: {

        type: String,

        enum: [

            "free",

            "individual",

            "business"

        ],

        default: "free",

        index: true

    },


    /*
    --------------------------------------
    ACCOUNT STATUS
    --------------------------------------
    */

    isActive: {

        type: Boolean,

        default: true,

        index: true

    },


    /*
    --------------------------------------
    LOGIN INFORMATION
    --------------------------------------
    */

    lastLogin: {

        type: Date,

        default: null

    }

}, {

    timestamps: true

});


/*
==========================================
USER INDEXES
==========================================
*/

UserSchema.index({

    email: 1

}, {

    unique: true

});


UserSchema.index({

    googleId: 1

}, {

    unique: true,

    sparse: true

});


UserSchema.index({

    provider: 1

});


UserSchema.index({

    plan: 1,

    isActive: 1

});


/*
==========================================
SESSION MODEL
PERSISTENT LOGIN SYSTEM
==========================================
*/

const SessionSchema = new mongoose.Schema({

    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true

    },


    token: {

        type: String,

        required: true,

        unique: true,

        index: true

    },


    device: {

        type: String,

        default: "unknown",

        maxlength: 500

    },


    browser: {

        type: String,

        default: "unknown",

        maxlength: 500

    },


    ip: {

        type: String,

        default: null,

        maxlength: 100

    },


    expiresAt: {

        type: Date,

        required: true,

        index: true

    }

}, {

    timestamps: true

});


SessionSchema.index({

    userId: 1,

    expiresAt: 1

});


SessionSchema.index(

    {

        expiresAt: 1

    },

    {

        expireAfterSeconds: 0

    }

);


/*
==========================================
CONVERSATION MODEL
==========================================
*/

const ConversationSchema = new mongoose.Schema({

    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true

    },


    title: {

        type: String,

        default: "Nova Conversa",

        trim: true,

        maxlength: 200

    },


    agentId: {

        type: String,

        default: "general",

        trim: true,

        index: true

    },


    workspace: {

        type: String,

        default: "main",

        trim: true,

        index: true

    },


    archived: {

        type: Boolean,

        default: false,

        index: true

    }

}, {

    timestamps: true

});


ConversationSchema.index({

    userId: 1,

    updatedAt: -1

});


/*
==========================================
MESSAGE MODEL
==========================================
*/

const MessageSchema = new mongoose.Schema({

    conversationId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Conversation",

        required: true,

        index: true

    },


    agentId: {

        type: String,

        default: "general",

        trim: true,

        index: true

    },


    role: {

        type: String,

        enum: [

            "user",

            "assistant",

            "system"

        ],

        required: true

    },


    content: {

        type: String,

        required: true

    }

}, {

    timestamps: true

});


MessageSchema.index({

    conversationId: 1,

    createdAt: 1

});


/*
==========================================
MEMORY MODEL
==========================================
*/

const MemorySchema = new mongoose.Schema({

    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true

    },


    key: {

        type: String,

        required: true,

        trim: true,

        maxlength: 150

    },


    value: {

        type: String,

        required: true

    },


    importance: {

        type: Number,

        default: 1,

        min: 0,

        max: 10

    }

}, {

    timestamps: true

});


MemorySchema.index({

    userId: 1,

    key: 1

}, {

    unique: true

});


/*
==========================================
DOCUMENT MODEL
==========================================
*/

const DocumentSchema = new mongoose.Schema({

    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true

    },


    name: {

        type: String,

        required: true,

        trim: true,

        maxlength: 300

    },


    type: {

        type: String,

        default: "unknown",

        trim: true

    },


    text: {

        type: String,

        default: ""

    },


    size: {

        type: Number,

        default: 0,

        min: 0

    },


    url: {

        type: String,

        default: null

    },


    status: {

        type: String,

        enum: [

            "pending",

            "processing",

            "completed",

            "failed"

        ],

        default: "pending",

        index: true

    }

}, {

    timestamps: true

});


DocumentSchema.index({

    userId: 1,

    createdAt: -1

});


/*
==========================================
PROJECT MODEL
==========================================
*/

const ProjectSchema = new mongoose.Schema({

    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true

    },


    name: {

        type: String,

        required: true,

        trim: true,

        maxlength: 200

    },


    description: {

        type: String,

        default: ""

    },


    type: {

        type: String,

        default: "general",

        trim: true,

        index: true

    },


    status: {

        type: String,

        enum: [

            "active",

            "completed",

            "archived"

        ],

        default: "active",

        index: true

    }

}, {

    timestamps: true

});


ProjectSchema.index({

    userId: 1,

    updatedAt: -1

});


/*
==========================================
PLUGIN MODEL
==========================================
*/

const PluginSchema = new mongoose.Schema({

    name: {

        type: String,

        required: true,

        trim: true,

        maxlength: 150

    },


    description: {

        type: String,

        default: ""

    },


    active: {

        type: Boolean,

        default: true,

        index: true

    }

}, {

    timestamps: true

});


PluginSchema.index({

    name: 1

});


/*
==========================================
MODEL EXPORTS
==========================================
*/

export const User = mongoose.model(

    "User",

    UserSchema

);


export const Session = mongoose.model(

    "Session",

    SessionSchema

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


export const Document = mongoose.model(

    "Document",

    DocumentSchema

);


export const Project = mongoose.model(

    "Project",

    ProjectSchema

);


export const Plugin = mongoose.model(

    "Plugin",

    PluginSchema

);
