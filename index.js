import { connectDatabase } from "./database.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Kernel from "./kernel.js";

const UserSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    avatar: {
        type: String,
        default: ""
    },

    role: {
        type: String,
        default: "user"
    },

    preferences: {

        theme: {
            type: String,
            default: "dark"
        },

        language: {
            type: String,
            default: "pt-PT"
        }

    }

}, {
    timestamps: true
});

const User = mongoose.model("User", UserSchema);
import mongoose from "mongoose";

mongoose.connect(process.env.MONGODB_URI)
.then(() => {
    console.log("✅ MongoDB ligado com sucesso.");
})
.catch(err => {
    console.error("❌ Erro ao ligar ao MongoDB:", err);
});
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import xlsx from "xlsx";
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import rateLimit from 'express-rate-limit';

dotenv.config();

await connectDatabase();

const app = express();

// ======================================================
// MONGODB
// ======================================================

mongoose.connect(process.env.MONGODB_URI, {

    autoIndex: true

});

mongoose.connection.once("open", () => {

    console.log("✅ MongoDB conectado.");

});

mongoose.connection.on("error", (err) => {

    console.error("Erro MongoDB:", err);

});
// ======================================================
// CONVERSAS
// ======================================================

const ConversationSchema = new mongoose.Schema({

    sessionId: {

        type: String,

        required: true,

        index: true

    },

    messages: [

        {

            role: String,

            content: String,

            createdAt: {

                type: Date,

                default: Date.now

            }

        }

    ],

    createdAt: {

        type: Date,

        default: Date.now

    },

    updatedAt: {

        type: Date,

        default: Date.now

    }

});

const Conversation = mongoose.model(
    "Conversation",
    ConversationSchema
);
// ======================================================
// CONVERSATION SERVICE
// ======================================================

const ConversationService = {

    async get(sessionId) {

        let conversation =
            await Conversation.findOne({

                sessionId

            });

        if (!conversation) {

            conversation =
                await Conversation.create({

                    sessionId,

                    messages: []

                });

        }

        return conversation;

    },

    async addMessage(sessionId, role, content) {

        const conversation =
            await this.get(sessionId);

        conversation.messages.push({

            role,

            content

        });

        conversation.updatedAt = new Date();

        await conversation.save();

    }

};
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(cors());
app.use(express.static('.'));

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Proteção de Rate Limit (20 pedidos por minuto por IP)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        erro: "A Honey IA está a receber muitos pedidos no momento! Por favor, aguarde alguns segundos. 🐝"
    }
});

app.use('/gerar-gratis', apiLimiter);

// Prompts por Modo de Trabalho
const SYSTEM_PROMPTS = {
    general: `Tu és a Honey IA, uma assistente virtual inteligente, carinhosa e altamente eficiente em negócios, programação e criação de conteúdos.
Diretrizes:
1. Sê sempre cortês, acolhedora e profissional.
2. Quando pedirem código, fornece código limpo e moderno em blocos Markdown.
3. Se pedirem prompts de imagem, formata o bloco de código com a linguagem "prompt-imagem".`,

    dev: `Tu és a Honey IA no modo especialista SENIOR DEVELOPER & SOFTWARE ARCHITECT.
Diretrizes:
1. Escreve código de nível de produção (HTML, CSS, JS, Node, Python, SQL, etc.), limpo, modular e sem erros.
2. Explica brevemente a lógica e as dependências necessárias.
3. Sempre que gerares componentes web em HTML/CSS/JS completos, formata em bloco "html" para permitir a pré-visualização ao vivo.`,

    designer: `Tu és a Honey IA no modo especialista VISUAL DESIGNER & UI/UX MASTER.
Diretrizes:
1. Foca em estética, paletas de cores, tipografia, arquitetura visual e prompts de IA.
2. Quando te pedirem conceitos de logótipos, flyers ou arte, cria PROMPTS DETALHADOS em inglês formatados na linguagem "prompt-imagem" para Midjourney/DALL-E.
3. Dá conselhos de experiência do utilizador (UI/UX) modernos.`,

    marketing: `Tu és a Honey IA no modo especialista CHIEF MARKETING OFFICER (CMO) & COPYWRITER PERSUASIVO.
Diretrizes:
1. Cria copies altamente persuasivos, guiados por estruturas comprovadas (AIDA, PAS, FAB).
2. Cria roteiros de anúncios para redes sociais (TikTok, Instagram, YouTube) e slogans marcantes.
3. Foca em conversão, métricas de vendas e tom comercial atrativo.`
}; // ======================================================
// LEITOR UNIVERSAL DE DOCUMENTOS
// ======================================================

async function extractText(filePath, mimeType) {

    try {

        // PDF
        if (mimeType === "application/pdf") {

            const buffer = fs.readFileSync(filePath);

            const pdf = await pdfParse(buffer);

            return pdf.text;

        }

        // DOCX
        if (
            mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {

            const result = await mammoth.extractRawText({
                path: filePath
            });

            return result.value;

        }

        // Excel
        if (
            mimeType.includes("spreadsheet") ||
            mimeType.includes("excel")
        ) {

            const workbook = xlsx.readFile(filePath);

            let text = "";

            workbook.SheetNames.forEach(sheet => {

                text += xlsx.utils.sheet_to_csv(
                    workbook.Sheets[sheet]
                );

                text += "\n";

            });

            return text;

        }

        // TXT, HTML, CSS, JS, JSON...

        return fs.readFileSync(filePath, "utf8");

    } catch (err) {

        console.error(err);

        return "";

    }

}

app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, anexoBase64, mimeType, modo } = req.body;

        if (!prompt && !anexoBase64) {
            return res.status(400).json({
                sucesso: false,
                erro: "Por favor, envie um texto ou ficheiro para a Honey IA analisar."
            });
        }

        if (anexoBase64 && anexoBase64.length > 14 * 1024 * 1024) {
            return res.status(400).json({
                sucesso: false,
                erro: "O ficheiro enviado é demasiado grande. Envie um ficheiro com menos de 10 MB."
            });
        }

        // Escolha do Prompt de Sistema com base no modo selecionado
        const selectedSystemPrompt = SYSTEM_PROMPTS[modo] || SYSTEM_PROMPTS.general;

        // ======================================================
// MENSAGENS DA IA
// ======================================================

let messages = [

    {

        role: "system",

        content: selectedSystemPrompt

    }

];

// Arquivo enviado

if (anexoBase64 && mimeType) {

    if (mimeType.startsWith("image/")) {

        messages.push({

            role: "user",

            content: [

                {

                    type: "text",

                    text: prompt || "Analisa esta imagem."

                },

                {

                    type: "image_url",

                    image_url: {

                        url: `data:${mimeType};base64,${anexoBase64}`

                    }

                }

            ]

        });

    } else {

        const textoDocumento = Buffer
            .from(anexoBase64, "base64")
            .toString("utf8");

        messages.push({

            role: "user",

            content:
`Documento:

${textoDocumento}

Instrução:

${prompt || "Analisa este documento detalhadamente."}`

        });

    }

} else {

    messages.push({

        role: "user",

        content: prompt

    });

}

        if (anexoBase64 && mimeType) {
            const isImage = mimeType.startsWith('image/');
            if (isImage) {
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: prompt || "Analisa esta imagem e descreve os detalhes principais." },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${anexoBase64}`
                            }
                        }
                    ]
                });
            } else {
                const textoDocumento = Buffer.from(anexoBase64, 'base64').toString('utf-8');
                messages.push({
                    role: "user",
                    content: `[Conteúdo do Documento Anexado]:\n${textoDocumento}\n\n[Instrução do Utilizador]: ${prompt || "Analisa e resume o documento acima."}`
                });
            }
        } else {
            messages.push({
                role: "user",
                content: prompt
            });
        }

        // ======================================================
// MODELO AUTOMÁTICO
// ======================================================

let selectedModel = "llama-3.3-70b-versatile";

if (anexoBase64 && mimeType) {

    if (mimeType.startsWith("image/")) {

        selectedModel = "llama-3.2-11b-vision-preview";

    }

}

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: selectedModel,
            temperature: 0.7,
            max_tokens: 4096,
        });

        const resposta = completion.choices[0]?.message?.content || "Desculpe, não consegui processar a resposta.";

        return res.json({
            sucesso: true,
            resposta: resposta
        });

    } catch (error) {
        console.error("Erro no processamento da Honey IA:", error);

        if (error.status === 429) {
            return res.status(429).json({
                sucesso: false,
                erro: "A Honey IA atingiu o limite de quota temporário da API. Aguarde alguns instantes. 🐝"
            });
        }

        return res.status(500).json({
            sucesso: false,
            erro: "Ocorreu um erro interno ao processar o seu pedido. Tente novamente."
        });
    }
});

app.listen(port, () => {
    console.log(`🐝 Honey IA a rodar com sucesso na porta ${port}!`);
});
