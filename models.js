/*
==========================================
HONEY IA OS
DATABASE MODELS
MongoDB User & AI Workspace System
V4.0
==========================================
*/

import mongoose from "mongoose";


/*
==========================================
USER MODEL
AUTHENTICATION SYSTEM
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

        trim: true

    },


    lastName: {

        type: String,

        required: true,

        trim: true

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

        required: false,

        default: null

    },


    /*
    --------------------------------------
    AUTH PROVIDER
    local = Honey IA account
    google = Google account
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

        default: null,

        sparse: true,

        index: true

    },


    /*
    --------------------------------------
    PROFILE PHOTO
    --------------------------------------
    */

    avatar: {

        type: String,

        default: null

    },


    /*
    --------------------------------------
    EMAIL VERIFICATION
    --------------------------------------
    */

    emailVerified: {

        type: Boolean,

        default: false

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

    },


    /*
    --------------------------------------
    TIMESTAMPS
    --------------------------------------
    */

    createdAt: {

        type: Date,

        default: Date.now

    },


    updatedAt: {

        type: Date,

        default: Date.now

    }

});


/*
==========================================
USER INDEXES
==========================================
*/


UserSchema.index({

    email: 1

});


UserSchema.index({

    googleId: 1

});


UserSchema.index({

    provider: 1

});


/*
==========================================
UPDATE TIMESTAMP
==========================================
*/


UserSchema.pre(

    "save",

    function(next) {

        this.updatedAt = new Date();

        next();

    }

);


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

        default: "unknown"

    },


    browser: {

        type: String,

        default: "unknown"

    },


    ip: {

        type: String,

        default: null

    },


    expiresAt: {

        type: Date,

        required: true,

        index: true

    },


    createdAt: {

        type: Date,

        default: Date.now

    }

});


/*
==========================================
SESSION INDEXES
==========================================
*/


SessionSchema.index({

    userId: 1,

    expiresAt: 1

});


/*
==========================================
CONVERSATION MODEL
AI CHAT MEMORY
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

        default: "Nova Conversa"

    },


    agentId: {

        type: String,

        default: "general"

    },


    workspace: {

        type: String,

        default: "main"

    },


    createdAt: {

        type: Date,

        default: Date.now

    },


    updatedAt: {

        type: Date,

        default: Date.now

    }

});


/*
==========================================
MESSAGE MODEL
AGENT CONTEXT MEMORY
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

        default: "general"

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

    },


    createdAt: {

        type: Date,

        default: Date.now

    }

});


/*
==========================================
MEMORY MODEL
HONEY IA USER MEMORY
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

        required: true

    },


    value: {

        type: String,

        required: true

    },


    importance: {

        type: Number,

        default: 1

    },


    createdAt: {

        type: Date,

        default: Date.now

    }

});


/*
==========================================
MEMORY INDEX
==========================================
*/


MemorySchema.index({

    userId: 1,

    key: 1

});


/*
==========================================
DOCUMENT MODEL
USER FILE STORAGE
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

        required: true

    },


    type: {

        type: String,

        default: "unknown"

    },


    text: {

        type: String,

        default: ""

    },


    createdAt: {

        type: Date,

        default: Date.now

    }

});


/*
==========================================
PROJECT MODEL
HONEY IA WORKSPACE
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

        required: true

    },


    description: {

        type: String,

        default: ""

    },


    type: {

        type: String,

        default: "general"

    },


    status: {

        type: String,

        enum: [

            "active",

            "completed",

            "archived"

        ],

        default: "active"

    },


    createdAt: {

        type: Date,

        default: Date.now

    }

});


/*
==========================================
PLUGIN MODEL
SYSTEM EXTENSIONS
==========================================
*/

const PluginSchema = new mongoose.Schema({

    name: {

        type: String,

        required: true

    },


    description: {

        type: String,

        default: ""

    },


    active: {

        type: Boolean,

        default: true

    },


    createdAt: {

        type: Date,

        default: Date.now

    }

});


/*
==========================================
MODEL EXPORTS
==========================================
*/

export const User =

mongoose.model(

    "User",

    UserSchema

);


export const Session =

mongoose.model(

    "Session",

    SessionSchema

);


export const Conversation =

mongoose.model(

    "Conversation",

    ConversationSchema

);


export const Message =

mongoose.model(

    "Message",

    MessageSchema

);


export const Memory =

mongoose.model(

    "Memory",

    MemorySchema

);


export const Document =

mongoose.model(

    "Document",

    DocumentSchema

);


export const Project =

mongoose.model(

    "Project",

    ProjectSchema

);


export const Plugin =

mongoose.model(

    "Plugin",

    PluginSchema

);
