const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    primeiroNome: {
        type: String,
        required: function() { return !this.googleId && !this.facebookId; }, // Apenas se não for login social
        trim: true
    },
    apelido: {
        type: String,
        required: function() { return !this.googleId && !this.facebookId; },
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: function() { return !this.googleId && !this.facebookId; } // Sem senha para Google/Facebook
    },
    // IDs para autenticação social
    googleId: {
        type: String,
        default: null
    },
    facebookId: {
        type: String,
        default: null
    },
    // Sistema de Verificação de E-mail por Código
    isVerified: {
        type: Boolean,
        default: false // Só ativa após confirmar o código
    },
    verificationCode: {
        type: String,
        default: null
    },
    verificationCodeExpires: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
