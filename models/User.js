const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    primeiroNome: {
        type: String,
        required: function() { return !this.googleId && !this.facebookId; },
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
        required: function() { return !this.googleId && !this.facebookId; }
    },
    // IDs de Autenticação Social
    googleId: {
        type: String,
        default: null
    },
    facebookId: {
        type: String,
        default: null
    },
    // Sistema de Verificação de E-mail
    isVerified: {
        type: Boolean,
        default: false
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
