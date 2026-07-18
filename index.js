const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Tenta servir os ficheiros da pasta 'public', se não existir, serve da raiz '.'
app.use(express.static('public'));
app.use(express.static('.'));

// Configuração da API do Google
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

app.post('/gerar-gratis', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ sucesso: false, erro: "O prompt não pode estar vazio." });
    }

    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: `
                You are Honey IA, an elegant, friendly, and highly intelligent virtual assistant.
                
                CRITICAL LANGUAGE RULE:
                1. Detect the language of the user's input immediately.
                2. Respond strictly in the SAME language as the user's input. 
                3. If the user speaks English, answer in English. If they speak Portuguese, answer in Portuguese. 
                4. Maintain a professional yet warm tone in every language.
                
                Do not deviate from these language rules under any circumstances.
            `
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        res.json({ 
            sucesso: true, 
            codigo: responseText 
        });

    } catch (error) {
        console.error("Erro na API:", error);
        res.status(500).json({ 
            sucesso: false, 
            erro: "Ocorreu um erro ao processar o seu pedido." 
        });
    }
});

// O Render define a variável PORT automaticamente, se não, usa a 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Honey IA está a correr com sucesso na porta ${PORT}`);
});
