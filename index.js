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

        let selectedModel = "llama-3.3-70b-versatile"; // Modelo padrão para texto
        let content = [];
        let textoExtraidoDoDocumento = "";

        if (anexoBase64) {
            const buffer = Buffer.from(anexoBase64, 'base64');
            const type = mimeType ? mimeType.toLowerCase() : '';

            // 1. IMAGENS -> Visão com o modelo ativo da Groq
            if (type.startsWith('image/')) {
                selectedModel = "llama-3.2-11b-vision-preview";
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

        let textoPromptFinal = prompt ? prompt : "Resume as informações principais deste ficheiro/imagem de forma clara e natural.";
        
        if (textoExtraidoDoDocumento) {
            textoPromptFinal += `\n\n[CONTEÚDO EXTRAÍDO DO DOCUMENTO]:\n${textoExtraidoDoDocumento}`;
        }

        content.push({
            type: "text",
            text: textoPromptFinal
        });

        // Prompt do sistema ajustado para tom natural e resposta fluida
        const systemPrompt = `És a Honey IA, uma assistente inteligente, prestativa e com um tom de conversa humano e natural.

DIRETRIZES DE COMUNICAÇÃO:
1. IDIOMA: Responde no idioma principal da conversa ou do documento. Se o utilizador pedir explicitamente para responder noutra língua (ex: inglês, francês, espanhol), atende ao pedido normalmente.
2. ANEXOS E DOCUMENTOS: Quando o utilizador enviar uma imagem ou documento, resume o conteúdo de forma clara, amigável e direta ao ponto. Explica o que é o documento, quem envolve, valores ou datas importantes sem parecer um relatório técnico robótico.
3. CONVERSAÇÃO: Fala diretamente com o utilizador. NUNCA incluas raciocínio interno, notas de análise nem termos como "Header:", "Parties:" ou "The user wants...".`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: content }
            ],
            model: selectedModel,
            temperature: 0.4
        });

        const respostaTexto = chatCompletion.choices[0]?.message?.content || "Não consegui analisar o documento.";

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
