import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import Tesseract from 'tesseract.js';
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

        const mainModel = "llama-3.3-70b-versatile";
        let textoExtraidoDoDocumento = "";

        if (anexoBase64) {
            const buffer = Buffer.from(anexoBase64, 'base64');
            const type = mimeType ? mimeType.toLowerCase() : '';

            // 1. IMAGENS -> OCR nativo com Tesseract (português/inglês)
            if (type.startsWith('image/')) {
                console.log("A extrair texto da imagem via OCR...");
                const { data: { text } } = await Tesseract.recognize(buffer, 'por+eng');
                textoExtraidoDoDocumento = text;
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

        let textoPromptFinal = prompt ? prompt : "Resuma o conteúdo e as informações deste documento de forma clara e natural.";
        
        if (textoExtraidoDoDocumento) {
            textoPromptFinal += `\n\n[TEXTO LIDO DO ANEXO/IMAGEM]:\n${textoExtraidoDoDocumento}`;
        }

        const systemPrompt = `És a Honey IA, uma assistente virtual clara, prestativa e natural.

DIRETRIZES DE RESPOSTA:
1. Responde de forma amigável, fluida e direta ao ponto.
2. Quando receberes o conteúdo de um documento ou imagem, resume as informações essenciais com clareza (ex: o tipo de documento, as partes envolvidas, o serviço/objeto, datas e valores importantes).
3. NUNCA mostres raciocínios técnicos internos, análises de cabeçalho nem observações em inglês (como "Header:", "Parties:", "The user wants...").
4. Mantém o idioma principal da interação (português por defeito), mas adapta-te se o utilizador pedir para responder noutro idioma.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: textoPromptFinal }
            ],
            model: mainModel,
            temperature: 0.3
        });

        const respostaTexto = chatCompletion.choices[0]?.message?.content || "Não consegui analisar o ficheiro enviado.";

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
