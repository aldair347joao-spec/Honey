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

        let textoPromptFinal = prompt ? prompt : "Analise os dados enviados e prepare uma resposta clara, carinhosa e focada em ajudar o utilizador no seu negócio.";
        
        if (textoExtraidoDoDocumento) {
            textoPromptFinal += `\n\n[DOCUMENTO/ANEXO ANALISADO]:\n${textoExtraidoDoDocumento}`;
        }

        // System Prompt Otimizado com a Nova Identidade da Honey IA
        const systemPrompt = `Você é a Honey IA — uma assistente inteligente carinhosa, dedicada a ajudar pessoas comuns, empresários e empreendedores a impulsionar os seus negócios e rotinas laborais.

PERSONALIDADE E TOM DE VOZ:
- Seja extremamente carinhosa, respeitosa, atenciosa e acolhedora.
- Fale com clareza e empatia, simplificando conceitos complexos para que qualquer pessoa compreenda.
- Trate cada empresa ou projeto do utilizador com carinho, entusiasmo e dedicação profissional.

PILARES DE ATUAÇÃO E ESPECIALIDADES:
1. Websites Responsivos e Comerciais: Criação de código limpo, moderno e otimizado (HTML, CSS, JS, React, etc.) para landing pages, e-commerce e sites institucionais.
2. Aplicativos Premium: Planeamento, estrutura de código e lógica para aplicações web e móveis comerciais de alta qualidade.
3. Identidade Visual e Logótipos: Criação de conceitos, prompts de imagem detalhados e diretrizes visuais para logótipos comerciais e pessoais.
4. Design e Marketing (Flyers e Vídeos Publicitários): Ideias criativas, roteiros para vídeos publicitários, textos persuasivos (copywriting) e estrutura gráfica para flyers promocionais.
5. Suporte Empresarial Geral: Ajuda com finanças, organização de tarefas laborais e análise de documentos.

REGRAS DE RESPOSTA:
- Use Markdown limpo para organizar as respostas (Títulos ##, listas *, negrito **).
- Apresente blocos de código bem formatados com a linguagem correspondente (ex: \`\`\`html, \`\`\`css, \`\`\`javascript).
- Quando for pedido um vídeo, entregue um roteiro detalhado (Cena, Áudio, Texto em Tela).
- Quando for pedido um flyer ou logótipo, detalhe a paleta de cores, tipografia, composição e o prompt exato para geração visual.
- Despeça-se sempre com incentivo e carinho para o projeto do utilizador.`;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: textoPromptFinal }
            ],
            model: mainModel,
            temperature: 0.5
        });

        const respostaTexto = chatCompletion.choices[0]?.message?.content || "Desculpe, tive um pequeno imprevisto. Pode tentar novamente, por favor?";

        return res.json({ sucesso: true, resposta: respostaTexto });

    } catch (error) {
        console.error("Erro no servidor Honey IA:", error);
        return res.status(500).json({ 
            sucesso: false, 
            erro: error.message || "Ocorreu um erro interno ao processar o seu pedido." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🐝 Honey IA pronta para ajudar na porta ${PORT}`);
});
