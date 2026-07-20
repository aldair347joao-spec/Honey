import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

const app = express();

// Aumentar o limite para permitir o envio de imagens/ficheiros em Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Servir os ficheiros estáticos da pasta 'public' (onde fica o teu index.html)
app.use(express.static('public'));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, anexoBase64, mimeType } = req.body;

        let model = "llama-3.3-70b-versatile"; // Modelo ultra-rápido para texto/documentos
        let content = [];
        let textoExtraidoDoDocumento = "";

        // PROCESSAMENTO DE FICHEIROS ANEXADOS
        if (anexoBase64) {
            const buffer = Buffer.from(anexoBase64, 'base64');
            const type = mimeType ? mimeType.toLowerCase() : '';

            // 1. IMAGENS (JPG, PNG, WEBP, GIF) -> Visão Computacional do Groq
            if (type.startsWith('image/')) {
                model = "llama-3.2-11b-vision-preview";
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${type};base64,${anexoBase64}`
                    }
                });
            } 
            // 2. DOCUMENTOS PDF
            else if (type === 'application/pdf' || type.includes('pdf')) {
                const pdfData = await pdfParse(buffer);
                textoExtraidoDoDocumento = pdfData.text;
            } 
            // 3. DOCUMENTOS WORD (.docx, .doc)
            else if (type.includes('word') || type.includes('officedocument.wordprocessingml')) {
                const result = await mammoth.extractRawText({ buffer: buffer });
                textoExtraidoDoDocumento = result.value;
            } 
            // 4. PLANILHAS EXCEL / CSV (.xlsx, .xls, .csv)
            else if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    textoExtraidoDoDocumento += `\n--- Aba: ${sheetName} ---\n`;
                    textoExtraidoDoDocumento += XLSX.utils.sheet_to_csv(sheet);
                });
            }
        }

        // MONTAGEM DO PROMPT FINAL
        let textoPromptFinal = prompt || "Por favor, analisa o conteúdo e os detalhes do anexo.";
        if (textoExtraidoDoDocumento) {
            textoPromptFinal += `\n\n[CONTEÚDO EXTRAÍDO DO DOCUMENTO ANEXADO]:\n${textoExtraidoDoDocumento}`;
        }

        content.push({
            type: "text",
            text: textoPromptFinal
        });

        // CHAMADA À API DO GROQ
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "És a Honey IA, assistente executiva especialista em análise de documentos, imagens, contratos, finanças e engenharia."
                },
                {
                    role: "user",
                    content: content
                }
            ],
            model: model,
            temperature: 0.2
        });

        const respostaTexto = chatCompletion.choices[0]?.message?.content || "Sem resposta do modelo.";

        return res.json({ sucesso: true, resposta: respostaTexto });

    } catch (error) {
        console.error("Erro no processamento:", error);
        return res.status(500).json({ 
            sucesso: false, 
            erro: "Ocorreu um erro ao processar o ficheiro ou ao comunicar com a IA." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Honey IA a rodar na porta ${PORT}`);
});
