/*
==========================================
HONEY IA OS - LIVE ROUTE ENGINE V4.0
FULL PRODUCTION (LIVE & STREAMING ENGINE)
==========================================
*/

import orchestratorinstance from './orchestrator.js';

/**
 * Utilitário para formatar eventos SSE
 */
const formatSSEEvent = (event, data) => {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
};

/**
 * Controller principal para rotas em tempo real (Server-Sent Events - SSE)
 */
export const handlelivestreamroute = async (req, res) => {
    const startTime = Date.now();

    // 1. Extração segura dos parâmetros do body
    const {
        prompt,
        agentId = null,
        history = [],
        workspacecontext = {},
        usermemory = [],
        mode = "live",
        audioEnabled = false
    } = req.body || {};

    // 2. Validação inicial de entrada
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
        return res.status(400).json({
            success: false,
            error: "O campo 'prompt' é obrigatório e deve ser uma string válida."
        });
    }

    // 3. Configuração rigorosa dos cabeçalhos HTTP para Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Desativa buffering no Nginx/Reverse Proxy

    // Notificar o cliente que a conexão SSE foi estabelecida com sucesso
    res.write(formatSSEEvent('connected', {
        status: 'online',
        timestamp: new Date().toISOString(),
        mode: mode
    }));

    // Monitorizar se o cliente cancelou a conexão a meio da transmissão
    let isclientconnected = true;
    req.on('close', () => {
        isclientconnected = false;
        console.log('[liveroute] Cliente desligou a conexão SSE prematuramente.');
    });

    try {
        let accumulatedText = "";

        // 4. Iniciar o processamento via Streaming no Orchestrator
        await orchestratorinstance.processStream({
            userPrompt: prompt,
            agentId,
            history,
            workspacecontext,
            usermemory,
            mode,
            onChunk: (chunkText) => {
                if (!isClientConnected) return;

                accumulatedText += chunkText;

                // Envia o fragmento de texto para o cliente
                res.write(formatSSEEvent('chunk', {
                    content: chunkText,
                    accumulatedLength: accumulatedText.length
                }));
            },
            onComplete: (summary) => {
                if (!isclientconnected) return;

                const durationMs = Date.now() - startTime;

                // Envia o sinalizador de conclusão e as estatísticas do agente selecionado
                res.write(formatSSEEvent('end', {
                    success: true,
                    agent: summary.agent,
                    fullResponse: summary.fullResponse,
                    audioEnabled: audioEnabled,
                    metrics: {
                        durationMs,
                        ...(summary.metrics || {})
                    }
                }));

                res.end();
            },
            onError: (err) => {
                if (!isClientConnected) return;

                console.error('[LiveRoute Stream Inner Error]:', err);

                res.write(formatSSEEvent('stream_error', {
                    success: false,
                    error: err.message || "Erro durante o streaming da resposta."
                }));

                res.end();
            }
        });

    } catch (error) {
        console.error('[LiveRoute Stream Execution Error]:', error);

        if (isclientconnected) {
            res.write(formatSSEEvent('error', {
                success: false,
                error: error.message || "Falha crítica no motor de streaming Live."
            }));
            res.end();
        }
    }
};

/**
 * Controller secundário para verificação de estado do canal Live
 */
export const handleliveStatusCheck = (req, res) => {
    return res.status(200).json({
        status: "active",
        service: "Honey IA Live Engine",
        timestamp: new Date().toISOString()
    });
};

export default handlelivestreamroute;
