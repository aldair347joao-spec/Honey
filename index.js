import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Otimização de limites no payload do Express (até 15MB para suportar ficheiros base64)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(cors());
app.use(express.static('.'));

// Inicialização da API do Groq
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// 1. Proteção de Segurança: Limite de Requisições (Rate Limiter)
// Limita cada IP a no máximo 20 requisições por minuto
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        sucesso: false,
        erro: "A Honey IA está a receber muitos pedidos no momento! Por favor, aguarde alguns segundos antes de tentar novamente. 🐝"
    }
});

// Aplicar o limite apenas à rota de geração
app.use('/gerar-gratis', apiLimiter);

// System Prompt Principal da Honey IA
const SYSTEM_PROMPT = `Tu és a Honey IA, uma assistente virtual extremamente inteligente, carinhosa, eficiente e focada em negócios, programação e criação de conteúdos.
O teu objetivo é ajudar criadores, programadores e empresas a criarem soluções completas.

Diretrizes de resposta:
1. Sê sempre cortês, acolhedora e altamente profissional.
2. Quando te pedirem código (HTML, CSS, JS, etc.), fornece o código limpo, moderno e funcional dentro de blocos de código Markdown indicando a linguagem.
3. Se o utilizador pedir para criar um Prompt para Gerador de Imagem (ex: Midjourney, DALL-E, Leonardo AI), formata o bloco de código com a linguagem "prompt-imagem" para que a interface crie um cartão destacado.
4. Se o utilizador enviar imagens ou documentos, analisa o conteúdo detalhadamente e responde com precisão.`;

// Rota principal para geração de respostas
app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, anexoBase64, mimeType } = req.body;

        if (!prompt && !anexoBase64) {
            return res.status(400).json({
                sucesso: false,
                erro: "Por favor, envie um texto ou um ficheiro para a Honey IA analisar."
            });
        }

        // Validação do tamanho do anexo Base64 (máximo ~10MB em raw data / ~13.3MB em string base64)
        if (anexoBase64 && anexoBase64.length > 14 * 1024 * 1024) {
            return res.status(400).json({
                sucesso: false,
                erro: "O ficheiro enviado é demasiado grande. Por favor, envie um ficheiro com menos de 10 MB."
            });
        }

        let messages = [
            {
                role: "system",
                content: SYSTEM_PROMPT
            }
        ];

        // Construção das mensagens suportando Vision/Anexos ou Texto simples
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
                // Caso seja um documento legível/texto
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

        // Seleção dinâmica do modelo (llama-3.2-11b-vision-preview para imagens ou llama-3.3-70b-versatile para texto)
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

        // Tratamento de erros amigável para limites de taxa da API do Groq
        if (error.status === 429) {
            return res.status(429).json({
                sucesso: false,
                erro: "A Honey IA atingiu o limite de quota temporário da API. Por favor, tente novamente dentro de instantes. 🐝"
            });
        }

        return res.status(500).json({
            sucesso: false,
            erro: "Ocorreu um erro interno ao processar o seu pedido. Por favor, tente novamente."
        });
    }
});

app.listen(port, () => {
    console.log(`🐝 Honey IA a rodar com sucesso na porta ${port}!`);
});
