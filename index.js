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

// Servir ficheiros estáticos a partir da raiz do projeto
app.use(express.static(__dirname));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Rota principal da aplicação
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint principal para geração de respostas da Honey IA
app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, anexoBase64, mimeType } = req.body;

        const mainModel = "llama-3.3-70b-versatile";
        let textoExtraidoDoDocumento = "";

        if (anexoBase64) {
            const buffer = Buffer.from(anexoBase64, 'base64');
            const type = mimeType ? mimeType.toLowerCase() : '';

            // 1. Imagens via OCR Tesseract (PT / EN)
            if (type.startsWith('image/')) {
                console.log("A extrair texto da imagem via OCR...");
                const { data: { text } } = await Tesseract.recognize(buffer, 'por+eng');
                textoExtraidoDoDocumento = text;
            } 
            // 2. Documentos PDF
            else if (type === 'application/pdf' || type.includes('pdf')) {
                const pdfData = await pdfParse(buffer);
                textoExtraidoDoDocumento = pdfData.text;
            } 
            // 3. Documentos Word (.docx, .doc)
            else if (type.includes('word') || type.includes('officedocument.wordprocessingml')) {
                const result = await mammoth.extractRawText({ buffer: buffer });
                textoExtraidoDoDocumento = result.value;
            } 
            // 4. Folhas de Cálculo Excel / CSV
            else if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    textoExtraidoDoDocumento += `\n--- Aba: ${sheetName} ---\n`;
                    textoExtraidoDoDocumento += XLSX.utils.sheet_to_csv(sheet);
                });
            }
        }

        let textoPromptFinal = prompt ? prompt : "Elabore um parecer/resumo executivo estruturado e analítico das informações deste documento.";
        
        if (textoExtraidoDoDocumento) {
            textoPromptFinal += `\n\n[TEXTO EXTRAÍDO DO DOCUMENTO/ANEXO]:\n${textoExtraidoDoDocumento}`;
        }

        // System Prompt Otimizado da Honey IA
        const systemPrompt = `Você é a Honey IA — uma Plataforma Quântica de Inteligência Artificial desenhada especificamente para ajudar empresários, empreendedores e profissionais.

PERSONALIDADE E TOM DE VOZ:
- Seja calorosa, empática, acolhedora e extremamente prática. Trate o utilizador com proximidade e respeito, como uma parceira estratégica de negócios confiável.
- Em conversas casuais ou saudações, mantenha o diálogo fluido, leve e humano.
- Em tarefas técnicas, de negócios, contabilidade ou programação, combine essa empatia com respostas estruturadas, precisas e de alto nível executivo.

CAPACIDADES PRINCIPAIS QUE DEVE OFRECER:
1. Negócios e Gestão: Pareceres de viabilidade, planos de marketing, estratégias comerciais e resolução de problemas empresariais.
2. Contabilidade e Finanças: Fórmulas de Excel, análise de margens, conciliação e interpretação de dados financeiros.
3. Engenharia de Software e Web: Criação de código limpo, moderno e responsivo para websites e aplicações (HTML, CSS, JS, React, Python, Node, etc.).
4. Criação e Marketing: Ideias de logótipos, textos publicitários (copywriting), conceitos para vídeos publicitários e flyers.

REGRAS DE FORMATAÇÃO (MARKDOWN):
- Organize as respostas de forma clara e limpa usando Títulos (##, ###).
- Use **negrito** para destacar conceitos fundamentais e termos-chave.
- Formate dados numéricos, financeiros ou de comparação SEMPRE em tabelas organizadas em Markdown.
- Escreva blocos de código com a devida linguagem declarada (ex: \`\`\`html, \`\`\`javascript, \`\`\`excel).
- Quando apropriado, termine a resposta com uma sugestão calorosa para o próximo passo do negócio.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: textoPromptFinal }
            ],
            model: mainModel,
            temperature: 0.5
        });

        const respostaTexto = chatCompletion.choices[0]?.message?.content || "Não foi possível processar o pedido neste momento. Por favor, tente novamente.";

        return res.json({ sucesso: true, resposta: respostaTexto });

    } catch (error) {
        console.error("Erro no servidor Honey IA:", error);
        return res.status(500).json({ 
            sucesso: false, 
            erro: error.message || "Ocorreu um erro interno ao processar a solicitação." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🐝 Servidor Honey IA a rodar na porta ${PORT}`);
});
