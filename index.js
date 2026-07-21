import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Servir ficheiros estáticos da raiz
app.use(express.static(__dirname));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota de processamento
app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, anexoBase64, mimeType } = req.body;

        // Lista de modelos de visão para tentar em sequência (Fallback automático)
        const visionModels = [
            "llama-3.2-11b-vision-preview",
            "llama-3.2-90b-vision-preview",
            "llama-3.3-70b-versatile"
        ];

        let selectedModel = "llama-3.3-70b-versatile"; 
        let content = [];
        let textoExtraidoDoDocumento = "";
        let isImage = false;

        if (anexoBase64) {
            const buffer = Buffer.from(anexoBase64, 'base64');
            const type = mimeType ? mimeType.toLowerCase() : '';

            // 1. IMAGENS
            if (type.startsWith('image/')) {
                isImage = true;
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${type};base64,${anexoBase64}`
                    }
                });
            } 
            // 2. PDF
            else if (type === 'application/pdf' || type.includes('pdf')) {
                const pdfData = await pdfParse(buffer);
                textoExtraidoDoDocumento = pdfData.text;
            } 
            // 3. WORD (.docx, .doc)
            else if (type.includes('word') || type.includes('officedocument.wordprocessingml')) {
                const result = await mammoth.extractRawText({ buffer: buffer });
                textoExtraidoDoDocumento = result.value;
            } 
            // 4. EXCEL / CSV (.xlsx, .xls, .csv)
            else if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    textoExtraidoDoDocumento += `\n--- Aba: ${sheetName} ---\n`;
                    textoExtraidoDoDocumento += XLSX.utils.sheet_to_csv(sheet);
                });
            }
        }

        let textoPromptFinal = prompt ? prompt : "Resuma o conteúdo e as informações deste ficheiro de forma clara e natural.";
        
        if (textoExtraidoDoDocumento) {
            textoPromptFinal += `\n\n[CONTEÚDO EXTRAÍDO DO DOCUMENTO]:\n${textoExtraidoDoDocumento}`;
        }

        content.push({
            type: "text",
            text: textoPromptFinal
        });

        const systemPrompt = `És a Honey IA, uma assistente virtual clara, direta e natural.

DIRETRIZES DE RESPOSTA:
1. Responde de forma amigável, humana e direta ao ponto.
2. Quando o utilizador enviar um documento ou imagem, resume claramente as informações principais (de que se trata, intervenientes, valores, datas).
3. NUNCA mostres raciocínios técnicos, análises de estrutura ("Header:", "Parties:") ou notas internas em inglês.
4. Fala na língua da interação (português por defeito), mas responde noutro idioma se o utilizador o solicitar explicitamente.`;

        let chatCompletion;

        // Se for imagem, tenta os modelos de visão um a um até um funcionar
        if (isImage) {
            let success = false;
            for (const modelCandidate of visionModels) {
                try {
                    chatCompletion = await groq.chat.completions.create({
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: content }
                        ],
                        model: modelCandidate,
                        temperature: 0.3
                    });
                    success = true;
                    break; // Funcionou, sai do loop
                } catch (err) {
                    console.warn(`Modelo de visão ${modelCandidate} falhou. Tentando o próximo...`);
                }
            }
            if (!success) {
                throw new Error("Nenhum modelo de visão disponível de momento no fornecedor.");
            }
        } else {
            // Processamento normal de texto/documentos
            chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: content }
                ],
                model: selectedModel,
                temperature: 0.3
            });
        }

        const respostaTexto = chatCompletion.choices[0]?.message?.content || "Não consegui analisar o ficheiro.";

        return res.json({ sucesso: true, resposta: respostaTexto });

    } catch (error) {
        console.error("Erro no servidor:", error);
        return res.status(500).json({ 
            sucesso: false, 
            erro: error.message || "Ocorreu um erro ao processar o ficheiro." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Honey IA a rodar na porta ${PORT}`);
});
