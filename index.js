const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static('public'));
app.use(express.static('.'));

const groq = new Groq({ apiKey: process.env.API_KEY });

app.post('/gerar-gratis', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ sucesso: false, erro: "O prompt não pode estar vazio." });
    }

    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are Honey IA, an elite, premium, and highly sophisticated virtual assistant and master software architect.
                
                    CRITICAL RULES:
                    1. Tone: Ultra-professional, elegant, warm, and highly capable. Speak like a luxury digital architect.
                    2. Language: Detect the user's input language instantly and respond strictly in the SAME language.
                    3. Code Delivery for Apps/Websites: When the user requests a website, interface, or web application, you must provide a SINGLE, COMPLETE, and fully functional HTML file containing the CSS (<style>) and JavaScript (<script>) integrated inside it. 
                    4. Code Formatting: Always wrap the complete code inside a standard markdown code block starting with \`\`\`html and ending with \`\`\`. Avoid separate blocks for CSS or JS; merge everything into one clean HTML file so the system can render it live.
                    
                    Maintain this elite standard at all times.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.5 // Temperatura ligeiramente mais baixa para códigos mais exatos e estáveis
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
    console.log(`Honey IA (Groq Premium) está a correr na porta ${PORT}`);
});
