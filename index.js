const express = require('express');
const https = require('https');
const path = require('path');
const app = express();

// Procura a chave nas variáveis de ambiente do Render, ou usa uma string vazia se não configurada
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

// Configurações essenciais do Express
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rota principal para carregar a página de chat
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota POST que o teu index.html consome
app.post('/gerar-gratis', async (req, res) => {
    const promptUtilizador = req.body.prompt;

    if (!promptUtilizador) {
        return res.status(400).json({ sucesso: false, erro: "O comando ou pergunta não pode estar vazio." });
    }

    try {
        const respostaIA = await conectarMotorGroq(promptUtilizador);
        return res.json({ sucesso: true, codigo: respostaIA });
    } catch (erro) {
        console.error("Erro no processamento:", erro);
        return res.status(500).json({ sucesso: false, erro: erro });
    }
});

// FUNÇÃO AUXILIAR COM A NOVA PERSONALIDADE INTELIGENTE E HUMANA
function conectarMotorGroq(promptText) {
    return new Promise((resolve, reject) => {
        if (!GROQ_API_KEY) {
            return reject("Chave GROQ_API_KEY não configurada no painel do Render.");
        }

        // Criamos o corpo dos dados com o System Prompt ajustado para evitar respostas puramente técnicas
        const corpoDados = JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
                { 
                    role: "system", 
                    content: "Você é a Honey IA, uma assistente virtual inteligente, amigável, acolhedora e profissional. Responda SEMPRE em português de forma natural, curta e conversacional. Regra crucial: Se o utilizador fizer perguntas normais, saudações ou apenas conversar, dialogue normalmente como um ser humano simpático faria. SÓ forneça códigos, scripts, blocos de programação ou projetos se o cliente pedir explicitamente usando palavras como 'crie um código', 'programe', 'gere um script' ou 'faça um projeto'." 
                },
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

        const requisicao = https.request(opcoes, (respostaServidor) => {
            let dadosAcumulados = '';
            respostaServidor.on('data', (chunk) => { dadosAcumulados += chunk; });
            
            respostaServidor.on('end', () => {
                try {
                    const respostaJson = JSON.parse(dadosAcumulados);
                    if (respostaServidor.statusCode === 200 && respostaJson.choices && respostaJson.choices[0]) {
                        resolve(respostaJson.choices[0].message.content);
                    } else {
                        const detalheErro = respostaJson.error ? respostaJson.error.message : `Status HTTP ${respostaServidor.statusCode}`;
                        reject(`Erro na API Groq: ${detalheErro}`);
                    }
                } catch (e) {
                    reject("Falha ao interpretar a resposta da inteligência artificial.");
                }
            });
        });

        requisicao.on('error', (erroDeRede) => {
            reject(`Falha de rede física: ${erroDeRede.message}`);
        });

        requisicao.write(corpoDados);
        requisicao.end();
    });
}

// Configuração da porta do servidor para o Render
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`Honey IA a rodar com sucesso na porta ${PORTA}`);
});
