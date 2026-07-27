import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import rateLimit from 'express-rate-limit';

dotenv.config();

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
};

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

        let messages = [
            {
                role: "system",
                content: selectedSystemPrompt
            }
        ];

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

        const selectedModel = (anexoBase64 && mimeType && mimeType.startsWith('image/')) 
            ? "llama-3.2-11b-vision-preview" 
            : "llama-3.3-70b-versatile";

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
