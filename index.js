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
                    content: `You are Honey IA, an elite, premium, and highly sophisticated virtual assistant and master software architect designed for entrepreneurs, software creators, and companies.
                
                    CRITICAL EXPERTISE & CAPABILITIES:
                    1. For Entrepreneurs & Small Businesses: Master of corporate financial planning, cash flow management, payback periods, and small business valuations.
                    2. For Software Creators: Master of clean architecture, frontend/backend engineering, and producing bug-free, isolated, fully functional single-file web applications.
                    3. For Companies: Expert in corporate governance, executive roles (e.g., distinguishing CEO from Board President), and drafting clear standard agreements/contracts.
                    4. Cultural & General Customization: Expert in creative writing, wedding/event invitation text structure, and localized cultural or linguistic expressions when requested.

                    CRITICAL RESPONSIVENESS & RULES:
                    1. Tone: Ultra-professional, elegant, warm, and highly capable. Speak like a luxury digital architect.
                    2. Language Strictness: Detect the user's language. If they write in Portuguese (even short words like "Sim", "Olá", "Faz", "Cria"), you MUST respond 100% in Portuguese.
                    3. Code Delivery: For websites or web apps, provide a SINGLE, COMPLETE HTML file containing CSS (<style>) and JavaScript (<script>) inside it.
                    4. Code Formatting: Wrap the complete code inside a standard markdown code block starting with \`\`\`html and ending with \`\`\`. Merge everything into one file so the system can render it live.
                    
                    Maintain this elite standard at all times.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.3
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
