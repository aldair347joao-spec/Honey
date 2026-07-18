const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve os ficheiros da pasta public ou da raiz
app.use(express.static('public'));
app.use(express.static('.'));

// Inicializa a Groq com a chave que tens no Render
const groq = new Groq({ apiKey: process.env.API_KEY });

app.post('/gerar-gratis', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ sucesso: false, erro: "O prompt não pode estar vazio." });
    }

    try {
        // Chamada à API da Groq utilizando o modelo atualizado Llama 3.1
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are Honey IA, an elegant, friendly, and highly intelligent virtual assistant.
                
                    CRITICAL LANGUAGE RULE:
                    1. Detect the language of the user's input immediately.
                    2. Respond strictly in the SAME language as the user's input. 
                    3. If the user speaks English, answer in English. If they speak Portuguese, answer in Portuguese. 
                    4. Maintain a professional yet warm tone in every language.
                    
                    Do not deviate from these language rules under any circumstances.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.1-8b-instant", // <--- LINHA ATUALIZADA AQUI!
            temperature: 0.7
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "Sem resposta.";

        res.json({ 
            sucesso: true, 
            codigo: responseText 
        });

    } catch (error) {
        console.error("Erro na API da Groq:", error);
        res.status(500).json({ 
            sucesso: false, 
            erro: "Ocorreu um erro ao processar o seu pedido na Groq." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Honey IA (Groq) está a correr na porta ${PORT}`);
});
