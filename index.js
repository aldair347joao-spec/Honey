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

// Rota principal para carregar o index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota de processamento
app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, anexoBase64, mimeType } = req.body;

        let primaryModel = "llama-3.3-70b-versatile";
        let fallbackModel = "llama-3.1-8b-instant";
        let content = [];
        let textoExtraidoDoDocumento = "";

        if (anexoBase64) {
            const buffer = Buffer.from(anexoBase64, 'base64');
            const type = mimeType ? mimeType.toLowerCase() : '';

            // 1. IMAGENS -> Visão
            if (type.startsWith('image/')) {
                primaryModel = "qwen/qwen3.6-27b";
                fallbackModel = "llama-3.2-11b-vision-preview";
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

        let textoPromptFinal = prompt || "Por favor, analisa este documento e diz-me claramente do que se trata.";
        if (textoExtraidoDoDocumento) {
            textoPromptFinal += `\n\n[CONTEÚDO EXTRAÍDO DO DOCUMENTO]:\n${textoExtraidoDoDocumento}`;
        }

        content.push({
            type: "text",
            text: textoPromptFinal
        });

        // Prompt de Sistema refinado para respostas diretas e humanas
        const systemPrompt = `És a Honey IA, uma assistente virtual inteligente, direta e amigável.
REGRAS IMPORTANTES DE RESPOSTA:
1. Responde SEMPRE diretamente ao utilizador, de forma clara, bem estruturada e fácil de ler.
2. NUNCA mostres raciocínios técnicos como "O utilizador enviou...", "Análise da Imagem:" ou "Cabeçalho:".
3. Quando o utilizador te mandar um contrato, documento ou imagem, resume de imediato: O que é o documento, quem são as partes envolvidas, os valores/serviços e as datas principais.
4. Usa marcações limpas (negrito, listas) para tornar a leitura agradável.`;

        let chatCompletion;
        
        try {
            chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: content }
                ],
                model: primaryModel,
                temperature: 0.3
            });
        } catch (primaryError) {
            console.warn(`Modelo ${primaryModel} falhou. Tentando modelo alternativo ${fallbackModel}...`, primaryError.message);
            chatCompletion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: content }
                ],
                model: fallbackModel,
                temperature: 0.3
            });
        }

        const respostaTexto = chatCompletion.choices[0]?.message?.content || "Não consegui ler o documento claramente.";

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
