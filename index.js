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

// Aumentar o limite do body-parser para suportar ficheiros em base64 grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Servir ficheiros estáticos (HTML, CSS, JS) a partir da raiz do projeto
app.use(express.static(__dirname));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Rota principal para carregar o frontend da Honey IA
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint principal para processar mensagens, documentos e imagens
app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, anexoBase64, mimeType } = req.body;

        const mainModel = "llama-3.3-70b-versatile";
        let textoExtraidoDoDocumento = "";

        // Extração de texto de anexos, caso existam
        if (anexoBase64) {
            const buffer = Buffer.from(anexoBase64, 'base64');
            const type = mimeType ? mimeType.toLowerCase() : '';

            // 1. Processamento de Imagens via OCR (Tesseract.js)
            if (type.startsWith('image/')) {
                console.log("Honey IA: A extrair texto da imagem via OCR...");
                const { data: { text } } = await Tesseract.recognize(buffer, 'por+eng');
                textoExtraidoDoDocumento = text;
            } 
            // 2. Documentos PDF
            else if (type === 'application/pdf' || type.includes('pdf')) {
                console.log("Honey IA: A processar PDF...");
                const pdfData = await pdfParse(buffer);
                textoExtraidoDoDocumento = pdfData.text;
            } 
            // 3. Documentos Word (.docx, .doc)
            else if (type.includes('word') || type.includes('officedocument.wordprocessingml')) {
                console.log("Honey IA: A processar documento Word...");
                const result = await mammoth.extractRawText({ buffer: buffer });
                textoExtraidoDoDocumento = result.value;
            } 
            // 4. Folhas de Cálculo Excel e CSV
            else if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
                console.log("Honey IA: A processar folha de cálculo...");
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

        // System Prompt: Identidade, Tom de Voz e Regras dos Pilares Comerciais
        const systemPrompt = `Você é a Honey IA — uma assistente inteligente carinhosa, dedicada a ajudar pessoas comuns, empresários e empreendedores a impulsionar os seus negócios e rotinas laborais.

PERSONALIDADE E TOM DE VOZ:
- Seja extremamente carinhosa, respeitosa, atenciosa e acolhedora.
- Fale com clareza e empatia, simplificando conceitos complexos.
- Despeça-se sempre com um incentivo acolhedor, assinando no final: "Com carinho para o seu negócio, Honey IA 🐝".

PILARES DE ATUAÇÃO E ESPECIALIDADES:
1. Websites Responsivos e Apps Comerciais: Criação de código limpo, moderno e funcional (HTML, CSS, JS, React, etc.).
2. Identidade Visual e Logótipos: Desenvolva o conceito visual e forneça SEMPRE um bloco especial de código no formato \`\`\`prompt-imagem ... \`\`\` contendo o prompt detalhado em inglês para geração da imagem.
3. Flyers e Vídeos Publicitários:
   - Para Vídeos: Estruture o roteiro detalhadamente em CENA, ÁUDIO/VOZ e TEXTO EM ECRÃ.
   - Para Flyers: Forneça a estrutura do texto (Headline, Corpo, Chamada para Ação) e inclua SEMPRE o bloco \`\`\`prompt-imagem ... \`\`\` com o prompt em inglês para a arte gráfica visual.
4. Suporte Empresarial Geral: Análise de ficheiros, organização de tarefas e otimização laboral.

REGRAS DE FORMATAÇÃO DE RESPOSTA:
- Use Markdown limpo (Títulos ##, listas *, negrito **).
- Código Web/App (HTML, CSS, JS) deve vir sempre em blocos de código formatados (\`\`\`html, \`\`\`css, \`\`\`javascript).
- Prompts para criação de imagens de logótipos e flyers DEVEM vir dentro do bloco \`\`\`prompt-imagem SEU PROMPT AQUI \`\`\` para ativar o botão de cópia na interface.`;

        // Chamada à API Groq com o modelo Llama 3.3 70B
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: textoPromptFinal }
            ],
            model: mainModel,
            temperature: 0.5
        });

        const respostaTexto = chatCompletion.choices[0]?.message?.content || "Desculpe, tive um pequeno imprevisto ao processar o seu pedido. Pode tentar novamente, por favor?";

        return res.json({ sucesso: true, resposta: respostaTexto });

    } catch (error) {
        console.error("Erro no servidor Honey IA:", error);
        return res.status(500).json({ 
            sucesso: false, 
            erro: error.message || "Ocorreu um erro interno ao processar o seu pedido." 
        });
    }
});

// Inicialização do Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🐝 Honey IA ativa e pronta para ajudar na porta ${PORT}`);
});
