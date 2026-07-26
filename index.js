// index.js — Honey IA (Backend com Streaming SSE + Cliente Frontend Integrado)
const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();

// Middlewares para ler JSON e servir ficheiros estáticos da pasta "public"
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializa o SDK do Groq com a tua chave de API nas variáveis de ambiente
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * ROTA DE STREAMING (SSE - Server-Sent Events)
 * Envia fragmentos de texto em tempo real e suporta formato JSON estrito
 */
app.post('/api/chat/stream', async (req, res) => {
  const { messages, jsonMode } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'O campo "messages" é obrigatório e deve ser um array.' });
  }

  // Cabeçalhos HTTP para manter a conexão aberta e transmitir em fluxo (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      stream: true,
      // Força a saída em JSON válido quando jsonMode é verdadeiro
      response_format: jsonMode ? { type: 'json_object' } : { type: 'text' }
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // Formato padrão SSE: "data: {JSON}\n\n"
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Sinaliza ao cliente que o streaming terminou
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Erro na geração com a Groq:', error);
    res.write(`data: ${JSON.stringify({ error: 'Ocorreu um erro no processamento da IA.' })}\n\n`);
    res.end();
  }
});

// Rota principal para carregar o index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Honey IA a rodar na porta ${PORT}`);
});

/* ============================================================================
   CÓDIGO DE CLIENTE (Copia o trecho abaixo para o teu frontend / script.js)
   ============================================================================

   async function pedirRespostaHoneyIA(historicoMensagens, modoJSON = false, aoReceberToken) {
     try {
       const resposta = await fetch('/api/chat/stream', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           messages: historicoMensagens, 
           jsonMode: modoJSON 
         })
       });

       const leitor = resposta.body.getReader();
       const decodificador = new TextDecoder('utf-8');
       let buffer = '';

       while (true) {
         const { done, value } = await leitor.read();
         if (done) break;

         buffer += decodificador.decode(value, { stream: true });
         const blocos = buffer.split('\n\n');
         buffer = blocos.pop(); // Mantém o fragmento incompleto no buffer

         for (const bloco of blocos) {
           if (bloco.startsWith('data: ')) {
             const dado = bloco.replace('data: ', '').trim();
             if (dado === '[DONE]') return;

             const objeto = JSON.parse(dado);
             if (objeto.content) {
               aoReceberToken(objeto.content); // Atualiza a interface token a token
             }
           }
         }
       }
     } catch (erro) {
       console.error('Erro ao conectar com a Honey IA:', erro);
     }
   }

   // Exemplo de uso simples no navegador:
   // const conversa = [{ role: 'user', content: 'Cria uma lista de metas em JSON' }];
   // pedirRespostaHoneyIA(conversa, true, (chunk) => {
   //   document.getElementById('resposta').textContent += chunk;
   // });
*/
