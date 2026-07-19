const express = require('express');
const app = express();
app.use(express.json());

// Rota de geração corrigida para o idioma correto
app.post('/gerar-gratis', async (req, res) => {
    try {
        const { prompt, idiomaContexto } = req.body;

        // Regra do Sistema invisível injetada na raiz do pedido
        const instrucaoSistema = `[REGRA OBRIGATÓRIA DE IDIOMA]: Identifica com precisão o idioma em que o utilizador escreveu a mensagem. Responde RIGOROSAMENTE no mesmo idioma. Se o utilizador comunicou em Português, a tua resposta inteira deve ser em Português. Nunca mistures ou respondas em Espanhol a prompts em Português. (Dica de contexto detetada: ${idiomaContexto}).`;

        // Junta a instrução restrita ao prompt enviado à IA
        const promptFinal = `${instrucaoSistema}\n\nPedido do Utilizador: ${prompt}`;

        // --- Exemplo de chamada à tua API de IA (ajusta conforme usas OpenAI/Gemini) ---
        // const resultadoAI = await chamarSuaCriacaoIA(promptFinal);
        // const codigoGerado = resultadoAI.text;
        
        // Simulação de resposta bem-sucedida para o teste
        const codigoGerado = "```html\n<!DOCTYPE html><html><body><h1>Olá do Honey IA!</h1></body></html>\n```";

        return res.json({
            sucesso: true,
            codigo: codigoGerado
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ sucesso: false, erro: "Erro interno no servidor." });
    }
});

app.listen(3000, () => console.log("Servidor Honey IA a rodar com sucesso."));
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.5 // Temperatura ligeiramente mais baixa para códigos mais exatos e estáveis
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "Sem resposta.";

        res.json({ 
            sucesso: true, 
            codigo: responseText 
        });

    } catch (error) {
        console.error("Erro na API da Groq:", error);
        res.status(500).json({ 
            sucesso: false, 
            erro: "Ocorreu um erro ao processar o seu pedido na Groq." 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Honey IA (Groq Premium) está a correr na porta ${PORT}`);
});
