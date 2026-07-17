const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const path = require('path');
const cors = require('cors');

const app = express();

// Configurações
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Conexão MongoDB (Verifica se tens a variável no Render)
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/honey_ia_local";
mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB Conectado!"))
  .catch(err => console.error("Erro MongoDB:", err));

// Sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave_secreta_honey_ia',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// --- ROTAS DE IA ---
app.post('/gerar-gratis', async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [{ role: "system", content: "Gere apenas código." }, { role: "user", content: prompt }]
            })
        });
        const data = await response.json();
        res.json({ sucesso: true, codigo: data.choices[0].message.content });
    } catch (e) {
        res.status(500).json({ erro: "Falha na conexão com motor IA." });
    }
});

// --- ROTA PRINCIPAL (AQUI ESTÁ A CORREÇÃO DA TELA BRANCA) ---
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log("A tentar servir o ficheiro em:", indexPath);
    res.sendFile(indexPath, (err) => {
        if (err) {
            console.error("Erro ao enviar o index.html:", err);
            res.status(404).send("Erro: O ficheiro index.html não foi encontrado na raiz!");
        }
    });
});

// --- LOGIN/AUTH (Simplificado) ---
app.get('/login', (req, res) => res.render('login', { erro: null }));
app.get('/registar', (req, res) => res.render('registar', { erro: null }));

// Logout
app.get('/sair', (req, res) => {
    req.session.destroy(() => { res.redirect('/'); });
});

// Iniciar Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Honey IA a rodar na porta ${PORT}!`));
