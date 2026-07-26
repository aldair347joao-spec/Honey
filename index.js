const express = require('express');
const path = require('path');
const Groq = require('groq-sdk');

const app = express();

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializa a API Groq
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ROTA DE STREAMING (SSE - Server-Sent Events)
app.post('/api/chat/stream', async (req, res) => {
  const { messages, jsonMode } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'O campo "messages" é obrigatório e deve ser um array.' });
  }

  // Cabeçalhos HTTP para manter o streaming em tempo real
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      stream: true,
      response_format: jsonMode ? { type: 'json_object' } : { type: 'text' }
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Erro na geração com a Groq:', error);
    res.write(`data: ${JSON.stringify({ error: 'Erro no processamento da IA.' })}\n\n`);
    res.end();
  }
});

// Serve a página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Porta do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Honey IA ativo na porta ${PORT}`);
});
