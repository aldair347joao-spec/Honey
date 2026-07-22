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

        let textoPromptFinal = prompt ? prompt : "Elabore um parecer/resumo executivo estruturado e analítico do conteúdo e das informações deste documento.";
        
        if (textoExtraidoDoDocumento) {
            textoPromptFinal += `\n\n[TEXTO EXTRAÍDO DO DOCUMENTO/ANEXO]:\n${textoExtraidoDoDocumento}`;
        }

        // Directiva Executiva e Profissional para a Honey IA
        const systemPrompt = `Você é a Honey IA — uma Plataforma de Inteligência Artificial Executiva e Corporativa voltada para Análise Estratégica, Gestão, Engenharia e Soluções Técnicas.

DIRETRIZES DE RESPOSTA (RIGOROSO):
1. NUNCA responda como um chat informal ("Claro!", "Olá!", "Tudo bem?", "Sobre o que quer conversar?"). Comece imediatamente com a análise ou resposta técnica.
2. Mantenha um tom altamente profissional, executivo, direto, analítico e elegante.
3. Estruture TODAS as respostas utilizando Markdown avançado:
   - Use Títulos e Subtítulos claros (##, ###).
   - Use Blocos de Citação (>) para resumos executivos ou destaques críticos.
   - Use Listas organizadas com negrito nos conceitos-chave.
   - Use Tabelas em formato Markdown sempre que envolver dados, comparações ou métricas.
4. Quando receber conteúdo de anexos/documentos, elabore um parecer técnico e estruturado destacando o objeto principal, dados críticos, valores, prazos e obrigações/observações fundamentais.
5. NUNCA mostre raciocínios técnicos internos, metadados ou observações de sistema em inglês (ex: "Header:", "Parties:", "The user wants...").
6. O idioma principal de comunicação é o português.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: textoPromptFinal }
            ],
            model: mainModel,
            temperature: 0.3
        });

        const respostaTexto = chatCompletion.choices[0]?.message?.content || "Não foi possível gerar a análise do conteúdo enviado.";

        return res.json({ sucesso: true, resposta: respostaTexto });

    } catch (error) {
        console.error("Erro no servidor:", error);
        return res.status(500).json({ 
            sucesso: false, 
            erro: error.message || "Ocorreu um erro ao processar a solicitação." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Honey IA a rodar na porta ${PORT}`);
});
