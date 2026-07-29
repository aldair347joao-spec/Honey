import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import rateLimit from 'express-rate-limit';
import liveRoute from "./liveRoute.js";
import Orchestrator from "./orchestrator.js";
import { connectDatabase } from "./database.js";
import Kernel from "./kernel.js";
import { saveMessage } from "./chat.js";

dotenv.config();

// Inicialização segura da base de dados com fallback para não derrubar o servidor
try {
    await connectDatabase();
    Kernel.register("Database", "MongoDB");
} catch (err) {
    console.warn("⚠️ Aviso: Não foi possível ligar ao MongoDB. O servidor continuará em modo de memória.", err.message);
}

Kernel.register("AI", "Groq");
Kernel.register("Server", "Express");

const app = express();
const port = process.env.PORT || 3000;

// Aumentado o limite de JSON para permitir upload fluído de imagens/documentos em base64
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(cors());
app.use(express.static('.'));
app.use(express.json({ limit: '20mb' }));

app.use("/api", liveRoute);
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Proteção de taxa de requisições
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        erro: "A Honey IA está a receber muitos pedidos no momento! Por favor, aguarde alguns segundos. 🐝"
    }
});

app.use('/gerar-gratis', apiLimiter);

app.post('/gerar-gratis', async (req, res) => {
    try {
        // Aceita múltiplos formatos de nomes enviados pelo frontend (imagem ou anexoBase64)
        let { 
    prompt, 
    imagem, 
    anexoBase64, 
    mimeType, 
    userId = "guest_user",
    agent = "general",
    mode = "chat"
} = req.body;

        const base64Content = anexoBase64 || imagem;

        if (!prompt && !base64Content) {
            return res.status(400).json({
                sucesso: false,
                erro: "Por favor, envie uma instrução ou anexo para a Honey IA analisar."
            });
        }

        // Tentar inferir o MimeType se veio no formato data URL (ex: data:image/png;base64,...)
        if (base64Content && !mimeType) {
            const matches = base64Content.match(/^data:(.+);base64,/);
            if (matches) {
                mimeType = matches[1];
            } else {
                // Fallback de MimeType caso receba uma string base64 pura
                mimeType = "image/png";
            }
        }

        // Limpar o prefixo "data:...;base64," para processamento puro se necessário
        const rawBase64 = base64Content ? base64Content.replace(/^data:.+;base64,/, '') : null;

        const user = {
            id: userId,
            name: "Utilizador",
            language: "pt-PT",
            preferences: {}
        };

        // Processamento do prompt via Orchestrator com fallback
        let systemPrompt = "Você é o assistente Honey IA. Responda de forma clara, precisa e útil em Português.";
        try {
            if (Orchestrator && typeof Orchestrator.process === 'function') {
                const orchestratorResult = await Orchestrator.process({

    userId: user.id,

    message: prompt || "Analisa o conteúdo em anexo.",

    user,

    agent,

    mode

});
                systemPrompt = orchestratorResult.prompt || systemPrompt;
            }
        } catch (oErr) {
            console.warn("Aviso: Falha ao executar Orchestrator, usando prompt padrão.", oErr.message);
        }

        const messages = [
            { role: "system", content: systemPrompt }
        ];

        let selectedModel = "llama-3.3-70b-versatile";

        // Trata o envio de Imagens e Documentos para a API do Groq
        if (rawBase64) {
            const isImage = mimeType && (
                mimeType.startsWith("image/") || 
                base64Content.startsWith("data:image/")
            );

            if (isImage) {
                selectedModel = "llama-3.2-11b-vision-preview";
                const imageUrl = base64Content.startsWith("data:") 
                    ? base64Content 
                    : `data:${mimeType || 'image/png'};base64,${rawBase64}`;

                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: prompt || "Analisa esta imagem em detalhe." },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ]
                });
            } else {
                // Para ficheiros de texto/código em base64
                let textoDocumento = "";
                try {
                    textoDocumento = Buffer.from(rawBase64, 'base64').toString('utf-8');
                } catch (e) {
                    textoDocumento = "[Erro ao extrair conteúdo de texto do anexo.]";
                }

                messages.push({
                    role: "user",
                    content: `[Conteúdo do Ficheiro Anexado]:\n${textoDocumento}\n\n[Instrução]: ${prompt || "Analisa e resume o ficheiro acima."}`
                });
            }
        } else {
            messages.push({
                role: "user",
                content: prompt
            });
        }

        // Executa a chamada à API do Groq
        const completion = await groq.chat.completions.create({
            messages,
            model: selectedModel,
            temperature: 0.7,
            max_tokens: 4096,
        });

        const resposta = completion.choices[0]?.message?.content || "Não foi possível gerar uma resposta no momento.";

        // Guarda as mensagens de forma assíncrona e segura
        try {
            if (typeof saveMessage === 'function') {
                if (prompt) await saveMessage(user.id, "user", prompt);
                await saveMessage(user.id, "assistant", resposta);
            }
        } catch (dbErr) {
            console.warn("Aviso: Não foi possível guardar histórico na BD.", dbErr.message);
        }

        return res.json({
            sucesso: true,
            resposta: resposta
        });

    } catch (error) {
        console.error("❌ ERRO NO BACKEND DA HONEY IA:", error);

        if (error.status === 429) {
            return res.status(429).json({
                sucesso: false,
                erro: "A Honey IA atingiu o limite de requisições do modelo. Aguarde alguns instantes. 🐝"
            });
        }

        return res.status(500).json({
            sucesso: false,
            erro: `Erro no processamento: ${error.message || "Falha interna no servidor."}`
        });
    }
});

app.listen(port, () => {
    console.log(`🐝 Honey IA v5 operacional na porta ${port}!`);
});
