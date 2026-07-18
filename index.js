const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Assume que o teu index.html está numa pasta 'public'

// Configuração da API do Google (Certifica-te que tens a chave no teu ficheiro .env)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

app.post('/gerar-gratis', async (req, res) => {
    const { prompt } = req.body;

    try {
        // Configuramos a instrução de sistema aqui dentro para garantir que ela obedece
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Honey IA está a correr na porta ${PORT}`);
});
