/*
==========================================
HONEY IA OS
DATABASE MODELS
MongoDB Enterprise AI Workspace System
V10.0
Authentication + Agents + Tools + Artifacts
Production Architecture
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


    password: {

        type: String,

        default: null

    },


    provider: {

        type: String,

        enum: [

            "local",

            "google"

        ],

        default: "local",

        index: true

    },


    googleId: {

        type: String,

        default: undefined,

        trim: true,

        index: true

    },


    avatar: {

        type: String,

        default: null,

        trim: true

    },


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


    isActive: {

        type: Boolean,

        default: true,

        index: true

    },


    lastLogin: {

        type: Date,

        default: null

    }

}, {

    timestamps: true

});


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


    projectId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Project",

        default: null,

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


ConversationSchema.index({

    userId: 1,

    agentId: 1,

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


    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

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

            "system",

            "tool"

        ],

        required: true

    },


    content: {

        type: String,

        required: true

    },


    toolCallId: {

        type: String,

        default: null,

        index: true

    },


    toolId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Tool",

        default: null,

        index: true

    }

}, {

    timestamps: true

});


MessageSchema.index({

    conversationId: 1,

    createdAt: 1

});


MessageSchema.index({

    userId: 1,

    createdAt: -1

});



/*
==========================================
MEMORY MODEL
USER LONG-TERM MEMORY
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

    },


    source: {

        type: String,

        enum: [

            "user",

            "conversation",

            "agent",

            "system"

        ],

        default: "system"

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

    },


    metadata: {

        type: mongoose.Schema.Types.Mixed,

        default: {}

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
AGENT MODEL
AI AGENT REGISTRY
==========================================
*/


const AgentSchema = new mongoose.Schema({

    /*
    --------------------------------------
    IDENTITY
    --------------------------------------
    */

    agentId: {

        type: String,

        required: true,

        unique: true,

        trim: true,

        maxlength: 150,

        index: true

    },


    name: {

        type: String,

        required: true,

        trim: true,

        maxlength: 150

    },


    description: {

        type: String,

        default: "",

        maxlength: 1000

    },


    /*
    --------------------------------------
    CATEGORY
    --------------------------------------
    */

    category: {

        type: String,

        default: "general",

        trim: true,

        maxlength: 100,

        index: true

    },


    /*
    --------------------------------------
    SYSTEM PROMPT
    --------------------------------------
    */

    systemPrompt: {

        type: String,

        default: ""

    },


    /*
    --------------------------------------
    MODEL CONFIGURATION
    --------------------------------------
    */

    model: {

        type: String,

        default: null,

        trim: true

    },


    temperature: {

        type: Number,

        default: 0.7,

        min: 0,

        max: 2

    },


    maxTokens: {

        type: Number,

        default: 4096,

        min: 1,

        max: 100000

    },


    /*
    --------------------------------------
    TOOL ACCESS
    --------------------------------------
    */

    tools: [{

        type: mongoose.Schema.Types.ObjectId,

        ref: "Tool"

    }],


    /*
    --------------------------------------
    OWNERSHIP
    --------------------------------------
    */

    ownerId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null,

        index: true

    },


    scope: {

        type: String,

        enum: [

            "system",

            "user",

            "workspace"

        ],

        default: "system",

        index: true

    },


    /*
    --------------------------------------
    STATUS
    --------------------------------------
    */

    active: {

        type: Boolean,

        default: true,

        index: true

    },


    version: {

        type: String,

        default: "1.0.0"

    },


    metadata: {

        type: mongoose.Schema.Types.Mixed,

        default: {}

    }

}, {

    timestamps: true

});


AgentSchema.index({

    ownerId: 1,

    active: 1

});


AgentSchema.index({

    category: 1,

    active: 1

});



/*
==========================================
TOOL MODEL
AI TOOL REGISTRY
==========================================
*/


const ToolSchema = new mongoose.Schema({

    /*
    --------------------------------------
    IDENTITY
    --------------------------------------
    */

    toolId: {

        type: String,

        required: true,

        unique: true,

        trim: true,

        maxlength: 150,

        index: true

    },


    name: {

        type: String,

        required: true,

        trim: true,

        maxlength: 150

    },


    description: {

        type: String,

        required: true,

        maxlength: 2000

    },


    /*
    --------------------------------------
    TOOL CATEGORY
    --------------------------------------
    */

    category: {

        type: String,

        default: "general",

        trim: true,

        maxlength: 100,

        index: true

    },


    /*
    --------------------------------------
    EXECUTION TYPE
    --------------------------------------
    */

    type: {

        type: String,

        enum: [

            "internal",

            "api",

            "code",

            "http",

            "generator",

            "system"

        ],

        default: "internal",

        index: true

    },


    /*
    --------------------------------------
    INPUT SCHEMA
    --------------------------------------
    */

    inputSchema: {

        type: mongoose.Schema.Types.Mixed,

        default: {

            type: "object",

            properties: {}

        }

    },


    /*
    --------------------------------------
    OUTPUT SCHEMA
    --------------------------------------
    */

    outputSchema: {

        type: mongoose.Schema.Types.Mixed,

        default: {

            type: "object"

        }

    },


    /*
    --------------------------------------
    EXECUTOR
    --------------------------------------
    */

    executor: {

        type: String,

        default: null,

        trim: true,

        maxlength: 200

    },


    /*
    --------------------------------------
    PERMISSIONS
    --------------------------------------
    */

    requiresAuth: {

        type: Boolean,

        default: true

    },


    requiresConfirmation: {

        type: Boolean,

        default: false

    },


    /*
    --------------------------------------
    OWNERSHIP
    --------------------------------------
    */

    ownerId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        default: null,

        index: true

    },


    scope: {

        type: String,

        enum: [

            "system",

            "user",

            "workspace"

        ],

        default: "system",

        index: true

    },


    /*
    --------------------------------------
    STATUS
    --------------------------------------
    */

    active: {

        type: Boolean,

        default: true,

        index: true

    },


    version: {

        type: String,

        default: "1.0.0"

    },


    metadata: {

        type: mongoose.Schema.Types.Mixed,

        default: {}

    }

}, {

    timestamps: true

});


ToolSchema.index({

    category: 1,

    active: 1

});


ToolSchema.index({

    ownerId: 1,

    active: 1

});


ToolSchema.index({

    type: 1,

    active: 1

});



/*
==========================================
AGENT TOOL PERMISSION MODEL
EXPLICIT AGENT ↔ TOOL ACCESS
==========================================
*/


const AgentToolSchema = new mongoose.Schema({

    agentId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Agent",

        required: true,

        index: true

    },


    toolId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Tool",

        required: true,

        index: true

    },


    enabled: {

        type: Boolean,

        default: true,

        index: true

    },


    priority: {

        type: Number,

        default: 0,

        index: true

    },


    configuration: {

        type: mongoose.Schema.Types.Mixed,

        default: {}

    }

}, {

    timestamps: true

});


AgentToolSchema.index({

    agentId: 1,

    toolId: 1

}, {

    unique: true

});



/*
==========================================
TOOL EXECUTION MODEL
AUDIT + EXECUTION HISTORY
==========================================
*/


const ToolExecutionSchema = new mongoose.Schema({

    /*
    --------------------------------------
    OWNERSHIP
    --------------------------------------
    */

    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true

    },


    conversationId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Conversation",

        default: null,

        index: true

    },


    messageId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Message",

        default: null,

        index: true

    },


    /*
    --------------------------------------
    AGENT + TOOL
    --------------------------------------
    */

    agentId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Agent",

        default: null,

        index: true

    },


    toolId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Tool",

        required: true,

        index: true

    },


    toolCallId: {

        type: String,

        default: null,

        index: true

    },


    /*
    --------------------------------------
    EXECUTION
    --------------------------------------
    */

    status: {

        type: String,

        enum: [

            "pending",

            "running",

            "completed",

            "failed",

            "cancelled"

        ],

        default: "pending",

        index: true

    },


    input: {

        type: mongoose.Schema.Types.Mixed,

        default: {}

    },


    output: {

        type: mongoose.Schema.Types.Mixed,

        default: null

    },


    error: {

        type: String,

        default: null

    },


    startedAt: {

        type: Date,

        default: null

    },


    completedAt: {

        type: Date,

        default: null

    },


    durationMs: {

        type: Number,

        default: null,

        min: 0

    }

}, {

    timestamps: true

});


ToolExecutionSchema.index({

    userId: 1,

    createdAt: -1

});


ToolExecutionSchema.index({

    conversationId: 1,

    createdAt: -1

});


ToolExecutionSchema.index({

    toolId: 1,

    status: 1,

    createdAt: -1

});



/*
==========================================
ARTIFACT MODEL
AI GENERATED OUTPUTS
==========================================
*/


const ArtifactSchema = new mongoose.Schema({

    /*
    --------------------------------------
    OWNERSHIP
    --------------------------------------
    */

    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true

    },


    projectId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Project",

        default: null,

        index: true

    },


    conversationId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Conversation",

        default: null,

        index: true

    },


    messageId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Message",

        default: null,

        index: true

    },


    /*
    --------------------------------------
    PRODUCER
    --------------------------------------
    */

    agentId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Agent",

        default: null,

        index: true

    },


    toolId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Tool",

        default: null,

        index: true

    },


    /*
    --------------------------------------
    ARTIFACT IDENTITY
    --------------------------------------
    */

    name: {

        type: String,

        required: true,

        trim: true,

        maxlength: 300

    },


    type: {

        type: String,

        enum: [

            "text",

            "code",

            "html",

            "css",

            "javascript",

            "json",

            "csv",

            "xlsx",

            "pdf",

            "image",

            "video",

            "audio",

            "document",

            "archive",

            "other"

        ],

        default: "other",

        index: true

    },


    mimeType: {

        type: String,

        default: "application/octet-stream",

        trim: true

    },


    /*
    --------------------------------------
    CONTENT
    --------------------------------------
    */

    content: {

        type: String,

        default: null

    },


    url: {

        type: String,

        default: null

    },


    size: {

        type: Number,

        default: 0,

        min: 0

    },


    /*
    --------------------------------------
    STATUS
    --------------------------------------
    */

    status: {

        type: String,

        enum: [

            "pending",

            "processing",

            "completed",

            "failed"

        ],

        default: "completed",

        index: true

    },


    error: {

        type: String,

        default: null

    },


    metadata: {

        type: mongoose.Schema.Types.Mixed,

        default: {}

    }

}, {

    timestamps: true

});


ArtifactSchema.index({

    userId: 1,

    createdAt: -1

});


ArtifactSchema.index({

    projectId: 1,

    createdAt: -1

});


ArtifactSchema.index({

    conversationId: 1,

    createdAt: -1

});


ArtifactSchema.index({

    agentId: 1,

    createdAt: -1

});



/*
==========================================
PLUGIN MODEL
EXTERNAL / SYSTEM INTEGRATIONS
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

    },


    version: {

        type: String,

        default: "1.0.0"

    },


    configuration: {

        type: mongoose.Schema.Types.Mixed,

        default: {}

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


export const Agent = mongoose.model(

    "Agent",

    AgentSchema

);


export const Tool = mongoose.model(

    "Tool",

    ToolSchema

);


export const AgentTool = mongoose.model(

    "AgentTool",

    AgentToolSchema

);


export const ToolExecution = mongoose.model(

    "ToolExecution",

    ToolExecutionSchema

);


export const Artifact = mongoose.model(

    "Artifact",

    ArtifactSchema

);


export const Plugin = mongoose.model(

    "Plugin",

    PluginSchema

);
