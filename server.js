const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Configurações Básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Conexão Base de Dados de Segurança (Caso uses no futuro)
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/honey_ia_local";
mongoose.connect(mongoURI)
  .then(() => console.log("MongoDB Ativo!"))
  .catch(err => console.error("Erro MongoDB:", err));

// Configuração de Sessão Simples
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave_secreta_honey_ia',
    resave: false,
    saveUninitialized: false
}));

// ==========================================
// ROTA PRINCIPAL: SERVIR O INDEX.HTML
// ==========================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// ROTAS DO MOTOR DE INTELIGÊNCIA ARTIFICIAL (GROQ)
// ==========================================
app.post('/gerar-gratis', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ erro: "Descreva o seu projeto." });

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                "Authorization": `Bearer ${GROQ_API_KEY}` 
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    { role: "system", content: "Você é a Honey IA. Gere apenas código limpo sem introduções ou explicações." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        
        if (!response.ok || !data.choices) {
            return res.status(500).json({ erro: "Erro na API da Groq. Verifica a GROQ_API_KEY no Render." });
        }

        res.json({ sucesso: true, codigo: data.choices[0].message.content });
    } catch (e) {
        res.status(500).json({ erro: "Falha ao conectar com o motor da Honey IA." });
    }
});

// Rota alternativa caso o botão chame por /gerar
app.post('/gerar', async (req, res) => {
    const { prompt } = req.body;
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [{ role: "system", content: "Você é a Honey IA." }, { role: "user", content: prompt }]
            })
        });
        const data = await response.json();
        res.json({ sucesso: true, codigo: data.choices[0].message.content });
    } catch (e) {
        res.status(500).json({ erro: "Falha no motor." });
    }
});

// Inicialização do Servidor na porta correta do Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Honey IA a rodar sem erros na porta ${PORT}!`));
