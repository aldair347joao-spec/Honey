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

// Servir ficheiros estáticos a partir do diretório raiz
app.use(express.static(__dirname));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Rota principal da aplicação
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint para processamento e geração de respostas
app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, anexoBase64, mimeType } = req.body;

        const mainModel = "llama-3.3-70b-versatile";
        let textoExtraidoDoDocumento = "";

        if (anexoBase64) {
            const buffer = Buffer.from(anexoBase64, 'base64');
            const type = mimeType ? mimeType.toLowerCase() : '';

            // 1. Processamento de Imagens via OCR Tesseract (PT / EN)
            if (type.startsWith('image/')) {
                console.log("A extrair texto da imagem via OCR...");
                const { data: { text } } = await Tesseract.recognize(buffer, 'por+eng');
                textoExtraidoDoDocumento = text;
            } 
            // 2. Processamento de Documentos PDF
            else if (type === 'application/pdf' || type.includes('pdf')) {
                const pdfData = await pdfParse(buffer);
                textoExtraidoDoDocumento = pdfData.text;
            } 
            // 3. Processamento de Documentos Word (.docx, .doc)
            else if (type.includes('word') || type.includes('officedocument.wordprocessingml')) {
                const result = await mammoth.extractRawText({ buffer: buffer });
                textoExtraidoDoDocumento = result.value;
            } 
            // 4. Processamento de Planilhas Excel / CSV (.xlsx, .xls, .csv)
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

        // System Prompt Otimizado para Respostas Executivas e Fluidez Colaborativa
        const systemPrompt = `Você é a Honey IA — uma Plataforma Executiva de Inteligência Artificial para Análise Estratégica, Gestão, Engenharia e Soluções Técnicas.

DIRETRIZES DE COMUNICAÇÃO E ESTILO:
1. POSTURA E TOM: Seja um parceiro de trabalho inteligente, direto e articulado. Mantenha um tom profissional, sofisticado e prestável, evitando formalismos excessivamente rígidos ou frios.
2. SAUDAÇÃO E FLUIDEZ: Em interações de conversa geral, responda de forma fluida e natural. Em análises de documentos ou tarefas técnicas, pode saudar brevemente antes de ir direto ao ponto.
3. ESTRUTURA EM MARKDOWN:
   - Organize as respostas de forma escaneável utilizando Títulos (##, ###).
   - Use Blocos de Citação (>) para destacar pareceres finais, resumos estratégicos ou conclusões críticas.
   - Destaque termos importantes com **negrito**.
   - Monte Tabelas organizadas em Markdown sempre que apresentar comparações, métricas, dados financeiros ou numéricos.
4. PROCESSAMENTO DE DOCUMENTOS: Ao analisar anexos, apresente um parecer técnico estruturado identificando o objeto principal, pontos críticos, datas/prazos, valores e recomendações práticas.
5. LINGUAGEM: Utilize o português (pt-PT ou pt-BR) de forma elegante e clara, sem expor raciocínios técnicos internos do sistema ou metadados em inglês.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: textoPromptFinal }
            ],
            model: mainModel,
            temperature: 0.4
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
