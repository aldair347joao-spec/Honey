const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const https = require('https');

const app = express();

// Configurações Básicas
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Configuração de Sessão Simples
app.use(session({
    secret: process.env.SESSION_SECRET || 'chave_secreta_honey_ia',
    resave: false,
    saveUninitialized: false
}));

// ROTA PRINCIPAL: SERVIR O INDEX.HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// FUNÇÃO AUXILIAR PARA LIGAÇÃO DIRETA À GROQ (SEM DEPENDER DE FETCH)
function chamarGroq(promptText) {
    return new Promise((resolve, reject) => {
        if (!GROQ_API_KEY) {
            return reject("Chave 'GROQ_API_KEY' não configurada nas variáveis de ambiente do Render.");
        }

        const corpoDados = JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
                { role: "system", content: "Você é a Honey IA. Gere apenas código limpo sem introduções, explicações ou markdown." },
                { role: "user", content: promptText }
            ]
        });

        const opcoes = {
            hostname: 'api.groq.com',
            port: 443,
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY.trim()}`,
                'Content-Length': Buffer.byteLength(corpoDados)
            }
        };

        const req = https.request(opcoes, (resObj) => {
            let dadosAcumulados = '';
            resObj.on('data', (chunk) => { dadosAcumulados += chunk; });
            
            resObj.on('end', () => {
                try {
                    const respostaJson = JSON.parse(dadosAcumulados);
                    if (resObj.statusCode === 200 && respostaJson.choices && respostaJson.choices[0]) {
                        resolve(respostaJson.choices[0].message.content);
                    } else {
                        const msgErro = respostaJson.error ? respostaJson.error.message : `Status HTTP ${resObj.statusCode}`;
                        reject(`Erro da API Groq: ${msgErro}`);
                    }
                } catch (e) {
                    reject("Falha ao processar resposta do motor.");
                }
            });
        });

        req.on('error', (erroConexao) => {
            reject(`Falha física na conexão: ${erroConexao.message}`);
        });

        req.write(corpoDados);
        req.end();
    });
}

// ROTAS DO MOTOR DE INTELIGÊNCIA ARTIFICIAL
app.post('/gerar-gratis', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ sucesso: false, erro: "Descreva o seu projeto." });

    try {
        const codigoGerado = await chamarGroq(prompt);
        res.json({ sucesso: true, codigo: codigoGerado });
    } catch (erroDoMotor) {
        console.error("[Erro Honey IA]:", erroDoMotor);
        res.status(500).json({ sucesso: false, erro: erroDoMotor });
    }
});

app.post('/gerar', async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ sucesso: false, erro: "Descreva o seu projeto." });

    try {
        const codigoGerado = await chamarGroq(prompt);
        res.json({ sucesso: true, codigo: codigoGerado });
    } catch (erroDoMotor) {
        res.status(500).json({ sucesso: false, erro: erroDoMotor });
    }
});

// Inicialização do Servidor na porta correta do Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Honey IA atualizada a rodar na porta ${PORT}!`));
