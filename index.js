import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import xlsx from 'xlsx';

import Orchestrator from "./orchestrator.js";
import { connectDatabase } from "./database.js";
import Kernel from "./kernel.js";
import { saveMessage } from "./chat.js";
import { saveMemory } from "./memory.js";

dotenv.config();

// Inicialização da base de dados e registo no Kernel
await connectDatabase();
Kernel.register("Database", "MongoDB");
Kernel.register("AI", "Groq");
Kernel.register("Server", "Express");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(cors());
app.use(express.static('.'));

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Proteção contra abuso (20 pedidos por minuto por IP)
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

// Leitor de ficheiros
async function extractText(filePath, mimeType) {
    try {
        if (mimeType === "application/pdf") {
            const buffer = fs.readFileSync(filePath);
            const pdf = await pdfParse(buffer);
            return pdf.text;
        }
        if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value;
        }
        if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
            const workbook = xlsx.readFile(filePath);
            let text = "";
            workbook.SheetNames.forEach(sheet => {
                text += xlsx.utils.sheet_to_csv(workbook.Sheets[sheet]) + "\n";
            });
            return text;
        }
        return fs.readFileSync(filePath, "utf8");
    } catch (err) {
        console.error("Erro ao extrair texto do documento:", err);
        return "";
    }
}

app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, anexoBase64, mimeType, userId = "guest_user" } = req.body;

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

        const user = {
            id: userId,
            name: "Utilizador",
            language: "pt-PT",
            preferences: {}
        };

        const orchestratorResult = await Orchestrator.process({
            userId: user.id,
            message: prompt || "Analisa o documento em anexo.",
            user
        });

        const messages = [
            {
                role: "system",
                content: orchestratorResult.prompt
            }
        ];

        if (anexoBase64 && mimeType) {
            const isImage = mimeType.startsWith("image/");
            if (isImage) {
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: prompt || "Analisa esta imagem e descreve os detalhes principais." },
                        { type: "image_url", image_url: { url: `data:${mimeType};base64,${anexoBase64}` } }
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

        let selectedModel = "llama-3.3-70b-versatile";
        if (anexoBase64 && mimeType && mimeType.startsWith("image/")) {
            selectedModel = "llama-3.2-11b-vision-preview";
        }

        const completion = await groq.chat.completions.create({
            messages,
            model: selectedModel,
            temperature: 0.7,
            max_tokens: 4096,
        });

        const resposta = completion.choices[0]?.message?.content || "Desculpe, não consegui processar a resposta.";

        // Guardar mensagem e histórico na BD
        if (prompt) await saveMessage(user.id, "user", prompt);
        await saveMessage(user.id, "assistant", resposta);

        return res.json({
            sucesso: true,
            resposta
        });

    } catch (error) {
        console.error("Erro no processamento da Honey IA:", error);

        if (error.status === 429) {
            return res.status(429).json({
                sucesso: false,
                erro: "A Honey IA atingiu o limite temporário de pedidos. Aguarde alguns instantes. 🐝"
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
