import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true
    },

    email: {
        type: String,
        unique: true,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    plano: {
        type: String,
        default: "free"
    },

    criadoEm: {
        type: Date,
        default: Date.now
    }

});

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

const MessageSchema = new mongoose.Schema({

    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation"
    },

    role: {
        type: String,
        enum: ["user", "assistant", "system"]
    },

    content: {
        type: String
    },

    criadoEm: {
        type: Date,
        default: Date.now
    }

});

const MemorySchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    chave: String,

    valor: String,

    importancia: {
        type: Number,
        default: 1
    },

    criadoEm: {
        type: Date,
        default: Date.now
    }

});

const PluginSchema = new mongoose.Schema({

    nome: String,

    descricao: String,

    ativo: {
        type: Boolean,
        default: true
    }

});

const DocumentSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    nome: String,

    tipo: String,

    texto: String,

    criadoEm: {
        type: Date,
        default: Date.now
    }

});

export const User = mongoose.model("User", UserSchema);

export const Conversation = mongoose.model("Conversation", ConversationSchema);

export const Message = mongoose.model("Message", MessageSchema);

export const Memory = mongoose.model("Memory", MemorySchema);

export const Plugin = mongoose.model("Plugin", PluginSchema);

export const Document = mongoose.model("Document", DocumentSchema);
